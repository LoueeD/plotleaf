import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
let directory: string;
let artifact: string;

test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "plotleaf-showcase-"));
  const source = path.join(directory, "examples");
  await cp(path.join(root, "examples"), source, { recursive: true });
  artifact = path.join(directory, "showcase.html");
  const result = spawnSync(
    process.env.PLOTLEAF_NODE ?? "node",
    [
      path.join(root, "dist/cli.js"),
      "build",
      path.join(source, "report.md"),
      "--out",
      artifact,
    ],
    { encoding: "utf8", timeout: 15_000 },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || "Build failed");
  await rm(source, { recursive: true, force: true });
});

test.afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("cumulative showcase retains KPI comparisons and chart interactions alongside rich cells offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await context.setOffline(true);
  await page.goto(pathToFileURL(artifact).href);
  await expect(
    page.locator(".metric-comparison[data-sentiment=positive]"),
  ).toHaveCount(7);
  await expect(page.locator(".metric-value").nth(1)).toHaveText("US$824,160");
  await expect(page.locator(".chart-plot svg")).toHaveCount(4);
  await expect(page.locator(".chart-plot").first()).toContainText(
    "Daily target",
  );
  await expect(
    page.getByText("At risk", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".table-image")).toHaveCount(4);
  await expect(page.locator(".sparkline-chart")).toHaveCount(4);
  await expect(
    page.getByRole("img", { name: "Illustration of a blue desk lamp" }),
  ).toBeVisible();

  const products = page.locator("table").filter({
    has: page.locator("caption", { hasText: "Performance by product" }),
  });
  await products
    .getByRole("button", { name: "Sort by Weekly orders", exact: true })
    .click();
  await expect(products.locator("tbody tr").first()).toContainText(
    "Linen tote — natural",
  );
  await products.locator("summary").first().click();
  await expect(products.locator("details[open] li")).toHaveCount(8);
  const categories = page.locator("table").filter({
    has: page.locator("caption", { hasText: "Category performance" }),
  });
  await categories
    .getByRole("button", { name: "Sort by Orders", exact: true })
    .click();
  await expect(categories.locator("tbody tr").first()).toContainText(
    "Outdoors",
  );

  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    const colors = await page
      .locator(".metric-comparison")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).color),
      );
    for (const color of colors) {
      const [red, green, blue] = color.match(/\d+/g)!.map(Number);
      expect(green!).toBeGreaterThan(red!);
      expect(green!).toBeGreaterThan(blue!);
    }
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1100 });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
      await page.screenshot({
        path: test.info().outputPath(`showcase-${width}-${theme}.png`),
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

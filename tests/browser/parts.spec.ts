import { test, expect, type Page } from "@playwright/test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const node = process.env.PLOTLEAF_NODE ?? "node";
let directory: string;
let artifact: string;
async function settleChartLayout(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page
        .locator(".chart-plot")
        .evaluateAll((plots) =>
          Math.max(
            ...plots.map((plot) =>
              Math.abs(
                plot.clientWidth -
                  Number(plot.querySelector("svg")?.getAttribute("width") ?? 0),
              ),
            ),
          ),
        ),
    )
    .toBeLessThan(2);
}
function build(source: string, output: string): void {
  const result = spawnSync(
    node,
    [path.join(root, "dist/cli.js"), "build", source, "--out", output],
    { encoding: "utf8", timeout: 15_000 },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || "Build failed");
}

test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "plotleaf-parts-browser-"));
  const source = path.join(directory, "source");
  await cp(path.join(root, "examples/onboarding"), source, { recursive: true });
  artifact = path.join(directory, "portable", "onboarding.html");
  build(path.join(source, "report.md"), artifact);
  await rm(source, { recursive: true, force: true });
});
test.afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("copied onboarding HTML retains offline donut tooltips and native funnel values", async ({
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
  await expect(page.locator(".chart-plot svg")).toHaveCount(2);
  await expect(page.getByRole("meter")).toHaveCount(4);
  await expect(
    page.getByRole("meter", { name: /Signed up/ }),
  ).toHaveAccessibleName(/30.3%, 12,480 of 41,200, On target/);
  await expect(page.locator(".funnel-status")).toHaveText([
    "On target",
    "On target",
    "Below target",
    "At risk",
  ]);
  await expect(page.locator(".donut-legend li").first()).toContainText("5,100");
  const ring = page.locator(".donut-plot");
  const box = await ring.boundingBox();
  await ring.hover({ position: { x: box!.width * 0.86, y: box!.height / 2 } });
  await expect(ring.locator("svg")).toContainText("5,100");
  await page.mouse.move(0, 0);
  await expect(ring.locator("svg")).not.toContainText("5,100");
  await page.screenshot({
    path: test.info().outputPath("onboarding-light.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".chart-plot svg")).toHaveCount(2);
  await page.screenshot({
    path: test.info().outputPath("onboarding-dark.png"),
    fullPage: true,
  });
  const data = page.locator(".donut details");
  await data.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(data.locator("table")).toBeVisible();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("funnel and donut remain readable at narrow widths and update their theme", async ({
  page,
}) => {
  await page.goto(pathToFileURL(artifact).href);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 375, 768, 1094, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator(".donut-plot svg")).toHaveCount(1);
      await settleChartLayout(page);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
        legends: [
          ...document.querySelectorAll<HTMLElement>(".donut-legend"),
        ].map((element) => [element.clientWidth, element.scrollWidth]),
        meters: [...document.querySelectorAll("meter")].map(
          (element) => element.getBoundingClientRect().width,
        ),
      }));
      expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
      for (const [client, scroll] of dimensions.legends)
        expect(scroll).toBeLessThanOrEqual(client! + 1);
      for (const width of dimensions.meters) expect(width).toBeGreaterThan(100);
    }
  }
  await page.setViewportSize({ width: 375, height: 1000 });
  await settleChartLayout(page);
  await page.screenshot({
    path: test.info().outputPath("onboarding-mobile-dark.png"),
    fullPage: true,
  });
});

test("funnel and donut data remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(artifact).href);
    await expect(page.getByRole("meter")).toHaveCount(4);
    await expect(page.locator(".funnel-status").last()).toHaveText("At risk");
    await expect(page.locator(".donut-legend")).toContainText("5,100");
    await page.locator(".funnel summary").click();
    await expect(page.locator(".funnel table")).toContainText("12,480");
    await expect(page.locator(".funnel table")).toContainText("Below target");
    await page.locator(".donut summary").click();
    await expect(page.locator(".donut table tbody tr")).toHaveCount(3);
    await expect(page.locator(".donut table")).toContainText("Free");
  } finally {
    await context.close();
  }
});

test("zero donuts stay empty and hostile labels remain inert during interaction", async ({
  page,
}) => {
  const source = path.join(directory, "hostile");
  await mkdir(source);
  const hostile = '</script><img src=x onerror="globalThis.PWNED=1">';
  await writeFile(
    path.join(source, "report.md"),
    '# Safe labels\n\n::donut{data="./zero.json" category="plan" value="teams" title="Zero mix"}\n\n::donut{data="./data.json" category="plan" value="teams" title="Unsafe labels"}\n\n::funnel{data="./data.json" stage="plan" value="teams" total="total" share="share" title="Safe stages"}',
  );
  await writeFile(
    path.join(source, "zero.json"),
    JSON.stringify([{ plan: "Pro", teams: 0 }]),
  );
  await writeFile(
    path.join(source, "data.json"),
    JSON.stringify([
      {
        plan: hostile,
        teams: 1,
        total: 2,
        share: 0.5,
        unused: "PRIVATE_UNUSED_SENTINEL",
      },
    ]),
  );
  const output = path.join(directory, "hostile.html");
  build(path.join(source, "report.md"), output);
  await page.goto(pathToFileURL(output).href);
  await expect(page.locator(".donut-plot svg")).toHaveCount(1);
  await expect(page.getByText("No non-zero values to display.")).toBeVisible();
  await expect(page.locator(".donut-legend")).toContainText(hostile);
  await expect(page.getByRole("meter")).toHaveAccessibleName(/50%, 1 of 2/);
  const ring = page.locator(".donut-plot");
  const box = await ring.boundingBox();
  await ring.hover({ position: { x: box!.width * 0.86, y: box!.height / 2 } });
  await expect(ring.locator("svg")).toContainText(hostile);
  expect(
    await page.evaluate(() => (globalThis as { PWNED?: unknown }).PWNED),
  ).toBeUndefined();
  await expect(page.locator("img, iframe")).toHaveCount(0);
  expect(await readFile(output, "utf8")).not.toContain(
    "PRIVATE_UNUSED_SENTINEL",
  );
});

import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

async function ready(page: import("@playwright/test").Page) {
  await expect(page.locator("#compile-status")).toHaveText("Ready");
  await expect(
    page.getByRole("button", { name: "Download HTML" }),
  ).toBeEnabled();
}

test("human docs, generated reference and real examples are readable across themes and widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/docs/");
  await expect(
    page.getByRole("heading", { name: "Discover the contract" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Component reference", exact: true })
    .click();
  await expect(page.locator("#column")).toContainText("sparkline");
  await page.goto("/examples/");
  const frame = page.frameLocator("iframe");
  await expect(frame.locator(".metric-comparison")).toHaveCount(7);
  await expect(frame.locator(".chart-plot svg")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "View report" })).toHaveCount(4);
  for (const path of [
    "/",
    "/docs/",
    "/docs/components/",
    "/examples/",
    "/playground/",
  ]) {
    await page.goto(path);
    if (path === "/playground/") await ready(page);
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [375, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        ).toBe(true);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("browser compilation edits data, diagnoses failures, isolates previews and never uploads report input", async ({
  page,
}) => {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.method() !== "GET") writes.push(r.url());
  });
  await page.goto("/playground/");
  await ready(page);
  const frame = page.frameLocator("#report-preview");
  await expect(frame.locator(".chart-plot svg")).toHaveCount(2);
  expect(await page.locator("#report-preview").getAttribute("sandbox")).toBe(
    "allow-scripts",
  );
  expect(
    await page
      .frames()
      .find((f) => f.url().includes("playground-preview"))!
      .evaluate(() => self.origin),
  ).toBe("null");
  await page.locator("#example-select").selectOption("sparklines");
  await ready(page);
  await expect(frame.locator(".sparkline-chart")).toHaveCount(4);
  await page.locator("#file-select").selectOption("products.json");
  await page.locator("#source-editor").fill("{invalid");
  await expect(page.locator("#diagnostics")).toContainText("E_DATA_JSON");
  await expect(
    page.getByRole("button", { name: "Download HTML" }),
  ).toBeDisabled();
  await expect(page.locator("#report-preview")).toBeHidden();
  await page.getByRole("button", { name: "Reset example" }).click();
  await ready(page);
  await expect(frame.locator(".sparkline-chart")).toHaveCount(4);
  await page.locator("#open-files").setInputFiles([
    {
      name: "report.md",
      mimeType: "text/markdown",
      buffer: Buffer.from('# Browser input\n\n::table{data="./data.json"}'),
    },
    {
      name: "data.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify([
          {
            label:
              '</script><img src=x onerror="parent.PWNED=1"> PRIVATE_BROWSER_DATA',
            count: 12,
          },
        ]),
      ),
    },
  ]);
  await ready(page);
  await expect(frame.locator("tbody")).toContainText("PRIVATE_BROWSER_DATA");
  await expect(frame.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => "PWNED" in window)).toBe(false);
  await page.locator("#file-select").selectOption("report.md");
  await page.locator("#source-editor").fill("<script>parent.PWNED=1</script>");
  await expect(page.locator("#diagnostics")).toContainText("E_RAW_HTML");
  await expect(page.locator("#report-preview")).toBeHidden();
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test("browser-produced HTML matches CLI output and works independently offline", async ({
  page,
  browser,
}, testInfo) => {
  await page.goto("/playground/");
  await ready(page);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  const download = await downloadEvent;
  const filename = testInfo.outputPath("report.html");
  await download.saveAs(filename);
  const html = await readFile(filename, "utf8");
  const reference = await (
    await page.request.get("/reports/storefront/")
  ).text();
  expect(html).toBe(reference);
  const context = await browser.newContext({ offline: true });
  const report = await context.newPage();
  const requests: string[] = [];
  report.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await report.goto(pathToFileURL(filename).href);
  await expect(report.locator(".chart-plot svg")).toHaveCount(2);
  await expect(report.locator(".metric-value").nth(1)).toHaveText("US$824,160");
  await report
    .getByRole("button", { name: "Sort by Orders", exact: true })
    .click();
  await expect(
    report
      .locator("table")
      .filter({
        has: report.getByRole("button", {
          name: "Sort by Orders",
          exact: true,
        }),
      })
      .locator("tbody tr")
      .first(),
  ).toContainText("Outdoors");
  expect(requests).toEqual([]);
  await context.close();
});

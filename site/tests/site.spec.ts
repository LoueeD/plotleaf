import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

async function ready(page: import("@playwright/test").Page) {
  await expect(page.locator("#compile-status")).toHaveText(/^Ready/);
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
  await expect(page.locator("iframe")).toHaveCount(0);
  const reportPage = await page.context().newPage();
  await reportPage.goto("/reports/showcase/");
  await expect(
    reportPage.locator(".metric-comparison[data-sentiment=positive]"),
  ).toHaveCount(7);
  await expect(reportPage.locator(".chart-plot svg")).toHaveCount(6);
  await reportPage.close();
  await expect(page.getByRole("link", { name: "View report" })).toHaveCount(6);
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
  await page.getByRole("tab", { name: "products.json", exact: true }).click();
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
  await page.getByRole("tab", { name: "data.json", exact: true }).click();
  await page
    .locator("#source-editor")
    .fill('[{"label":"Updated live","count":13}]');
  await expect(frame.locator("tbody")).toContainText("Updated live");
  await page.getByRole("tab", { name: "report.md", exact: true }).click();
  await page
    .locator("#source-editor")
    .fill('# Edited heading\n\n::table{data="./data.json"}');
  await expect(
    frame.getByRole("heading", { name: "Edited heading" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "report.md", exact: true }).click();
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

test("workspace fits viewport, resizes panes and adds editable JSON tabs", async ({
  page,
}) => {
  await page.goto("/playground/");
  await ready(page);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    const sizes = await page.evaluate(() => ({
      page: document.documentElement.scrollHeight,
      footer: document.querySelector("footer")!.getBoundingClientRect().bottom,
      editor: document.querySelector(".editor")!.getBoundingClientRect().height,
      preview: document.querySelector(".preview-pane")!.getBoundingClientRect()
        .height,
    }));
    expect(sizes.page).toBe(800);
    expect(sizes.footer).toBeLessThanOrEqual(800);
    expect(sizes.editor).toBeGreaterThan(300);
    expect(sizes.preview).toBe(sizes.editor);
  }
  const before = (await page.locator(".editor").boundingBox())!.width;
  const handle = await page
    .getByRole("separator", { name: "Resize editor" })
    .boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + 80);
  await page.mouse.down();
  await page.mouse.move(handle!.x + 180, handle!.y + 80);
  await page.mouse.up();
  expect((await page.locator(".editor").boundingBox())!.width).toBeGreaterThan(
    before + 100,
  );
  await page.getByRole("separator").focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("separator")).toHaveAttribute(
    "aria-valuenow",
    "20",
  );
  await page
    .getByRole("button", { name: "Add JSON file", exact: true })
    .click();
  await page.getByLabel("Filename").fill("notes.json");
  await page.getByRole("button", { name: "Add file", exact: true }).click();
  await expect(page.getByRole("tab", { name: "notes.json" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.locator("#source-editor").fill('[{"note":"tab edit retained"}]');
  await page.getByRole("tab", { name: "report.md", exact: true }).click();
  await page.getByRole("tab", { name: "notes.json" }).click();
  await expect(page.locator("#source-editor")).toHaveValue(
    '[{"note":"tab edit retained"}]',
  );
  await page.getByRole("button", { name: "Remove selected JSON" }).click();
  await expect(page.getByRole("tab", { name: "notes.json" })).toHaveCount(0);
});

test("browser playground compiles interactive bundles and live JSON edits update prepared views", async ({
  page,
}) => {
  await page.goto("/playground/?example=interactions");
  await ready(page);
  const frame = page.frameLocator("#report-preview");
  const region = frame.locator(".exploration").nth(0);
  await region.getByLabel("Region", { exact: true }).selectOption("1");
  await expect(region.locator(".metric-value:visible").first()).toHaveText(
    "4,200",
  );
  await page
    .getByRole("tab", { name: "regional-views.json", exact: true })
    .click();
  const bundle = JSON.parse(await page.locator("#source-editor").inputValue());
  const view = bundle.views.find(
    (item: { id: string }) => item.id === "emea-1",
  );
  view.markdown = view.markdown.replace('value="4200"', 'value="4300"');
  await page.locator("#source-editor").fill(JSON.stringify(bundle, null, 2));
  await expect(page.locator("#compile-status")).toHaveText("Editing…");
  await ready(page);
  await region.getByLabel("Region", { exact: true }).selectOption("1");
  await expect(region.locator(".metric-value:visible").first()).toHaveText(
    "4,300",
  );
  await expect(region.locator(".chart-plot svg")).toHaveCount(2);
});

test("playground edits reusable definitions and scoped subtotal data", async ({
  page,
}) => {
  await page.goto("/playground/?example=reuse");
  await ready(page);
  const frame = page.frameLocator("#report-preview");
  await expect(frame.locator(".metric-value").first()).toHaveText("53");
  await expect(frame.getByText("All regions, January–March")).toBeVisible();
  await page.getByRole("tab", { name: "summary.json", exact: true }).click();
  const definition = JSON.parse(
    await page.locator("#source-editor").inputValue(),
  );
  definition.components[0].props.comparison = "Prepared comparison";
  await page
    .locator("#source-editor")
    .fill(JSON.stringify(definition, null, 2));
  await ready(page);
  await expect(frame.getByText("Prepared comparison")).toHaveCount(2);
  await page
    .getByRole("tab", { name: "prepared-subtotals.json", exact: true })
    .click();
  const data = JSON.parse(await page.locator("#source-editor").inputValue());
  data.scope = "Revised prepared scope";
  await page.locator("#source-editor").fill(JSON.stringify(data, null, 2));
  await ready(page);
  await expect(frame.getByText("Revised prepared scope")).toBeVisible();
});

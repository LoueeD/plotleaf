import { test, expect } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const node = process.env.PLOTLEAF_NODE ?? "node";
let directory: string, artifact: string;
const build = (input: string, out: string) => {
  const r = spawnSync(
    node,
    [path.join(root, "dist/cli.js"), "build", input, "--out", out],
    { encoding: "utf8", timeout: 15000 },
  );
  if (r.status !== 0) throw new Error(r.stderr || "Build failed");
};
test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "plotleaf-explore-"));
  const source = path.join(directory, "source");
  await cp(path.join(root, "examples/interactions"), source, {
    recursive: true,
  });
  artifact = path.join(directory, "report.html");
  build(path.join(source, "report.md"), artifact);
  await rm(source, { recursive: true, force: true });
});
test.afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("offline region/range transition updates metrics, charts, funnel, tables and data alternatives together", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await context.setOffline(true);
  await page.goto(pathToFileURL(artifact).href);
  const region = page.locator(".exploration").nth(0),
    other = page.locator(".exploration").nth(1);
  await expect(region.locator(".metric-value:visible").first()).toHaveText(
    "12,480",
  );
  await expect(region.locator(".chart-plot svg")).toHaveCount(2);
  await region.getByLabel("Region", { exact: true }).selectOption("1");
  await region.getByLabel("From", { exact: true }).fill("2026-11-08");
  await expect(region.locator(".metric-value:visible")).toHaveCount(0);
  await region.getByLabel("Through", { exact: true }).fill("2026-11-14");
  await expect(region.locator(".metric-value:visible")).toHaveText([
    "5,100",
    "US$336,600",
    "3,264",
  ]);
  await expect(region.locator(".explore-status")).toContainText(
    "EMEA / 8–14 November",
  );
  await expect(region.locator(".chart-plot svg")).toHaveCount(2);
  await expect(region.locator(".funnel:visible")).toContainText("15.3k");
  await expect(
    region.locator("table:visible").filter({
      has: page.locator("caption", { hasText: "Selected-view accounts" }),
    }),
  ).toContainText("EMEA account A");
  const panel = region.locator("[data-plotleaf-view]:visible");
  await panel.locator("details.chart-data summary").first().click();
  await expect(panel.locator("details.chart-data").first()).toContainText(
    "2026-11-08",
  );
  await expect(panel.locator("details.chart-data").first()).not.toContainText(
    "2026-11-01",
  );
  await expect(other.locator(".metric-value:visible")).toHaveText("240");
  for (let i = 0; i < 3; i++) {
    await region.getByLabel("Region", { exact: true }).selectOption("0");
    await region.getByLabel("Region", { exact: true }).selectOption("1");
  }
  await expect(region.locator(".chart-plot svg")).toHaveCount(2);
  await region.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(region.locator(".metric-value:visible").first()).toHaveText(
    "12,480",
  );
  await expect(region.getByLabel("From", { exact: true })).toHaveValue(
    "2026-11-01",
  );
  await region.getByLabel("Region", { exact: true }).selectOption("2");
  await expect(region.locator(".metric-value:visible")).toHaveText([
    "0",
    "US$0",
    "0",
  ]);
  await expect(region.locator(".empty-state:visible").first()).toBeVisible();
  await expect(region.locator(".chart-plot svg")).toHaveCount(0);
  await region.getByLabel("From", { exact: true }).fill("2026-11-08");
  await region.getByLabel("Through", { exact: true }).fill("2026-11-14");
  await expect(region.locator("[data-plotleaf-view]:visible")).toHaveCount(0);
  await expect(region.getByRole("status")).toContainText("No prepared view");
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test("segmented, toggle, text and number controls stay scoped and recover from unavailable values", async ({
  page,
}) => {
  await page.goto(pathToFileURL(artifact).href);
  const region = page.locator(".exploration").nth(0),
    controls = page.locator(".exploration").nth(1);
  await controls.getByRole("radio", { name: "Monthly", exact: true }).check();
  await controls.getByRole("checkbox", { name: "Priority accounts" }).check();
  await controls
    .getByLabel("Product (all or notebook)", { exact: true })
    .fill("notebook");
  await controls.getByLabel("Quantity (10 or 20)", { exact: true }).fill("20");
  await expect(controls.locator(".metric-value:visible")).toHaveText("350");
  await expect(controls.locator("table:visible")).toContainText("notebook");
  await expect(region.locator(".metric-value:visible").first()).toHaveText(
    "12,480",
  );
  await controls
    .getByLabel("Product (all or notebook)", { exact: true })
    .fill("not a supported product");
  await expect(
    controls.getByLabel("Product (all or notebook)", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(controls.locator(".metric-value:visible")).toHaveCount(0);
  await expect(controls.getByRole("status")).toContainText("No prepared view");
  await controls.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(controls.locator(".metric-value:visible")).toHaveText("240");
  await expect(
    controls.getByLabel("Product (all or notebook)", { exact: true }),
  ).toHaveValue("all");
  await expect(controls.getByRole("checkbox")).not.toBeChecked();
  await controls.getByLabel("Quantity (10 or 20)", { exact: true }).fill("");
  await expect(controls.locator(".metric-value:visible")).toHaveCount(0);
  await controls.getByLabel("Quantity (10 or 20)", { exact: true }).fill("10");
  await expect(controls.locator(".metric-value:visible")).toHaveText("240");
});

test("default view and data remain readable with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    offline: true,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(artifact).href);
  const region = page.locator(".exploration").nth(0);
  await expect(region.locator(".metric-value:visible")).toHaveText([
    "12,480",
    "US$824,160",
    "7,612",
  ]);
  await expect(region.getByLabel("Region", { exact: true })).toBeDisabled();
  await expect(
    region.getByRole("button", { name: "Reset", exact: true }),
  ).toBeDisabled();
  await expect(region.locator("noscript")).toBeVisible();
  await region
    .locator("[data-plotleaf-view]:visible details.chart-data summary")
    .first()
    .click();
  await expect(
    region.locator("[data-plotleaf-view]:visible details.chart-data").first(),
  ).toContainText("2026-11-01");
  await context.close();
});

test("controls and selected charts fit mobile/tablet/desktop in both themes and support keyboard selection", async ({
  page,
}, info) => {
  await page.goto(pathToFileURL(artifact).href);
  const region = page.locator(".exploration").nth(0);
  await region.getByLabel("Region", { exact: true }).selectOption("1");
  const controls = page.locator(".exploration").nth(1);
  await controls.getByRole("radio", { name: "Weekly", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(controls.locator(".metric-value:visible")).toHaveText("960");
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(region.locator(".chart-plot svg")).toHaveCount(2);
      await page.screenshot({
        path: info.outputPath(`explore-${theme}-${width}.png`),
      });
    }
  }
});

test("hostile input labels/values stay inert and links target the selected view", async ({
  page,
}) => {
  const source = path.join(directory, `hostile-${test.info().project.name}.md`),
    bundle = path.join(directory, `hostile-${test.info().project.name}.json`),
    output = path.join(directory, `hostile-${test.info().project.name}.html`);
  const attack = '</script><img src=x onerror="window.PWNED=1">';
  await writeFile(
    source,
    `::explore{data="./${path.basename(bundle)}" title="Safe"}`,
  );
  await writeFile(
    bundle,
    JSON.stringify({
      inputs: [
        {
          id: "choice",
          type: "select",
          label: "Choice",
          default: "safe",
          options: [
            { value: "safe", label: "Safe" },
            { value: attack, label: attack },
          ],
        },
      ],
      views: [
        {
          id: "safe",
          label: "Safe",
          when: { choice: "safe" },
          markdown: "[Details](#details)\n\n### Details\n\nDefault.",
        },
        {
          id: "hostile",
          label: attack,
          when: { choice: attack },
          markdown: "[Details](#details)\n\n### Details\n\nSelected.",
        },
      ],
    }),
  );
  build(source, output);
  await page.goto(pathToFileURL(output).href);
  await page.getByLabel("Choice").selectOption("1");
  await expect(page.locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => "PWNED" in window)).toBe(false);
  const selected = page.locator("[data-plotleaf-view]:visible");
  const href = await selected
    .getByRole("link", { name: "Details" })
    .getAttribute("href");
  expect(href).toBe(
    "#" +
      (await selected
        .getByRole("heading", { name: "Details" })
        .getAttribute("id")),
  );
  await expect(selected).toContainText("Selected.");
});

test("Node preview watches prepared bundles and recovers after deletion and repair", async ({
  page,
}) => {
  const live = path.join(directory, `live-${test.info().project.name}`);
  await cp(path.join(root, "examples/interactions"), live, { recursive: true });
  const file = path.join(live, "regional-views.json"),
    original = await readFile(file, "utf8");
  const child = spawn(
    node,
    [
      path.join(root, "dist/cli.js"),
      "dev",
      path.join(live, "report.md"),
      "--no-open",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let log = "";
      const timer = setTimeout(
        () => reject(new Error("Preview timeout " + log)),
        10000,
      );
      child.once("error", reject);
      child.stderr!.on("data", (chunk) => {
        log += String(chunk);
        const match = log.match(
          /plotleaf preview: (http:\/\/127\.0\.0\.1:\d+)/,
        );
        if (match) {
          clearTimeout(timer);
          resolve(match[1]!);
        }
      });
    });
    await page.goto(url);
    const scope = page.locator(".exploration").nth(0);
    await expect(scope.locator(".metric-value:visible").first()).toHaveText(
      "12,480",
    );
    await writeFile(
      file,
      original.replace('value=\\"12480\\"', 'value=\\"12500\\"'),
    );
    await expect(scope.locator(".metric-value:visible").first()).toHaveText(
      "12,500",
    );
    await unlink(file);
    await expect(
      page.getByRole("heading", { name: "Report needs attention" }),
    ).toBeVisible();
    await writeFile(file, original);
    await expect(scope.locator(".metric-value:visible").first()).toHaveText(
      "12,480",
    );
  } finally {
    child.kill();
  }
});

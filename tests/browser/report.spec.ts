import { test, expect } from "@playwright/test";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  rm,
  copyFile,
} from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const node = process.env.PLOTLEAF_NODE ?? "node";
let directory: string;
let artifact: string;
const build = (source: string, output: string): void => {
  const result = spawnSync(
    node,
    [path.join(root, "dist/cli.js"), "build", source, "--out", output],
    { encoding: "utf8", timeout: 15_000 },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || "Build failed");
};

test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "plotleaf-browser-"));
  artifact = path.join(directory, "report.html");
  build(path.join(root, "examples/storefront/report.md"), artifact);
});
test.afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("narrative dates use distinct month labels across time zones", async ({
  browser,
}) => {
  const context = await browser.newContext({
    timezoneId: "America/Los_Angeles",
    viewport: { width: 1094, height: 1052 },
  });
  try {
    const page = await context.newPage();
    const narrative = path.join(directory, "adoption.html");
    build(path.join(root, "examples/adoption/report.md"), narrative);
    await page.goto(pathToFileURL(narrative).href);
    await expect(page.locator(".chart-plot svg")).toHaveCount(1);
    const labels = (
      await page.locator(".chart-plot svg text").allTextContents()
    ).filter((label) =>
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/.test(label),
    );
    expect(labels.length).toBeGreaterThanOrEqual(3);
    expect(new Set(labels).size).toBe(labels.length);
    await page.screenshot({
      path: test.info().outputPath("narrative-light.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("copied HTML works offline with SVG charts, safe tooltip and numeric sorting", async ({
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
  const portable = path.join(directory, "portable", "copied.html");
  await mkdir(path.dirname(portable), { recursive: true });
  await copyFile(artifact, portable);
  await context.setOffline(true);
  await page.goto(pathToFileURL(portable).href);
  await expect(page.locator(".chart-plot svg")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Storefront Overview" }),
  ).toBeVisible();
  await expect(page.locator(".metric-value").first()).toHaveText("12,480");
  await expect(page.locator("table[data-plotleaf-table] caption")).toHaveText(
    "Category performance",
  );
  const bar = page.locator(".chart-plot").nth(1);
  const size = await bar.boundingBox();
  await bar.hover({ position: { x: size!.width * 0.28, y: 120 } });
  await expect(bar.locator("svg")).toContainText("228");
  const table = page.locator("table[data-plotleaf-table]");
  await page
    .getByRole("button", { name: "Sort by Orders", exact: true })
    .click();
  await expect(table.locator("tbody tr").first()).toContainText("Outdoors");
  await expect(table.locator('th[aria-sort="ascending"]')).toContainText(
    "Orders",
  );
  await page
    .getByRole("button", { name: "Sort by Orders", exact: true })
    .click();
  await expect(table.locator("tbody tr").first()).toContainText("Apparel");
  await page
    .getByRole("button", { name: "Sort by Revenue", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(table.locator("tbody tr").first()).toContainText("Outdoors");
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  const stops = page
    .locator(".chart-plot")
    .first()
    .locator("linearGradient stop");
  expect(await stops.count()).toBeGreaterThan(0);
  expect(
    await stops.last().evaluate((stop) => getComputedStyle(stop).stopOpacity),
  ).toBe("0");
});

test("keeps full currency metrics on one visible line across responsive widths", async ({
  page,
}) => {
  await page.goto(pathToFileURL(artifact).href);
  const revenue = page.locator(".metric-value").nth(1);
  await expect(revenue).toHaveText("US$824,160");
  for (const width of [
    320, 375, 540, 640, 768, 820, 1000, 1094, 1280, 1281, 1366, 1440,
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    const values = await page.locator(".metric-value").evaluateAll((elements) =>
      elements.map((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return {
          lines: range.getClientRects().length,
          contained: text.left >= box.left - 1 && text.right <= box.right + 1,
          clipped: element.scrollWidth > element.clientWidth + 1,
        };
      }),
    );
    expect(values, `metric values at ${width}px`).toEqual(
      Array.from({ length: 4 }, () => ({
        lines: 1,
        contained: true,
        clipped: false,
      })),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      `page at ${width}px`,
    ).toBeLessThanOrEqual(width);
  }
});

test("follows system theme, resizes, and contains mobile/table overflow", async ({
  page,
}, info) => {
  await page.goto(pathToFileURL(artifact).href);
  await expect(page.locator(".chart-plot svg")).toHaveCount(2);
  await page.screenshot({
    path: info.outputPath("desktop-light.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect
    .poll(() =>
      page
        .locator(".chart-plot svg path[stroke]")
        .evaluateAll((paths) =>
          paths.map((item) => item.getAttribute("stroke")),
        ),
    )
    .toContain("#65b5ed");
  await page.screenshot({
    path: info.outputPath("desktop-dark.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 850 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  await expect
    .poll(() =>
      page
        .locator(".chart-plot svg")
        .first()
        .evaluate((svg) => svg.getBoundingClientRect().width),
    )
    .toBeLessThan(375);
  await page
    .getByRole("button", { name: "Sort by Δ week", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator("table[data-plotleaf-table] tbody tr").first(),
  ).toContainText("Home");
  await page.screenshot({
    path: info.outputPath("mobile-dark.png"),
    fullPage: true,
  });
});

test("keeps content and native data disclosures usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(pathToFileURL(artifact).href);
    await expect(page.locator(".metric-value").first()).toHaveText("12,480");
    await expect(page.locator(".chart-plot svg")).toHaveCount(0);
    await page.locator(".chart-data summary").first().click();
    await expect(
      page.locator(".chart-data").first().locator("tbody tr"),
    ).toHaveCount(7);
    await expect(
      page.locator(".chart-data").first().locator("tbody"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sort by Orders", exact: true }),
    ).toBeDisabled();
  } finally {
    await context.close();
  }
});

test("hostile JSON/labels remain inert through SVG and table interaction", async ({
  page,
}) => {
  const source = path.join(directory, "hostile.md");
  const data = path.join(directory, "hostile.json");
  const output = path.join(directory, "hostile.html");
  await writeFile(
    source,
    '# Prepared data\n\n::bar{data="./hostile.json" x="label" y="value" title="Labels"}\n\n:::table{data="./hostile.json"}\n::column{field="label"}\n::column{field="value"}\n:::',
  );
  const attack =
    '</script><script>globalThis.PWNED=1</script><img src=x onerror="globalThis.PWNED=2">';
  await writeFile(
    data,
    JSON.stringify([
      { label: attack, value: 2, unused: "PRIVATE_UNUSED_SENTINEL" },
    ]),
  );
  build(source, output);
  const html = await readFile(output, "utf8");
  expect(html).not.toContain("PRIVATE_UNUSED_SENTINEL");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(output).href);
  await expect(page.locator(".chart-plot svg")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Sort by Label", exact: true })
    .click();
  await expect(page.locator("table[data-plotleaf-table] tbody")).toContainText(
    attack,
  );
  expect(
    await page.evaluate(
      () => (globalThis as typeof globalThis & { PWNED?: number }).PWNED,
    ),
  ).toBeUndefined();
  await expect(page.locator("main img, main script")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Node preview reloads Markdown/JSON and recovers from a failed compile", async ({
  page,
}) => {
  const source = path.join(directory, "live.md");
  const data = path.join(directory, "live.json");
  await writeFile(source, '# Live report\n\n::table{data="./live.json"}');
  await writeFile(data, '[{"name":"Initial","value":1}]');
  const child = spawn(
    node,
    [path.join(root, "dist/cli.js"), "dev", source, "--no-open"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () => reject(new Error(output || "No preview URL")),
        8000,
      );
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.stderr.on("data", (chunk) => {
        output += String(chunk);
        const match = output.match(
          /plotleaf preview: (http:\/\/127\.0\.0\.1:\d+)/,
        );
        if (match?.[1]) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
    });
    await page.goto(url);
    await expect(page.locator("tbody")).toContainText("Initial");
    await writeFile(data, '[{"name":"Updated","value":2}]');
    await expect(page.locator("tbody")).toContainText("Updated");
    await writeFile(source, '# Updated heading\n\n::table{data="./live.json"}');
    await expect(
      page.getByRole("heading", { name: "Updated heading" }),
    ).toBeVisible();
    await writeFile(data, "{invalid");
    await expect(
      page.getByRole("heading", { name: "Report needs attention" }),
    ).toBeVisible();
    await expect(page.locator(".diagnostic-location")).toContainText(
      "E_DATA_JSON",
    );
    await writeFile(data, '[{"name":"Recovered","value":3}]');
    await expect(page.locator("tbody")).toContainText("Recovered");
    await expect(
      page.getByRole("heading", { name: "Updated heading" }),
    ).toBeVisible();
  } finally {
    await page.close();
    const stopped = new Promise<void>((resolve) =>
      child.once("exit", () => resolve()),
    );
    child.kill("SIGTERM");
    await stopped;
  }
});

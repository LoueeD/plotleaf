import { test, expect } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
async function preview(filename: string) {
  const child = spawn(
    node,
    [path.join(root, "dist/cli.js"), "dev", filename, "--no-open"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const url = await new Promise<string>((resolve, reject) => {
    let log = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(log || "Preview timeout"));
    }, 10_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited ${code}: ${log}`));
    });
    child.stderr!.on("data", (chunk) => {
      log += String(chunk);
      const match = log.match(/plotleaf preview: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return {
    url,
    close: async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const stopped = new Promise<void>((resolve) =>
        child.once("exit", () => resolve()),
      );
      child.kill("SIGTERM");
      await stopped;
    },
  };
}
test.beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "plotleaf-rich-browser-"));
  const source = path.join(directory, "source");
  await cp(path.join(root, "examples/catalog"), source, { recursive: true });
  artifact = path.join(directory, "portable", "catalog.html");
  build(path.join(source, "report.md"), artifact);
  await rm(source, { recursive: true, force: true });
});
test.afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

test("copied rich tables render offline, deduplicate rasters and sort declared raw keys", async ({
  page,
  context,
}) => {
  const errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await context.setOffline(true);
  await page.goto(pathToFileURL(artifact).href);
  await expect(page.locator(".image-definitions symbol")).toHaveCount(3);
  await expect(page.locator(".table-image")).toHaveCount(4);
  await expect(page.locator(".sparkline-chart")).toHaveCount(4);
  await expect(
    page.getByRole("img", { name: "Illustration of a blue desk lamp" }),
  ).toBeVisible();
  const sizes = await page.evaluate(async () =>
    Promise.all(
      [...document.querySelectorAll(".image-definitions image")].map(
        async (element) => {
          const image = new Image();
          image.src = element.getAttribute("href")!;
          await image.decode();
          return [image.naturalWidth, image.naturalHeight];
        },
      ),
    ),
  );
  expect(sizes).toEqual([
    [320, 240],
    [320, 240],
    [320, 240],
  ]);
  const table = page.locator("table[data-plotleaf-table]");
  await page
    .getByRole("button", { name: "Sort by Weekly orders", exact: true })
    .click();
  await expect(table.locator("tbody tr").first()).toContainText(
    "Linen tote — natural",
  );
  await page
    .getByRole("button", { name: "Sort by Weekly orders", exact: true })
    .click();
  await expect(table.locator("tbody tr").first()).toContainText(
    "Field notebook",
  );
  await expect(table.locator("th").first()).not.toHaveAttribute(
    "aria-sort",
    /.+/,
  );
  await expect(
    page.getByRole("button", { name: "Sort by Preview", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sort by Revenue", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(table.locator("tbody tr").first()).toContainText(
    "Linen tote — natural",
  );
  await page.screenshot({
    path: test.info().outputPath("catalog-light.png"),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({
    path: test.info().outputPath("catalog-dark.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  const html = await readFile(artifact, "utf8");
  expect(html).not.toContain("/assets/");
  expect(html).not.toContain(".png");
  expect(html).not.toContain(".jpg");
  expect(html).not.toContain('"charts":');
});

test("native images, sparklines and value disclosures work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(artifact).href);
    await expect(page.locator(".table-image")).toHaveCount(4);
    await expect(
      page.getByRole("img", { name: /Weekly orders.*8 of 8 recorded samples/ }),
    ).toHaveCount(3);
    const detail = page.locator(".sparkline-data").nth(1);
    await detail.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(detail.locator("ol")).toBeVisible();
    await expect(detail.locator("li")).toHaveText([
      "38",
      "35",
      "39",
      "—",
      "46",
      "44",
      "49",
      "53",
    ]);
    await expect(
      page.getByRole("button", { name: "Sort by Orders", exact: true }),
    ).toBeDisabled();
  } finally {
    await context.close();
  }
});

test("rich tables contain overflow and retain image/line contrast across themes and widths", async ({
  page,
}) => {
  await page.goto(pathToFileURL(artifact).href);
  let lightStroke = "";
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    const stroke = await page
      .locator(".sparkline-chart path")
      .first()
      .evaluate((path) => getComputedStyle(path).stroke);
    if (theme === "light") lightStroke = stroke;
    else expect(stroke).not.toBe(lightStroke);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const sizes = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        tables: [
          ...document.querySelectorAll<HTMLElement>(".table-scroll"),
        ].map((element) => ({
          width: element.clientWidth,
          scroll: element.scrollWidth,
        })),
      }));
      expect(sizes.page).toBeLessThanOrEqual(sizes.viewport);
      if (width === 320)
        expect(sizes.tables[0]!.scroll).toBeGreaterThan(sizes.tables[0]!.width);
    }
  }
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.screenshot({
    path: test.info().outputPath("catalog-mobile-dark.png"),
    fullPage: true,
  });
});

test("image and sort labels remain inert, including nullable sortable images", async ({
  page,
}) => {
  const source = path.join(directory, "hostile");
  await mkdir(source);
  await cp(
    path.join(root, "examples/catalog/assets/field-notebook.png"),
    path.join(source, "image.png"),
  );
  const hostile = '</script><img src=x onerror="globalThis.PWNED=1">';
  await writeFile(
    path.join(source, "data.json"),
    JSON.stringify([
      {
        name: "Zulu",
        image: "./image.png",
        alt: hostile,
        trend: [1, null, 2],
        key: 2,
        unused: "PRIVATE_UNUSED_SENTINEL",
      },
      {
        name: "Alpha",
        image: null,
        alt: null,
        trend: [0, 1, 2],
        key: 1,
        unused: "PRIVATE_UNUSED_SENTINEL",
      },
    ]),
  );
  await writeFile(
    path.join(source, "report.md"),
    '# Safe cells\n\n:::table{data="./data.json"}\n::column{field="image" label="Preview" kind="image" alt="alt" sortBy="name"}\n::column{field="name"}\n::column{field="trend" kind="sparkline" sortBy="key"}\n:::',
  );
  const output = path.join(directory, "hostile.html");
  build(path.join(source, "report.md"), output);
  await page.goto(pathToFileURL(output).href);
  await expect(
    page.getByRole("img", { name: hostile, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sort by Preview", exact: true })
    .click();
  await expect(page.locator("tbody tr").first()).toContainText("Alpha");
  expect(
    await page.evaluate(() => (globalThis as { PWNED?: unknown }).PWNED),
  ).toBeUndefined();
  await expect(page.locator("img, iframe, svg script")).toHaveCount(0);
  expect(await readFile(output, "utf8")).not.toContain(
    "PRIVATE_UNUSED_SENTINEL",
  );
});

test("Node preview reloads image bytes and recovers after deletion and invalid replacements", async ({
  page,
}) => {
  const source = path.join(directory, "live");
  await cp(path.join(root, "examples/catalog"), source, { recursive: true });
  const server = await preview(path.join(source, "report.md"));
  try {
    await page.goto(server.url);
    const first = await page
      .locator(".table-image use")
      .first()
      .getAttribute("href");
    const image = path.join(source, "assets/linen-tote.png");
    const replacement = await readFile(
      path.join(source, "assets/field-notebook.png"),
    );
    await writeFile(image, replacement);
    await expect(page.locator(".table-image use").first()).not.toHaveAttribute(
      "href",
      first!,
    );
    await unlink(image);
    await expect(
      page.getByRole("heading", { name: "Report needs attention" }),
    ).toBeVisible();
    await expect(page.locator(".diagnostic-location").first()).toContainText(
      "E_ASSET_READ",
    );
    await writeFile(image, Buffer.from('<svg onload="alert(1)"></svg>'));
    await expect(page.locator(".diagnostic-location").first()).toContainText(
      "E_ASSET_IMAGE",
    );
    await writeFile(image, replacement);
    await expect(
      page.getByRole("heading", { name: "Product Performance", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".table-image")).toHaveCount(4);
    expect(
      (await page.request.get(server.url + "/assets/linen-tote.png")).status(),
    ).toBe(404);
  } finally {
    await server.close();
  }
});

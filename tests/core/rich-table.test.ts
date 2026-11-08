import { expect, test } from "bun:test";
import {
  cp,
  readFile,
  writeFile,
  symlink,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { compileReport } from "../../src/compiler/compile.js";
import { renderHtml } from "../../src/render/html.js";
import { limits } from "../../src/shared/limits.js";
import { writeReport } from "../../src/export.js";
import { DataResolver } from "../../src/compiler/data.js";
import { Diagnostics } from "../../src/compiler/diagnostics.js";
import { parseReport } from "../../src/compiler/parse.js";
import { root, testAssets, withReport } from "./helpers.js";

const source =
  ':::table{data="./data.json" title="Products"}\n::column{field="image" kind="image" alt="alt"}\n::column{field="name"}\n::column{field="trend" kind="sparkline" sortBy="score"}\n:::';
const row = {
  image: "./assets/field-notebook.png",
  alt: "A green notebook",
  name: "Notebook",
  trend: [1, 2, null, 4],
  score: 4,
};
async function withTable<T>(
  rows: unknown,
  run: (filename: string, directory: string) => Promise<T>,
  markdown = source,
): Promise<T> {
  return withReport(
    markdown,
    { "data.json": rows },
    async (filename, directory) => {
      await cp(
        path.join(root, "examples/catalog/assets"),
        path.join(directory, "assets"),
        { recursive: true },
      );
      return run(filename, directory);
    },
  );
}

test("compiles the fictional catalogue with deduplicated static images and no chart runtime", async () => {
  const filename = path.join(root, "examples/catalog/report.md");
  const first = await compileReport(filename);
  expect(first.diagnostics).toEqual([]);
  expect(first.report?.images).toHaveLength(3);
  const html = renderHtml(first.report!, testAssets);
  expect(html.match(/data:image\/(?:png|jpeg);base64,/g)).toHaveLength(3);
  expect(html.match(/class="table-image"/g)).toHaveLength(4);
  expect(html.match(/class="sparkline-chart"/g)).toHaveLength(4);
  expect(html).not.toContain("/* chart runtime */");
  expect(html).not.toContain("/assets/");
  expect(html).not.toContain(".png");
  expect(html).not.toContain(".jpg");
  expect(html).toBe(
    renderHtml((await compileReport(filename)).report!, testAssets),
  );
});

test("keeps alt/sort metadata but excludes unused values, unused images and source paths", async () =>
  withTable(
    [{ ...row, unused: "PRIVATE_UNUSED_SENTINEL" }],
    async (filename, directory) => {
      const result = await compileReport(filename);
      expect(result.report?.images).toHaveLength(1);
      const html = renderHtml(result.report!, testAssets);
      expect(html).toContain('aria-label="A green notebook"');
      expect(html).toContain('data-raw="4"');
      expect(html).not.toContain(directory);
      expect(html).not.toContain("PRIVATE_UNUSED_SENTINEL");
      expect(html).not.toContain("field-notebook.png");
    },
  ));

test("deduplicates identical images from different local files", async () =>
  withTable(
    [row, { ...row, image: "./assets/copy.png" }],
    async (filename, directory) => {
      await cp(
        path.join(directory, "assets/field-notebook.png"),
        path.join(directory, "assets/copy.png"),
      );
      const result = await compileReport(filename);
      expect(result.report?.images).toHaveLength(1);
      expect(
        renderHtml(result.report!, testAssets).match(
          /data:image\/png;base64,/g,
        ),
      ).toHaveLength(1);
    },
  ));

test("nullable rich cells retain declared scalar sort keys without loading images", async () =>
  withTable(
    [{ ...row, image: null, alt: null, trend: null }],
    async (filename) => {
      const result = await compileReport(filename);
      expect(result.diagnostics).toEqual([]);
      expect(result.report?.images).toBeUndefined();
      const html = renderHtml(result.report!, testAssets);
      expect(html).toContain("No recorded values");
      expect(html).not.toContain("NaN");
    },
  ));

for (const reference of [
  "../outside.png",
  "/etc/private.png",
  "https://example.com/image.png",
  "data:image/png;base64,abc",
  "./.private/a.png",
  "./%2e%2e/a.png",
  "C:\\private.png",
  "./assets/icon.svg",
])
  test(`contains image references: ${reference}`, async () =>
    withTable([{ ...row, image: reference }], async (filename) => {
      const result = await compileReport(filename);
      expect(result.report).toBeUndefined();
      expect(result.diagnostics[0]).toMatchObject({
        code: "E_ASSET_PATH",
        line: 2,
      });
    }));

test("retains missing image references for watcher recovery", async () =>
  withTable(
    [{ ...row, image: "./assets/missing.png" }],
    async (filename, directory) => {
      const result = await compileReport(filename);
      expect(result.diagnostics[0]?.code).toBe("E_ASSET_READ");
      expect(
        result.dependencies.has(path.join(directory, "assets/missing.png")),
      ).toBe(true);
    },
  ));

test("blocks image directory symlinks/junctions escaping the report root", async () =>
  withTable(
    [{ ...row, image: "./outside/image.png" }],
    async (filename, directory) => {
      const outside = await mkdtemp(
        path.join(path.dirname(directory), "plotleaf-image-outside-"),
      );
      try {
        await cp(
          path.join(directory, "assets/field-notebook.png"),
          path.join(outside, "image.png"),
        );
        await symlink(
          outside,
          path.join(directory, "outside"),
          process.platform === "win32" ? "junction" : "dir",
        );
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics[0]?.code).toBe("E_ASSET_PATH");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    },
  ));

for (const [reason, modify] of [
  [
    "active SVG in a PNG file",
    () => Buffer.from('<svg onload="alert(1)"></svg>'),
  ],
  ["truncated PNG", (bytes: Buffer) => bytes.subarray(0, 30)],
  ["wrong raster signature", () => Buffer.from([255, 216, 255, 217])],
  ["oversized byte content", () => Buffer.alloc(limits.imageBytes + 1)],
  [
    "oversized side",
    (bytes: Buffer) => {
      const b = Buffer.from(bytes);
      b.writeUInt32BE(limits.imageDimension + 1, 16);
      return b;
    },
  ],
  [
    "oversized pixel count",
    (bytes: Buffer) => {
      const b = Buffer.from(bytes);
      b.writeUInt32BE(3000, 16);
      b.writeUInt32BE(2000, 20);
      return b;
    },
  ],
  [
    "animated PNG",
    (bytes: Buffer) => {
      const chunk = Buffer.alloc(20);
      chunk.writeUInt32BE(8);
      chunk.write("acTL", 4);
      return Buffer.concat([bytes.subarray(0, 33), chunk, bytes.subarray(33)]);
    },
  ],
] as const)
  test(`rejects ${reason} before export`, async () =>
    withTable([row], async (filename, directory) => {
      const asset = path.join(directory, "assets/field-notebook.png");
      await writeFile(asset, modify(await readFile(asset)));
      const result = await compileReport(filename);
      expect(result.report).toBeUndefined();
      expect(result.diagnostics[0]).toMatchObject({
        code: "E_ASSET_IMAGE",
        line: 2,
      });
    }));

test("rejects PNG bytes named JPEG and truncated JPEG data", async () => {
  await withTable(
    [{ ...row, image: "./assets/fake.jpg" }],
    async (filename, directory) => {
      await cp(
        path.join(directory, "assets/field-notebook.png"),
        path.join(directory, "assets/fake.jpg"),
      );
      expect((await compileReport(filename)).diagnostics[0]?.code).toBe(
        "E_ASSET_IMAGE",
      );
    },
  );
  await withTable(
    [{ ...row, image: "./assets/desk-lamp.jpg" }],
    async (filename, directory) => {
      const asset = path.join(directory, "assets/desk-lamp.jpg");
      await writeFile(asset, (await readFile(asset)).subarray(0, 100));
      expect((await compileReport(filename)).report).toBeUndefined();
    },
  );
});

test("checks a symlink alias extension even when the canonical image is cached", async () =>
  withTable(
    [row, { ...row, image: "./assets/alias.jpg" }],
    async (filename, directory) => {
      await symlink(
        path.join(directory, "assets/field-notebook.png"),
        path.join(directory, "assets/alias.jpg"),
        "file",
      );
      const result = await compileReport(filename);
      expect(result.report).toBeUndefined();
      expect(result.diagnostics[0]?.message).toContain(
        "signature does not match",
      );
    },
  ));

test.skipIf(process.platform === "win32")(
  "rejects named-pipe images without blocking",
  async () =>
    withTable(
      [{ ...row, image: "./assets/pipe.png" }],
      async (filename, directory) => {
        expect(
          spawnSync("mkfifo", [path.join(directory, "assets/pipe.png")]).status,
        ).toBe(0);
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics[0]?.message).toContain("regular file");
      },
    ),
);

test("image dependencies cannot be overwritten by an export", async () =>
  withTable([row], async (filename, directory) => {
    const result = await compileReport(filename);
    const image = path.join(directory, "assets/field-notebook.png");
    expect(result.dependencies.has(image)).toBe(true);
    await expect(
      writeReport(image, "wrong", result.dependencies),
    ).rejects.toThrow();
  }));

test("caps attempted image watches, including missing files", async () =>
  withTable(
    Array.from({ length: limits.imageFiles + 1 }, (_, i) => ({
      ...row,
      image: `./assets/missing-${i}.png`,
    })),
    async (filename, directory) => {
      const result = await compileReport(filename);
      expect(result.report).toBeUndefined();
      expect(
        result.diagnostics.some((d) =>
          d.message.includes("At most 64 local image references"),
        ),
      ).toBe(true);
      expect(
        result.dependencies.has(
          path.join(directory, `assets/missing-${limits.imageFiles}.png`),
        ),
      ).toBe(false);
    },
  ));

test("JSON and image bytes share the compilation resource budget", async () =>
  withTable([row], async (filename, directory) => {
    const jsonBytes = (await readFile(path.join(directory, "data.json")))
      .length;
    const imageBytes = (
      await readFile(path.join(directory, "assets/field-notebook.png"))
    ).length;
    const diagnostics = new Diagnostics(filename);
    const report = parseReport(source, "Budget", diagnostics);
    const resolver = new DataResolver(
      directory,
      diagnostics,
      new Set([filename]),
      limits.totalBytes - jsonBytes - imageBytes + 1,
    );
    await resolver.resolve(report.blocks);
    expect(
      diagnostics.sorted().some((d) => d.message.includes("size limit")),
    ).toBe(true);
    expect(resolver.images.embedded.size).toBe(0);
  }));

for (const data of [
  [[1]],
  ["1"],
  [true],
  [{ value: 1 }],
  Array.from({ length: limits.sparklinePoints + 1 }, () => 1),
])
  test(`rejects an invalid or oversized sparkline: ${JSON.stringify(data).slice(0, 40)}`, async () =>
    withTable([{ ...row, trend: data }], async (filename) =>
      expect((await compileReport(filename)).report).toBeUndefined(),
    ));

test("sequences require explicit sparkline declarations on every consuming table, including cache hits", async () => {
  const scalar = '::table{data="./data.json"}';
  for (const markdown of [
    scalar,
    source + "\n\n" + scalar,
    scalar + "\n\n" + source,
    '::bar{data="./data.json" x="name" y="score" title="Flat only"}',
  ])
    await withTable(
      [row],
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics.some((d) => d.code === "E_DATA_SHAPE")).toBe(
          true,
        );
      },
      markdown,
    );
});

test("uses a shared per-column scale, preserves gaps and marks isolated samples", async () =>
  withTable(
    [
      { ...row, trend: [0, 10, null, 5, 10] },
      { ...row, trend: [2] },
      { ...row, trend: [null, null] },
    ],
    async (filename) => {
      const result = await compileReport(filename);
      expect(result.diagnostics).toEqual([]);
      const html = renderHtml(result.report!, testAssets);
      expect(html.match(/<path d=/g)).toHaveLength(2);
      expect(html).toContain('cy="23.800"');
      expect(html).toContain("Shared column scale 0 to 10");
      expect(html).toContain("No recorded values");
      expect(html).toContain("View 5 values");
    },
  ));

test("keeps constant, empty and extreme finite sparkline geometry valid", async () =>
  withTable(
    [
      { ...row, trend: [-1e308, 0, 1e308] },
      { ...row, trend: [] },
      { ...row, trend: [5, 5] },
    ],
    async (filename) => {
      const html = renderHtml(
        (await compileReport(filename)).report!,
        testAssets,
      );
      expect(html).not.toContain("NaN");
      expect(html).not.toContain("Infinity");
      expect(html).toContain("No recorded values");
    },
  ));

for (const [reason, data, code] of [
  ["blank alt", { ...row, alt: " " }, "E_TABLE_IMAGE"],
  ["numeric alt", { ...row, alt: 7 }, "E_TABLE_IMAGE"],
  ["oversized alt", { ...row, alt: "a".repeat(1001) }, "E_TABLE_IMAGE"],
  ["numeric image", { ...row, image: 1 }, "E_TABLE_IMAGE"],
  ["scalar sparkline", { ...row, trend: 42 }, "E_DATA_TYPE"],
] as const)
  test(`rejects ${reason} with a column location`, async () =>
    withTable([data], async (filename) => {
      const result = await compileReport(filename);
      expect(result.report).toBeUndefined();
      expect(result.diagnostics[0]?.code).toBe(code);
    }));

test("rejects missing/non-scalar/mixed sort keys and incompatible column properties", async () => {
  await withTable(
    [
      { ...row, score: "one" },
      { ...row, score: 2 },
    ],
    async (filename) =>
      expect((await compileReport(filename)).diagnostics[0]?.code).toBe(
        "E_TABLE_SORT",
      ),
  );
  await withTable([{ ...row, score: [2] }], async (filename) =>
    expect((await compileReport(filename)).report).toBeUndefined(),
  );
  for (const declaration of [
    '::column{field="image" kind="image"}',
    '::column{field="image" kind="image" alt="alt" format="number"}',
    '::column{field="image" kind="image" alt="image"}',
    '::column{field="image" kind="image" alt="alt" sortBy="image"}',
    '::column{field="name" alt="alt"}',
    '::column{field="name" sortBy="score"}',
    '::column{field="trend" kind="sparkline" semantics="higher-is-better"}',
    '::column{field="trend" kind="sparkline" sign="always"}',
    '::column{field="name" kind="script"}',
  ])
    await withReport(
      ':::table{data="./data.json"}\n' + declaration + "\n:::",
      {},
      async (filename) => {
        expect(
          (await compileReport(filename)).diagnostics.some(
            (d) => d.code === "E_PROP_VALUE",
          ),
        ).toBe(true);
      },
    );
});

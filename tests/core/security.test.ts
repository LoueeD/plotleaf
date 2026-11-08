import { expect, test } from "bun:test";
import {
  link,
  symlink,
  writeFile,
  readFile,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { compileReport } from "../../src/compiler/compile.js";
import { renderHtml } from "../../src/render/html.js";
import { writeReport } from "../../src/export.js";
import { withReport, testAssets } from "./helpers.js";

for (const source of [
  "<script>globalThis.pwned=1</script>",
  "[unsafe](javascript:alert%281%29)",
  "![image](https://example.com/tracker.png)",
  '<iframe src="https://example.com"></iframe>',
])
  test(`rejects active report content: ${source}`, async () =>
    withReport(source, {}, async (filename) => {
      expect((await compileReport(filename)).report).toBeUndefined();
    }));

for (const reference of [
  "../outside.json",
  "/etc/passwd",
  "https://example.com/data.json",
  "./.secrets/data.json",
  "./%2e%2e/data.json",
  ".env",
  "C:\\secrets.json",
])
  test(`contains local references: ${reference}`, async () =>
    withReport(
      `::table{data="${reference.replaceAll("\\", "\\\\")}"}`,
      {},
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(
          result.diagnostics.some(
            (d) => d.code === "E_DATA_PATH" || d.code === "E_DIRECTIVE_SYNTAX",
          ),
        ).toBe(true);
      },
    ));

test("rejects symlink escapes and retains missing references for preview recovery", async () =>
  withReport('::table{data="./data.json"}', {}, async (filename, directory) => {
    const missing = await compileReport(filename);
    expect(missing.dependencies.has(path.join(directory, "data.json"))).toBe(
      true,
    );
    const outside = await mkdtemp(
      path.join(path.dirname(directory), "plotleaf-outside-"),
    );
    await symlink(
      outside,
      path.join(directory, "outside"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await writeFile(filename, '::table{data="./outside/data.json"}');
    await writeFile(path.join(outside, "data.json"), "[]");
    try {
      expect(
        (await compileReport(filename)).diagnostics.some(
          (d) => d.code === "E_DATA_PATH",
        ),
      ).toBe(true);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  }));

test("blocks reserved keys, nested cells, Infinity and non-array datasets", async () => {
  for (const json of [
    '[{"__proto__":"bad"}]',
    '[{"constructor":1}]',
    '[{"value":{"nested":true}}]',
    '[{"value":1e999}]',
    '{"value":1}',
  ]) {
    await withReport(
      '::table{data="./data.json"}',
      { "data.json": json },
      async (filename) =>
        expect((await compileReport(filename)).report).toBeUndefined(),
    );
  }
});

test("treats script-terminating data as text and excludes unused fields/paths", async () =>
  withReport(
    '::bar{data="./data.json" x="category" y="value" title="Unsafe strings"}\n\n:::table{data="./data.json"}\n::column{field="category"}\n::column{field="value"}\n:::',
    {
      "data.json": [
        {
          category: "</script><script>globalThis.PWNED=1</script>",
          value: 2,
          unused: "PRIVATE_UNUSED_SENTINEL",
        },
      ],
    },
    async (filename, directory) => {
      const compilation = await compileReport(filename);
      expect(compilation.report).toBeDefined();
      const first = renderHtml(compilation.report!, testAssets);
      const second = renderHtml(
        (await compileReport(filename)).report!,
        testAssets,
      );
      expect(first).toBe(second);
      expect(first).toContain("\\u003c/script\\u003e");
      expect(first).not.toContain("<script>globalThis.PWNED");
      expect(first).not.toContain("PRIVATE_UNUSED_SENTINEL");
      expect(first).not.toContain(directory);
      expect(first).not.toContain("data.json");
    },
  ));

test("rejects oversized data before parsing and never truncates", async () =>
  withReport('::table{data="./data.json"}', {}, async (filename, directory) => {
    await writeFile(
      path.join(directory, "data.json"),
      Buffer.alloc(10 * 1024 ** 2 + 1, 32),
    );
    const result = await compileReport(filename);
    expect(result.report).toBeUndefined();
    expect(result.diagnostics[0]?.message).toContain("size limit");
  }));

test.skipIf(process.platform === "win32")(
  "rejects special files without blocking on a named pipe",
  async () => {
    await withReport(
      '::table{data="./pipe.json"}',
      {},
      async (filename, directory) => {
        expect(
          spawnSync("mkfifo", [path.join(directory, "pipe.json")]).status,
        ).toBe(0);
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics[0]?.message).toContain("regular file");
      },
    );
  },
);

test("will not overwrite an input via symlink/hardlink and writes complete outputs", async () =>
  withReport("# Safe report", {}, async (filename, directory) => {
    const alias = path.join(directory, "alias.html");
    await symlink(filename, alias, "file");
    await expect(
      writeReport(alias, "replacement", new Set([filename])),
    ).rejects.toThrow("symbolic-link");
    const hard = path.join(directory, "hard.html");
    await link(filename, hard);
    await expect(
      writeReport(hard, "replacement", new Set([filename])),
    ).rejects.toThrow("hard link");
    expect(await readFile(filename, "utf8")).toBe("# Safe report");
    const output = path.join(directory, "nested", "report.html");
    await writeReport(output, "first complete output", new Set([filename]));
    await writeReport(output, "second complete output", new Set([filename]));
    expect(await readFile(output, "utf8")).toBe("second complete output");
  }));

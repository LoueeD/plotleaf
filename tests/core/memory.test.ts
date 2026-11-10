import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { compileMemory } from "../../src/compiler/memory.js";
import { compileReport } from "../../src/compiler/compile.js";
import { renderHtml } from "../../src/render/html.js";
import { renderHtml as renderPortable } from "../../src/render/document.js";
import { root, testAssets, withReport } from "./helpers.js";

for (const name of ["storefront", "adoption", "onboarding"])
  test(`memory compilation matches filesystem output: ${name}`, async () => {
    const filename = path.join(root, "examples", name, "report.md");
    const disk = await compileReport(filename);
    const files: Record<string, string> = {};
    for (const file of disk.dependencies)
      if (file.endsWith(".json"))
        files[path.basename(file)] = await readFile(file, "utf8");
    const memory = await compileMemory({
      markdown: await readFile(filename, "utf8"),
      files,
    });
    expect(memory.diagnostics).toEqual([]);
    expect(memory.report).toEqual(disk.report);
    const hashes = new Map<string, string>();
    const { inlineScript } = await import("../../src/render/document.js");
    for (const script of [testAssets.base, testAssets.charts]) {
      const text = inlineScript(script);
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(text),
      );
      hashes.set(text, Buffer.from(digest).toString("base64"));
    }
    expect(
      renderPortable(memory.report!, testAssets, (code) => hashes.get(code)!),
    ).toBe(renderHtml(disk.report!, testAssets));
  });

for (const reference of [
  "../private.json",
  "https://example.com/a.json",
  "/etc/a.json",
  ".private/a.json",
  "./%2e%2e/a.json",
  "C:\\a.json",
])
  test(`memory input rejects external paths: ${reference}`, async () => {
    const result = await compileMemory({
      markdown: `::table{data="${reference}"}`,
      files: { "a.json": "[]" },
    });
    expect(result.report).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe("E_DATA_PATH");
  });

test("memory validation shares CLI data, directive and hostile-input diagnostics", async () => {
  const fixtures = [
    { markdown: '::metric{value="invalid"}', data: [] },
    {
      markdown: '::line{data="./data.json" x="x" y="y" title="Trend"}',
      data: [{ x: 1, y: "2" }],
    },
    {
      markdown: '::table{data="./data.json"}',
      data: [{ value: { nested: true } }],
    },
    { markdown: "<script>alert(1)</script>", data: [] },
  ];
  for (const fixture of fixtures)
    await withReport(
      fixture.markdown,
      { "data.json": fixture.data },
      async (filename) => {
        const disk = await compileReport(filename);
        const memory = await compileMemory({
          markdown: fixture.markdown,
          files: { "data.json": JSON.stringify(fixture.data) },
        });
        expect(memory.report).toBeUndefined();
        expect(
          memory.diagnostics.map(({ code, line, column, message }) => ({
            code,
            line,
            column,
            message,
          })),
        ).toEqual(
          disk.diagnostics.map(({ code, line, column, message }) => ({
            code,
            line,
            column,
            message,
          })),
        );
      },
    );
});

test("memory reports retain shared-scale sparklines and exclude unused source fields", async () => {
  const result = await compileMemory({
    markdown:
      ':::table{data="./data.json"}\n::column{field="name"}\n::column{field="trend" kind="sparkline"}\n:::',
    files: {
      "data.json": JSON.stringify([
        { name: "One", trend: [1, null, 3], secret: "UNUSED_SECRET" },
        { name: "Two", trend: [2, 4, 6], secret: "UNUSED_SECRET" },
      ]),
    },
  });
  expect(result.diagnostics).toEqual([]);
  const html = renderPortable(result.report!, testAssets, (s) =>
    createHash("sha256").update(s).digest("base64"),
  );
  expect(html).toContain("Shared column scale 1 to 6");
  expect(html).not.toContain("UNUSED_SECRET");
  expect(html).toContain("sparkline-chart");
});

test("memory compiler bounds total input and provides an explicit image limitation", async () => {
  for (const project of [
    { markdown: "x".repeat(1024 ** 2 + 1), files: {} },
    {
      markdown: "# Report",
      files: Object.fromEntries(
        Array.from({ length: 17 }, (_, i) => [`${i}.json`, "[]"]),
      ),
    },
  ]) {
    const result = await compileMemory(project);
    expect(result.report).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe("E_PLAYGROUND_LIMIT");
  }
  const result = await compileMemory({
    markdown:
      ':::table{data="./data.json"}\n::column{field="image" kind="image" alt="alt"}\n:::',
    files: { "data.json": '[{"image":"./photo.png","alt":"Photo"}]' },
  });
  expect(result.report).toBeUndefined();
  expect(result.diagnostics[0]?.message).toContain(
    "Use the CLI for local PNG/JPEG",
  );
});

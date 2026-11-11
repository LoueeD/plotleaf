import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileMemory } from "../../src/compiler/memory.js";
import { renderContent } from "../../src/render/content.js";
import { root } from "./helpers.js";

test("prepared subtotals retain group identity, scope and projected fields", async () => {
  const raw = await readFile(
    path.join(root, "tests/fixtures/m6/prepared-subtotals.json"),
    "utf8",
  );
  const result = await compileMemory({
    markdown:
      ':::table{data="./groups.json" title="Orders" prepared="grouped"}\n::column{field="product"}\n::column{field="orders"}\n:::',
    files: { "groups.json": raw },
  });
  expect(result.diagnostics).toEqual([]);
  expect(result.report).toBeDefined();
  const html = renderContent(result.report!).html;
  expect(html).toContain("All regions, January–March");
  expect(html).toContain("data-plotleaf-group-header");
  expect(html).toContain("data-plotleaf-subtotal");
  expect(html).toContain("North subtotal");
  expect(html).toContain("South subtotal");
  expect((html.match(/<tbody>/g) ?? []).length).toBe(2);
});
test("group bundles require explicit opt-in and valid scope", async () => {
  const raw = await readFile(
    path.join(root, "tests/fixtures/m6/prepared-subtotals.json"),
    "utf8",
  );
  const normal = await compileMemory({
    markdown: '::table{data="./groups.json"}',
    files: { "groups.json": raw },
  });
  expect(normal.diagnostics.some((item) => item.code === "E_DATA_SHAPE")).toBe(
    true,
  );
  const invalid = JSON.parse(raw);
  invalid.scope = "";
  const grouped = await compileMemory({
    markdown: '::table{data="./groups.json" prepared="grouped"}',
    files: { "groups.json": JSON.stringify(invalid) },
  });
  expect(
    grouped.diagnostics.some((item) => item.code === "E_TABLE_GROUPS"),
  ).toBe(true);
});

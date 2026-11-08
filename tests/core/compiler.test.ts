import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileReport } from "../../src/compiler/compile.js";
import { componentSpec } from "../../src/compiler/registry.js";
import { renderHtml } from "../../src/render/html.js";
import { formatValue } from "../../src/shared/format.js";
import { withReport, testAssets, root } from "./helpers.js";

describe("report compiler", () => {
  test("compiles the prepared storefront example with all MVP components", async () => {
    const result = await compileReport(
      path.join(root, "examples/storefront/report.md"),
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.report?.metadata.title).toBe("Storefront Overview");
    const html = renderHtml(result.report!, testAssets);
    expect(html).toContain("12,480");
    expect(html).toContain("3.1%");
    expect(html).toContain("US$824,160");
    expect(html).not.toContain("US$824,160.00");
    expect(html).toContain("+32.8%");
    expect(html).toContain('data-columns="4"');
    expect(html).toContain('data-plotleaf-chart=""');
    expect(html).toContain("View data");
    expect(html).not.toContain("/__plotleaf/events");
  });

  test("currency formatting omits zero decimals while retaining meaningful cents", () => {
    expect(formatValue(824160, "currency:USD")).toBe("US$824,160");
    expect(formatValue(824160.5, "currency:USD")).toBe("US$824,160.50");
    expect(formatValue(12, "currency:GBP")).toBe("£12");
    expect(formatValue(12.5, "currency:GBP")).toBe("£12.50");
    expect(formatValue(12.34, "currency:GBP")).toBe("£12.34");
    expect(formatValue(0, "currency:USD")).toBe("US$0");
    expect(formatValue(-12, "currency:USD")).toBe("-US$12");
    expect(formatValue(-12.5, "currency:USD")).toBe("-US$12.50");
    expect(formatValue(824160, "currency:USD")).toBe("US$824,160");
  });

  test("positions property diagnostics and rejects unknown props", async () =>
    withReport(
      '# Example\n\n::metric{label="Teams" value="many" mystery="1"}',
      {},
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics[0]).toMatchObject({
          line: 3,
          column: 1,
          code: "E_PROP_VALUE",
          severity: "error",
        });
        expect(
          result.diagnostics.some((d) => d.message.includes("mystery")),
        ).toBe(true);
      },
    ));

  for (const [source, code] of [
    ['::metric{label="Teams" value="1"', "E_DIRECTIVE_SYNTAX"],
    ["::metric{value={1+2}}", "E_DIRECTIVE_SYNTAX"],
    [':::grid\n::metric{label="Teams" value="1"}', "E_DIRECTIVE_CLOSE"],
    ['::metric{label="Teams" value="1" value="2"}', "E_PROP_DUPLICATE"],
    ['::mystery{value="1"}', "E_COMPONENT_UNKNOWN"],
    ["::toString", "E_COMPONENT_UNKNOWN"],
    ['::column{field="teams"}', "E_COMPONENT_CONTEXT"],
    ['::metric[label]{label="Teams" value="1"}', "E_COMPONENT_LABEL"],
    ['A :metric{label="Teams" value="1"} inline.', "E_COMPONENT_CONTEXT"],
    ['::metric{label="Teams" value="1" sentiment="positive"}', "E_PROP_VALUE"],
  ])
    test(`rejects ${code}: ${source}`, async () =>
      withReport(source!, {}, async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics.some((d) => d.code === code)).toBe(true);
      }));

  test("keeps example directives inert inside code fences", async () =>
    withReport(
      "```md\n::metric{value={anything()}}\n```",
      {},
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeDefined();
        expect(result.diagnostics).toEqual([]);
      },
    ));

  test("supports table containers inside a longer grid fence", async () =>
    withReport(
      '::::grid\n:::table{data="./data.json"}\n::column{field="value" format="number"}\n:::\n::::',
      { "data.json": [{ value: 1 }] },
      async (filename) => {
        expect((await compileReport(filename)).diagnostics).toEqual([]);
      },
    ));

  test("preserves Markdown reference links across component boundaries", async () =>
    withReport(
      '[Docs][docs]\n\n::metric{label="Teams" value="1"}\n\n[docs]: https://example.com',
      {},
      async (filename) => {
        const result = await compileReport(filename);
        expect(renderHtml(result.report!, testAssets)).toContain(
          'href="https://example.com"',
        );
      },
    ));

  test("uses title metadata and rejects aliases or extra metadata keys", async () => {
    await withReport(
      "---\ntitle: A prepared report\n---\nHello.",
      {},
      async (filename) =>
        expect((await compileReport(filename)).report?.metadata.title).toBe(
          "A prepared report",
        ),
    );
    for (const metadata of [
      "title: &t Report\ndescription: *t",
      "title: One\ntitle: Two",
      "title: Report\nscript: execute",
      "title: !unknown payload",
    ]) {
      await withReport(
        `---\n${metadata}\n---\n# Report`,
        {},
        async (filename) => {
          const result = await compileReport(filename);
          expect(result.report).toBeUndefined();
          expect(
            result.diagnostics.some((d) => d.code === "E_FRONTMATTER"),
          ).toBe(true);
        },
      );
    }
  });

  test("renders valid empty datasets without inventing values", async () =>
    withReport(
      '::line{data="./empty.json" x="date" y="value" title="Empty"}',
      { "empty.json": [] },
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeDefined();
        expect(result.diagnostics).toMatchObject([
          { code: "W_DATA_EMPTY", severity: "warning" },
        ]);
        expect(renderHtml(result.report!, testAssets)).toContain(
          "No data to display.",
        );
      },
    ));

  test("keeps line gaps but rejects bar nulls and numeric strings", async () => {
    const files = {
      "data.json": [
        { date: "2026-11-01", value: 4 },
        { date: "2026-11-02", value: null },
      ],
    };
    await withReport(
      '::area{data="./data.json" x="date" y="value" xType="date" title="Gaps"}',
      files,
      async (filename) =>
        expect((await compileReport(filename)).report).toBeDefined(),
    );
    for (const rows of [[{ x: "A", y: null }], [{ x: "A", y: "4" }]]) {
      await withReport(
        '::bar{data="./data.json" x="x" y="y" title="Invalid"}',
        { "data.json": rows },
        async (filename) =>
          expect(
            (await compileReport(filename)).diagnostics.some(
              (d) => d.code === "E_DATA_TYPE",
            ),
          ).toBe(true),
      );
    }
  });

  test("requires real zoned/date-only values, unique x and sorted time data", async () => {
    for (const dates of [
      ["2026-02-30"],
      ["2026-11-01T10:00:00"],
      ["2026-11-01", "2026-11-01"],
      ["2026-11-02", "2026-11-01"],
    ]) {
      await withReport(
        '::line{data="./data.json" x="date" y="value" xType="date" title="Dates"}',
        { "data.json": dates.map((date) => ({ date, value: 1 })) },
        async (filename) =>
          expect((await compileReport(filename)).report).toBeUndefined(),
      );
    }
  });

  test("validates every row and reports the missing field with a repair hint", async () =>
    withReport(
      '::bar{data="./data.json" x="category" y="count" title="Counts"}',
      {
        "data.json": [
          { category: "A", count: 1 },
          { category: "B", counts: 2 },
        ],
      },
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics[0]).toMatchObject({ code: "E_DATA_FIELD" });
        expect(result.diagnostics[0]?.message).toContain("row 2");
        expect(result.diagnostics[0]?.hint).toContain("counts");
      },
    ));

  test("rejects inconsistent/mixed table fields, duplicate columns and text formatting", async () => {
    const reports: [string, unknown][] = [
      ['::table{data="./data.json"}', [{ value: 1 }, { other: 2 }]],
      ['::table{data="./data.json"}', [{ value: 1 }, { value: "2" }]],
      [
        ':::table{data="./data.json"}\n::column{field="value"}\n::column{field="value"}\n:::',
        [{ value: 1 }],
      ],
      [
        ':::table{data="./data.json"}\n::column{field="value" format="percent"}\n:::',
        [{ value: "text" }],
      ],
    ];
    for (const [source, rows] of reports)
      await withReport(source, { "data.json": rows }, async (filename) =>
        expect((await compileReport(filename)).report).toBeUndefined(),
      );
  });

  test("specification is generated from the same registry and does not drift", async () => {
    const spec = JSON.parse(
      await readFile(path.join(root, "schema/components.json"), "utf8"),
    );
    expect(spec).toEqual(componentSpec());
    expect(Object.keys(spec.components)).toEqual([
      "grid",
      "metric",
      "line",
      "area",
      "bar",
      "table",
      "column",
      "callout",
    ]);
  });
});

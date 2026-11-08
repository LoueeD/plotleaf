import { describe, expect, test } from "bun:test";
import path from "node:path";
import { compileReport } from "../../src/compiler/compile.js";
import { renderHtml } from "../../src/render/html.js";
import { renderContent } from "../../src/render/content.js";
import { limits } from "../../src/shared/limits.js";
import { root, testAssets, withReport } from "./helpers.js";

const donut =
  '::donut{data="./data.json" category="plan" value="teams" title="By plan"}';
const funnel =
  '::funnel{data="./data.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="By stage"}';
const stage = {
  stage: "Activated",
  teams: 25,
  baseline: 100,
  share: 0.25,
  status: "below-target",
};

describe("donut and funnel contracts", () => {
  test("compiles the fictional onboarding composition and keeps prepared denominators distinct", async () => {
    const result = await compileReport(
      path.join(root, "examples/onboarding/report.md"),
    );
    expect(result.diagnostics).toEqual([]);
    const content = renderContent(result.report!);
    expect(content.payload.charts.map((chart) => chart.kind)).toEqual([
      "area",
      "donut",
    ]);
    expect(content.html).toContain('value="0.3029126213592233"');
    expect(content.html).toContain("41.2k");
    expect(content.html).toContain("10.3%");
    expect(content.html).toContain("At risk");
  });

  test("preserves donut category order and zeros while exporting only selected fields", async () =>
    withReport(
      donut,
      {
        "data.json": [
          { plan: "Team", teams: 2, unused: "PRIVATE_UNUSED_SENTINEL" },
          { plan: "Free", teams: 0, unused: "PRIVATE_UNUSED_SENTINEL" },
          { plan: "Pro", teams: 8, unused: "PRIVATE_UNUSED_SENTINEL" },
        ],
      },
      async (filename, directory) => {
        const first = await compileReport(filename);
        const content = renderContent(first.report!);
        expect(content.payload.charts[0]).toMatchObject({
          kind: "donut",
          rows: [
            ["Team", 2],
            ["Free", 0],
            ["Pro", 8],
          ],
        });
        const html = renderHtml(first.report!, testAssets);
        expect(html).toContain("20%");
        expect(html).toContain("80%");
        expect(html).not.toContain("PRIVATE_UNUSED_SENTINEL");
        expect(html).not.toContain(directory);
        expect(html).toBe(
          renderHtml((await compileReport(filename)).report!, testAssets),
        );
      },
    ));

  for (const rows of [[], [{ plan: "Pro", teams: 0 }]])
    test(`never invents slices for ${rows.length ? "all-zero" : "empty"} donut data`, async () =>
      withReport(donut, { "data.json": rows }, async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeDefined();
        const html = renderHtml(result.report!, testAssets);
        expect(html).toContain(
          rows.length
            ? "No non-zero values to display."
            : "No data to display.",
        );
        expect(html).not.toContain("/* chart runtime */");
        expect(html).not.toContain('id="plotleaf-data"');
        if (rows.length) expect(html).toContain("Pro");
      }));

  for (const [reason, rows, code] of [
    ["negative values", [{ plan: "Pro", teams: -1 }], "E_DATA_TYPE"],
    ["null values", [{ plan: "Pro", teams: null }], "E_DATA_TYPE"],
    ["numeric strings", [{ plan: "Pro", teams: "12" }], "E_DATA_TYPE"],
    [
      "duplicate categories",
      [
        { plan: "Pro", teams: 1 },
        { plan: "Pro", teams: 2 },
      ],
      "E_DATA_ORDER",
    ],
    ["blank labels", [{ plan: " ", teams: 1 }], "E_DATA_TYPE"],
    ["non-string labels", [{ plan: 12, teams: 1 }], "E_DATA_TYPE"],
    ["oversized labels", [{ plan: "p".repeat(1001), teams: 1 }], "E_DATA_TYPE"],
    [
      "overflowing totals",
      [
        { plan: "Pro", teams: 1e308 },
        { plan: "Free", teams: 1e308 },
      ],
      "E_DATA_VALUE",
    ],
    ["missing fields", [{ plan: "Pro" }], "E_DATA_FIELD"],
    [
      "too many categories",
      Array.from({ length: limits.donutSlices + 1 }, (_, i) => ({
        plan: `Plan ${i}`,
        teams: 1,
      })),
      "E_DATA_LIMIT",
    ],
  ] as const)
    test(`rejects donut ${reason} with a repairable source diagnostic`, async () =>
      withReport(
        `# Report\n\n${donut}`,
        { "data.json": rows },
        async (filename) => {
          const result = await compileReport(filename);
          expect(result.report).toBeUndefined();
          expect(result.diagnostics[0]).toMatchObject({
            code,
            line: 3,
            column: 1,
          });
          expect(result.diagnostics[0]!.hint).toBeTruthy();
        },
      ));

  test("renders funnel shares, explicit status and full accessible counts without the chart runtime", async () =>
    withReport(
      funnel,
      { "data.json": [{ ...stage, unused: "PRIVATE_UNUSED_SENTINEL" }] },
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.diagnostics).toEqual([]);
        const html = renderHtml(result.report!, testAssets);
        expect(html).toContain('<meter min="0" max="1" value="0.25"');
        expect(html).toContain("25 of 100, Below target");
        expect(html).toContain("Below target");
        expect(html).not.toContain("/* chart runtime */");
        expect(html).not.toContain("PRIVATE_UNUSED_SENTINEL");
      },
    ));

  test("accepts rounded prepared shares and preserves per-stage denominators and source order", async () =>
    withReport(
      funnel.replace(' status="status"', ""),
      {
        "data.json": [
          { stage: "Step conversion", teams: 1, baseline: 3, share: 0.333 },
          { stage: "Baseline conversion", teams: 1, baseline: 10, share: 0.1 },
        ],
      },
      async (filename) => {
        const result = await compileReport(filename);
        expect(result.diagnostics).toEqual([]);
        const html = renderHtml(result.report!, testAssets);
        expect(html).toContain("33.3%");
        expect(html.indexOf("Step conversion")).toBeLessThan(
          html.indexOf("Baseline conversion"),
        );
        expect(html).not.toContain("On target");
        expect(html).toContain('data-status="neutral"');
      },
    ));

  for (const [reason, data, code] of [
    ["zero denominator", { ...stage, baseline: 0 }, "E_DATA_VALUE"],
    ["negative denominator", { ...stage, baseline: -1 }, "E_DATA_VALUE"],
    ["null denominator", { ...stage, baseline: null }, "E_DATA_VALUE"],
    ["value beyond total", { ...stage, teams: 101 }, "E_DATA_VALUE"],
    ["negative value", { ...stage, teams: -1 }, "E_DATA_TYPE"],
    ["percentage instead of ratio", { ...stage, share: 25 }, "E_DATA_VALUE"],
    ["null share", { ...stage, share: null }, "E_DATA_VALUE"],
    ["inconsistent share", { ...stage, share: 0.5 }, "E_DATA_VALUE"],
    ["unknown status", { ...stage, status: "toString" }, "E_DATA_VALUE"],
    [
      "missing status",
      { stage: "Activated", teams: 25, baseline: 100, share: 0.25 },
      "E_DATA_FIELD",
    ],
  ] as const)
    test(`rejects funnel ${reason}`, async () =>
      withReport(funnel, { "data.json": [data] }, async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics[0]).toMatchObject({ code, line: 1 });
      }));

  test("rejects duplicate/oversized funnel stages without silently truncating", async () => {
    for (const rows of [
      [stage, stage],
      Array.from({ length: limits.funnelStages + 1 }, (_, i) => ({
        ...stage,
        stage: `Stage ${i}`,
      })),
    ]) {
      await withReport(funnel, { "data.json": rows }, async (filename) => {
        expect((await compileReport(filename)).report).toBeUndefined();
      });
    }
  });

  test("requires distinct field references and literal, known properties", async () => {
    for (const source of [
      donut.replace('value="teams"', 'value="plan"'),
      funnel.replace('share="share"', 'share="teams"'),
      funnel.replace('total="baseline" ', ""),
      donut.replace('title="By plan"', 'title="By plan" options="unsafe"'),
    ])
      await withReport(source, {}, async (filename) => {
        const result = await compileReport(filename);
        expect(result.report).toBeUndefined();
        expect(result.diagnostics.some((d) => d.code === "E_PROP_VALUE")).toBe(
          true,
        );
      });
  });

  test("treats hostile category/stage labels as inert text in HTML and payloads", async () => {
    const hostile = '</script><img src=x onerror="globalThis.PWNED=1">';
    for (const [source, rows] of [
      [donut, [{ plan: hostile, teams: 1 }]],
      [funnel, [{ ...stage, stage: hostile }]],
    ] as const)
      await withReport(source, { "data.json": rows }, async (filename) => {
        const result = await compileReport(filename);
        const html = renderHtml(result.report!, testAssets);
        expect(html).not.toContain(hostile);
        expect(html).toContain("globalThis.PWNED=1");
        expect(html).toMatch(/(?:&lt;|&#x3C;)img/);
      });
  });
});

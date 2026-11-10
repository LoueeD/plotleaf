import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileMemory } from "../../src/compiler/memory.js";
import { compileReport } from "../../src/compiler/compile.js";
import { renderHtml } from "../../src/render/html.js";
import { root, testAssets, withReport } from "./helpers.js";

const source = '::explore{data="./views.json" title="Prepared regions"}';
function fixture() {
  return {
    inputs: [
      {
        id: "region",
        type: "select",
        label: "Region",
        default: "all",
        options: [
          { value: "all", label: "All regions" },
          { value: "emea", label: "EMEA" },
        ],
      },
    ],
    views: [
      {
        id: "all",
        label: "All regions",
        when: { region: "all" },
        markdown:
          '::metric{label="Orders" value="100"}\n\n::table{data="./rows.json"}',
        datasets: { "rows.json": [{ region: "all", count: 100 }] },
      },
      {
        id: "emea",
        label: "EMEA",
        when: { region: "emea" },
        markdown: '::metric{label="Orders" value="40"}',
        datasets: {},
      },
    ],
  };
}
const memory = (bundle: unknown, markdown = source) =>
  compileMemory({ markdown, files: { "views.json": JSON.stringify(bundle) } });

test("scoped prepared views compile identically through filesystem and memory, with deterministic export", async () => {
  const bundle = fixture();
  const inMemory = await memory(bundle);
  expect(inMemory.diagnostics).toEqual([]);
  await withReport(source, { "views.json": bundle }, async (filename) => {
    const disk = await compileReport(filename);
    expect(inMemory.report).toEqual(disk.report);
    const html = renderHtml(disk.report!, testAssets);
    expect(html).toBe(renderHtml(inMemory.report!, testAssets));
    expect(html).toContain("data-plotleaf-explore");
    expect(html).toContain('data-plotleaf-view="emea"');
    expect(html).toContain("hidden");
    expect(html).toContain("disabled");
    expect(html).not.toContain("plotleaf-inline:");
  });
});
for (const [name, mutate] of [
  ["duplicate input IDs", (v: any) => v.inputs.push(v.inputs[0])],
  ["duplicate views", (v: any) => v.views.push(v.views[0])],
  [
    "duplicate conditions",
    (v: any) => v.views.push({ ...v.views[0], id: "another" }),
  ],
  [
    "duplicate domain values",
    (v: any) => v.inputs[0].options.push(v.inputs[0].options[0]),
  ],
  ["unknown input", (v: any) => (v.views[0].when.extra = "x")],
  ["missing input", (v: any) => (v.views[0].when = {})],
  ["unsupported default", (v: any) => (v.inputs[0].default = "unknown")],
  ["wrong value type", (v: any) => (v.views[0].when.region = 1)],
  ["missing default view", (v: any) => v.views.shift()],
  ["extra attributes", (v: any) => (v.inputs[0].onclick = "alert(1)")],
  ["unsupported control", (v: any) => (v.inputs[0].type = "javascript")],
  [
    "invalid date",
    (v: any) =>
      (v.inputs = [
        {
          id: "period",
          label: "Period",
          type: "date-range",
          default: { start: "2026-02-30", end: "2026-03-01" },
          options: [],
        },
      ]),
  ],
  [
    "too many views",
    (v: any) =>
      (v.views = Array.from({ length: 33 }, (_, i) => ({
        ...v.views[0],
        id: `view-${i}`,
      }))),
  ],
] as const)
  test(`exploration rejects ${name}`, async () => {
    const bundle = fixture();
    mutate(bundle);
    const result = await memory(bundle);
    expect(result.report).toBeUndefined();
    expect(
      result.diagnostics.some((item) => item.code === "E_EXPLORE_SCHEMA"),
    ).toBe(true);
  });

test("nested explorations and malformed/raw HTML in view Markdown produce scoped diagnostics", async () => {
  for (const markdown of [
    '::explore{data="./views.json" title="Nested"}',
    "<script>alert(1)</script>",
    '::metric{label="Bad" value="oops"}',
  ]) {
    const bundle = fixture();
    bundle.views[0]!.markdown = markdown;
    const result = await memory(bundle);
    expect(result.report).toBeUndefined();
    expect(
      result.diagnostics.some((item) => item.message.includes("all")),
    ).toBe(true);
  }
});

test("all prepared datasets use existing validators, including unused fields and projection", async () => {
  const bundle = fixture();
  bundle.views[0]!.markdown =
    ':::table{data="./rows.json"}\n::column{field="count"}\n:::';
  bundle.views[0]!.datasets["rows.json"] = [
    { count: 100, region: "DO_NOT_EXPORT" },
  ];
  const result = await memory(bundle);
  expect(result.diagnostics).toEqual([]);
  expect(renderHtml(result.report!, testAssets)).not.toContain("DO_NOT_EXPORT");
  const invalid = fixture();
  (invalid.views[0]!.datasets["rows.json"]![0] as any).constructor = "hostile";
  const bad = await memory(invalid);
  expect(bad.report).toBeUndefined();
  expect(bad.diagnostics.some((item) => item.code === "E_EXPLORE_KEY")).toBe(
    true,
  );
});

test("inline view files never bypass local path policy for fallback references", async () => {
  const bundle = fixture();
  bundle.views[0]!.markdown = '::table{data="../private.json"}';
  const result = await memory(bundle);
  expect(result.report).toBeUndefined();
  expect(result.diagnostics.some((item) => item.code === "E_DATA_PATH")).toBe(
    true,
  );
});

test("expanded content is bounded and hostile text remains inert", async () => {
  const bundle = fixture();
  bundle.views[0]!.markdown = Array.from(
    { length: 513 },
    () => '::metric{label="Bounded" value="1"}',
  ).join("\n\n");
  const result = await memory(bundle);
  expect(result.report).toBeUndefined();
  expect(
    result.diagnostics.some((item) => item.code === "E_EXPLORE_LIMIT"),
  ).toBe(true);
  const hostile = fixture();
  hostile.inputs[0]!.label = "</script><img src=x onerror=alert(1)>";
  hostile.views[0]!.label = "</script><img src=x onerror=alert(1)>";
  const safe = await memory(hostile);
  expect(safe.report).toBeDefined();
  const html = renderHtml(safe.report!, testAssets);
  expect(html).toContain("&#x3C;img");
  expect(html).toContain("\\u003cimg");
});

test("real six-control fixture compiles through both adapters", async () => {
  const markdown = await readFile(
    path.join(root, "examples/interactions/report.md"),
    "utf8",
  );
  const files = Object.fromEntries(
    await Promise.all(
      ["regional-views.json", "control-views.json"].map(async (name) => [
        name,
        await readFile(path.join(root, "examples/interactions", name), "utf8"),
      ]),
    ),
  );
  const browser = await compileMemory({ markdown, files });
  const disk = await compileReport(
    path.join(root, "examples/interactions/report.md"),
  );
  expect(browser.report).toEqual(disk.report);
  expect(browser.diagnostics.every((item) => item.severity === "warning")).toBe(
    true,
  );
  expect(
    browser.report!.blocks.filter(
      (block) => block.type === "component" && block.name === "explore",
    ),
  ).toHaveLength(2);
});

test("preflight rejects reserved keys and excessive JSON depth before schema copying", async () => {
  for (const key of ["__proto__", "constructor", "prototype"]) {
    const bundle = fixture();
    (bundle.views[0]!.datasets as Record<string, unknown>)["unused.json"] = [
      JSON.parse(`{"${key}":"blocked"}`),
    ];
    const result = await memory(bundle);
    expect(result.report).toBeUndefined();
    expect(
      result.diagnostics.some((item) => item.code === "E_EXPLORE_KEY"),
    ).toBe(true);
  }
  const bundle = fixture();
  let deep: unknown = {};
  for (let i = 0; i < 35; i++) deep = { child: deep };
  (bundle.views[0]!.datasets as Record<string, unknown>)["unused.json"] = [
    deep,
  ];
  const result = await memory(bundle);
  expect(result.report).toBeUndefined();
  expect(
    result.diagnostics.some((item) => item.code === "E_EXPLORE_LIMIT"),
  ).toBe(true);
});

test("two scopes with identically named inline datasets never share another view’s rows", async () => {
  const first = fixture(),
    second = fixture();
  second.views[0]!.datasets["rows.json"]![0]!.count = 200;
  const result = await compileMemory({
    markdown: source + "\n\n" + source.replace("views.json", "other.json"),
    files: {
      "views.json": JSON.stringify(first),
      "other.json": JSON.stringify(second),
    },
  });
  expect(result.diagnostics).toEqual([]);
  const scopes = result.report!.blocks.filter(
    (block) => block.type === "component" && block.name === "explore",
  );
  expect(
    scopes
      .map((block) =>
        block.type === "component"
          ? block.exploration!.views[0]!.blocks.find(
              (child) => child.type === "component" && child.name === "table",
            )
          : undefined,
      )
      .map((block) =>
        block?.type === "component" ? block.rows?.[0]?.count : undefined,
      ),
  ).toEqual([100, 200]);
});

test("repeated use of large prepared cells cannot bypass the expanded byte budget", async () => {
  const bundle = fixture();
  (
    bundle.views[0]!.datasets["rows.json"]![0] as Record<string, unknown>
  ).count = "x".repeat(512 * 1024);
  bundle.views[0]!.markdown = Array.from(
    { length: 17 },
    () => '::table{data="./rows.json"}',
  ).join("\n\n");
  const result = await memory(bundle);
  expect(result.report).toBeUndefined();
  expect(
    result.diagnostics.some(
      (item) =>
        item.code === "E_EXPLORE_LIMIT" && item.message.includes("8 MiB"),
    ),
  ).toBe(true);
});

test("authored control IDs cannot collide with generated option/date/hint IDs", async () => {
  const bundle = fixture();
  bundle.inputs[0]!.type = "segmented";
  bundle.inputs.push({
    ...bundle.inputs[0]!,
    id: "region-0",
    type: "select",
    label: "Second region",
  });
  for (const view of bundle.views)
    (view.when as Record<string, unknown>)["region-0"] = "all";
  const result = await memory(bundle);
  expect(result.diagnostics).toEqual([]);
  const html = renderHtml(result.report!, testAssets);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("a heading in a hidden view cannot suppress the main report title", async () => {
  const bundle = fixture();
  bundle.views[1]!.markdown = "# Hidden view heading";
  const result = await memory(bundle);
  expect(result.report).toBeDefined();
  expect(renderHtml(result.report!, testAssets)).toContain(">report</h1>");
});

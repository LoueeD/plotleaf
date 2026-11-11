import { expect, test } from "bun:test";
import path from "node:path";
import { compileReport } from "../../src/compiler/compile.js";
import { compileMemory } from "../../src/compiler/memory.js";
import { root, withReport, testAssets } from "./helpers.js";
import { renderHtml } from "../../src/render/html.js";

const definition = JSON.stringify({
  version: 1,
  props: { label: { type: "string" }, value: { type: "number" } },
  components: [
    {
      name: "metric",
      props: { label: { prop: "label" }, value: { prop: "value" } },
    },
  ],
});
test("a composition expands in both reports and in browser memory", async () => {
  for (const file of ["first.md", "second.md"]) {
    const result = await compileReport(
      path.join(root, "tests/fixtures/m6", file),
    );
    expect(result.diagnostics).toEqual([]);
    expect(
      result.report?.blocks.some(
        (block) => block.type === "component" && block.name === "metric",
      ),
    ).toBe(true);
    expect(
      [...result.dependencies].some((name) => name.endsWith("summary.json")),
    ).toBe(true);
  }
  const result = await compileMemory({
    markdown: '::component{src="./summary.json" label="Orders" value="1284"}',
    files: { "summary.json": definition },
  });
  expect(result.diagnostics).toEqual([]);
  const metric = result.report?.blocks[0];
  expect(
    metric?.type === "component" &&
      metric.name === "metric" &&
      metric.props.value,
  ).toBe(1284);
});
test("invalid arguments and cyclic definitions produce diagnostics", async () => {
  for (const directive of [
    '::component{src="./summary.json" label="Orders"}',
    '::component{src="./summary.json" label="Orders" value="NaN"}',
    '::component{src="./summary.json" label="Orders" value="1" extra="x"}',
  ]) {
    const result = await compileMemory({
      markdown: directive,
      files: { "summary.json": definition },
    });
    expect(
      result.diagnostics.some((item) => item.code === "E_COMPONENT_PROP"),
    ).toBe(true);
    expect(result.report).toBeUndefined();
  }
  const cycle = JSON.stringify({
    version: 1,
    props: {},
    components: [{ name: "component", props: { src: "./cycle.json" } }],
  });
  const result = await compileMemory({
    markdown: '::component{src="./cycle.json"}',
    files: { "cycle.json": cycle },
  });
  expect(
    result.diagnostics.some((item) => item.code === "E_COMPONENT_CYCLE"),
  ).toBe(true);
});

test("definition-local and caller-supplied datasets resolve from their respective origins", async () => {
  const local = {
    version: 1,
    props: { external: { type: "string" } },
    components: [
      {
        name: "bar",
        props: { data: "./local.json", x: "label", y: "value", title: "Local" },
      },
      {
        name: "bar",
        props: {
          data: { prop: "external" },
          x: "label",
          y: "value",
          title: "External",
        },
      },
    ],
  };
  const result = await compileMemory({
    markdown:
      '::component{src="./components/card.json" external="./external.json"}',
    files: {
      "components/card.json": JSON.stringify(local),
      "components/local.json": '[{"label":"Local","value":1}]',
      "external.json": '[{"label":"External","value":2}]',
    },
  });
  expect(result.diagnostics).toEqual([]);
  const charts = result.report!.blocks.filter(
    (block) => block.type === "component" && block.name === "bar",
  );
  expect(charts).toHaveLength(2);
  expect(charts[0]?.type === "component" && charts[0].rows?.[0]?.label).toBe(
    "Local",
  );
  expect(charts[1]?.type === "component" && charts[1].rows?.[0]?.label).toBe(
    "External",
  );
});

test("compositions cannot bypass nesting, property or local path checks", async () => {
  const cases: {
    source: string;
    files: Record<string, string>;
    code: string;
  }[] = [
    {
      source: '::component{src="../outside.json"}',
      files: {},
      code: "E_COMPONENT_PATH",
    },
    {
      source: '::component{src="./bad.json"}',
      files: {
        "bad.json": JSON.stringify({
          version: 1,
          props: {},
          components: [{ name: "unknown", props: {} }],
        }),
      },
      code: "E_COMPONENT_UNKNOWN",
    },
    {
      source: '::component{src="./bad.json"}',
      files: {
        "bad.json": JSON.stringify({
          version: 1,
          props: {},
          components: [{ name: "metric", props: { label: 123, value: 1 } }],
        }),
      },
      code: "E_COMPONENT_PROP",
    },
    {
      source: '::component{src="./bad.json"}',
      files: {
        "bad.json": JSON.stringify({
          version: 1,
          props: {},
          components: [{ name: "column", props: { field: "a" } }],
        }),
      },
      code: "E_COMPONENT_CONTEXT",
    },
    {
      source: '::component{src="./bad.json"}',
      files: {
        "bad.json": '{"version":1,"props":{},"components":[],"__proto__":{}}',
      },
      code: "E_COMPONENT_SCHEMA",
    },
  ];
  for (const item of cases) {
    const result = await compileMemory({
      markdown: item.source,
      files: item.files,
    });
    expect(result.diagnostics.map((d) => d.code)).toContain(item.code);
    expect(result.report).toBeUndefined();
  }
});

test("nested compositions retain the origin of forwarded paths", async () => {
  const outer = {
    version: 1,
    props: {},
    components: [
      {
        name: "component",
        props: { src: "./nested/inner.json", dataset: "./data.json" },
      },
    ],
  };
  const inner = {
    version: 1,
    props: { dataset: { type: "string" } },
    components: [
      {
        name: "bar",
        props: {
          data: { prop: "dataset" },
          x: "name",
          y: "value",
          title: "Sales",
        },
      },
    ],
  };
  const result = await compileMemory({
    markdown: '::component{src="./parts/outer.json"}',
    files: {
      "parts/outer.json": JSON.stringify(outer),
      "parts/nested/inner.json": JSON.stringify(inner),
      "parts/data.json": '[{"name":"A","value":8}]',
    },
  });
  expect(result.diagnostics).toEqual([]);
  const bar = result.report?.blocks[0];
  expect(
    bar?.type === "component" && bar.name === "bar" && bar.rows?.[0]?.value,
  ).toBe(8);
});

test("expanded data is bounded even when one cached dataset is reused", async () => {
  const nodes = Array.from({ length: 25 }, () => ({
    name: "table",
    props: { data: "./rows.json" },
  }));
  const rows = Array.from({ length: 900 }, (_, index) => ({
    label: `Row ${index}`,
    value: index,
  }));
  const result = await compileMemory({
    markdown: '::component{src="./repeated.json"}',
    files: {
      "repeated.json": JSON.stringify({
        version: 1,
        props: {},
        components: nodes,
      }),
      "rows.json": JSON.stringify(rows),
    },
  });
  expect(
    result.diagnostics.some((item) => item.code === "E_COMPONENT_LIMIT"),
  ).toBe(true);
  expect(result.report).toBeUndefined();
});

test("a composition cannot introduce an exploration inside a prepared view", async () => {
  const views = {
    inputs: [{ id: "region", type: "toggle", label: "Region", default: false }],
    views: [
      {
        id: "only",
        label: "Only",
        when: { region: false },
        markdown: '::component{src="./nested.json"}',
        datasets: {},
      },
    ],
  };
  const nested = {
    version: 1,
    props: {},
    components: [
      { name: "explore", props: { data: "./views.json", title: "Nested" } },
    ],
  };
  const result = await compileMemory({
    markdown: '::explore{data="./views.json" title="Outer"}',
    files: {
      "views.json": JSON.stringify(views),
      "nested.json": JSON.stringify(nested),
    },
  });
  expect(result.report).toBeUndefined();
  expect(
    result.diagnostics.some(
      (item) =>
        item.code === "E_EXPLORE_SCHEMA" &&
        item.message.includes("Nested explorations"),
    ),
  ).toBe(true);
});

test("filesystem and browser exports of a reused definition are deterministic and self-contained", async () => {
  const markdown =
    '# Sales\n\n::component{src="./summary.json" label="Orders" value="1284"}';
  const memory = await compileMemory({
    markdown,
    files: { "summary.json": definition },
  });
  await withReport(
    markdown,
    { "summary.json": definition },
    async (filename) => {
      const disk = await compileReport(filename);
      expect(disk.diagnostics).toEqual([]);
      expect(memory.diagnostics).toEqual([]);
      const html = renderHtml(disk.report!, testAssets);
      expect(html).toBe(renderHtml(memory.report!, testAssets));
      expect(html).toContain("1,284");
      expect(html).not.toContain("summary.json");
    },
  );
});

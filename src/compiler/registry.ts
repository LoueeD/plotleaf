import * as z from "zod";
import { limits } from "../shared/limits.js";
import { funnelStatuses } from "../shared/payload.js";

const text = z.string().min(1).max(1000);
const format = z
  .string()
  .regex(
    /^(number|percent|percentage-points|currency:[A-Z]{3})$/,
    "Use number, percent, percentage-points or currency:GBP (an ISO currency code).",
  );
const chart = {
  data: text,
  x: text,
  y: text,
  title: text,
  format: format.default("number"),
};
const line = z.strictObject({
  ...chart,
  xType: z.enum(["category", "date", "number"]).default("category"),
  target: z.number().finite().optional(),
  targetLabel: text.optional(),
});

export const registry = {
  grid: {
    forms: ["container"],
    children: [
      "metric",
      "line",
      "area",
      "bar",
      "donut",
      "funnel",
      "table",
      "callout",
    ],
    description: "A responsive row of one to four components.",
    schema: z.strictObject({
      columns: z.number().int().min(1).max(4).default(2),
    }),
    example: ':::grid{columns="4"}\n::metric{label="Teams" value="1492"}\n:::',
  },
  metric: {
    forms: ["leaf"],
    children: [],
    description:
      "A prepared numeric value with optional comparison, direction and sentiment.",
    schema: z.strictObject({
      label: text,
      value: z.number().finite(),
      format: format.default("number"),
      comparison: text.optional(),
      direction: z.enum(["up", "down", "flat"]).optional(),
      sentiment: z.enum(["positive", "negative", "neutral"]).default("neutral"),
    }),
    example: '::metric{label="Conversion" value="0.103" format="percent"}',
  },
  line: {
    forms: ["leaf"],
    children: [],
    description: "An interactive single-series line chart from local JSON.",
    schema: line,
    example:
      '::line{data="./usage.json" x="date" y="teams" xType="date" title="Active teams"}',
  },
  area: {
    forms: ["leaf"],
    children: [],
    description: "A line chart with a restrained area fill.",
    schema: line,
    example:
      '::area{data="./usage.json" x="date" y="teams" xType="date" title="Active teams" target="1600"}',
  },
  bar: {
    forms: ["leaf"],
    children: [],
    description: "An interactive category bar chart with a zero baseline.",
    schema: z.strictObject(chart),
    example:
      '::bar{data="./errors.json" x="category" y="count" title="Errors by category"}',
  },
  donut: {
    forms: ["leaf"],
    children: [],
    description:
      "A part-to-whole donut with a readable legend and native data table.",
    schema: z.strictObject({
      data: text,
      category: text,
      value: text,
      title: text,
      format: format.default("number"),
    }),
    dataRules: {
      category:
        "Unique nonblank strings of at most 1000 characters; source order is preserved.",
      value:
        "Finite nonnegative numbers with a finite sum. Nulls and numeric strings are invalid. All-zero values show an empty state.",
      maximumRows: limits.donutSlices,
    },
    example:
      '::donut{data="./plans.json" category="plan" value="teams" title="Teams by plan"}',
  },
  funnel: {
    forms: ["leaf"],
    children: [],
    description:
      "Ordered stage/progress rows with prepared values, denominators, shares and optional explicit status. Works without JavaScript.",
    schema: z.strictObject({
      data: text,
      stage: text,
      value: text,
      total: text,
      share: text,
      status: text.optional(),
      title: text,
      format: format.default("number"),
    }),
    dataRules: {
      stage:
        "Unique nonblank strings of at most 1000 characters; source order is preserved.",
      value: "Finite nonnegative number no greater than its row's total.",
      total:
        "Finite positive denominator supplied per row. No denominator is inferred from adjacent stages.",
      share:
        "Prepared ratio from 0 to 1, matching value / total to within 0.0005 (rounding to 0.1 percentage point).",
      status: Object.keys(funnelStatuses),
      maximumRows: limits.funnelStages,
    },
    example:
      '::funnel{data="./funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}',
  },
  table: {
    forms: ["leaf", "container"],
    children: ["column"],
    description:
      "A semantic sortable table, with inferred or explicitly formatted columns.",
    schema: z.strictObject({ data: text, title: text.optional() }),
    example:
      ':::table{data="./plans.json" title="By plan"}\n::column{field="plan" label="Plan"}\n::column{field="change" label="Δ QoQ" format="percent" sign="always"}\n:::',
  },
  column: {
    forms: ["leaf"],
    children: [],
    description:
      "A scalar, local image or bounded sparkline column. Omitted kind means scalar.",
    schema: z.strictObject({
      field: text,
      label: text.optional(),
      kind: z.enum(["scalar", "image", "sparkline"]).optional(),
      alt: text.optional(),
      sortBy: text.optional(),
      format: format.optional(),
      sign: z.enum(["auto", "always"]).default("auto"),
      semantics: z
        .enum(["neutral", "higher-is-better", "lower-is-better"])
        .default("neutral"),
    }),
    example:
      '::column{field="change" label="Δ QoQ" format="percent" sign="always" semantics="higher-is-better"}',
    dataRules: {
      image:
        "Local static PNG/JPEG path or null. alt names a nonblank string field for each image. Fixed 64 × 48 display box; deduplicated and embedded offline. Paths resolve from the report directory.",
      sparkline:
        "Only explicitly declared sparkline fields may contain arrays: at most 64 finite numbers/nulls, in sample order. Nulls are gaps. Shared observed y scale per column; no aggregation or resampling.",
      sortBy:
        "Optional scalar field for image/sparkline sorting. Without it a rich column has a plain header. Scalar columns sort their own raw values. Sort keys are readable in the export.",
    },
  },
  callout: {
    forms: ["container"],
    children: ["markdown"],
    description: "A contextual note or warning containing ordinary Markdown.",
    schema: z.strictObject({
      tone: z.enum(["note", "warning"]).default("note"),
      title: text.optional(),
    }),
    example:
      ':::callout{title="Coverage"}\nSeven complete days of prepared data.\n:::',
  },
} as const;

export type ComponentName = keyof typeof registry;
export type PropsByName = {
  [K in ComponentName]: z.infer<(typeof registry)[K]["schema"]>;
};
export type ColumnProps = PropsByName["column"];

export function componentSpec() {
  return {
    version: 1,
    syntax: "markdown-directives",
    attributes:
      "Literal strings decoded according to each property schema. No JavaScript expressions.",
    limits,
    data: {
      shape:
        "array of flat JSON records; explicit table sparkline columns permit bounded numeric/null arrays only in their declared fields",
      resolution: "relative to the report directory; local .json files only",
      percent: "ratios: 0.12 displays as 12%",
      percentagePoints: "point values: 0.8 displays as 0.8 pt",
      currency:
        "major units; omit .00 on whole amounts, preserve nonzero cents",
      locale: "en-GB",
      timeZone: "UTC",
    },
    components: Object.fromEntries(
      Object.entries(registry).map(([name, entry]) => [
        name,
        {
          description: entry.description,
          forms: entry.forms,
          children: entry.children,
          props: z.toJSONSchema(entry.schema),
          example: entry.example,
          ...("dataRules" in entry ? { dataRules: entry.dataRules } : {}),
        },
      ]),
    ),
    rules: [
      "Use explicit closing fences for containers.",
      "Components are standalone blocks, not inline/list/blockquote content.",
      "column is only allowed inside table; grids cannot nest.",
      "direction and explicitly supplied sentiment require metric comparison text.",
      "targetLabel requires target.",
      "Dataset fields are literal own-property keys, not expressions.",
      "Charts preserve source order; date/number x values must increase.",
      "Line/area null y values create gaps; bar null y values are invalid.",
      "Donut category/value fields must differ; category count is bounded, and all-zero values do not create equal slices.",
      "Funnel fields must differ; shares and denominators are supplied, validated and displayed per row, with no sorting or status inference.",
      "Only explicit image columns can load local static PNG/JPEG; every resource stays within the report root and shared byte limits.",
      "Filters, maps, arbitrary nested data and executable components are not supported in this release.",
    ],
  };
}

const specs = componentSpec().components;
const numericLiteral = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export function decodeProps(
  name: ComponentName,
  attributes: Record<string, string | null | undefined>,
): { props?: PropsByName[ComponentName]; errors: string[] } {
  const decoded: Record<string, unknown> = Object.create(null);
  const properties = specs[name]!.props.properties ?? {};
  for (const [key, value] of Object.entries(attributes)) {
    const property = properties[key] as { type?: string } | undefined;
    if (property?.type === "number" || property?.type === "integer")
      decoded[key] =
        typeof value === "string" && numericLiteral.test(value)
          ? Number(value)
          : value;
    else decoded[key] = value;
  }
  const result = registry[name].schema.safeParse(decoded);
  if (!result.success)
    return {
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || name}: ${issue.message}`,
      ),
    };
  const props = result.data;
  const errors: string[] = [];
  if (name === "column") {
    const column = props as PropsByName["column"];
    const kind = column.kind ?? "scalar";
    if (kind === "image" && !column.alt)
      errors.push("image columns require an alt field.");
    if (kind !== "image" && column.alt)
      errors.push("alt is only supported on image columns.");
    if (kind === "image" && column.format)
      errors.push("Image columns cannot use numeric formatting.");
    if (
      kind !== "scalar" &&
      (column.sign !== "auto" || column.semantics !== "neutral")
    )
      errors.push("sign and semantics apply only to scalar columns.");
    if (kind === "scalar" && column.sortBy)
      errors.push(
        "Scalar columns sort their own field; sortBy is for image/sparkline columns.",
      );
    if (column.alt === column.field || column.sortBy === column.field)
      errors.push(
        "alt and sortBy must reference fields different from the rich cell field.",
      );
  }
  if (name === "donut" || name === "funnel") {
    const fields = Object.entries(props)
      .filter(
        ([key, value]) =>
          ["category", "stage", "value", "total", "share", "status"].includes(
            key,
          ) && value !== undefined,
      )
      .map(([, value]) => value);
    if (new Set(fields).size !== fields.length)
      errors.push(
        `${name} field properties must reference different dataset fields.`,
      );
  }
  if (
    "format" in props &&
    props.format?.startsWith("currency:") &&
    !Intl.supportedValuesOf("currency").includes(props.format.slice(9))
  )
    errors.push(`Unknown ISO currency code ${props.format.slice(9)}.`);
  if (
    name === "metric" &&
    !(props as PropsByName["metric"]).comparison &&
    (attributes.direction !== undefined || attributes.sentiment !== undefined)
  )
    errors.push("direction and sentiment require comparison text.");
  if (
    (name === "line" || name === "area") &&
    "targetLabel" in props &&
    props.targetLabel !== undefined &&
    (!("target" in props) || props.target === undefined)
  )
    errors.push("targetLabel requires a numeric target.");
  return { props, errors };
}

import * as z from "zod";
import { limits } from "../shared/limits.js";

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
    children: ["metric", "line", "area", "bar", "table", "callout"],
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
    description: "An explicit field, label and format inside a table.",
    schema: z.strictObject({
      field: text,
      label: text.optional(),
      format: format.optional(),
      sign: z.enum(["auto", "always"]).default("auto"),
      semantics: z
        .enum(["neutral", "higher-is-better", "lower-is-better"])
        .default("neutral"),
    }),
    example:
      '::column{field="change" label="Δ QoQ" format="percent" sign="always" semantics="higher-is-better"}',
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
      shape: "array of flat JSON records",
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
      "Filters, maps, images, nested data and executable components are not supported in this release.",
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

import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Element, Text, Properties, Root } from "hast";
import type { Block, ComponentBlock, Report } from "../compiler/ir.js";
import type { ColumnProps } from "../compiler/registry.js";
import type {
  Cell,
  ChartPayload,
  ReportPayload,
  Row,
} from "../shared/payload.js";
import { formatValue, valueSentiment } from "../shared/format.js";
import { parseDate } from "../compiler/data.js";
import { serializeData } from "../shared/serialize.js";

type Child = Element | Text;
const t = (value: unknown): Text => ({ type: "text", value: String(value) });
const h = (
  tagName: string,
  properties: Properties = {},
  children: Child[] = [],
): Element => ({ type: "element", tagName, properties, children });
const markdown = unified().use(remarkRehype);
const serializer = unified()
  .use(rehypeSanitize, {
    ...defaultSchema,
    // All IDs are generated here with reserved prefixes; reports cannot supply raw HTML/IDs.
    clobberPrefix: "",
    tagNames: [
      ...(defaultSchema.tagNames ?? []),
      "figure",
      "figcaption",
      "button",
      "caption",
    ],
    attributes: {
      ...defaultSchema.attributes,
      "*": [
        ...(defaultSchema.attributes?.["*"] ?? []),
        "className",
        "id",
        "role",
        "ariaLabel",
        "ariaLabelledBy",
        "ariaHidden",
        "ariaSort",
        "dataPlotleafChart",
        "dataPlotleafTable",
        "dataColumn",
        "dataRaw",
        "dataColumns",
        "dataSentiment",
        "dataTone",
      ],
      button: ["type", "disabled", "ariaLabel", "dataColumn"],
      section: ["className", "ariaLabel"],
      th: ["scope", "ariaSort", "className"],
      td: ["className", "dataRaw"],
    },
  })
  .use(rehypeStringify);

function label(field: string): string {
  const value = field.replaceAll("_", " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function slugOf(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-") || "section"
  );
}
function cellText(value: Cell, column: ColumnProps): string {
  return value === null
    ? "—"
    : typeof value === "number"
      ? formatValue(value, column.format, column.sign)
      : String(value);
}

function table(
  rows: Row[],
  columns: ColumnProps[],
  title: string,
  id: string,
  sortable = true,
): Element {
  const numeric = columns.map(
    (column) =>
      rows.some((row) => typeof row[column.field] === "number") ||
      Boolean(column.format),
  );
  const caption = h("caption", {}, [t(title)]);
  const headers = columns.map((column, index) => {
    const name = column.label ?? label(column.field);
    const content = sortable
      ? h(
          "button",
          {
            type: "button",
            disabled: true,
            dataColumn: index,
            ariaLabel: `Sort by ${name}`,
          },
          [
            t(name),
            h("span", { className: ["sort-indicator"], ariaHidden: "true" }, [
              t("↕"),
            ]),
          ],
        )
      : t(name);
    return h(
      "th",
      {
        scope: "col",
        className: numeric[index] ? ["numeric"] : [],
        ...(sortable ? { ariaSort: "none" } : {}),
      },
      [content],
    );
  });
  const head = h("thead", {}, [h("tr", {}, headers)]);
  const tableRows = rows.map((row) => {
    const cells = columns.map((column, index) => {
      const value = row[column.field] ?? null;
      return h(
        "td",
        {
          className: numeric[index] ? ["numeric"] : [],
          dataRaw: serializeData(value),
          ...(typeof value === "number"
            ? { dataSentiment: valueSentiment(value, column.semantics) }
            : {}),
        },
        [t(cellText(value, column))],
      );
    });
    return h("tr", {}, cells);
  });
  const body = h("tbody", {}, tableRows);
  return h("div", { className: ["table-scroll"] }, [
    h("table", { id, ...(sortable ? { dataPlotleafTable: "" } : {}) }, [
      caption,
      head,
      body,
    ]),
  ]);
}

export interface RenderedContent {
  html: string;
  payload: ReportPayload;
  hasCharts: boolean;
}

export function renderContent(report: Report): RenderedContent {
  let sequence = 0;
  const payload: ReportPayload = { charts: [] };
  const headings = new Map<string, number>();
  let hasH1 = false;
  const headingId = (text: string): string => {
    const slug = slugOf(text);
    const count = headings.get(slug) ?? 0;
    headings.set(slug, count + 1);
    return `plotleaf-heading-${slug}${count ? `-${count + 1}` : ""}`;
  };
  function decorate(node: Child): void {
    if (node.type !== "element") return;
    if (/^h[1-6]$/.test(node.tagName)) {
      const text = (child: Child): string =>
        child.type === "text"
          ? child.value
          : child.children.map((n) => text(n as Child)).join("");
      node.properties.id = headingId(text(node));
      if (node.tagName === "h1") hasH1 = true;
    }
    if (node.tagName === "a" && typeof node.properties.href === "string") {
      if (
        node.properties.href.startsWith("#") &&
        !node.properties.href.startsWith("#plotleaf-heading-")
      ) {
        let fragment = node.properties.href.slice(1);
        try {
          fragment = decodeURIComponent(fragment);
        } catch {
          /* Keep malformed escapes inert. */
        }
        node.properties.href = `#plotleaf-heading-${slugOf(fragment)}`;
      }
      if (/^https?:/.test(node.properties.href))
        node.properties.rel = ["noopener", "noreferrer"];
    }
    node.children.forEach((child) => decorate(child as Child));
  }
  function render(blocks: Block[]): Child[] {
    return blocks.flatMap((block): Child[] => {
      if (block.type === "markdown") {
        const root = markdown.runSync(block.tree) as Root;
        root.children.forEach((child) => decorate(child as Child));
        return root.children as Child[];
      }
      const id = `plotleaf-component-${String(++sequence).padStart(4, "0")}`;
      switch (block.name) {
        case "grid":
          return [
            h(
              "div",
              {
                className: [
                  "component-grid",
                  ...(block.children.length > 0 &&
                  block.children.every(
                    (child) =>
                      child.type === "component" && child.name === "metric",
                  )
                    ? ["metric-grid"]
                    : []),
                ],
                dataColumns: block.props.columns,
              },
              render(block.children),
            ),
          ];
        case "metric": {
          const props = block.props;
          const comparison = props.comparison
            ? h(
                "p",
                {
                  className: ["metric-comparison"],
                  dataSentiment: props.sentiment,
                  ariaLabel: `${props.direction === "up" ? "Increased: " : props.direction === "down" ? "Decreased: " : ""}${props.comparison}`,
                },
                [
                  ...(props.direction
                    ? [
                        h(
                          "span",
                          {
                            ariaHidden: "true",
                            className: ["metric-direction"],
                          },
                          [
                            t(
                              props.direction === "up"
                                ? "▲"
                                : props.direction === "down"
                                  ? "▼"
                                  : "—",
                            ),
                          ],
                        ),
                      ]
                    : []),
                  t(props.comparison),
                ],
              )
            : null;
          return [
            h("section", { className: ["metric"], ariaLabel: props.label }, [
              h("p", { className: ["metric-label"] }, [t(props.label)]),
              h("p", { className: ["metric-value"] }, [
                t(formatValue(props.value, props.format)),
              ]),
              ...(comparison ? [comparison] : []),
            ]),
          ];
        }
        case "callout":
          return [
            h("aside", { className: ["callout"], dataTone: block.props.tone }, [
              ...(block.props.title
                ? [
                    h("p", { className: ["callout-title"] }, [
                      t(block.props.title),
                    ]),
                  ]
                : []),
              ...render(block.children),
            ]),
          ];
        case "table":
          return [
            table(
              block.rows ?? [],
              block.columns ?? [],
              block.props.title ?? "Data",
              id,
            ),
            ...(!block.rows?.length
              ? [
                  h("p", { className: ["empty-state"] }, [
                    t("No data to display."),
                  ]),
                ]
              : []),
          ];
        case "column":
          return [];
        case "line":
        case "area":
        case "bar":
          return renderChart(block, id);
      }
    });
  }
  function renderChart(
    block: Extract<ComponentBlock, { name: "line" | "area" | "bar" }>,
    id: string,
  ): Child[] {
    const { x, y, title, format } = block.props;
    const xType = block.name === "bar" ? "category" : block.props.xType;
    const rows = block.rows ?? [];
    if (rows.length) {
      const chart: ChartPayload = {
        id,
        kind: block.name,
        title,
        xType,
        x,
        y,
        format,
        rows: rows.map((row) => [
          xType === "date"
            ? parseDate(row[x] as string)!
            : xType === "category"
              ? String(row[x])
              : (row[x] as number),
          row[y] as number | null,
        ]),
      };
      if (block.name !== "bar") {
        chart.target = block.props.target;
        chart.targetLabel = block.props.targetLabel;
      }
      payload.charts.push(chart);
    }
    const columns: ColumnProps[] = [
      { field: x, label: label(x), sign: "auto", semantics: "neutral" },
      { field: y, label: label(y), format, sign: "auto", semantics: "neutral" },
    ];
    return [
      h("figure", { className: ["chart"] }, [
        h("figcaption", { id: `${id}-title` }, [t(title)]),
        ...(rows.length
          ? [
              h("div", {
                className: ["chart-plot"],
                id,
                dataPlotleafChart: "",
                role: "img",
                ariaLabel: `${title}. Data is available in the table below.`,
              }),
            ]
          : [
              h("p", { className: ["empty-state"] }, [
                t("No data to display."),
              ]),
            ]),
        ...(rows.length
          ? [
              h("details", { className: ["chart-data"] }, [
                h("summary", {}, [
                  t("View data"),
                  h("span", { className: ["visually-hidden"] }, [
                    t(` for ${title}`),
                  ]),
                ]),
                table(rows, columns, title, `${id}-data`, false),
              ]),
            ]
          : []),
      ]),
    ];
  }
  const children = render(report.blocks);
  if (!hasH1)
    children.unshift(
      h("h1", { id: "plotleaf-heading-title" }, [t(report.metadata.title)]),
    );
  const tree: Root = { type: "root", children };
  return {
    html: serializer.stringify(serializer.runSync(tree)),
    payload,
    hasCharts: payload.charts.length > 0,
  };
}

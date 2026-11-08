import { unified } from "unified";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Element, Root } from "hast";
import type {
  Block,
  ComponentBlock,
  Report,
  TableRow,
} from "../compiler/ir.js";
import { h, t, type Child } from "./tree.js";
import { columnScale, richCell } from "./table-cells.js";
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
import { funnelStatuses } from "../shared/payload.js";

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
      "meter",
      "svg",
      "use",
      "path",
      "circle",
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
        "dataStatus",
        "dataSlice",
      ],
      button: ["type", "disabled", "ariaLabel", "dataColumn"],
      section: ["className", "ariaLabel"],
      meter: ["min", "max", "value", "className", "ariaLabel"],
      svg: ["className", "viewBox", "width", "height", "role", "ariaLabel"],
      use: ["href"],
      path: ["d"],
      circle: ["cx", "cy", "r"],
      ul: ["className", "role"],
      ol: ["start", "className", "role"],
      li: ["className", "dataStatus"],
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
  rows: TableRow[],
  columns: ColumnProps[],
  title: string,
  id: string,
  sortable = true,
): Element {
  const scales = columns.map((column) =>
    column.kind === "sparkline" ? columnScale(rows, column.field) : undefined,
  );
  const canSort = columns.map(
    (column) =>
      sortable &&
      (!column.kind || column.kind === "scalar" || Boolean(column.sortBy)),
  );
  const numeric = columns.map(
    (column) =>
      column.kind === "sparkline" ||
      rows.some((row) => typeof row[column.field] === "number") ||
      Boolean(column.format),
  );
  const caption = h("caption", {}, [t(title)]);
  const headers = columns.map((column, index) => {
    const name = column.label ?? label(column.field);
    const content = canSort[index]
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
        ...(canSort[index] ? { ariaSort: "none" } : {}),
      },
      [content],
    );
  });
  const head = h("thead", {}, [h("tr", {}, headers)]);
  const tableRows = rows.map((row) => {
    const cells = columns.map((column, index) => {
      const value = row[column.field] ?? null;
      const rich = value !== null && typeof value === "object";
      const raw = rich ? (value.sort ?? null) : value;
      return h(
        "td",
        {
          className: numeric[index] ? ["numeric"] : [],
          ...(canSort[index] ? { dataRaw: serializeData(raw) } : {}),
          ...(typeof value === "number"
            ? { dataSentiment: valueSentiment(value, column.semantics) }
            : {}),
        },
        rich
          ? richCell(value, column, scales[index])
          : [t(cellText(value, column))],
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

function dataDisclosure(
  rows: Row[],
  columns: ColumnProps[],
  title: string,
  id: string,
): Element {
  return h("details", { className: ["chart-data"] }, [
    h("summary", {}, [
      t("View data"),
      h("span", { className: ["visually-hidden"] }, [t(` for ${title}`)]),
    ]),
    table(rows, columns, title, `${id}-data`, false),
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
        case "funnel":
          return renderFunnel(block, id);
        case "donut":
          return renderDonut(block, id);
        case "line":
        case "area":
        case "bar":
          return renderChart(block, id);
      }
    });
  }
  function renderFunnel(
    block: Extract<ComponentBlock, { name: "funnel" }>,
    id: string,
  ): Child[] {
    const { stage, value, total, share, status, title, format } = block.props;
    const rows = block.rows ?? [];
    const columns: ColumnProps[] = [
      { field: stage, label: label(stage), sign: "auto", semantics: "neutral" },
      {
        field: value,
        label: label(value),
        format,
        sign: "auto",
        semantics: "neutral",
      },
      {
        field: total,
        label: label(total),
        format,
        sign: "auto",
        semantics: "neutral",
      },
      {
        field: share,
        label: "Share",
        format: "percent",
        sign: "auto",
        semantics: "neutral",
      },
      ...(status
        ? [
            {
              field: status,
              label: "Status",
              sign: "auto" as const,
              semantics: "neutral" as const,
            },
          ]
        : []),
    ];
    return [
      h("figure", { className: ["chart", "funnel"] }, [
        h("figcaption", { id: `${id}-title` }, [t(title)]),
        ...(rows.length
          ? [
              h(
                "ol",
                { className: ["funnel-stages"], role: "list" },
                rows.map((row) => {
                  const state = status
                    ? (row[status] as keyof typeof funnelStatuses)
                    : "neutral";
                  const rate = formatValue(row[share] as number, "percent");
                  const amount = formatValue(
                    row[value] as number,
                    format,
                    "auto",
                    true,
                  );
                  const denominator = formatValue(
                    row[total] as number,
                    format,
                    "auto",
                    true,
                  );
                  return h(
                    "li",
                    { className: ["funnel-stage"], dataStatus: state },
                    [
                      h("div", { className: ["funnel-heading"] }, [
                        h("span", { className: ["funnel-label"] }, [
                          t(row[stage]),
                        ]),
                        h("span", { className: ["funnel-values"] }, [
                          h("strong", {}, [t(rate)]),
                          h("span", {}, [t(`${amount} / ${denominator}`)]),
                        ]),
                      ]),
                      h(
                        "meter",
                        {
                          min: "0",
                          max: "1",
                          value: String(row[share]),
                          ariaLabel: `${row[stage]}: ${rate}, ${formatValue(row[value] as number, format)} of ${formatValue(row[total] as number, format)}${status ? `, ${funnelStatuses[state]}` : ""}`,
                        },
                        [t(rate)],
                      ),
                      ...(status
                        ? [
                            h("span", { className: ["funnel-status"] }, [
                              t(funnelStatuses[state]),
                            ]),
                          ]
                        : []),
                    ],
                  );
                }),
              ),
            ]
          : [
              h("p", { className: ["empty-state"] }, [
                t("No data to display."),
              ]),
            ]),
        ...(rows.length
          ? [
              dataDisclosure(
                rows.map((row) =>
                  status
                    ? {
                        ...row,
                        [status]:
                          funnelStatuses[
                            row[status] as keyof typeof funnelStatuses
                          ],
                      }
                    : row,
                ),
                columns,
                title,
                id,
              ),
            ]
          : []),
      ]),
    ];
  }

  function renderDonut(
    block: Extract<ComponentBlock, { name: "donut" }>,
    id: string,
  ): Child[] {
    const { category, value, title, format } = block.props;
    const rows = block.rows ?? [];
    const total = rows.reduce((sum, row) => sum + (row[value] as number), 0);
    if (total > 0)
      payload.charts.push({
        id,
        kind: "donut",
        title,
        format,
        rows: rows.map((row) => [
          row[category] as string,
          row[value] as number,
        ]),
      });
    return [
      h("figure", { className: ["chart", "donut"] }, [
        h("figcaption", { id: `${id}-title` }, [t(title)]),
        ...(total > 0
          ? [
              h("div", { className: ["donut-layout"] }, [
                h("div", {
                  className: ["chart-plot", "donut-plot"],
                  id,
                  dataPlotleafChart: "",
                  role: "img",
                  ariaLabel: `${title}. Values and shares follow in the legend and data table.`,
                }),
                h(
                  "ul",
                  { className: ["donut-legend"], role: "list" },
                  rows.map((row, index) =>
                    h("li", {}, [
                      h("span", { className: ["donut-key"] }, [
                        h("span", {
                          className: ["donut-swatch"],
                          dataSlice: index + 1,
                          ariaHidden: "true",
                        }),
                        h("span", {}, [t(row[category])]),
                      ]),
                      h("span", { className: ["donut-value"] }, [
                        t(formatValue(row[value] as number, format)),
                      ]),
                      h("span", { className: ["donut-share"] }, [
                        t(
                          formatValue(
                            (row[value] as number) / total,
                            "percent",
                          ),
                        ),
                      ]),
                    ]),
                  ),
                ),
              ]),
            ]
          : [
              h("p", { className: ["empty-state"] }, [
                t(
                  rows.length
                    ? "No non-zero values to display."
                    : "No data to display.",
                ),
              ]),
            ]),
        ...(rows.length
          ? [
              dataDisclosure(
                rows,
                [
                  {
                    field: category,
                    label: label(category),
                    sign: "auto",
                    semantics: "neutral",
                  },
                  {
                    field: value,
                    label: label(value),
                    format,
                    sign: "auto",
                    semantics: "neutral",
                  },
                ],
                title,
                id,
              ),
            ]
          : []),
      ]),
    ];
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
        ...(rows.length ? [dataDisclosure(rows, columns, title, id)] : []),
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

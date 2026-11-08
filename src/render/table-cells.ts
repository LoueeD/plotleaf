import type { RichCell, TableRow } from "../compiler/ir.js";
import type { ColumnProps } from "../compiler/registry.js";
import { formatValue } from "../shared/format.js";
import { h, t, type Child } from "./tree.js";

export interface Scale {
  min: number;
  max: number;
}
export function columnScale(
  rows: TableRow[],
  field: string,
): Scale | undefined {
  let min = Infinity,
    max = -Infinity;
  for (const row of rows) {
    const cell = row[field];
    if (!cell || typeof cell !== "object" || cell.kind !== "sparkline")
      continue;
    for (const value of cell.values)
      if (value !== null) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
  }
  return Number.isFinite(min) ? { min, max } : undefined;
}

export function richCell(
  cell: RichCell,
  column: ColumnProps,
  scale?: Scale,
): Child[] {
  if (cell.kind === "image")
    return cell.imageId
      ? [
          h(
            "svg",
            {
              className: ["table-image"],
              viewBox: "0 0 64 48",
              width: "64",
              height: "48",
              role: "img",
              ariaLabel: cell.alt,
            },
            [h("use", { href: `#${cell.imageId}` })],
          ),
        ]
      : [t("—")];
  const values = cell.values;
  const recorded = values.filter((value): value is number => value !== null);
  const formatted = (value: number | null | undefined): string =>
    value == null ? "—" : formatValue(value, column.format);
  const name = column.label ?? column.field;
  const description = `${name}. ${recorded.length} of ${values.length} recorded samples. First sample ${formatted(values[0])}; last sample ${formatted(values.at(-1))}.${scale ? ` Shared column scale ${formatted(scale.min)} to ${formatted(scale.max)}.` : ""}`;
  const marks: Child[] = [];
  if (scale && recorded.length) {
    const divisor = Math.max(Math.abs(scale.min), Math.abs(scale.max)) || 1;
    const low = scale.min / divisor,
      high = scale.max / divisor;
    const segments: [number, number][][] = [];
    let segment: [number, number][] = [];
    for (const [index, value] of values.entries()) {
      if (value === null) {
        if (segment.length) segments.push(segment);
        segment = [];
        continue;
      }
      const x =
        values.length === 1 ? 56 : 3 + (index / (values.length - 1)) * 106;
      const y =
        high === low
          ? 16
          : 3 + (1 - (value / divisor - low) / (high - low)) * 26;
      segment.push([x, y]);
    }
    if (segment.length) segments.push(segment);
    for (const points of segments) {
      if (points.length === 1)
        marks.push(
          h("circle", {
            cx: points[0]![0].toFixed(3),
            cy: points[0]![1].toFixed(3),
            r: "2",
          }),
        );
      else
        marks.push(
          h("path", {
            d: points
              .map(
                ([x, y], index) =>
                  `${index ? "L" : "M"}${x.toFixed(3)} ${y.toFixed(3)}`,
              )
              .join(""),
          }),
        );
    }
  }
  return [
    h("div", { className: ["sparkline-cell"] }, [
      ...(marks.length
        ? [
            h(
              "svg",
              {
                className: ["sparkline-chart"],
                viewBox: "0 0 112 32",
                width: "112",
                height: "32",
                role: "img",
                ariaLabel: description,
              },
              marks,
            ),
          ]
        : [
            h("span", { className: ["sparkline-empty"] }, [
              t("No recorded values"),
            ]),
          ]),
      h(
        "span",
        {
          className: ["sparkline-last"],
          ariaLabel: `Last sample: ${formatted(values.at(-1))}`,
        },
        [t(formatted(values.at(-1)))],
      ),
      ...(values.length
        ? [
            h("details", { className: ["sparkline-data"] }, [
              h("summary", {}, [t(`View ${values.length} values`)]),
              h(
                "ol",
                { className: ["sparkline-values"] },
                values.map((value) =>
                  h("li", {}, [t(value === null ? "—" : String(value))]),
                ),
              ),
            ]),
          ]
        : []),
    ]),
  ];
}

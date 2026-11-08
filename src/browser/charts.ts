import "./base.js";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ReportPayload, ChartPayload } from "../shared/payload.js";
import { formatDate, formatValue } from "../shared/format.js";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  AriaComponent,
  SVGRenderer,
]);
const element = document.getElementById("plotleaf-data");
const payload = JSON.parse(
  element?.textContent ?? '{"charts":[]}',
) as ReportPayload;
const theme = window.matchMedia("(prefers-color-scheme: dark)");
const instances: {
  chart: ReturnType<typeof echarts.init>;
  data: ChartPayload;
}[] = [];

function options(data: ChartPayload): echarts.EChartsCoreOption {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string): string =>
    styles.getPropertyValue(`--${name}`).trim();
  if (data.kind === "donut")
    return {
      animation: false,
      color: Array.from({ length: 8 }, (_, index) =>
        token(`slice-${index + 1}`),
      ),
      textStyle: { fontFamily: styles.fontFamily, fontSize: 12 },
      aria: {
        enabled: true,
        label: {
          description: `${data.title}. Values and shares are available in the adjacent legend and data table.`,
        },
      },
      tooltip: {
        trigger: "item",
        renderMode: "richText",
        confine: true,
        backgroundColor: token("tooltip"),
        borderColor: token("rule"),
        borderWidth: 1,
        textStyle: {
          color: token("ink"),
          fontFamily: styles.fontFamily,
          fontSize: 13,
        },
        valueFormatter: (value: unknown) =>
          typeof value === "number" ? formatValue(value, data.format) : "—",
      },
      series: [
        {
          type: "pie",
          radius: ["58%", "88%"],
          center: ["50%", "50%"],
          clockwise: true,
          startAngle: 90,
          stillShowZeroSum: false,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderColor: token("page"),
            borderWidth: 2,
            borderRadius: 2,
          },
          emphasis: { scale: false, itemStyle: { opacity: 0.8 } },
          data: data.rows.map(([name, value]) => ({ name, value })),
        },
      ],
    };
  const date = data.xType === "date";
  const category = data.xType === "category";
  const duration = date
    ? Number(data.rows.at(-1)?.[0]) - Number(data.rows[0]?.[0])
    : 0;
  const dateLabel = (value: number): string =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      month: "short",
      ...(duration < 90 * 86_400_000 ? { day: "numeric" } : {}),
      ...(duration > 365 * 86_400_000 ? { year: "numeric" } : {}),
    }).format(value);
  const format = (value: number): string =>
    formatValue(value, data.format, "auto", true);
  return {
    animation: false,
    useUTC: true,
    color: [token("series")],
    textStyle: { fontFamily: styles.fontFamily, fontSize: 12 },
    aria: {
      enabled: true,
      label: { description: `${data.title}. A data table follows this chart.` },
    },
    grid: { top: 14, right: 14, bottom: 34, left: 54, containLabel: false },
    tooltip: {
      trigger: "axis",
      renderMode: "richText",
      confine: true,
      backgroundColor: token("tooltip"),
      borderColor: token("rule"),
      borderWidth: 1,
      textStyle: {
        color: token("ink"),
        fontFamily: styles.fontFamily,
        fontSize: 13,
      },
      valueFormatter: (value: unknown) => {
        const scalar = Array.isArray(value) ? value[1] : value;
        return typeof scalar === "number"
          ? formatValue(scalar, data.format)
          : "—";
      },
      axisPointer: {
        type: "line",
        lineStyle: { color: token("rule"), width: 1 },
        label: {
          formatter: (params: { value: string | number }) =>
            date
              ? formatDate(Number(params.value), true)
              : String(params.value),
        },
      },
    },
    xAxis: {
      type: category ? "category" : date ? "time" : "value",
      ...(category ? { data: data.rows.map((row) => row[0]) } : {}),
      boundaryGap: category ? data.kind === "bar" : ["0%", "0%"],
      ...(date
        ? {
            minInterval: (duration < 90 * 86_400_000 ? 1 : 31) * 86_400_000,
            splitNumber: 5,
          }
        : {}),
      axisLine: { show: true, lineStyle: { color: token("rule") } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: token("muted"),
        margin: 16,
        hideOverlap: true,
        ...(date
          ? { formatter: dateLabel }
          : { width: 140, overflow: "truncate" }),
      },
    },
    yAxis: {
      type: "value",
      min: (range: { min: number }) => Math.min(0, range.min, data.target ?? 0),
      splitNumber: 3,
      axisLabel: { color: token("muted"), margin: 14, formatter: format },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      ...(data.target !== undefined
        ? {
            max: (range: { max: number }) =>
              Math.max(0, range.max, data.target!) * 1.12,
          }
        : {}),
    },
    series: [
      {
        type: data.kind === "bar" ? "bar" : "line",
        name: data.y,
        data: category ? data.rows.map((row) => row[1]) : data.rows,
        showSymbol: false,
        smooth: false,
        connectNulls: false,
        lineStyle: { color: token("series"), width: 2.25 },
        itemStyle: {
          color: token("series"),
          ...(data.kind === "bar" ? { borderRadius: [3, 3, 0, 0] } : {}),
        },
        barMaxWidth: 48,
        ...(data.kind === "area"
          ? {
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: token("series-fill") },
                  { offset: 1, color: token("series-fill-end") },
                ]),
              },
            }
          : {}),
        ...(data.target !== undefined
          ? {
              markLine: {
                silent: true,
                symbol: "none",
                animation: false,
                lineStyle: {
                  color: token("target"),
                  width: 1.25,
                  type: "dashed",
                },
                label: {
                  show: true,
                  position: "insideEndTop",
                  color: token("body"),
                  backgroundColor: token("page"),
                  borderColor: token("rule"),
                  borderWidth: 1,
                  borderRadius: 5,
                  padding: [5, 8],
                  formatter: `${data.targetLabel ?? "Target"} · ${format(data.target)}`,
                },
                data: [{ yAxis: data.target }],
              },
            }
          : {}),
      },
    ],
  };
}

for (const data of payload.charts) {
  const container = document.getElementById(data.id);
  if (!container) continue;
  const chart = echarts.init(container, undefined, { renderer: "svg" });
  chart.setOption(options(data));
  instances.push({ chart, data });
  const observer = new ResizeObserver(() => chart.resize());
  observer.observe(container);
}
theme.addEventListener("change", () => {
  for (const { chart, data } of instances)
    chart.setOption(options(data), { notMerge: true });
});

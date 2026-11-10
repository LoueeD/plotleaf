import type { ExplorationConfig } from "../compiler/exploration-schema.js";
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
interface ChartBase {
  id: string;
  title: string;
  format: string;
}
export interface CartesianPayload extends ChartBase {
  kind: "line" | "area" | "bar";
  xType: "category" | "date" | "number";
  x: string;
  y: string;
  target?: number;
  targetLabel?: string;
  rows: [string | number, number | null][];
}
export interface DonutPayload extends ChartBase {
  kind: "donut";
  rows: [string, number][];
}
export type ChartPayload = CartesianPayload | DonutPayload;

export const funnelStatuses = {
  "on-target": "On target",
  "below-target": "Below target",
  "at-risk": "At risk",
  neutral: "Neutral",
} as const;
export interface ReportPayload {
  charts: ChartPayload[];
  explorations?: ExplorationConfig[];
}

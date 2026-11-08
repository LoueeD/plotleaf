export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;
export interface ChartPayload {
  id: string;
  kind: "line" | "area" | "bar";
  title: string;
  xType: "category" | "date" | "number";
  x: string;
  y: string;
  format: string;
  target?: number;
  targetLabel?: string;
  rows: [string | number, number | null][];
}
export interface ReportPayload {
  charts: ChartPayload[];
}

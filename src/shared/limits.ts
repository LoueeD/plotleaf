/** Shared with the generated agent specification; oversized inputs are never truncated. */
export const limits = {
  markdownBytes: 1024 ** 2,
  jsonBytes: 10 * 1024 ** 2,
  totalBytes: 25 * 1024 ** 2,
  datasets: 64,
  rows: 100_000,
  chartRows: 10_000,
  donutSlices: 8,
  funnelStages: 20,
  tableRows: 1000,
  tableColumns: 40,
} as const;

import type { InputValue } from "../compiler/exploration-schema.js";
export const valueKey = (value: InputValue): string =>
  typeof value === "object"
    ? `${value.start}/${value.end}`
    : `${typeof value}:${String(value)}`;

export const explorationLimits = {
  inputs: 6,
  options: 20,
  views: 32,
  explorations: 4,
  components: 512,
  rows: 20000,
  dataBytes: 8 * 1024 ** 2,
  markdownBytes: 2 * 1024 ** 2,
  jsonDepth: 32,
  jsonContainers: 100000,
} as const;

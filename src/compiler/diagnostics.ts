import path from "node:path";
export * from "./diagnostic-core.js";

export function displayPath(filename: string): string {
  return path.relative(process.cwd(), filename) || path.basename(filename);
}

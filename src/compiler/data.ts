import { DataResolver as CoreDataResolver } from "./resolve-data.js";
import { ReportFiles } from "./files.js";
import { ImageResolver } from "./images.js";
import type { Diagnostics } from "./diagnostic-core.js";
export { contained, readBounded } from "./files.js";
export { limits } from "../shared/limits.js";
export { parseDate } from "../shared/date.js";

export class DataResolver extends CoreDataResolver {
  constructor(
    readonly root: string,
    diagnostics: Diagnostics,
    dependencies: Set<string>,
    totalBytes = 0,
  ) {
    const files = new ReportFiles(root, dependencies, totalBytes);
    super(diagnostics, files, new ImageResolver(files));
  }
}

import path from "node:path";
import { realpath } from "node:fs/promises";
import { Diagnostics, displayPath, type Diagnostic } from "./diagnostics.js";
import { DataResolver, limits, readBounded } from "./data.js";
import { parseReport } from "./parse.js";
import type { Report } from "./ir.js";

export interface Compilation {
  report?: Report;
  diagnostics: Diagnostic[];
  dependencies: Set<string>;
  filename: string;
}

export async function compileReport(input: string): Promise<Compilation> {
  const requested = path.resolve(input);
  const diagnostics = new Diagnostics(displayPath(requested));
  const dependencies = new Set([requested]);
  const result = (): Compilation => ({
    diagnostics: diagnostics.sorted(),
    dependencies,
    filename: requested,
  });
  try {
    if (path.extname(requested).toLowerCase() !== ".md") {
      diagnostics.add("E_REPORT_PATH", "A report must be a .md Markdown file.");
      return result();
    }
    const filename = await realpath(requested);
    dependencies.add(filename);
    const { text, bytes } = await readBounded(filename, limits.markdownBytes);
    const report = parseReport(
      text,
      path.basename(filename, path.extname(filename)),
      diagnostics,
    );
    const resolver = new DataResolver(
      path.dirname(filename),
      diagnostics,
      dependencies,
      bytes,
    );
    await resolver.resolve(report.blocks);
    return { ...result(), ...(!diagnostics.hasErrors ? { report } : {}) };
  } catch (error) {
    diagnostics.add(
      "E_REPORT_READ",
      error instanceof Error
        ? error.message.replaceAll(requested, displayPath(requested))
        : "Could not compile the report.",
    );
    return result();
  }
}

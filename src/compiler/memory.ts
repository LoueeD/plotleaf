import { Diagnostics, type Diagnostic } from "./diagnostic-core.js";
import { parseReport } from "./parse.js";
import { DataResolver } from "./resolve-data.js";
import {
  LocalFileError,
  type SourceFiles,
  type SourceImages,
} from "./sources.js";
import type { Report } from "./ir.js";

import { playgroundLimits } from "../shared/playground.js";
export { playgroundLimits } from "../shared/playground.js";
export interface MemoryProject {
  markdown: string;
  files: Record<string, string>;
}
export interface MemoryCompilation {
  report?: Report;
  diagnostics: Diagnostic[];
}

/** Plain relative paths within the supplied virtual report directory. No URLs. */
function filename(reference: string, extensions: readonly string[]): string {
  if (
    reference.startsWith("/") ||
    /^[A-Za-z][A-Za-z\d+.-]*:/.test(reference) ||
    /\\|\0|%[\da-f]{2}/i.test(reference)
  )
    throw new LocalFileError(
      "path",
      "Use a plain relative path to a supplied JSON file.",
    );
  const parts: string[] = [];
  for (const part of reference.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!parts.length)
        throw new LocalFileError(
          "path",
          "Reference escapes the report directory.",
        );
      parts.pop();
    } else parts.push(part);
  }
  if (
    !parts.length ||
    parts.some((part) => part.startsWith(".")) ||
    !extensions.some((ext) => parts.at(-1)!.toLowerCase().endsWith(ext))
  )
    throw new LocalFileError("path", "Use a non-hidden local JSON filename.");
  return parts.join("/");
}

export async function compileMemory(
  project: MemoryProject,
): Promise<MemoryCompilation> {
  const diagnostics = new Diagnostics("report.md");
  const result = (report?: Report): MemoryCompilation => ({
    ...(!diagnostics.hasErrors && report ? { report } : {}),
    diagnostics: diagnostics.sorted(),
  });
  try {
    const encoder = new TextEncoder();
    const markdownBytes = encoder.encode(project.markdown).length;
    const entries = Object.entries(project.files);
    if (
      entries.length > playgroundLimits.files ||
      markdownBytes +
        entries.reduce(
          (total, [, value]) => total + encoder.encode(value).length,
          0,
        ) >
        playgroundLimits.bytes
    ) {
      diagnostics.add(
        "E_PLAYGROUND_LIMIT",
        "The playground accepts at most 16 JSON files and 1 MiB of total input.",
        undefined,
        "Prepare a smaller example, or use the CLI for larger reports.",
      );
      return result();
    }
    const files = new Map<string, Uint8Array>();
    for (const [name, value] of entries) {
      const key = filename(name, [".json"]);
      if (files.has(key))
        throw new LocalFileError(
          "path",
          "Duplicate normalized JSON filenames are not supported.",
        );
      files.set(key, encoder.encode(value));
    }
    const source: SourceFiles = {
      async resolve(reference, extensions) {
        const key = filename(reference, extensions);
        if (!files.has(key))
          throw new LocalFileError(
            "read",
            "Cannot read the referenced file. Add it to the playground or correct the data property.",
          );
        return key;
      },
      async read(name, maximum) {
        const bytes = files.get(name)!;
        if (bytes.length > maximum)
          throw new LocalFileError(
            "read",
            "File exceeds the supported size limit.",
          );
        return bytes;
      },
    };
    const images: SourceImages = {
      embedded: new Map(),
      async load() {
        throw new Error(
          "The playground accepts Markdown and JSON only. Use the CLI for local PNG/JPEG image files.",
        );
      },
    };
    const report = parseReport(project.markdown, "report", diagnostics);
    await new DataResolver(diagnostics, source, images).resolve(report.blocks);
    return result(report);
  } catch (error) {
    diagnostics.add(
      "E_PLAYGROUND_INPUT",
      error instanceof Error
        ? error.message
        : "Cannot compile the supplied files.",
    );
    return result();
  }
}

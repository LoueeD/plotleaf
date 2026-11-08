#!/usr/bin/env node
import path from "node:path";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { compileReport } from "./compiler/compile.js";
import { humanDiagnostics, displayPath } from "./compiler/diagnostics.js";
import { componentSpec } from "./compiler/registry.js";
import { renderHtml, type Assets } from "./render/html.js";
import { writeReport } from "./export.js";
import { startPreview } from "./preview.js";
import metadata from "../package.json" with { type: "json" };

const help = `plotleaf — beautiful reports from Markdown and JSON

Usage:
  npx plotleaf <report.md>                    Open a live preview
  npx plotleaf dev <report.md> [--no-open] [--port 3000]
  npx plotleaf validate <report.md> [--json]   Validate syntax and local data
  npx plotleaf build <report.md> [--out report.html]
  npx plotleaf guide                          Read the report-authoring guide
  npx plotleaf schema                         Print component specifications

Options:
  -h, --help      Show this help
  -v, --version   Show the version

Reports run without application setup. Exports work offline in a browser.
`;

async function assets(): Promise<Assets> {
  const base = new URL("./assets/", import.meta.url);
  const [styles, runtime, charts, notices] = await Promise.all(
    ["styles.css", "base.js", "charts.js", "notices.txt"].map((file) =>
      readFile(new URL(file, base), "utf8"),
    ),
  );
  return {
    styles: styles!,
    base: runtime!,
    charts: charts!,
    notices: notices!,
  };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      json: { type: "boolean" },
      "no-open": { type: "boolean" },
      port: { type: "string" },
      out: { type: "string", short: "o" },
    },
  });
  if (values.version) {
    console.log(metadata.version);
    return;
  }
  if (values.help || !positionals.length) {
    process.stdout.write(help);
    return;
  }
  const first = positionals[0]!;
  const known = ["dev", "validate", "build", "schema", "guide"];
  const command = known.includes(first) ? first : "dev";
  const filename = known.includes(first) ? positionals[1] : first;
  const extras = positionals.slice(known.includes(first) ? 2 : 1);
  if (command === "schema" || command === "guide") {
    if (positionals.length !== 1 || Object.keys(values).length)
      throw new Error(
        `${command} does not accept a report or options. Use plotleaf ${command}.`,
      );
    if (command === "guide")
      process.stdout.write(
        await readFile(
          new URL("../skills/plotleaf/SKILL.md", import.meta.url),
          "utf8",
        ),
      );
    else console.log(JSON.stringify(componentSpec(), null, 2));
    return;
  }
  if (!filename || extras.length)
    throw new Error(
      "Specify exactly one report.md. Run plotleaf --help for usage.",
    );
  if (values.json && command !== "validate")
    throw new Error("--json is only supported by validate.");
  if (values.out && command !== "build")
    throw new Error("--out is only supported by build.");
  if ((values.port !== undefined || values["no-open"]) && command !== "dev")
    throw new Error("--port and --no-open are only supported by dev/preview.");
  let port: number | undefined;
  if (values.port !== undefined) {
    if (!/^\d+$/.test(values.port) || Number(values.port) > 65535)
      throw new Error("--port must be an integer from 0 to 65535.");
    port = Number(values.port);
  }
  const result = await compileReport(filename);
  if (command === "validate") {
    if (values.json)
      console.log(
        JSON.stringify(
          { valid: Boolean(result.report), diagnostics: result.diagnostics },
          null,
          2,
        ),
      );
    else {
      if (result.diagnostics.length)
        console.error(humanDiagnostics(result.diagnostics));
      if (result.report) console.log(`Valid: ${displayPath(result.filename)}`);
    }
    if (!result.report) process.exitCode = 1;
    return;
  }
  if (command === "build") {
    if (result.diagnostics.length)
      console.error(humanDiagnostics(result.diagnostics));
    if (!result.report) {
      process.exitCode = 1;
      return;
    }
    const html = renderHtml(result.report, await assets());
    const defaultOutput =
      result.filename.slice(0, -path.extname(result.filename).length) + ".html";
    const destination = await writeReport(
      values.out ?? defaultOutput,
      html,
      result.dependencies,
    );
    console.log(
      `Built ${displayPath(destination)} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`,
    );
    return;
  }
  const preview = await startPreview(filename, await assets(), {
    initial: result,
    port,
    openBrowser: !values["no-open"],
    log: (message) => process.stderr.write(message + "\n"),
  });
  let closing = false;
  const close = (): void => {
    if (closing) return;
    closing = true;
    void preview.close().catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 2;
    });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  console.error(
    `plotleaf: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 2;
});

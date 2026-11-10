import type { Report } from "../compiler/ir.js";
import type { Diagnostic } from "../compiler/diagnostic-core.js";
import { renderContent } from "./content.js";
import { serializeData } from "../shared/serialize.js";

export interface Assets {
  styles: string;
  base: string;
  charts: string;
  notices: string;
}
export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export const inlineScript = (value: string): string =>
  value.replace(/<\/script/gi, "<\\/script").replaceAll("<!--", "\\x3c!--");
const reload = (revision: number): string =>
  `(()=>{const source=new EventSource("/__plotleaf/events");source.addEventListener("ready",event=>{if(Number(event.data)!==${revision})location.reload()});source.addEventListener("reload",()=>location.reload());addEventListener("pagehide",()=>source.close(),{once:true});})();`;

function documentHtml(
  title: string,
  description: string | undefined,
  body: string,
  styles: string,
  scripts: string[],
  preview: boolean,
  hash: (script: string) => string,
  payload?: string,
  notices = "",
  revision = 0,
): string {
  const code = [...scripts, ...(preview ? [reload(revision)] : [])].map(
    inlineScript,
  );
  const hashes = code.map((script) => `'sha256-${hash(script)}'`).join(" ");
  // ECharts owns inline SVG style attributes. Authors cannot supply CSS or raw HTML.
  const policy = `default-src 'none'; script-src ${hashes || "'none'"}; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src ${preview ? "'self'" : "'none'"}; base-uri 'none'; object-src 'none'; form-action 'none'`;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${escapeHtml(policy)}"><meta name="color-scheme" content="light dark"><title>${escapeHtml(title)}</title>${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}<style>${styles}</style></head><body><a class="skip-link" href="#plotleaf-report">Skip to report</a><main class="report" id="plotleaf-report">${body}</main>${payload ? `<script type="application/json" id="plotleaf-data">${payload}</script>` : ""}${notices ? `<template id="plotleaf-notices"><pre>${escapeHtml(notices)}</pre></template>` : ""}${code.map((script) => `<script>${script}</script>`).join("")}</body></html>\n`;
}

export function renderHtml(
  report: Report,
  assets: Assets,
  hash: (script: string) => string,
  preview = false,
  revision = 0,
): string {
  const content = renderContent(report);
  // Raster bytes are generated from validated local files. Symbols deduplicate
  // images without scripts, data paths in cells or relaxed link protocols.
  const images = report.images?.length
    ? `<svg class="image-definitions" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>${report.images.map((image) => `<symbol id="${escapeHtml(image.id)}" viewBox="0 0 64 48"><image href="data:${image.mime};base64,${image.base64}" width="64" height="48" preserveAspectRatio="xMidYMid meet"/></symbol>`).join("")}</defs></svg>`
    : "";
  return documentHtml(
    report.metadata.title,
    report.metadata.description,
    images + content.html,
    assets.styles,
    [content.hasCharts ? assets.charts : assets.base],
    preview,
    hash,
    content.hasCharts || content.payload.explorations?.length
      ? serializeData(content.payload)
      : undefined,
    content.hasCharts ? assets.notices : "",
    revision,
  );
}

export function renderDiagnostics(
  diagnostics: Diagnostic[],
  assets: Assets,
  hash: (script: string) => string,
  preview = true,
  revision = 0,
): string {
  const body = `<h1>Report needs attention</h1><p class="diagnostic-intro">Update the source files to refresh this preview.</p>${diagnostics.map((item) => `<section class="diagnostic"><p class="diagnostic-location">${escapeHtml(item.file)}:${item.line}:${item.column} · ${escapeHtml(item.code)}</p><p>${escapeHtml(item.message)}</p>${item.hint ? `<p class="diagnostic-hint">${escapeHtml(item.hint)}</p>` : ""}</section>`).join("")}`;
  return documentHtml(
    "Report needs attention",
    undefined,
    body,
    assets.styles,
    [],
    preview,
    hash,
    undefined,
    "",
    revision,
  );
}

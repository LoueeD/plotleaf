import { createHash } from "node:crypto";
import type { Report } from "../compiler/ir.js";
import type { Diagnostic } from "../compiler/diagnostic-core.js";
import {
  renderHtml as renderDocument,
  renderDiagnostics as renderErrors,
  type Assets,
} from "./document.js";
export { escapeHtml, inlineScript, type Assets } from "./document.js";

const hash = (script: string): string =>
  createHash("sha256").update(script).digest("base64");
export function renderHtml(
  report: Report,
  assets: Assets,
  preview = false,
  revision = 0,
): string {
  return renderDocument(report, assets, hash, preview, revision);
}
export function renderDiagnostics(
  diagnostics: Diagnostic[],
  assets: Assets,
  preview = true,
  revision = 0,
): string {
  return renderErrors(diagnostics, assets, hash, preview, revision);
}

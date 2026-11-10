import type { Position } from "unist";

export interface Diagnostic {
  code: string;
  severity: "error" | "warning";
  file: string;
  line: number;
  column: number;
  message: string;
  hint?: string;
}

export class Diagnostics {
  readonly items: Diagnostic[] = [];
  private errors = false;
  constructor(readonly file: string) {}
  add(
    code: string,
    message: string,
    position?: Position,
    hint?: string,
    severity: Diagnostic["severity"] = "error",
  ): void {
    if (severity === "error") this.errors = true;
    if (this.items.length >= 100) {
      this.errors = true;
      this.items[99] = {
        code: "E_DIAGNOSTIC_LIMIT",
        severity: "error",
        file: this.file,
        line: position?.start.line ?? 1,
        column: position?.start.column ?? 1,
        message:
          "Report exceeds the limit of 100 diagnostics. Fix the reported issues first.",
      };
      return;
    }
    this.items.push({
      code,
      severity,
      file: this.file,
      line: position?.start.line ?? 1,
      column: position?.start.column ?? 1,
      message: message.length > 2000 ? message.slice(0, 1999) + "…" : message,
      ...(hint
        ? { hint: hint.length > 1500 ? hint.slice(0, 1499) + "…" : hint }
        : {}),
    });
  }
  get hasErrors(): boolean {
    return this.errors;
  }
  sorted(): Diagnostic[] {
    return [...this.items].sort(
      (a, b) =>
        a.file.localeCompare(b.file, "en") ||
        a.line - b.line ||
        a.column - b.column ||
        a.code.localeCompare(b.code, "en"),
    );
  }
}

export function humanDiagnostics(items: Diagnostic[]): string {
  return items
    .map(
      (d) =>
        `${d.file}:${d.line}:${d.column} ${d.code}${d.severity === "warning" ? " (warning)" : ""}\n${d.message}${d.hint ? `\n${d.hint}` : ""}`,
    )
    .join("\n\n");
}

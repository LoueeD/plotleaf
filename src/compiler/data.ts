import path from "node:path";
import { open, realpath, stat } from "node:fs/promises";
import type { Block, ComponentBlock } from "./ir.js";
import type { ColumnProps } from "./registry.js";
import type { Cell, Row } from "../shared/payload.js";
import { Diagnostics } from "./diagnostics.js";
import { limits } from "../shared/limits.js";

export { limits } from "../shared/limits.js";
const reserved = new Set(["__proto__", "constructor", "prototype"]);

export function contained(root: string, filename: string): boolean {
  const relative = path.relative(root, filename);
  return (
    relative === "" ||
    (!path.isAbsolute(relative) &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`))
  );
}

export async function readBounded(
  filename: string,
  maximum: number,
): Promise<{ text: string; bytes: number }> {
  if (!(await stat(filename)).isFile())
    throw new Error("Expected a regular file.");
  const file = await open(filename, "r");
  try {
    const stat = await file.stat();
    if (!stat.isFile()) throw new Error("Expected a regular file.");
    if (stat.size > maximum)
      throw new Error(
        `File exceeds the ${Math.floor(maximum / 1024)} KiB size limit.`,
      );
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (bytes <= maximum) {
      const buffer = Buffer.alloc(Math.min(64 * 1024, maximum + 1 - bytes));
      const result = await file.read(buffer, 0, buffer.length, null);
      if (!result.bytesRead) break;
      chunks.push(buffer.subarray(0, result.bytesRead));
      bytes += result.bytesRead;
    }
    if (bytes > maximum)
      throw new Error("File grew beyond the size limit while reading.");
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks, bytes),
      ),
      bytes,
    };
  } finally {
    await file.close();
  }
}

export function parseDate(value: string): number | undefined {
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const day = Date.parse(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(day) ||
    new Date(day).toISOString().slice(0, 10) !== date
  )
    return;
  if (value.length === 10) return day;
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      value,
    )
  )
    return;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export class DataResolver {
  private readonly cache = new Map<string, Row[]>();
  constructor(
    readonly root: string,
    readonly diagnostics: Diagnostics,
    readonly dependencies: Set<string>,
    private totalBytes = 0,
  ) {}

  async load(
    reference: string,
    block: ComponentBlock,
  ): Promise<Row[] | undefined> {
    const fail = (code: string, message: string, hint?: string): undefined => {
      this.diagnostics.add(
        code,
        `${reference}: ${message}`,
        block.position,
        hint,
      );
      return;
    };
    if (
      path.isAbsolute(reference) ||
      /^[A-Za-z][A-Za-z\d+.-]*:/.test(reference) ||
      reference.includes("\\") ||
      /%[\da-f]{2}/i.test(reference) ||
      reference.includes("\0")
    )
      return fail("E_DATA_PATH", "Use a plain relative local .json path.");
    const candidate = path.resolve(this.root, reference);
    if (!contained(this.root, candidate))
      return fail(
        "E_DATA_PATH",
        "Reference escapes the report directory.",
        "Place prepared JSON beside the report or in one of its subdirectories.",
      );
    if (
      path
        .relative(this.root, candidate)
        .split(path.sep)
        .some((segment) => segment.startsWith("."))
    )
      return fail(
        "E_DATA_PATH",
        "Hidden files and directories are not allowed.",
      );
    if (path.extname(candidate).toLowerCase() !== ".json")
      return fail("E_DATA_PATH", "Datasets must be .json files.");
    this.dependencies.add(candidate);
    let canonical: string;
    try {
      canonical = await realpath(candidate);
    } catch {
      return fail(
        "E_DATA_READ",
        "Cannot read the referenced dataset.",
        "Create the file at this path or correct the data property.",
      );
    }
    if (
      !contained(this.root, canonical) ||
      path
        .relative(this.root, canonical)
        .split(path.sep)
        .some((segment) => segment.startsWith("."))
    )
      return fail(
        "E_DATA_PATH",
        "The resolved file or symlink escapes the permitted report files.",
      );
    if (path.extname(canonical).toLowerCase() !== ".json")
      return fail(
        "E_DATA_PATH",
        "The resolved file must also have a .json extension.",
      );
    this.dependencies.add(canonical);
    const cached = this.cache.get(canonical);
    if (cached) return cached;
    if (this.cache.size >= limits.datasets)
      return fail(
        "E_DATA_LIMIT",
        `At most ${limits.datasets} datasets are supported.`,
      );
    let input: { text: string; bytes: number };
    try {
      input = await readBounded(
        canonical,
        Math.min(limits.jsonBytes, limits.totalBytes - this.totalBytes),
      );
    } catch (error) {
      return fail(
        "E_DATA_READ",
        error instanceof Error ? error.message : "Could not read data.",
      );
    }
    this.totalBytes += input.bytes;
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.text);
    } catch {
      return fail(
        "E_DATA_JSON",
        "Invalid JSON.",
        "Use a JSON array of flat records, without comments or trailing commas.",
      );
    }
    if (!Array.isArray(parsed))
      return fail("E_DATA_SHAPE", "Expected an array of flat JSON records.");
    if (parsed.length > limits.rows)
      return fail(
        "E_DATA_LIMIT",
        `Dataset exceeds ${limits.rows.toLocaleString("en-GB")} rows.`,
        "Prepare a smaller aggregate dataset before rendering.",
      );
    for (const [index, row] of parsed.entries()) {
      if (!row || typeof row !== "object" || Array.isArray(row))
        return fail("E_DATA_SHAPE", `Row ${index + 1} is not a record.`);
      for (const [key, value] of Object.entries(row)) {
        if (reserved.has(key))
          return fail(
            "E_DATA_KEY",
            `Row ${index + 1} contains the reserved key ${JSON.stringify(key)}.`,
          );
        if (!(
          value === null ||
          typeof value === "string" ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value))
        ))
          return fail(
            "E_DATA_SHAPE",
            `Row ${index + 1}, field ${JSON.stringify(key)} must contain a finite number, string, boolean or null.`,
            "Prepare flat scalar records. Nested cells and sparkline data are planned separately.",
          );
      }
    }
    const rows = parsed as Row[];
    this.cache.set(canonical, rows);
    return rows;
  }

  async resolve(blocks: Block[]): Promise<void> {
    for (const block of blocks) {
      if (block.type !== "component") continue;
      if (
        block.name === "line" ||
        block.name === "area" ||
        block.name === "bar" ||
        block.name === "table"
      ) {
        const rows = await this.load(block.props.data, block);
        if (rows) {
          if (!rows.length)
            this.diagnostics.add(
              "W_DATA_EMPTY",
              `${block.props.data} is empty; a no-data state will be shown.`,
              block.position,
              "Field validation requires at least one record.",
              "warning",
            );
          if (block.name === "table") this.resolveTable(block, rows);
          else this.resolveChart(block, rows);
        }
      }
      await this.resolve(block.children);
    }
  }

  private field(rows: Row[], name: string, block: ComponentBlock): boolean {
    const index = rows.findIndex((row) => !Object.hasOwn(row, name));
    if (index < 0) return true;
    const available = Object.keys(rows[index] ?? {});
    this.diagnostics.add(
      "E_DATA_FIELD",
      `${block.name} references missing field ${JSON.stringify(name)} in ${block.props && "data" in block.props ? block.props.data : "dataset"}, row ${index + 1}.`,
      block.position,
      `Available fields: ${available.slice(0, 12).join(", ") || "none"}${available.length > 12 ? ` … (${available.length - 12} more)` : ""}.`,
    );
    return false;
  }

  private resolveChart(
    block: Extract<ComponentBlock, { name: "line" | "area" | "bar" }>,
    rows: Row[],
  ): void {
    const { x, y } = block.props;
    if (rows.length > limits.chartRows) {
      this.diagnostics.add(
        "E_DATA_LIMIT",
        `Chart exceeds ${limits.chartRows} points/categories.`,
        block.position,
        "Prepare a smaller chart aggregate.",
      );
      return;
    }
    if (!this.field(rows, x, block) || !this.field(rows, y, block)) return;
    const kind = block.name === "bar" ? "category" : block.props.xType;
    const seen = new Set<string | number>();
    let previous = -Infinity;
    for (const [index, row] of rows.entries()) {
      const xv = row[x];
      const yv = row[y];
      const validY =
        (typeof yv === "number" && Number.isFinite(yv)) ||
        (block.name !== "bar" && yv === null);
      let normalized: string | number | undefined;
      if (
        kind === "category" &&
        (typeof xv === "string" || typeof xv === "number")
      )
        normalized = String(xv);
      if (kind === "number" && typeof xv === "number") normalized = xv;
      if (kind === "date" && typeof xv === "string") normalized = parseDate(xv);
      if (normalized === undefined || !validY) {
        this.diagnostics.add(
          "E_DATA_TYPE",
          `${block.props.data}, row ${index + 1}: ${JSON.stringify(x)} must be ${kind === "date" ? "an ISO date or zoned timestamp" : `a ${kind === "number" ? "number" : "string or number category"}`} and ${JSON.stringify(y)} must be ${block.name === "bar" ? "a number" : "a number or null"}.`,
          block.position,
        );
        return;
      }
      if (
        seen.has(normalized) ||
        (typeof normalized === "number" &&
          kind !== "category" &&
          normalized <= previous)
      ) {
        this.diagnostics.add(
          "E_DATA_ORDER",
          `${block.props.data}, row ${index + 1}: x values must be unique${kind !== "category" ? " and increasing" : ""}.`,
          block.position,
          "Sort or aggregate the prepared dataset; plotleaf does not silently change chart data.",
        );
        return;
      }
      seen.add(normalized);
      if (typeof normalized === "number") previous = normalized;
    }
    block.rows = rows.map((row) =>
      Object.fromEntries(
        [...new Set([x, y])].map((key) => [key, row[key] as Cell]),
      ),
    );
  }

  private resolveTable(
    block: Extract<ComponentBlock, { name: "table" }>,
    rows: Row[],
  ): void {
    if (rows.length > limits.tableRows) {
      this.diagnostics.add(
        "E_DATA_LIMIT",
        `Table exceeds ${limits.tableRows} rows.`,
        block.position,
        "Provide a prepared summary table; rows are never silently truncated.",
      );
      return;
    }
    const inferred = Object.keys(rows[0] ?? {});
    const explicit = block.children.filter(
      (child): child is Extract<ComponentBlock, { name: "column" }> =>
        child.type === "component" && child.name === "column",
    );
    const columns: ColumnProps[] = explicit.length
      ? explicit.map((column) => column.props)
      : inferred.map((field) => ({
          field,
          sign: "auto",
          semantics: "neutral",
        }));
    if (columns.length > limits.tableColumns) {
      this.diagnostics.add(
        "E_DATA_LIMIT",
        `Table exceeds ${limits.tableColumns} columns.`,
        block.position,
        "Declare a smaller selection of column fields.",
      );
      return;
    }
    if (new Set(columns.map((column) => column.field)).size !== columns.length)
      this.diagnostics.add(
        "E_TABLE_COLUMN",
        "A table cannot declare the same column field twice.",
        block.position,
      );
    for (const [index, row] of rows.entries())
      if (
        Object.keys(row).length !== inferred.length ||
        inferred.some((field) => !Object.hasOwn(row, field))
      ) {
        this.diagnostics.add(
          "E_DATA_SHAPE",
          `${block.props.data}, row ${index + 1}: table records must have consistent keys.`,
          block.position,
        );
        return;
      }
    for (const column of columns) {
      if (!this.field(rows, column.field, block)) continue;
      const types = new Set(
        rows
          .map((row) => row[column.field])
          .filter((value) => value !== null)
          .map((value) => typeof value),
      );
      if (types.size > 1)
        this.diagnostics.add(
          "E_DATA_TYPE",
          `Table field ${JSON.stringify(column.field)} has mixed non-null types.`,
          block.position,
        );
      if (
        (column.format ||
          column.sign !== "auto" ||
          column.semantics !== "neutral") &&
        types.size &&
        !types.has("number")
      )
        this.diagnostics.add(
          "E_TABLE_FORMAT",
          `Numeric formatting/sign/semantics cannot be applied to ${JSON.stringify(column.field)}.`,
          block.position,
        );
    }
    block.columns = columns;
    block.rows = rows.map((row) =>
      Object.fromEntries(
        columns.map((column) => [column.field, row[column.field] as Cell]),
      ),
    );
  }
}

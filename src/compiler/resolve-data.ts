import { subtotalSchema } from "./subtotal-schema.js";
import {
  checkCompositionStructure,
  compositionLimits,
} from "./composition-schema.js";
import {
  compositionState,
  expandComposition,
  type CompositionState,
} from "./composition.js";
import {
  resolveExploration,
  expansionBudget,
  type ExpansionBudget,
} from "./exploration.js";
import type { Block, ComponentBlock, RichCell, TableRow } from "./ir.js";
import {
  LocalFileError,
  type SourceFiles,
  type SourceImages,
} from "./sources.js";
import { parseDate } from "../shared/date.js";
import type { ColumnProps } from "./registry.js";
import { funnelStatuses, type Cell } from "../shared/payload.js";
import { Diagnostics } from "./diagnostic-core.js";
import { limits } from "../shared/limits.js";

export { limits } from "../shared/limits.js";
type SourceRow = Record<string, Cell | (number | null)[]>;
const reserved = new Set(["__proto__", "constructor", "prototype"]);

export class DataResolver {
  constructor(
    readonly diagnostics: Diagnostics,
    private readonly files: SourceFiles,
    readonly images: SourceImages,
    private readonly expansion: ExpansionBudget = expansionBudget(),
    private readonly compositions: CompositionState = compositionState(),
    private readonly inExploration = false,
    private readonly cache = new Map<
      string,
      {
        rows: SourceRow[];
        arrays: Map<string, number>;
        grouped?: NonNullable<ComponentBlock["tableGroups"]>;
      }
    >(),
  ) {}

  async load(
    reference: string,
    block: ComponentBlock,
  ): Promise<SourceRow[] | undefined> {
    const fail = (code: string, message: string, hint?: string): undefined => {
      this.diagnostics.add(
        code,
        `${reference}: ${message}`,
        block.position,
        hint,
      );
      return;
    };
    let canonical: string;
    try {
      canonical = await this.files.resolve(reference, [".json"]);
    } catch (error) {
      return fail(
        error instanceof LocalFileError && error.kind === "path"
          ? "E_DATA_PATH"
          : "E_DATA_READ",
        error instanceof Error ? error.message : "Cannot resolve the dataset.",
        "Place prepared JSON within the report directory and correct the data property.",
      );
    }
    let dataset = this.cache.get(canonical);
    if (!dataset) {
      if (this.cache.size >= limits.datasets)
        return fail(
          "E_DATA_LIMIT",
          `At most ${limits.datasets} datasets are supported.`,
        );
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(
          await this.files.read(canonical, limits.jsonBytes),
        );
      } catch (error) {
        return fail(
          "E_DATA_READ",
          error instanceof Error ? error.message : "Could not read data.",
        );
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return fail(
          "E_DATA_JSON",
          "Invalid JSON.",
          "Use a JSON array of records, without comments or trailing commas.",
        );
      }
      let grouped: NonNullable<ComponentBlock["tableGroups"]> | undefined;
      if (block.name === "table" && block.props.prepared === "grouped") {
        const structural = checkCompositionStructure(parsed);
        if (structural) return fail("E_TABLE_GROUPS", structural);
        const result = subtotalSchema.safeParse(parsed);
        if (!result.success)
          return fail(
            "E_TABLE_GROUPS",
            result.error.issues
              .slice(0, 8)
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; "),
          );
        grouped = {
          scope: result.data.scope,
          groups: result.data.groups.map((group) => ({
            id: group.id,
            label: group.label,
            size: group.rows.length,
          })),
        };
        parsed = result.data.groups.flatMap((group) => [
          ...group.rows,
          group.subtotal,
        ]);
      }
      if (!Array.isArray(parsed))
        return fail(
          "E_DATA_SHAPE",
          "Expected an array of flat JSON records, or declare prepared=grouped for a subtotal bundle.",
        );
      if (parsed.length > limits.rows)
        return fail(
          "E_DATA_LIMIT",
          `Dataset exceeds ${limits.rows.toLocaleString("en-GB")} rows.`,
          "Prepare a smaller dataset before rendering.",
        );
      const arrays = new Map<string, number>();
      for (const [index, row] of parsed.entries()) {
        if (!row || typeof row !== "object" || Array.isArray(row))
          return fail("E_DATA_SHAPE", `Row ${index + 1} is not a record.`);
        for (const [key, value] of Object.entries(row)) {
          if (reserved.has(key))
            return fail(
              "E_DATA_KEY",
              `Row ${index + 1} contains the reserved key ${JSON.stringify(key)}.`,
            );
          if (Array.isArray(value)) {
            if (value.length > limits.sparklinePoints)
              return fail(
                "E_DATA_LIMIT",
                `Row ${index + 1}, field ${JSON.stringify(key)} exceeds ${limits.sparklinePoints} sparkline points.`,
                "Prepare a bounded sequence; values are never truncated.",
              );
            if (
              value.some(
                (item) =>
                  item !== null &&
                  !(typeof item === "number" && Number.isFinite(item)),
              )
            )
              return fail(
                "E_DATA_SHAPE",
                `Row ${index + 1}, field ${JSON.stringify(key)} must contain only finite numbers or null gaps.`,
                "Only declared sparkline columns support sequences; nested objects and sequences are invalid.",
              );
            if (!arrays.has(key)) arrays.set(key, index);
          } else if (!(
            value === null ||
            typeof value === "string" ||
            typeof value === "boolean" ||
            (typeof value === "number" && Number.isFinite(value))
          ))
            return fail(
              "E_DATA_SHAPE",
              `Row ${index + 1}, field ${JSON.stringify(key)} must contain a finite number, string, boolean or null.`,
              "Prepare flat scalar records; use an explicit sparkline column for bounded numeric/null sequences.",
            );
        }
      }
      dataset = {
        rows: parsed as SourceRow[],
        arrays,
        ...(grouped ? { grouped } : {}),
      };
      this.cache.set(canonical, dataset);
    }
    if (
      Boolean(dataset.grouped) !==
      (block.name === "table" && block.props.prepared === "grouped")
    )
      return fail(
        "E_DATA_SHAPE",
        "Grouped subtotal bundles require prepared=grouped and cannot be used as ordinary datasets.",
      );
    if (block.name === "table" && dataset.grouped)
      block.tableGroups = dataset.grouped;
    const declared = new Set(
      block.name === "table"
        ? block.children.flatMap((child) =>
            child.type === "component" &&
            child.name === "column" &&
            child.props.kind === "sparkline"
              ? [child.props.field]
              : [],
          )
        : [],
    );
    for (const [field, index] of dataset.arrays)
      if (!declared.has(field))
        return fail(
          "E_DATA_SHAPE",
          `Row ${index + 1}, field ${JSON.stringify(field)} is a sequence without an explicit sparkline column.`,
          'Use a table column with kind="sparkline" for that field. Charts and scalar tables require flat scalar datasets.',
        );
    return dataset.rows;
  }

  async resolve(blocks: Block[], parent = "root"): Promise<void> {
    for (let index = 0; index < blocks.length; index++) {
      let block = blocks[index]!;
      if (block.type === "component" && block.name === "component") {
        const expanded = await expandComposition(
          block,
          this.files,
          this.diagnostics,
          this.compositions,
          parent,
        );
        blocks.splice(index, 1, ...expanded);
        if (!expanded.length) {
          index--;
          continue;
        }
        index--;
        continue;
      }
      if (block.type !== "component") continue;
      if (block.name === "explore") {
        if (this.inExploration) {
          this.diagnostics.add(
            "E_EXPLORE_SCHEMA",
            "Nested explorations are unsupported, including inside compositions.",
            block.position,
          );
          continue;
        }
        await resolveExploration(
          block,
          this.files,
          this.diagnostics,
          (children, files, diagnostics) =>
            new DataResolver(
              diagnostics,
              files,
              this.images,
              this.expansion,
              this.compositions,
              true,
              this.cache,
            ).resolve(children),
          this.expansion,
        );
        continue;
      }
      if (
        block.name === "line" ||
        block.name === "area" ||
        block.name === "bar" ||
        block.name === "donut" ||
        block.name === "funnel" ||
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
          if (block.name === "table") await this.resolveTable(block, rows);
          else if (block.name === "donut" || block.name === "funnel")
            this.resolveParts(block, rows);
          else this.resolveChart(block, rows);
        }
      }
      if (block.compositionOrigin && block.rows) {
        this.compositions.rows += block.rows.length;
        this.compositions.dataBytes += new TextEncoder().encode(
          JSON.stringify(block.rows),
        ).length;
        if (
          this.compositions.rows > compositionLimits.rows ||
          this.compositions.dataBytes > compositionLimits.dataBytes
        ) {
          this.diagnostics.add(
            "E_COMPONENT_LIMIT",
            "Expanded composition data exceeds its row or byte budget.",
            block.position,
            "Prepare a smaller dataset or reuse fewer components.",
          );
          return;
        }
      }
      await this.resolve(block.children, block.name);
    }
  }

  private field(
    rows: SourceRow[],
    name: string,
    block: ComponentBlock,
  ): boolean {
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
    rows: SourceRow[],
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

  private resolveParts(
    block: Extract<ComponentBlock, { name: "donut" | "funnel" }>,
    rows: SourceRow[],
  ): void {
    const props = block.props;
    const maximum =
      block.name === "donut" ? limits.donutSlices : limits.funnelStages;
    const fields =
      block.name === "donut"
        ? [block.props.category, props.value]
        : [
            block.props.stage,
            props.value,
            block.props.total,
            block.props.share,
            ...(block.props.status ? [block.props.status] : []),
          ];
    const fail = (code: string, message: string, hint: string): void => {
      this.diagnostics.add(
        code,
        `${props.data}: ${message}`,
        block.position,
        hint,
      );
    };
    if (rows.length > maximum) {
      fail(
        "E_DATA_LIMIT",
        `${block.name} supports at most ${maximum} rows.`,
        "Prepare a smaller summary; plotleaf does not group or truncate data.",
      );
      return;
    }
    if (fields.some((field) => !this.field(rows, field, block))) return;
    const seen = new Set<string>();
    let sum = 0;
    for (const [index, row] of rows.entries()) {
      const name = row[fields[0]!];
      const value = row[props.value];
      if (typeof name !== "string" || !name.trim() || name.length > 1000) {
        fail(
          "E_DATA_TYPE",
          `Row ${index + 1}: ${JSON.stringify(fields[0])} must be a nonblank string of at most 1000 characters.`,
          "Supply a short, explicit label for every category or stage.",
        );
        return;
      }
      if (seen.has(name)) {
        fail(
          "E_DATA_ORDER",
          `Row ${index + 1}: category/stage labels must be unique.`,
          "Prepare distinct labels; source order is preserved.",
        );
        return;
      }
      seen.add(name);
      if (typeof value !== "number" || value < 0) {
        fail(
          "E_DATA_TYPE",
          `Row ${index + 1}: ${JSON.stringify(props.value)} must be a nonnegative number.`,
          "Use finite JSON numbers, not nulls or numeric strings.",
        );
        return;
      }
      if (block.name === "donut") {
        sum += value;
        if (!Number.isFinite(sum)) {
          fail(
            "E_DATA_VALUE",
            "The donut total exceeds the finite numeric range.",
            "Prepare values in smaller units before rendering.",
          );
          return;
        }
      } else {
        const total = row[block.props.total];
        const share = row[block.props.share];
        if (
          typeof total !== "number" ||
          total <= 0 ||
          value > total ||
          typeof share !== "number" ||
          share < 0 ||
          share > 1
        ) {
          fail(
            "E_DATA_VALUE",
            `Row ${index + 1}: total must be positive, value must not exceed total, and share must be a number from 0 to 1.`,
            "Supply each stage's denominator and prepared ratio explicitly; use an empty array when no baseline exists.",
          );
          return;
        }
        if (Math.abs(share - value / total) > 0.0005 + Number.EPSILON) {
          fail(
            "E_DATA_VALUE",
            `Row ${index + 1}: share does not match value / total.`,
            "Prepare a ratio consistent with the displayed values; rounding to 0.1 percentage point is supported.",
          );
          return;
        }
        if (block.props.status) {
          const status = row[block.props.status];
          if (
            typeof status !== "string" ||
            !Object.hasOwn(funnelStatuses, status)
          ) {
            fail(
              "E_DATA_VALUE",
              `Row ${index + 1}: status must be ${Object.keys(funnelStatuses).join(", ")}.`,
              "Supply business status explicitly, or omit the status property for neutral styling.",
            );
            return;
          }
        }
      }
    }
    block.rows = rows.map((row) =>
      Object.fromEntries(fields.map((field) => [field, row[field] as Cell])),
    );
  }

  private async resolveTable(
    block: Extract<ComponentBlock, { name: "table" }>,
    rows: SourceRow[],
  ): Promise<void> {
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
    if (
      new Set(columns.map((column) => column.field)).size !== columns.length
    ) {
      this.diagnostics.add(
        "E_TABLE_COLUMN",
        "A table cannot declare the same column field twice.",
        block.position,
      );
      return;
    }
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
    const prepared: TableRow[] = rows.map(() => ({}));
    for (const column of columns) {
      const origin =
        explicit.find((child) => child.props.field === column.field) ?? block;
      const fields = [
        column.field,
        ...(column.alt ? [column.alt] : []),
        ...(column.sortBy ? [column.sortBy] : []),
      ];
      if (fields.some((field) => !this.field(rows, field, origin))) continue;
      const fail = (
        code: string,
        row: number,
        message: string,
        hint?: string,
      ): void =>
        this.diagnostics.add(
          code,
          `${block.props.data}, row ${row + 1}, field ${JSON.stringify(column.field)}: ${message}`,
          origin.position,
          hint,
        );
      const kind = column.kind ?? "scalar";
      if (kind === "scalar") {
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
            origin.position,
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
            origin.position,
          );
      }
      let sortType: string | undefined;
      for (const [index, row] of rows.entries()) {
        const value = row[column.field]!;
        const sort = column.sortBy ? row[column.sortBy] : undefined;
        if (column.sortBy && (Array.isArray(sort) || sort === undefined)) {
          fail("E_TABLE_SORT", index, "sortBy must name a scalar field.");
          continue;
        }
        if (sort !== undefined && sort !== null) {
          if (sortType && sortType !== typeof sort) {
            fail(
              "E_TABLE_SORT",
              index,
              "sortBy values must have consistent non-null types.",
            );
            continue;
          }
          sortType = typeof sort;
        }
        if (kind === "scalar") {
          prepared[index]![column.field] = value as Cell;
          continue;
        }
        let rich: RichCell;
        if (kind === "sparkline") {
          if (value !== null && !Array.isArray(value)) {
            fail(
              "E_DATA_TYPE",
              index,
              "Sparkline values must be a bounded numeric/null array or null.",
            );
            continue;
          }
          rich = {
            kind: "sparkline",
            values: value ?? [],
            ...(column.sortBy ? { sort: sort as Cell } : {}),
          };
        } else {
          const alt = row[column.alt!];
          if (
            (value !== null &&
              (typeof alt !== "string" || !alt.trim() || alt.length > 1000)) ||
            (value === null && alt !== null && typeof alt !== "string")
          ) {
            fail(
              "E_TABLE_IMAGE",
              index,
              "alt must name a nonblank string of at most 1000 characters for each image.",
            );
            continue;
          }
          if (value === null) {
            prepared[index]![column.field] = {
              kind: "image",
              imageId: null,
              alt: "",
              ...(column.sortBy ? { sort: sort as Cell } : {}),
            };
            continue;
          }
          if (typeof value !== "string" || !value.trim()) {
            fail(
              "E_TABLE_IMAGE",
              index,
              "Image values must be a plain local PNG/JPEG path or null.",
            );
            continue;
          }
          try {
            const image = await this.images.load(value);
            rich = {
              kind: "image",
              imageId: image.id,
              alt: alt as string,
              ...(column.sortBy ? { sort: sort as Cell } : {}),
            };
          } catch (error) {
            fail(
              error instanceof LocalFileError
                ? error.kind === "path"
                  ? "E_ASSET_PATH"
                  : "E_ASSET_READ"
                : "E_ASSET_IMAGE",
              index,
              `${value}: ${error instanceof Error ? error.message : "Cannot read image."}`,
              "Use a bounded static PNG/JPEG inside the report directory, with a matching extension.",
            );
            continue;
          }
        }
        prepared[index]![column.field] = rich;
      }
    }
    block.columns = columns;
    block.rows = prepared;
  }
}

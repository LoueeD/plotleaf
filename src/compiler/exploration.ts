import { explorationSchema, type InputValue } from "./exploration-schema.js";
import { valueKey, explorationLimits } from "../shared/exploration.js";
import { Diagnostics } from "./diagnostic-core.js";
import { parseReport } from "./parse.js";
import { limits } from "../shared/limits.js";
import { LocalFileError, type SourceFiles } from "./sources.js";
import type { Block, ComponentBlock } from "./ir.js";

export interface ExpansionBudget {
  explorations: number;
  components: number;
  rows: number;
  markdownBytes: number;
  dataBytes: number;
}
export const expansionBudget = (): ExpansionBudget => ({
  explorations: 0,
  components: 0,
  rows: 0,
  markdownBytes: 0,
  dataBytes: 0,
});
export async function resolveExploration(
  block: Extract<ComponentBlock, { name: "explore" }>,
  files: SourceFiles,
  diagnostics: Diagnostics,
  resolve: (
    blocks: Block[],
    files: SourceFiles,
    diagnostics: Diagnostics,
  ) => Promise<void>,
  budget: ExpansionBudget,
): Promise<void> {
  const fail = (message: string, code = "E_EXPLORE_SCHEMA") =>
    diagnostics.add(
      code,
      `${block.props.data}: ${message}`,
      block.position,
      "Correct the prepared-view bundle; every view must declare all input values.",
    );
  try {
    if (++budget.explorations > explorationLimits.explorations) {
      fail("At most four explorations are supported.", "E_EXPLORE_LIMIT");
      return;
    }
    const filename = await files.resolve(block.props.data, [".json"]);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      await files.read(filename, limits.jsonBytes),
    );
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      fail("Invalid JSON.", "E_EXPLORE_JSON");
      return;
    }
    // Check keys before schema decoding can copy records. Traverse iteratively so
    // hostile nesting cannot exhaust the call stack in a JSON/schema walk.
    const pending: { value: unknown; depth: number }[] = [
      { value: raw, depth: 0 },
    ];
    let containers = 0;
    while (pending.length) {
      const { value, depth } = pending.pop()!;
      if (value === null || typeof value !== "object") continue;
      if (
        depth > explorationLimits.jsonDepth ||
        ++containers > explorationLimits.jsonContainers
      ) {
        fail(
          "JSON exceeds 32 nesting levels or 100,000 containers.",
          "E_EXPLORE_LIMIT",
        );
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (["__proto__", "constructor", "prototype"].includes(key)) {
          fail(`Reserved object key ${JSON.stringify(key)}.`, "E_EXPLORE_KEY");
          return;
        }
        if (child !== null && typeof child === "object")
          pending.push({ value: child, depth: depth + 1 });
      }
    }
    const parsed = explorationSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 12))
        fail(`${issue.path.join(".")}: ${issue.message}`);
      return;
    }
    const bundle = parsed.data;
    const ids = bundle.inputs.map((input) => input.id);
    if (new Set(ids).size !== ids.length) {
      fail("Input IDs must be unique.");
      return;
    }
    const domains = new Map<string, Set<string>>();
    for (const input of bundle.inputs) {
      const values =
        input.type === "toggle"
          ? [false, true]
          : input.options.map((option) => option.value);
      const domain = new Set(values.map(valueKey));
      if (
        domain.size !== values.length ||
        !domain.has(valueKey(input.default))
      ) {
        fail(
          `Input ${input.id} has duplicate choices or an unsupported default.`,
        );
        return;
      }
      domains.set(input.id, domain);
    }
    const combinations = new Set<string>(),
      viewIds = new Set<string>();
    const key = (when: Record<string, InputValue>) =>
      JSON.stringify(ids.map((id) => valueKey(when[id]!)));
    const initial = Object.fromEntries(
      bundle.inputs.map((input) => [input.id, input.default]),
    );
    for (const view of bundle.views) {
      if (viewIds.has(view.id)) {
        fail(`Duplicate view ID ${view.id}.`);
        return;
      }
      viewIds.add(view.id);
      if (
        Object.keys(view.when).length !== ids.length ||
        ids.some((id) => !Object.hasOwn(view.when, id)) ||
        Object.keys(view.when).some((id) => !domains.has(id))
      ) {
        fail(`View ${view.id} must declare exactly the scoped input IDs.`);
        return;
      }
      if (ids.some((id) => !domains.get(id)!.has(valueKey(view.when[id]!)))) {
        fail(
          `View ${view.id} contains an unsupported input value or value type.`,
        );
        return;
      }
      const combination = key(view.when);
      if (combinations.has(combination)) {
        fail(`View ${view.id} duplicates another input combination.`);
        return;
      }
      combinations.add(combination);
    }
    const defaultView = bundle.views.find(
      (view) => key(view.when) === key(initial),
    );
    if (!defaultView) {
      fail("Declared defaults must select one prepared view.");
      return;
    }
    const views: NonNullable<ComponentBlock["exploration"]>["views"] = [];
    for (const view of bundle.views) {
      budget.markdownBytes += new TextEncoder().encode(view.markdown).length;
      if (budget.markdownBytes > explorationLimits.markdownBytes) {
        fail("Expanded Markdown exceeds 2 MiB.", "E_EXPLORE_LIMIT");
        return;
      }
      const local = new Diagnostics(`${block.props.data}#${view.id}`);
      const report = parseReport(view.markdown, view.label, local);
      function inspect(blocks: Block[]): boolean {
        for (const child of blocks) {
          if (child.type !== "component") continue;
          if (child.name === "explore") {
            fail(`View ${view.id}: nested explorations are unsupported.`);
            return false;
          }
          if (++budget.components > explorationLimits.components) {
            fail("Expanded components exceed 512.", "E_EXPLORE_LIMIT");
            return false;
          }
          if (!inspect(child.children)) return false;
        }
        return true;
      }
      if (!inspect(report.blocks)) return;
      const inline = new Map(
        Object.entries(view.datasets).map(([name, rows]) => [
          `plotleaf-inline:${budget.explorations}-${view.id}:${name}`,
          new TextEncoder().encode(JSON.stringify(rows)),
        ]),
      );
      const virtual: SourceFiles = {
        async resolve(reference, extensions) {
          const name = reference.startsWith("./")
            ? reference.slice(2)
            : reference;
          const key = `plotleaf-inline:${budget.explorations}-${view.id}:${name}`;
          return inline.has(key) ? key : files.resolve(reference, extensions);
        },
        async read(name, maximum) {
          const bytes = inline.get(name);
          if (!bytes) return files.read(name, maximum);
          if (bytes.length > maximum)
            throw new Error("Prepared dataset exceeds the file size limit.");
          return bytes;
        },
      };
      // All row validation, projection and image resolution use the existing resolver.
      await resolve(report.blocks, virtual, local);
      function countRows(blocks: Block[]): void {
        for (const child of blocks)
          if (child.type === "component") {
            budget.rows += child.rows?.length ?? 0;
            budget.dataBytes += child.rows
              ? new TextEncoder().encode(JSON.stringify(child.rows)).length
              : 0;
            countRows(child.children);
          }
      }
      countRows(report.blocks);
      if (budget.rows > explorationLimits.rows) {
        fail("Expanded component rows exceed 20,000.", "E_EXPLORE_LIMIT");
        return;
      }
      if (budget.dataBytes > explorationLimits.dataBytes) {
        fail("Expanded prepared data exceeds 8 MiB.", "E_EXPLORE_LIMIT");
        return;
      }
      for (const item of local.sorted())
        diagnostics.add(
          item.code,
          `View ${view.id}, Markdown ${item.line}:${item.column}: ${item.message}`,
          block.position,
          item.hint,
          item.severity,
        );
      views.push({
        id: view.id,
        label: view.label,
        when: view.when,
        blocks: report.blocks,
      });
    }
    block.exploration = {
      inputs: bundle.inputs,
      defaultView: defaultView.id,
      views,
    };
  } catch (error) {
    fail(
      error instanceof Error
        ? error.message
        : "Could not read the exploration.",
      error instanceof LocalFileError && error.kind === "path"
        ? "E_EXPLORE_PATH"
        : "E_EXPLORE_READ",
    );
  }
}

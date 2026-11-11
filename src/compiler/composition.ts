import {
  checkCompositionStructure,
  compositionLimits,
  compositionSchema,
  type CompositionDefinition,
  type CompositionNode,
} from "./composition-schema.js";
import {
  registry,
  decodeProps,
  componentSpec,
  type ComponentName,
} from "./registry.js";
import { LocalFileError, type SourceFiles } from "./sources.js";
import { Diagnostics } from "./diagnostic-core.js";
import { limits } from "../shared/limits.js";
import type { Block, ComponentBlock } from "./ir.js";

const componentProperties = componentSpec().components;

export interface CompositionState {
  definitions: Map<string, CompositionDefinition>;
  nodes: number;
  rows: number;
  dataBytes: number;
}
export const compositionState = (): CompositionState => ({
  definitions: new Map(),
  nodes: 0,
  rows: 0,
  dataBytes: 0,
});

/** Combine report-root-relative references without normalizing away path policy checks. */
function relativeTo(reference: string, base: string): string {
  if (!base) return reference;
  if (
    /^(?:\/|[A-Za-z][A-Za-z\d+.-]*:)/.test(reference) ||
    reference.includes("\\")
  )
    return reference;
  return `${base}/${reference}`;
}
function parentOf(reference: string): string {
  const index = reference.lastIndexOf("/");
  return index < 0 ? "" : reference.slice(0, index);
}

export async function expandComposition(
  block: Extract<ComponentBlock, { name: "component" }>,
  files: SourceFiles,
  diagnostics: Diagnostics,
  state: CompositionState,
  parent: string,
  stack: string[] = [],
  origins: Record<string, string> = {},
): Promise<Block[]> {
  const fail = (code: string, message: string): Block[] => {
    diagnostics.add(
      code,
      `${block.props.src}: ${message}`,
      block.position,
      "Correct the composition definition and its declared literal parameters.",
    );
    return [];
  };
  let filename: string;
  try {
    filename = await files.resolve(block.props.src, [".json"]);
  } catch (error) {
    return fail(
      error instanceof LocalFileError && error.kind === "path"
        ? "E_COMPONENT_PATH"
        : "E_COMPONENT_READ",
      error instanceof Error ? error.message : "Cannot resolve definition.",
    );
  }
  if (stack.includes(filename))
    return fail(
      "E_COMPONENT_CYCLE",
      "Composition definitions cannot contain cycles.",
    );
  if (stack.length >= compositionLimits.depth)
    return fail(
      "E_COMPONENT_LIMIT",
      `Composition nesting exceeds ${compositionLimits.depth}.`,
    );
  let definition = state.definitions.get(filename);
  if (!definition) {
    if (state.definitions.size >= compositionLimits.definitions)
      return fail(
        "E_COMPONENT_LIMIT",
        `At most ${compositionLimits.definitions} definitions are supported.`,
      );
    let raw: unknown;
    try {
      raw = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          await files.read(filename, limits.jsonBytes),
        ),
      );
    } catch (error) {
      return fail(
        "E_COMPONENT_READ",
        error instanceof Error ? error.message : "Cannot read definition JSON.",
      );
    }
    const structural = checkCompositionStructure(raw);
    if (structural) return fail("E_COMPONENT_SCHEMA", structural);
    const parsed = compositionSchema.safeParse(raw);
    if (!parsed.success)
      return fail(
        "E_COMPONENT_SCHEMA",
        parsed.error.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
    definition = parsed.data;
    state.definitions.set(filename, definition);
  }
  const supplied = Object.entries(block.props).filter(
    ([name]) => name !== "src",
  );
  for (const [name] of supplied)
    if (!Object.hasOwn(definition.props, name))
      return fail(
        "E_COMPONENT_PROP",
        `Unknown parameter ${JSON.stringify(name)}.`,
      );
  const base = parentOf(block.props.src);
  const values: Record<string, string | number | boolean> = Object.create(null);
  const valueOrigins: Record<string, string> = Object.create(null);
  for (const [name, spec] of Object.entries(definition.props)) {
    const input = block.props[name];
    valueOrigins[name] = input === undefined ? base : (origins[name] ?? "");
    if (input === undefined) {
      if (spec.default === undefined)
        return fail(
          "E_COMPONENT_PROP",
          `Missing required parameter ${JSON.stringify(name)}.`,
        );
      values[name] = spec.default;
    } else if (spec.type === "number") {
      if (
        !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(input) ||
        !Number.isFinite(Number(input))
      )
        return fail("E_COMPONENT_PROP", `${name} must be a finite number.`);
      values[name] = Number(input);
    } else if (spec.type === "boolean") {
      if (input !== "true" && input !== "false")
        return fail("E_COMPONENT_PROP", `${name} must be true or false.`);
      values[name] = input === "true";
    } else values[name] = input;
  }
  const build = async (
    nodes: CompositionNode[],
    context: string,
    depth: number,
  ): Promise<Block[]> => {
    const out: Block[] = [];
    if (depth > compositionLimits.depth)
      return fail(
        "E_COMPONENT_LIMIT",
        "Component nesting exceeds the composition limit.",
      );
    for (const node of nodes) {
      if (++state.nodes > compositionLimits.nodes)
        return fail(
          "E_COMPONENT_LIMIT",
          `Expanded components exceed ${compositionLimits.nodes}.`,
        );
      if (!Object.hasOwn(registry, node.name)) {
        fail(
          "E_COMPONENT_UNKNOWN",
          `Unknown built-in ${JSON.stringify(node.name)}.`,
        );
        continue;
      }
      const name = node.name as ComponentName;
      const entry = registry[name];
      const allowed =
        context === "root"
          ? name !== "column"
          : (
              registry[context as ComponentName]?.children as
                readonly string[] | undefined
            )?.includes(name);
      if (!allowed) {
        fail(
          "E_COMPONENT_CONTEXT",
          `${name} is not allowed inside ${context}.`,
        );
        continue;
      }
      const attrs: Record<string, string> = Object.create(null);
      const childOrigins: Record<string, string> = Object.create(null);
      const properties = componentProperties[name]!.props.properties ?? {};
      let bad = false;
      for (const [key, value] of Object.entries(node.props)) {
        const dynamic = typeof value === "object";
        if (dynamic && !Object.hasOwn(values, value.prop)) {
          fail(
            "E_COMPONENT_PROP",
            `Unknown parameter reference ${JSON.stringify(value.prop)}.`,
          );
          bad = true;
          continue;
        }
        let resolved = dynamic ? values[value.prop]! : value;
        const property = properties[key] as { type?: string } | undefined;
        const expected =
          property?.type === "integer" ? "number" : property?.type;
        if (name !== "component" && expected && expected !== typeof resolved) {
          fail(
            "E_COMPONENT_PROP",
            `${name}.${key} requires ${expected}; received ${typeof resolved}.`,
          );
          bad = true;
          continue;
        }
        if (
          typeof resolved === "string" &&
          ((key === "data" &&
            [
              "line",
              "area",
              "bar",
              "donut",
              "funnel",
              "table",
              "explore",
            ].includes(name)) ||
            (key === "src" && name === "component"))
        )
          resolved = relativeTo(
            resolved,
            dynamic ? valueOrigins[value.prop]! : base,
          );
        attrs[key] = String(resolved);
        if (name === "component" && key !== "src")
          childOrigins[key] = dynamic ? valueOrigins[value.prop]! : base;
      }
      if (bad) continue;
      const decoded = decodeProps(name, attrs);
      if (decoded.errors.length) {
        fail("E_COMPONENT_PROP", `${name}: ${decoded.errors.join("; ")}`);
        continue;
      }
      const children = node.children ?? [];
      if (
        children.length &&
        !(entry.forms as readonly string[]).includes("container")
      ) {
        fail("E_COMPONENT_CONTEXT", `${name} cannot contain children.`);
        continue;
      }
      const built = {
        type: "component",
        name,
        props: decoded.props!,
        children: [],
        position: block.position,
        compositionOrigin: true,
      } as ComponentBlock;
      if (name === "component") {
        out.push(
          ...(await expandComposition(
            built as Extract<ComponentBlock, { name: "component" }>,
            files,
            diagnostics,
            state,
            context,
            [...stack, filename],
            childOrigins,
          )),
        );
      } else {
        built.children = await build(children, name, depth + 1);
        out.push(built);
      }
    }
    return out;
  };
  return build(definition.components, parent, 0);
}

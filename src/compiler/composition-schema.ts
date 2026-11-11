import * as z from "zod";

/** Shared limits apply to a whole compilation, including prepared views. */
export const compositionLimits = {
  depth: 16,
  definitions: 64,
  nodes: 512,
  rows: 20_000,
  dataBytes: 8 * 1024 * 1024,
  parameters: 32,
  jsonDepth: 32,
  jsonContainers: 10_000,
} as const;

const identifier = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,63}$/);
const literal = z.union([
  z.string().max(1000),
  z.number().finite(),
  z.boolean(),
]);
const parameter = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("string"),
    default: z.string().max(1000).optional(),
  }),
  z.strictObject({
    type: z.literal("number"),
    default: z.number().finite().optional(),
  }),
  z.strictObject({
    type: z.literal("boolean"),
    default: z.boolean().optional(),
  }),
]);
const value = z.union([literal, z.strictObject({ prop: identifier })]);
export type CompositionValue = z.infer<typeof value>;
export interface CompositionNode {
  name: string;
  props: Record<string, CompositionValue>;
  children?: CompositionNode[];
}
const node: z.ZodType<CompositionNode> = z.lazy(() =>
  z.strictObject({
    name: identifier,
    props: z.record(identifier, value),
    children: z.array(node).max(compositionLimits.nodes).optional(),
  }),
);
export const compositionSchema = z
  .strictObject({
    version: z.literal(1),
    props: z.record(identifier, parameter),
    components: z.array(node).min(1).max(compositionLimits.nodes),
  })
  .superRefine((definition, context) => {
    if (Object.hasOwn(definition.props, "src"))
      context.addIssue({
        code: "custom",
        path: ["props", "src"],
        message: "src is reserved for the composition definition path.",
      });
    if (Object.keys(definition.props).length > compositionLimits.parameters)
      context.addIssue({
        code: "custom",
        path: ["props"],
        message: `At most ${compositionLimits.parameters} parameters are supported.`,
      });
  });
export type CompositionDefinition = z.infer<typeof compositionSchema>;

/** Bound hostile JSON before recursive schema validation can visit it. */
export function checkCompositionStructure(value: unknown): string | undefined {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let containers = 0;
  while (pending.length) {
    const current = pending.pop()!;
    if (current.value === null || typeof current.value !== "object") continue;
    if (
      current.depth > compositionLimits.jsonDepth ||
      ++containers > compositionLimits.jsonContainers
    )
      return "Composition JSON exceeds the nesting or container limit.";
    for (const [key, child] of Object.entries(current.value)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        return `Reserved object key ${JSON.stringify(key)}.`;
      if (child !== null && typeof child === "object")
        pending.push({ value: child, depth: current.depth + 1 });
    }
  }
  return undefined;
}

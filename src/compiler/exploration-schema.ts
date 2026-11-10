import * as z from "zod";
import { explorationLimits } from "../shared/exploration.js";

const id = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{0,47}$/)
  .refine(
    (value) => !["constructor", "prototype"].includes(value),
    "Reserved identifier.",
  );
const label = z.string().min(1).max(160);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  }, "Use a real ISO calendar date.");
const range = z
  .strictObject({ start: date, end: date })
  .refine(
    (value) => value.start <= value.end,
    "Range start must not follow its end.",
  );
const common = { id, label };
export const explorationInputSchema = z.discriminatedUnion("type", [
  z.strictObject({
    ...common,
    type: z.enum(["select", "segmented", "text"]),
    default: z.string().max(120),
    options: z
      .array(z.strictObject({ value: z.string().max(120), label }))
      .min(1)
      .max(explorationLimits.options),
  }),
  z.strictObject({
    ...common,
    type: z.literal("number"),
    default: z.number().finite(),
    options: z
      .array(z.strictObject({ value: z.number().finite(), label }))
      .min(1)
      .max(explorationLimits.options),
  }),
  z.strictObject({
    ...common,
    type: z.literal("toggle"),
    default: z.boolean(),
  }),
  z.strictObject({
    ...common,
    type: z.literal("date-range"),
    default: range,
    options: z
      .array(z.strictObject({ value: range, label }))
      .min(1)
      .max(explorationLimits.options),
  }),
]);
export const explorationSchema = z.strictObject({
  inputs: z.array(explorationInputSchema).min(1).max(explorationLimits.inputs),
  views: z
    .array(
      z.strictObject({
        id,
        label,
        when: z.record(
          id,
          z.union([
            z.string().max(120),
            z.number().finite(),
            z.boolean(),
            range,
          ]),
        ),
        markdown: z
          .string()
          .min(1)
          .max(1024 ** 2),
        datasets: z
          .record(
            z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*\.json$/),
            z.array(z.record(z.string(), z.unknown())).max(10000),
          )
          .default({}),
      }),
    )
    .min(1)
    .max(explorationLimits.views),
});
export type ExplorationInput = z.infer<typeof explorationInputSchema>;
export type InputValue =
  string | number | boolean | { start: string; end: string };
export interface ExplorationConfig {
  id: string;
  inputs: ExplorationInput[];
  views: { id: string; label: string; when: Record<string, InputValue> }[];
}

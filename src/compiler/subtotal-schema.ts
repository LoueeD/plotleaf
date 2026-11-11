import * as z from "zod";
import { limits } from "../shared/limits.js";

/** Structural validation only: every row still uses normal table validation. */
const row = z.record(z.string(), z.unknown());
export const subtotalSchema = z
  .strictObject({
    version: z.literal(1),
    scope: z.string().trim().min(1).max(1000),
    groups: z
      .array(
        z.strictObject({
          id: z.string().trim().min(1).max(1000),
          label: z.string().trim().min(1).max(1000),
          rows: z.array(row).min(1).max(limits.tableRows),
          subtotal: row,
        }),
      )
      .max(limits.tableRows),
  })
  .superRefine((bundle, context) => {
    const ids = new Set<string>();
    let count = 0;
    for (const [index, group] of bundle.groups.entries()) {
      if (ids.has(group.id))
        context.addIssue({
          code: "custom",
          path: ["groups", index, "id"],
          message: "Group IDs must be unique.",
        });
      ids.add(group.id);
      count += group.rows.length + 1;
    }
    if (count > limits.tableRows)
      context.addIssue({
        code: "custom",
        path: ["groups"],
        message: `At most ${limits.tableRows} detail and subtotal rows are supported.`,
      });
  });
export type SubtotalBundle = z.infer<typeof subtotalSchema>;

import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { subtotalSchema } from "../../src/compiler/subtotal-schema.js";
import { root } from "./helpers.js";

test("prepared subtotals require a scope and unique groups", async () => {
  const bundle = JSON.parse(
    await readFile(
      path.join(root, "tests/fixtures/m6/prepared-subtotals.json"),
      "utf8",
    ),
  );
  expect(subtotalSchema.safeParse(bundle).success).toBe(true);
  expect(subtotalSchema.safeParse({ ...bundle, scope: " " }).success).toBe(
    false,
  );
  expect(
    subtotalSchema.safeParse({
      ...bundle,
      groups: [bundle.groups[0], bundle.groups[0]],
    }).success,
  ).toBe(false);
  expect(
    subtotalSchema.safeParse({
      ...bundle,
      groups: [{ ...bundle.groups[0], subtotal: undefined }],
    }).success,
  ).toBe(false);
});

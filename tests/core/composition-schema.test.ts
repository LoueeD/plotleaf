import { describe, expect, test } from "bun:test";
import {
  checkCompositionStructure,
  compositionSchema,
} from "../../src/compiler/composition-schema.js";
import { readFile } from "node:fs/promises";
import { root } from "./helpers.js";
import path from "node:path";

describe("composition definition contract", () => {
  test("accepts a versioned definition with typed parameter references", async () => {
    const example = JSON.parse(
      await readFile(
        path.join(root, "tests/fixtures/m6/components/summary.json"),
        "utf8",
      ),
    );
    expect(compositionSchema.safeParse(example).success).toBe(true);
  });
  test("rejects unknown fields, mismatched defaults and executable values", () => {
    const base = {
      version: 1,
      props: {},
      components: [{ name: "metric", props: { label: "A", value: 1 } }],
    };
    for (const definition of [
      { ...base, version: 2 },
      { ...base, script: "alert(1)" },
      { ...base, props: { value: { type: "number", default: "1" } } },
      {
        ...base,
        components: [
          { name: "metric", props: { value: { expression: "1 + 2" } } },
        ],
      },
    ])
      expect(compositionSchema.safeParse(definition).success).toBe(false);
  });
});

test("rejects dangerous keys and deeply nested JSON before recursive decoding", () => {
  expect(checkCompositionStructure(JSON.parse('{"__proto__":{}}'))).toContain(
    "Reserved",
  );
  let value: unknown = {};
  for (let depth = 0; depth < 40; depth++) value = [value];
  expect(checkCompositionStructure(value)).toContain("limit");
});

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

for (const [output, source] of [
  ["agent", "../skills/plotleaf/SKILL.md"],
  ["schema.json", "../schema/components.json"],
]) {
  assert.equal(
    await readFile(new URL(`../dist/${output}`, import.meta.url), "utf8"),
    await readFile(new URL(`../${source}`, import.meta.url), "utf8"),
    `${output} must match the reporting package's canonical content`,
  );
}
console.log("Agent guide and component schema match their canonical sources.");

for (const slug of [
  "showcase",
  "interactions",
  "storefront",
  "adoption",
  "onboarding",
  "catalog",
]) {
  const html = await readFile(
    new URL(`../dist/reports/${slug}/index.html`, import.meta.url),
    "utf8",
  );
  assert.ok(
    html.startsWith("<!doctype html>"),
    `${slug} must be a standalone report`,
  );
  assert.ok(
    html.includes("Content-Security-Policy"),
    `${slug} must retain export CSP`,
  );
}
const projects = JSON.parse(
  await readFile(
    new URL("../dist/playground-projects.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(projects.filter((project) => project.editable).length, 5);
const assets = await readdir(new URL("../dist/_astro/", import.meta.url));
assert.ok(
  assets.some((name) => /^compiler-.*\.js$/.test(name)),
  "Browser compiler must be emitted",
);
console.log("Six standalone reports and five editable projects are present.");

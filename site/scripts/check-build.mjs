import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const [output, source] of [
  ['agent', '../skills/plotleaf/SKILL.md'],
  ['schema.json', '../schema/components.json'],
]) {
  assert.equal(
    await readFile(new URL(`../dist/${output}`, import.meta.url), 'utf8'),
    await readFile(new URL(`../${source}`, import.meta.url), 'utf8'),
    `${output} must match the reporting package's canonical content`,
  );
}
console.log('Agent guide and component schema match their canonical sources.');

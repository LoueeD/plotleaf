import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditPackage } from "./audit-package.mjs";

// Immutable release evidence: run from the v0.1.0 checkout after building.
const integrity =
  "sha512-1+pPVjQcofJiJGNOQMN2io+wkNQsFfNK9TMc11QW1ldHfD8qAS141OMpAtIbtlz3Z6J1z/QgsB826HZt3unjFQ==";
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(path.join(tmpdir(), "plotleaf-published-"));
try {
  let archive = process.argv[2];
  if (!archive) {
    const response = await fetch(
      "https://registry.npmjs.org/plotleaf/-/plotleaf-0.1.0.tgz",
      {
        signal: AbortSignal.timeout(30_000),
      },
    );
    assert(response.ok, `Registry returned ${response.status}`);
    archive = path.join(temporary, "plotleaf-0.1.0.tgz");
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  }
  const audited = await auditPackage(archive);
  assert.equal(
    audited.integrity,
    integrity,
    "Published archive integrity changed.",
  );
  for (const filename of audited.files) {
    const extracted = spawnSync(
      "tar",
      ["-xOf", archive, `package/${filename}`],
      {
        maxBuffer: 4 * 1024 ** 2,
      },
    );
    assert.equal(extracted.status, 0, extracted.stderr.toString());
    assert.deepEqual(
      await readFile(path.join(root, filename)),
      extracted.stdout,
      `${filename} differs from published 0.1.0; verify from the v0.1.0 tag.`,
    );
  }
  console.log(
    `Published plotleaf@0.1.0 reproduced: all ${audited.files.length} files match byte for byte.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}

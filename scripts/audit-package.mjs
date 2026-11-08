import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Deliberately enumerate the public artifact. Adding a file requires review.
const approvedFiles = [
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.txt",
  "dist/cli.js",
  "dist/assets/base.js",
  "dist/assets/charts.js",
  "dist/assets/styles.css",
  "dist/assets/notices.txt",
  "schema/components.json",
  "examples/storefront/report.md",
  "examples/storefront/orders.json",
  "examples/storefront/returns.json",
  "examples/storefront/categories.json",
  "examples/adoption/report.md",
  "examples/adoption/adoption.json",
  "examples/adoption/plans.json",
  "examples/onboarding/report.md",
  "examples/onboarding/funnel.json",
  "examples/onboarding/plans.json",
  "examples/onboarding/signups.json",
  "skills/plotleaf/SKILL.md",
  "package.json",
]
  .map((filename) => `package/${filename}`)
  .sort();

const prohibited = [
  ["retired project name", /\btablio\b|dataTablio|TABLIO_/i],
  [
    "internal demo context",
    /\bMCP\b|Engineering Telemetry|Application Insights|internal (?:server|usage|telemetry)/i,
  ],
  ["local machine path", /\/(?:Users|home)\/|\/(?:private\/)?var\/folders\//],
  ["source map", /sourceMappingURL\s*=/],
  [
    "credential-shaped content",
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|npm_[A-Za-z0-9]{36,}|(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{30,}|(?:_authToken|_password)\s*=/,
  ],
];

function tar(args) {
  const result = spawnSync("tar", args, {
    encoding: "utf8",
    maxBuffer: 4 * 1024 ** 2,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout;
}

export async function auditPackage(filename) {
  const archive = path.resolve(filename);
  const files = tar(["-tzf", archive]).trim().split(/\r?\n/).sort();
  assert.deepEqual(
    files,
    approvedFiles,
    "Tarball differs from the reviewed public file list.",
  );
  for (const filename of files) {
    const content = tar(["-xOf", archive, filename]);
    for (const [reason, pattern] of prohibited) {
      assert(
        !pattern.test(content),
        `${filename}: ${reason} found; review before publishing.`,
      );
    }
    if (/^package\/examples\/.*\/report\.md$/.test(filename)) {
      assert(
        /fictional/i.test(content),
        `${filename}: public examples must explicitly identify fictional data.`,
      );
    }
  }
  const metadata = JSON.parse(tar(["-xOf", archive, "package/package.json"]));
  assert.equal(metadata.name, "plotleaf");
  assert.equal(metadata.bin.plotleaf, "./dist/cli.js");
  for (const hook of ["preinstall", "install", "postinstall", "prepare"]) {
    assert(
      !metadata.scripts?.[hook],
      `Unexpected consumer lifecycle hook: ${hook}`,
    );
  }
  const bytes = await readFile(archive);
  return {
    name: metadata.name,
    version: metadata.version,
    bytes: bytes.length,
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
    files: files.map((filename) => filename.slice("package/".length)),
    checks: [
      "exact public file list",
      "no retired branding",
      "fictional examples",
      "internal context and local paths",
      "credential patterns",
      "no source maps",
      "no consumer install hooks",
    ],
    limitation:
      "Pattern checks supplement manual review; they are not a general secret-detection guarantee.",
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert(
    process.argv[2],
    "Usage: node scripts/audit-package.mjs path/to/plotleaf.tgz",
  );
  const result = await auditPackage(process.argv[2]);
  await writeFile(
    `${process.argv[2]}.audit.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    `Audited ${result.name}@${result.version}: ${result.files.length} approved files, ${result.bytes} bytes. Manifest saved beside tarball.`,
  );
}

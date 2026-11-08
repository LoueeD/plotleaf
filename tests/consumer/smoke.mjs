import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  mkdir,
  readdir,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditPackage } from "../../scripts/audit-package.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
assert(
  Number(process.versions.node.split(".")[0]) >= 22,
  "Consumer verification requires supported Node 22+.",
);
const nodeDirectory = path.dirname(process.execPath);
const npmCli =
  process.env.PLOTLEAF_NPM_CLI ??
  [
    path.resolve(nodeDirectory, "../lib/node_modules/npm/bin/npm-cli.js"),
    path.resolve(nodeDirectory, "node_modules/npm/bin/npm-cli.js"),
  ].find((filename) => existsSync(filename));
assert(
  npmCli,
  "Cannot locate npm beside Node. Set PLOTLEAF_NPM_CLI to npm-cli.js.",
);
const npxCli = path.join(path.dirname(npmCli), "npx-cli.js");
const cache = path.join(root, ".cache", "npm");
await mkdir(cache, { recursive: true });
const directory = await mkdtemp(path.join(tmpdir(), "plotleaf-consumer-"));
// Windows treats PATH keys case-insensitively. Remove the inherited spelling
// before assigning a minimal PATH that deliberately excludes Bun.
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toLowerCase() !== "path"),
  ),
  PATH: (process.platform === "win32"
    ? [
        nodeDirectory,
        path.join(process.env.SystemRoot ?? "C:\\Windows", "System32"),
        process.env.SystemRoot ?? "C:\\Windows",
      ]
    : [nodeDirectory, "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
  ).join(path.delimiter),
  npm_config_cache: cache,
  npm_config_update_notifier: "false",
  NO_COLOR: "1",
};
const bunProbe = spawnSync("bun", ["--version"], { env, encoding: "utf8" });
assert(
  bunProbe.error?.code === "ENOENT",
  "Consumer PATH must not provide Bun.",
);
const run = (program, args, cwd = directory) => {
  const result = spawnSync(program, args, {
    env,
    cwd,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 10 * 1024 ** 2,
  });
  assert.equal(
    result.status,
    0,
    `${program} ${args.join(" ")}\n${result.stderr}\n${result.stdout}\n${result.error ?? ""}`,
  );
  return result.stdout;
};
async function installedBytes(folder) {
  let total = 0;
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) total += await installedBytes(filename);
    else if (entry.isFile()) total += (await stat(filename)).size;
  }
  return total;
}
let preview;
try {
  const packed = process.env.PLOTLEAF_PACKAGE_TARBALL
    ? undefined
    : JSON.parse(
        run(
          process.execPath,
          [
            npmCli,
            "pack",
            "--ignore-scripts",
            "--json",
            "--pack-destination",
            directory,
          ],
          root,
        ),
      )[0];
  const tarball =
    process.env.PLOTLEAF_PACKAGE_TARBALL ??
    path.join(directory, packed.filename);
  const audited = await auditPackage(tarball);
  assert(
    !audited.files.some((filename) =>
      /^(src|scripts|tests|docs|\.cache)\//.test(filename),
    ),
    "Package includes development-only files.",
  );
  assert(
    !audited.files.some((filename) => /^examples\/.*\.html$/.test(filename)),
    "Package includes generated example exports.",
  );
  await writeFile(
    path.join(directory, "package.json"),
    '{"name":"plotleaf-consumer-check","private":true}\n',
  );
  run(process.execPath, [
    npmCli,
    "install",
    "--ignore-scripts",
    "--omit=dev",
    "--no-audit",
    "--no-fund",
    process.env.PLOTLEAF_OFFLINE === "1" ? "--offline" : "--prefer-offline",
    tarball,
  ]);
  const cli = path.join(directory, "node_modules/plotleaf/dist/cli.js");
  assert((await readFile(cli, "utf8")).startsWith("#!/usr/bin/env node"));
  assert(!existsSync(path.join(directory, "node_modules/.bin/tablio")));
  assert(!existsSync(path.join(directory, "node_modules/bun")));
  assert(!existsSync(path.join(directory, "node_modules/tsrs")));
  await cp(
    path.join(directory, "node_modules/plotleaf/examples/storefront"),
    path.join(directory, "analysis"),
    { recursive: true },
  );
  const report = path.join(directory, "analysis/report.md");
  assert.match(run(process.execPath, [cli, "--help"]), /npx plotleaf/);
  assert.equal(
    run(process.execPath, [cli, "--version"]).trim(),
    JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version,
  );
  const validation = JSON.parse(
    run(process.execPath, [
      npxCli,
      "--no-install",
      "plotleaf",
      "validate",
      report,
      "--json",
    ]),
  );
  assert.equal(validation.valid, true);
  assert.deepEqual(validation.diagnostics, []);
  const output = path.join(directory, "portable.html");
  run(process.execPath, [
    npxCli,
    "--no-install",
    "plotleaf",
    "build",
    report,
    "--out",
    output,
  ]);
  const html = await readFile(output, "utf8");
  assert(html.includes("Storefront Overview"));
  assert(html.includes("Apache License"));
  assert(!html.includes(root));
  assert(!html.includes(directory));
  assert(!html.includes("/__plotleaf/events"));
  const onboarding = path.join(directory, "onboarding");
  await cp(
    path.join(directory, "node_modules/plotleaf/examples/onboarding"),
    onboarding,
    { recursive: true },
  );
  const onboardingReport = path.join(onboarding, "report.md");
  const onboardingValidation = JSON.parse(
    run(process.execPath, [
      npxCli,
      "--no-install",
      "plotleaf",
      "validate",
      onboardingReport,
      "--json",
    ]),
  );
  assert.equal(onboardingValidation.valid, true);
  const onboardingOutput = path.join(directory, "onboarding.html");
  run(process.execPath, [
    npxCli,
    "--no-install",
    "plotleaf",
    "build",
    onboardingReport,
    "--out",
    onboardingOutput,
  ]);
  const onboardingHtml = await readFile(onboardingOutput, "utf8");
  assert(onboardingHtml.includes('<meter min="0" max="1"'));
  assert(onboardingHtml.includes('"kind":"donut"'));
  assert(onboardingHtml.includes("At risk"));
  assert(!onboardingHtml.includes(onboarding));
  const catalog = path.join(directory, "catalog");
  await cp(
    path.join(directory, "node_modules/plotleaf/examples/catalog"),
    catalog,
    { recursive: true },
  );
  const catalogReport = path.join(catalog, "report.md");
  assert.equal(
    JSON.parse(
      run(process.execPath, [
        npxCli,
        "--no-install",
        "plotleaf",
        "validate",
        catalogReport,
        "--json",
      ]),
    ).valid,
    true,
  );
  const catalogOutput = path.join(directory, "catalog.html");
  run(process.execPath, [
    npxCli,
    "--no-install",
    "plotleaf",
    "build",
    catalogReport,
    "--out",
    catalogOutput,
  ]);
  const catalogHtml = await readFile(catalogOutput, "utf8");
  assert.equal(catalogHtml.match(/class="table-image"/g)?.length, 4);
  assert.equal(catalogHtml.match(/class="sparkline-chart"/g)?.length, 4);
  assert.equal(
    catalogHtml.match(/data:image\/(?:png|jpeg);base64,/g)?.length,
    3,
  );
  assert(!catalogHtml.includes("/assets/"));
  assert(!catalogHtml.includes('id="plotleaf-data"'));
  preview = spawn(process.execPath, [cli, "dev", catalogReport, "--no-open"], {
    cwd: directory,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(new Error(`Packed preview did not start: ${output}`)),
      10_000,
    );
    preview.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    preview.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Packed preview exited ${code}: ${output}`));
    });
    preview.stderr.on("data", (chunk) => {
      output += String(chunk);
      const match = output.match(
        /plotleaf preview: (http:\/\/127\.0\.0\.1:\d+)/,
      );
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  assert((await (await fetch(url)).text()).includes("Product Performance"));
  assert.equal((await fetch(url + "/assets/linen-tote.png")).status, 404);
  const metrics = {
    node: process.versions.node,
    tarballBytes: audited.bytes,
    ...(packed ? { packageUnpackedBytes: packed.unpackedSize } : {}),
    exportedHtmlBytes: Buffer.byteLength(html),
    installedFileBytes: await installedBytes(
      path.join(directory, "node_modules"),
    ),
    runtimePackages: Object.keys(
      JSON.parse(
        await readFile(
          path.join(directory, "node_modules/.package-lock.json"),
          "utf8",
        ),
      ).packages,
    ).length,
    definition:
      "Logical regular-file bytes after npm install --omit=dev; includes plotleaf and production dependencies, excludes symlink targets counted twice and filesystem allocation overhead.",
  };
  if (process.env.PLOTLEAF_CONSUMER_METRICS) {
    await writeFile(
      process.env.PLOTLEAF_CONSUMER_METRICS,
      JSON.stringify(metrics, null, 2) + "\n",
    );
  }
  console.log(
    `Node ${process.versions.node}: audited npm/npx validate/build/preview passed without Bun (${(audited.bytes / 1024).toFixed(1)} KiB tarball; ${(metrics.installedFileBytes / 1024 ** 2).toFixed(1)} MiB installed; ${(metrics.exportedHtmlBytes / 1024).toFixed(1)} KiB HTML).`,
  );
} finally {
  if (preview?.exitCode === null) {
    const stopped = new Promise((resolve) => preview.once("exit", resolve));
    preview.kill("SIGTERM");
    await stopped;
  }
  await rm(directory, { recursive: true, force: true });
}

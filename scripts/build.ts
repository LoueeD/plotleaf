import { mkdir, readFile, writeFile, chmod, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { componentSpec } from "../src/compiler/registry.ts";

const root = path.resolve(import.meta.dir, "..");
process.chdir(root);
await mkdir("dist/assets", { recursive: true });
await mkdir("schema", { recursive: true });
const artifacts = [
  {
    entrypoints: ["src/cli.ts"],
    outdir: "dist",
    target: "node" as const,
    format: "esm" as const,
    packages: "external" as const,
    naming: "[name].js",
    minify: false,
  },
  {
    entrypoints: ["src/browser/base.ts", "src/browser/charts.ts"],
    outdir: "dist/assets",
    target: "browser" as const,
    format: "iife" as const,
    naming: "[name].js",
    minify: true,
  },
];
for (const config of artifacts) {
  const result = await Bun.build({
    ...config,
    splitting: false,
    sourcemap: "none",
    env: "disable",
  });
  if (!result.success)
    throw new AggregateError(result.logs, "Package build failed");
}
await chmod("dist/cli.js", 0o755);
await writeFile(
  "dist/assets/styles.css",
  await readFile("src/render/styles.css"),
);
await writeFile(
  "schema/components.json",
  JSON.stringify(componentSpec(), null, 2) + "\n",
);

const require = createRequire(import.meta.url);
const notices: string[] = ["plotleaf\n" + (await readFile("LICENSE", "utf8"))];
for (const name of ["echarts", "zrender", "tslib"]) {
  let directory = path.dirname(require.resolve(name));
  let metadata: { name: string; version: string } | undefined;
  while (true) {
    if (await Bun.file(path.join(directory, "package.json")).exists()) {
      const candidate = JSON.parse(
        await readFile(path.join(directory, "package.json"), "utf8"),
      ) as { name: string; version: string };
      if (candidate.name === name) {
        metadata = candidate;
        break;
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory)
      throw new Error(`Cannot find package/license root for ${name}`);
    directory = parent;
  }
  const filenames = (await readdir(directory))
    .filter((file) => /^(licen[cs]e|notice)(\.|$)/i.test(file))
    .sort();
  if (!filenames.length)
    throw new Error(`No license notice found for bundled dependency ${name}`);
  notices.push(
    `${metadata.name} ${metadata.version}\n${(await Promise.all(filenames.map((file) => readFile(path.join(directory, file), "utf8")))).join("\n")}`,
  );
}
await writeFile(
  "THIRD_PARTY_NOTICES.txt",
  notices.join("\n\n────────────────────────────────────────\n\n") + "\n",
);
await writeFile(
  "dist/assets/notices.txt",
  await readFile("THIRD_PARTY_NOTICES.txt"),
);
for (const filename of ["base.js", "charts.js"]) {
  const bytes = await readFile(`dist/assets/${filename}`);
  const gzipBytes = gzipSync(bytes).length;
  const budget = filename === "charts.js" ? 210 * 1024 : 5 * 1024;
  if (gzipBytes > budget)
    throw new Error(
      `${filename} exceeds its ${budget / 1024} KiB gzip budget (${gzipBytes} bytes).`,
    );
  console.log(
    `${filename}: ${(bytes.length / 1024).toFixed(1)} KiB raw, ${(gzipBytes / 1024).toFixed(1)} KiB gzip`,
  );
}
console.log(
  "Built Node CLI, prebuilt browser assets and component specification.",
);

import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir, cpus, platform, arch } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = await mkdtemp(path.join(tmpdir(), "plotleaf-measure-"));
const cli = path.join(root, "dist/cli.js");
const report = path.join(directory, "report.md");
const output = path.join(directory, "report.html");
const table = Array.from({ length: 100 }, (_, i) => ({
  team: `Team ${i + 1}`,
  value: i * 7,
  change: (i % 30) / 100,
}));
const source =
  '# Technical benchmark fixture\n\n:::grid{columns="4"}\n' +
  Array.from(
    { length: 4 },
    (_, i) => `::metric{label="Metric ${i + 1}" value="${1000 + i}"}`,
  ).join("\n") +
  '\n:::\n\n:::grid{columns="2"}\n::area{data="./series.json" x="date" y="value" xType="date" title="Prepared series" target="1100"}\n::bar{data="./bars.json" x="category" y="value" title="Prepared categories"}\n:::\n\n::table{data="./table.json" title="Benchmark table"}';
const summary = (values) => ({
  median: [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)],
  minimum: Math.min(...values),
  maximum: Math.max(...values),
  runs: values,
});
const runBuild = () => {
  const start = performance.now();
  const result = spawnSync(
    process.execPath,
    [cli, "build", report, "--out", output],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return Math.round((performance.now() - start) * 10) / 10;
};
async function preview() {
  const started = performance.now();
  const child = spawn(process.execPath, [cli, "dev", report, "--no-open"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(
      () => reject(new Error(log || "Preview timeout")),
      10_000,
    );
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited ${code}: ${log}`));
    });
    child.stderr.on("data", (chunk) => {
      log += String(chunk);
      const match = log.match(/plotleaf preview: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return {
    url,
    elapsed: Math.round((performance.now() - started) * 10) / 10,
    close: async () => {
      const stopped = new Promise((resolve) => child.once("exit", resolve));
      child.kill("SIGTERM");
      await stopped;
    },
  };
}
let server;
let browser;
try {
  await writeFile(report, source);
  await writeFile(
    path.join(directory, "series.json"),
    JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(Date.UTC(2024, 0, 1) + i * 86_400_000)
          .toISOString()
          .slice(0, 10),
        value: Math.round(700 + i / 3 + 70 * Math.sin(i / 20)),
      })),
    ),
  );
  await writeFile(
    path.join(directory, "bars.json"),
    JSON.stringify(
      Array.from({ length: 1000 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: (i % 73) + 10,
      })),
    ),
  );
  await writeFile(path.join(directory, "table.json"), JSON.stringify(table));
  runBuild();
  const builds = Array.from({ length: 5 }, runBuild);
  const starts = [];
  const warmup = await preview();
  await warmup.close();
  for (let i = 0; i < 5; i++) {
    const current = await preview();
    starts.push(current.elapsed);
    await current.close();
  }
  server = await preview();
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  await page.goto(server.url);
  await page.locator(".chart-plot svg").last().waitFor();
  const reloads = [];
  for (let i = 0; i < 5; i++) {
    const marker = `Measurement ${i}`;
    table[0].team = marker;
    const start = performance.now();
    await writeFile(path.join(directory, "table.json"), JSON.stringify(table));
    await page.getByText(marker, { exact: true }).waitFor();
    reloads.push(Math.round((performance.now() - start) * 10) / 10);
  }
  await page.close();
  const charts = await readFile(path.join(root, "dist/assets/charts.js"));
  const base = await readFile(path.join(root, "dist/assets/base.js"));
  const pkg = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const results = {
    recorded: new Date().toISOString(),
    platform: `${platform()} ${arch()}`,
    cpu: cpus()[0]?.model,
    node: process.versions.node,
    bun: pkg.packageManager,
    dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
    fixture: {
      metrics: 4,
      areaRows: 1000,
      barRows: 1000,
      tableRows: 100,
      viewport: "1440 × 1100",
    },
    warmBuildMs: summary(builds),
    warmPreviewStartupMs: summary(starts),
    fileWriteToBrowserReloadMs: summary(reloads),
    assets: {
      charts: { bytes: charts.length, gzipBytes: gzipSync(charts).length },
      base: { bytes: base.length, gzipBytes: gzipSync(base).length },
    },
    limitations:
      "Warm local runs, not an end-user download benchmark. Browser reload includes save stabilization, compilation and full reload. No cross-machine speed claim.",
  };
  await writeFile(
    path.join(root, "docs/phase-zero-metrics.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        warmBuildMs: results.warmBuildMs,
        warmPreviewStartupMs: results.warmPreviewStartupMs,
        fileWriteToBrowserReloadMs: results.fileWriteToBrowserReloadMs,
        assets: results.assets,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await server?.close();
  await rm(directory, { recursive: true, force: true });
}

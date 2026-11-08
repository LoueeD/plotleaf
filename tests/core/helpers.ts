import { mkdtemp, writeFile, mkdir, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Assets } from "../../src/render/html.js";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const node = process.env.PLOTLEAF_NODE ?? "node";
export const testAssets: Assets = {
  styles: ":root{color-scheme:light dark}",
  base: "/* base runtime */",
  charts: "/* chart runtime */",
  notices: "Example license",
};

export async function withReport<T>(
  source: string,
  files: Record<string, unknown>,
  run: (filename: string, directory: string) => Promise<T>,
): Promise<T> {
  const directory = await realpath(
    await mkdtemp(path.join(tmpdir(), "plotleaf-test-")),
  );
  try {
    const filename = path.join(directory, "report.md");
    await writeFile(filename, source);
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(directory, name);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(
        target,
        typeof content === "string" ? content : JSON.stringify(content),
      );
    }
    return await run(filename, directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function cli(args: string[], cwd = root) {
  const result = spawnSync(node, [path.join(root, "dist/cli.js"), ...args], {
    cwd,
    encoding: "utf8",
    timeout: 15_000,
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.error) throw result.error;
  return result;
}

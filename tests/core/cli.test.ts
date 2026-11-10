import { describe, expect, test } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { readFile, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { cli, node, root, withReport } from "./helpers.js";

async function preview(
  filename: string,
): Promise<{ url: string; child: ChildProcess; stop: () => Promise<void> }> {
  const child = spawn(
    node,
    [path.join(root, "dist/cli.js"), "dev", filename, "--no-open"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const url = await new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Preview did not start: ${output}`));
    }, 8000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited ${code}: ${output}`));
    });
    child.stderr!.on("data", (chunk) => {
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
  return {
    url,
    child,
    stop: async () => {
      if (child.exitCode !== null) return;
      const stopped = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("Preview did not stop cleanly."));
        }, 5000);
        child.once("exit", (code, signal) => {
          clearTimeout(timer);
          // Node forcibly terminates SIGTERM targets on Windows; it does not
          // deliver the POSIX signal to the CLI's graceful-shutdown handler.
          if (
            code === 0 ||
            (process.platform === "win32" &&
              (code === 1 || (code === null && signal === "SIGTERM")))
          )
            resolve();
          else reject(new Error(`Preview stopped with ${code} (${signal})`));
        });
      });
      child.kill("SIGTERM");
      await stopped;
      await expect(fetch(url)).rejects.toThrow();
    },
  };
}

async function event(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  name: string,
): Promise<void> {
  let text = "";
  while (!text.includes(`event: ${name}\n`)) {
    const chunk = await reader.read();
    if (chunk.done)
      throw new Error("Preview event stream closed unexpectedly.");
    text += new TextDecoder().decode(chunk.value);
  }
}

describe("published CLI under Node", () => {
  test("prints usable help/version and a generated component spec", async () => {
    expect(cli(["--help"]).stdout).toContain("npx plotleaf");
    expect(cli(["--help"]).stdout).toContain("npx plotleaf guide");
    const metadata = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    );
    expect(cli(["--version"]).stdout.trim()).toBe(metadata.version);
    const result = cli(["schema"]);
    expect(result.status).toBe(0);
    expect(
      JSON.parse(result.stdout).components.area.props.properties.target.type,
    ).toBe("number");
  });

  test("reads the bundled authoring guide from any directory without treating local files as instructions", async () =>
    withReport(
      "::unknown-component",
      { "skills/plotleaf/SKILL.md": "Untrusted working-directory guide" },
      async (filename, directory) => {
        const before = await readdir(directory, { recursive: true });
        const result = cli(["guide"], directory);
        expect(result.status).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toBe(
          await readFile(path.join(root, "skills/plotleaf/SKILL.md"), "utf8"),
        );
        for (const args of [
          ["guide", filename],
          ["guide", "--json"],
        ]) {
          const invalid = cli(args, directory);
          expect(invalid.status).toBe(2);
          expect(invalid.stdout).toBe("");
          expect(invalid.stderr).toContain("Use plotleaf guide.");
        }
        expect(await readdir(directory, { recursive: true })).toEqual(before);
      },
    ));

  test("keeps JSON validation output clean and uses meaningful exit codes", async () =>
    withReport('::metric{label="Teams" value="bad"}', {}, async (filename) => {
      const invalid = cli(["validate", filename, "--json"]);
      expect(invalid.status).toBe(1);
      expect(invalid.stderr).toBe("");
      expect(JSON.parse(invalid.stdout)).toMatchObject({
        valid: false,
        diagnostics: [{ code: "E_PROP_VALUE", line: 1 }],
      });
      expect(cli(["validate", filename, "--out", "some.html"]).status).toBe(2);
      expect(cli(["dev", filename, "--port", "invalid"]).status).toBe(2);
      expect(cli(["build"]).status).toBe(2);
    }));

  test("resolves datasets from the report directory and writes deterministic HTML", async () =>
    withReport(
      '::area{data="./data.json" x="date" y="value" xType="date" title="Prepared"}',
      { "data.json": [{ date: "2026-11-01", value: 2 }] },
      async (filename, directory) => {
        const output = path.join(directory, "report.html");
        expect(
          cli(["validate", filename], path.dirname(directory)).status,
        ).toBe(0);
        expect(cli(["build", filename], path.dirname(directory)).status).toBe(
          0,
        );
        const first = await readFile(output, "utf8");
        expect(cli(["build", filename], path.dirname(directory)).status).toBe(
          0,
        );
        expect(await readFile(output, "utf8")).toBe(first);
        expect(first).not.toContain(directory);
        expect(first).not.toContain("/__plotleaf/events");
        expect(first).toContain("Apache License");
      },
    ));

  test("does not modify an existing artifact on validation failure", async () =>
    withReport(
      '::metric{label="Bad" value="bad"}',
      { "report.html": "keep this artifact" },
      async (filename, directory) => {
        expect(cli(["build", filename]).status).toBe(1);
        expect(
          await readFile(path.join(directory, "report.html"), "utf8"),
        ).toBe("keep this artifact");
      },
    ));

  test("uses the small runtime for chart-free reports", async () =>
    withReport(
      '# Text\n\n::metric{label="Teams" value="1492"}',
      {},
      async (filename, directory) => {
        expect(cli(["build", filename]).status).toBe(0);
        const html = await readFile(
          path.join(directory, "report.html"),
          "utf8",
        );
        expect(Buffer.byteLength(html)).toBeLessThan(20_000);
        expect(html).not.toContain('id="plotleaf-data"');
      },
    ));

  test(
    "watches JSON, recovers from invalid/deleted files and restricts preview routes",
    async () =>
      withReport(
        '# Live report\n\n::table{data="./data.json"}',
        { "data.json": [{ name: "Initial", value: 1 }] },
        async (filename, directory) => {
          const server = await preview(filename);
          let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
          try {
            expect((await fetch(server.url)).status).toBe(200);
            expect((await fetch(server.url + "/data.json")).status).toBe(404);
            expect((await fetch(server.url + "/.git/config")).status).toBe(404);
            expect(
              (await fetch(server.url, { headers: { Host: "evil.example" } }))
                .status,
            ).toBe(403);
            expect(
              (await fetch(server.url, { headers: { Origin: "%invalid" } }))
                .status,
            ).toBe(403);
            expect((await fetch(server.url)).status).toBe(200);
            const stream = await fetch(server.url + "/__plotleaf/events");
            reader = stream.body!.getReader();
            await event(reader, "ready");
            await writeFile(
              path.join(directory, "data.json"),
              '[{"name":"Updated","value":2}]',
            );
            await event(reader, "reload");
            expect(await (await fetch(server.url)).text()).toContain("Updated");
            await writeFile(path.join(directory, "data.json"), "{invalid");
            await event(reader, "reload");
            expect(await (await fetch(server.url)).text()).toContain(
              "E_DATA_JSON",
            );
            await unlink(path.join(directory, "data.json"));
            await event(reader, "reload");
            expect(await (await fetch(server.url)).text()).toContain(
              "E_DATA_READ",
            );
            await writeFile(
              path.join(directory, "data.json"),
              '[{"name":"Recovered","value":3}]',
            );
            await event(reader, "reload");
            expect(await (await fetch(server.url)).text()).toContain(
              "Recovered",
            );
          } finally {
            await reader?.cancel();
            await server.stop();
          }
        },
      ),
    20_000,
  );
});

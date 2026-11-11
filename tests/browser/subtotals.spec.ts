import { test, expect } from "@playwright/test";
import { spawn, spawnSync } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("offline sorting keeps details inside groups and subtotals last", async ({
  page,
  context,
}) => {
  const directory = await mkdtemp(path.join(tmpdir(), "plotleaf-subtotal-"));
  try {
    const source = path.join(directory, "source");
    await cp(path.join(root, "tests/fixtures/m6"), source, { recursive: true });
    await writeFile(
      path.join(source, "report.md"),
      ':::table{data="./prepared-subtotals.json" title="Orders" prepared="grouped"}\n::column{field="product"}\n::column{field="orders"}\n:::',
    );
    const artifact = path.join(directory, "report.html");
    const result = spawnSync(
      process.env.PLOTLEAF_NODE ?? "node",
      [
        path.join(root, "dist/cli.js"),
        "build",
        path.join(source, "report.md"),
        "--out",
        artifact,
      ],
      { encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    await rm(source, { recursive: true, force: true });
    await context.setOffline(true);
    await page.goto(pathToFileURL(artifact).href);
    await expect(page.getByText("All regions, January–March")).toBeVisible();
    const bodies = page.locator("tbody");
    const orders = page.getByRole("button", { name: "Sort by Orders" });
    await expect(orders).toBeEnabled();
    await orders.click();
    await expect(bodies.nth(0).locator("tr")).toContainText([
      "North",
      "Lamp",
      "Notebook",
      "North subtotal",
    ]);
    await expect(bodies.nth(1).locator("tr")).toContainText([
      "South",
      "Notebook",
      "Lamp",
      "South subtotal",
    ]);
    await orders.click();
    await expect(bodies.nth(0).locator("tr")).toContainText([
      "North",
      "Notebook",
      "Lamp",
      "North subtotal",
    ]);
    await expect(bodies.nth(1).locator("tr")).toContainText([
      "South",
      "Lamp",
      "Notebook",
      "South subtotal",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("prepared views switch subtotal scopes without retaining another view's totals", async ({
  page,
  context,
}) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "plotleaf-subtotal-views-"),
  );
  try {
    const bundle = (scope: string, total: number) => ({
      version: 1,
      scope,
      groups: [
        {
          id: "region",
          label: scope,
          rows: [{ product: "Lamp", orders: total }],
          subtotal: { product: "Subtotal", orders: total },
        },
      ],
    });
    const views = {
      inputs: [
        {
          id: "region",
          type: "select",
          label: "Region",
          default: "all",
          options: [
            { value: "all", label: "All" },
            { value: "north", label: "North" },
          ],
        },
      ],
      views: [
        {
          id: "all",
          label: "All",
          when: { region: "all" },
          markdown:
            '::table{data="./all.json" title="Orders" prepared="grouped"}',
          datasets: {},
        },
        {
          id: "north",
          label: "North",
          when: { region: "north" },
          markdown:
            '::table{data="./north.json" title="Orders" prepared="grouped"}',
          datasets: {},
        },
      ],
    };
    await writeFile(
      path.join(directory, "report.md"),
      '::explore{data="./views.json" title="Regions"}',
    );
    await writeFile(path.join(directory, "views.json"), JSON.stringify(views));
    await writeFile(
      path.join(directory, "all.json"),
      JSON.stringify(bundle("All regions", 100)),
    );
    await writeFile(
      path.join(directory, "north.json"),
      JSON.stringify(bundle("North only", 40)),
    );
    const artifact = path.join(directory, "export.html");
    const result = spawnSync(
      process.env.PLOTLEAF_NODE ?? "node",
      [
        path.join(root, "dist/cli.js"),
        "build",
        path.join(directory, "report.md"),
        "--out",
        artifact,
      ],
      { encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    await context.setOffline(true);
    await page.goto(pathToFileURL(artifact).href);
    await expect(page.getByText("All regions").first()).toBeVisible();
    await page.getByLabel("Region", { exact: true }).selectOption("1");
    await expect(page.getByText("North only").first()).toBeVisible();
    await expect(page.getByText("All regions").first()).toBeHidden();
    await expect(page.getByRole("cell", { name: "40" }).first()).toBeVisible();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("preview watches a missing composition and reloads edited definitions", async ({
  page,
}) => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "plotleaf-composition-live-"),
  );
  const source = path.join(directory, "report.md");
  const definition = path.join(directory, "component.json");
  await writeFile(source, '::component{src="./component.json"}');
  const child = spawn(
    process.env.PLOTLEAF_NODE ?? "node",
    [path.join(root, "dist/cli.js"), "dev", source, "--no-open"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let output = "";
      const timer = setTimeout(
        () => reject(new Error(output || "Preview timeout")),
        8000,
      );
      child.once("error", reject);
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
    await page.goto(url);
    await expect(page.locator(".diagnostic-location")).toContainText(
      "E_COMPONENT_READ",
    );
    const content = (label: string) =>
      JSON.stringify({
        version: 1,
        props: {},
        components: [{ name: "metric", props: { label, value: 1 } }],
      });
    await writeFile(definition, content("First version"));
    await expect(page.getByText("First version")).toBeVisible();
    await writeFile(definition, content("Edited version"));
    await expect(page.getByText("Edited version")).toBeVisible();
  } finally {
    child.kill("SIGTERM");
    await new Promise<void>((resolve) =>
      child.exitCode !== null || child.signalCode !== null
        ? resolve()
        : child.once("exit", () => resolve()),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

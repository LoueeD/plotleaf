import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileReport } from "../../src/compiler/compile";
import { renderHtml, type Assets } from "../../src/render/html";

const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, "site/public/reports");
const assets = Object.fromEntries(
  await Promise.all(
    [
      ["styles", "styles.css"],
      ["base", "base.js"],
      ["charts", "charts.js"],
      ["notices", "notices.txt"],
    ].map(async ([key, file]) => [
      key,
      await readFile(path.join(root, "dist/assets", file!), "utf8"),
    ]),
  ),
) as unknown as Assets;
const entries = [
  {
    slug: "showcase",
    name: "Complete showcase",
    file: "examples/report.md",
    description:
      "Every current component together: prepared metrics, interactive charts, funnel stages, formatted tables, images and sparklines.",
    kind: "All components",
  },
  {
    slug: "storefront",
    name: "Storefront overview",
    file: "examples/storefront/report.md",
    description:
      "An analytical overview with metric comparisons, sales targets and a formatted category table.",
    kind: "Metrics · Area · Bar · Table",
  },
  {
    slug: "adoption",
    name: "Feature adoption",
    file: "examples/adoption/report.md",
    description:
      "A narrative report combining findings, an adoption trend and prepared plan comparisons.",
    kind: "Narrative · Target · Area",
  },
  {
    slug: "onboarding",
    name: "Product onboarding",
    file: "examples/onboarding/report.md",
    description:
      "Prepared funnel stages and plan mix, with explicit denominators and business status.",
    kind: "Funnel · Donut · Comparisons",
  },
  {
    slug: "catalog",
    name: "Product catalogue",
    file: "examples/catalog/report.md",
    description:
      "Local image thumbnails and small weekly-order lines in a native sortable table.",
    kind: "Images · Sparklines · Table",
  },
];
const projects = [];
for (const entry of entries) {
  const filename = path.join(root, entry.file);
  const compilation = await compileReport(filename);
  if (!compilation.report)
    throw new Error(JSON.stringify(compilation.diagnostics));
  const directory = path.join(output, entry.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "index.html"),
    renderHtml(compilation.report, assets),
  );
  const editable = ![...compilation.dependencies].some((file) =>
    /\.(png|jpe?g)$/i.test(file),
  );
  const files: Record<string, string> = {};
  if (editable)
    for (const file of compilation.dependencies)
      if (file.endsWith(".json"))
        files[
          path.relative(path.dirname(filename), file).split(path.sep).join("/")
        ] = await readFile(file, "utf8");
  projects.push({
    ...entry,
    editable,
    markdown: editable ? await readFile(filename, "utf8") : undefined,
    files: editable ? files : undefined,
  });
}
const products = JSON.parse(
  await readFile(path.join(root, "examples/catalog/products.json"), "utf8"),
).map(
  ({ product, weekly_orders, orders, revenue }: Record<string, unknown>) => ({
    product,
    weekly_orders,
    orders,
    revenue,
  }),
);
projects.push({
  slug: "sparklines",
  name: "Weekly order sparklines",
  description: "Shared scales and missing observations in a native table.",
  kind: "Sparklines",
  file: "",
  editable: true,
  markdown:
    '# Weekly order patterns\n\nAll values are fictional. Lines share a vertical scale; null samples create gaps.\n\n:::table{data="./products.json" title="Weekly orders"}\n::column{field="product" label="Product"}\n::column{field="weekly_orders" label="Weekly orders" kind="sparkline"}\n::column{field="orders" label="Orders"}\n::column{field="revenue" label="Revenue" format="currency:USD"}\n:::\n',
  files: { "products.json": JSON.stringify(products, null, 2) },
});
await writeFile(
  path.join(root, "site/public/playground-projects.json"),
  JSON.stringify(projects),
);
console.log("Prepared five real reports and four editable browser examples.");

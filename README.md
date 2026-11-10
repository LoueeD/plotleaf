# plotleaf

Beautiful, interactive reports from Markdown and prepared JSON. Built for coding agents.

**The agent does the thinking. We do the rendering.**

[Website](https://plotleaf-site.loueed.workers.dev) · [Docs](https://plotleaf-site.loueed.workers.dev/docs/) · [Examples](https://plotleaf-site.loueed.workers.dev/examples/) · [Playground](https://plotleaf-site.loueed.workers.dev/playground/) · [Source](https://github.com/LoueeD/plotleaf) · [Issues](https://github.com/LoueeD/plotleaf/issues) · [Verification](https://github.com/LoueeD/plotleaf/actions/workflows/ci.yml) · [Contributing](https://github.com/LoueeD/plotleaf/blob/main/CONTRIBUTING.md)

A report is one Markdown file, optionally accompanied by local JSON datasets. No application, configuration file, account, database or hosted service. Export one HTML file that keeps working offline.

## Start with your coding agent

Copy this into your coding agent and describe your report:

```text
Build a beautiful, interactive report with Plotleaf.
Here's what I want to explore: [Your brief and data]
Follow https://plotleaf-site.loueed.workers.dev/agent and give me a preview and a standalone HTML report.
```

## Status

**0.4.1** removes metric-value scrollbars; exceptionally long values wrap rather than clip.

**0.4.0** adds scoped interactive explorations: dropdowns, segmented choices, toggles, literal text/number inputs and supported date ranges select complete agent-prepared views. Metrics, charts, funnels, tables and data alternatives update together, including offline HTML. Unsupported selections show an unavailable state; no analytics or arbitrary queries run in reports.

**0.3.2** adds the website links and updated agent setup prompt. Read the [docs](https://plotleaf-site.loueed.workers.dev/docs/), explore [example reports](https://plotleaf-site.loueed.workers.dev/examples/), or try the [browser playground](https://plotleaf-site.loueed.workers.dev/playground/) without installing anything. The playground supports Markdown and JSON; local image imports and larger reports use the CLI.

The initial MVP includes validation, live preview/reload, self-contained HTML export and a generated component specification. All bundled examples use fictional data.

**0.3.0** adds local PNG/JPEG image cells, static sparklines and a cumulative example report. Donut charts and prepared funnel/progress views are available since 0.2.0. Check your installed CLI version or schema before using newer components.

Implemented components: responsive grids, metrics/comparisons, line/area/bar/donut charts, prepared funnel/progress stages, literal chart targets, sortable/formatted tables and callouts. Reports support light/dark system preference, native chart-data disclosures and responsive layouts. Scoped prepared-view controls are supported. Arbitrary row queries, maps, subtotals and reusable compositions remain planned increments.

## Quick start

Requires Node 22 or newer. Create `report.md` and any referenced JSON files, then run the CLI directly. No application setup or Bun installation is needed:

```bash
npx plotleaf report.md
npx plotleaf dev report.md --no-open --port 3000
npx plotleaf validate report.md --json
npx plotleaf build report.md --out ./exports/report.html
npx plotleaf schema
```

`plotleaf report.md` is an alias for `dev`. `build` defaults to `report.html` beside the source. Relative dataset paths resolve from the Markdown file's directory; an explicit `--out` resolves from the caller's working directory. Exports contain no preview connection and need no source files at viewing time.

For agent discovery, `npx plotleaf guide` (0.3.1+) prints the bundled report-authoring guide as Markdown, and `npx plotleaf schema` prints the component specification as JSON. The guide is the same `skills/plotleaf/SKILL.md` shipped with the package. These commands print documentation without creating files, changing project configuration or starting a server; once installed, they read local package content.

## A report

```markdown
---
title: Team adoption
description: Usage and growth from prepared data.
---

# Team adoption

An overview of active teams and their recent growth.

:::grid{columns="2"}
::metric{label="Teams" value="1492" comparison="34% vs previous quarter" direction="up" sentiment="positive"}
::metric{label="Conversion" value="0.103" format="percent"}
:::

::area{data="./usage.json" x="date" y="teams" xType="date" title="Active teams" target="1600" targetLabel="Target"}

:::table{data="./plans.json" title="By plan"}
::column{field="plan" label="Plan"}
::column{field="teams" label="Teams" format="number"}
::column{field="change" label="Δ QoQ" format="percent" sign="always" semantics="higher-is-better"}
:::
```

`usage.json`:

```json
[
  { "date": "2026-11-01", "teams": 1410 },
  { "date": "2026-11-02", "teams": 1492 }
]
```

`plans.json`:

```json
[
  { "plan": "Pro", "teams": 884, "change": 0.41 },
  { "plan": "Team", "teams": 432, "change": 0.22 },
  { "plan": "Free", "teams": 176, "change": 0.09 }
]
```

Attributes are literal values, not JavaScript. Keep leaf directives on one line and close containers explicitly. Use a longer outer fence (`::::grid`) when nesting another container, such as a table. Use Markdown headings and rules for sections/dividers.

Numbers, comparisons, trends and findings are prepared by the author. `percent` uses ratios (`0.12` → 12%); `percentage-points` uses point values (`0.8` → 0.8 pt); `currency:GBP` uses major units. Whole currency amounts omit `.00`; nonzero cents retain two decimal places. Formatting is `en-GB`; date display is UTC. An increase does not imply positive business sentiment.

Use `schema` for current property schemas, child rules and input limits. The installed package includes `schema/components.json`, generated from the validation registry, and `skills/plotleaf/SKILL.md`, a reusable report-authoring guide. Public examples under `examples/storefront/`, `examples/adoption/`, `examples/onboarding/` and `examples/catalog/` contain only fictional data. Catalogue illustrations are original, purpose-built raster assets.

## Donut and funnel

```markdown
::donut{data="./plans.json" category="plan" value="teams" title="Teams by plan"}
::funnel{data="./funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}
```

Donuts accept up to eight unique, nonblank categories with nonnegative numeric values. Prepare mutually exclusive parts of one whole. Zero values stay in the legend/table; an all-zero dataset shows an empty state. Categories remain in source order and are never grouped automatically.

Funnel data supplies each stage explicitly, for example `{"stage":"Activated","teams":25,"baseline":100,"share":0.25,"status":"below-target"}`. `total` maps the positive denominator; `share` maps a ratio from 0 to 1 and must agree with `value / total` within 0.0005. Status is optional and is never inferred: supported values are `on-target`, `below-target`, `at-risk` and `neutral`. Stages stay in source order, with a limit of 20. Native meters, text status and full data disclosures work without JavaScript.

Try the fictional `examples/onboarding/report.md` from a source checkout. See [M3 contracts and tradeoffs](https://github.com/LoueeD/plotleaf/blob/main/docs/m3-visualizations.md).

## Image and sparkline columns

```markdown
:::table{data="./products.json" title="Product performance"}
::column{field="image" label="Preview" kind="image" alt="description"}
::column{field="product" label="Product"}
::column{field="weekly_orders" label="Weekly orders" kind="sparkline" sortBy="last_week"}
::column{field="revenue" label="Revenue" format="currency:USD"}
:::
```

An image value is a relative PNG/JPEG path or null; `alt` names its row's text-alternative field. The fixed thumbnail box is 64 × 48. Images are bounded, validated and embedded once per unique content hash, with no source paths or runtime requests. Remote/data URLs, active SVG and animated images are rejected.

Only explicitly declared sparkline fields may contain arrays: at most 64 finite numbers/nulls in sample order. Rows share the observed y scale for that column. Nulls create gaps; a last-sample label and native value disclosure remain readable without JavaScript. Charts and scalar/inferred tables keep the flat scalar data contract.

Rich headers are plain text unless `sortBy` names a scalar field; scalar columns retain raw-value sorting. Alternatives, explicit sort keys and embedded image metadata are readable in the export. Try the fictional `examples/catalog/report.md` from a source build. See [M4 contracts](https://github.com/LoueeD/plotleaf/blob/main/docs/m4-rich-tables.md) for limits and validation details.

## Data and security boundaries

Prepare JSON arrays of flat scalar records; only explicitly declared sparkline fields permit bounded numeric/null sequences. Charts preserve input order and do not calculate, join or aggregate data. Date/number x values must be unique and increasing; line/area nulls are gaps and bar nulls are errors. Tables sort raw typed values. Explicit table columns also select the fields exported; an inferred table includes every source field.

Local JSON must stay within the report directory, including after resolving symlinks. Raw HTML, remote assets/data, executable components and report-authored code are rejected. Script/data escaping, sanitization, size limits and safe output writes are part of compilation. Invalid reports do not replace an existing export.

Charts and sorting require JavaScript. Prose, metrics, tables and native chart-data disclosures remain usable without it. All data included in an export is readable by recipients; hiding a value is not redaction. Prepare sensitive datasets before rendering.

## Source development

Use Bun 1.4.4 for development and Node 22+ for the published CLI/runtime checks:

```bash
bun install --frozen-lockfile
bun run build

node dist/cli.js examples/report.md
node dist/cli.js validate examples/storefront/report.md --json
node dist/cli.js build examples/storefront/report.md
```

The first CLI command opens a browser and watches the Markdown, referenced JSON and local table images. Add `--no-open` to print the URL without launching a browser. Ctrl-C stops the server. A failed edit shows diagnostics and recovers after you fix it.

Use `bun run dev` for the cumulative review report in `examples/report.md`. It keeps metrics/comparisons, area/line/bar/donut charts, targets, funnel stages, scalar tables, image cells, sparklines, prose and callouts together as milestones are added. It reuses the focused examples' datasets and image assets; their separate periods and populations remain explicit. Focused examples, including the narrative report in `examples/adoption/report.md`, remain available.

## Development and verification

```bash
bun run typecheck          # official TypeScript reference check
bun run typecheck:tsrs     # candidate Rust checker; fast preset disabled
bun run build             # Node CLI, fixed browser assets and component spec
bun test                  # core tests; CLI integration explicitly runs Node
bun run test:consumer     # temporary npm/npx install, no Bun on consumer PATH
node node_modules/@playwright/test/cli.js install chromium webkit
bun run test:browser      # real Chromium/WebKit checks
```

Build before running integration tests. Consumer checks need npm/registry access on the first run; they accept `PLOTLEAF_OFFLINE=1` once dependencies are cached. `PLOTLEAF_NODE` selects the Node executable used by integration/browser tests. No JavaScript bundling happens while compiling a user's report.

Bun builds a Node-target ESM executable and browser-target IIFE assets. The browser graph contains modular ECharts and plain TypeScript, with no UI framework. TSRS is a development-only candidate; official TypeScript checking remains authoritative. Engine guidance and planning notes belong to the source checkout and are excluded from the npm artifact.

MIT licensed. Bundled chart licenses/notices are retained in the package and exported HTML.

See [CONTRIBUTING.md](https://github.com/LoueeD/plotleaf/blob/main/CONTRIBUTING.md) for the platform matrix and contribution workflow. The `v0.1.0` source tag reproduces the published npm archive; subsequent source changes require a new package version before release. Renderer releases require the owner's manual visual review of the running preview, in addition to automated checks.


## Interactive prepared views

```markdown
::explore{data="./regional-views.json" title="Regional performance"}
```

The JSON bundle declares native `inputs`, their defaults/supported values and
complete `views`. Every view binds all input IDs through `when` and contains
Markdown using the existing components plus optional inline JSON `datasets`.
The agent prepares every value and denominator; Plotleaf selects the matching
view without recalculating analytics. Controls affect only their exploration;
static prose and metrics outside it stay fixed. Reset restores defaults and an
unsupported combination hides stale results.

See the [interactive example](https://plotleaf-site.loueed.workers.dev/playground/?example=interactions),
[authoring guide](https://plotleaf-site.loueed.workers.dev/docs/) and `npx plotleaf schema`
for the exact contract and limits. All selectable data remains readable in the
HTML file; hidden views are not redaction. Native controls need JavaScript, while
the default view and data alternatives remain readable without it.

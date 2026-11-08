# plotleaf

Beautiful, interactive reports from Markdown and prepared JSON. Built for coding agents.

**The agent does the thinking. We do the rendering.**

[Source](https://github.com/LoueeD/plotleaf) · [Issues](https://github.com/LoueeD/plotleaf/issues) · [Verification](https://github.com/LoueeD/plotleaf/actions/workflows/ci.yml) · [Contributing](https://github.com/LoueeD/plotleaf/blob/main/CONTRIBUTING.md)

A report is one Markdown file, optionally accompanied by local JSON datasets. No application, configuration file, account, database or hosted service. Export one HTML file that keeps working offline.

## Status

The initial MVP includes validation, live preview/reload, self-contained HTML export and a generated component specification. All bundled examples use fictional data.

Main contains the unreleased **0.2.0 / M3 visualization candidate**. npm currently provides `0.1.0`; use a source build to try the new components while owner visual review is pending.

Implemented components: responsive grids, metrics/comparisons, line/area/bar/donut charts, prepared funnel/progress stages, literal chart targets, sortable/formatted tables and callouts. Reports support light/dark system preference, native chart-data disclosures and responsive layouts. Filters, rich table cells, maps and reusable compositions remain planned increments.

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

Use `schema` for current property schemas, child rules and input limits. The installed package includes `schema/components.json`, generated from the validation registry, and `skills/plotleaf/SKILL.md`, a reusable report-authoring guide. Public examples under `examples/storefront/`, `examples/adoption/` and `examples/onboarding/` contain only fictional data.

## Donut and funnel

```markdown
::donut{data="./plans.json" category="plan" value="teams" title="Teams by plan"}
::funnel{data="./funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}
```

Donuts accept up to eight unique, nonblank categories with nonnegative numeric values. Prepare mutually exclusive parts of one whole. Zero values stay in the legend/table; an all-zero dataset shows an empty state. Categories remain in source order and are never grouped automatically.

Funnel data supplies each stage explicitly, for example `{"stage":"Activated","teams":25,"baseline":100,"share":0.25,"status":"below-target"}`. `total` maps the positive denominator; `share` maps a ratio from 0 to 1 and must agree with `value / total` within 0.0005. Status is optional and is never inferred: supported values are `on-target`, `below-target`, `at-risk` and `neutral`. Stages stay in source order, with a limit of 20. Native meters, text status and full data disclosures work without JavaScript.

Try the fictional `examples/onboarding/report.md` from a source checkout. See [M3 contracts and tradeoffs](https://github.com/LoueeD/plotleaf/blob/main/docs/m3-visualizations.md).

## Data and security boundaries

Prepare JSON arrays of flat scalar records. Charts preserve input order and do not calculate, join or aggregate data. Date/number x values must be unique and increasing; line/area nulls are gaps and bar nulls are errors. Tables sort raw typed values. Explicit table columns also select the fields exported; an inferred table includes every source field.

Local JSON must stay within the report directory, including after resolving symlinks. Raw HTML, remote assets/data, executable components and report-authored code are rejected. Script/data escaping, sanitization, size limits and safe output writes are part of compilation. Invalid reports do not replace an existing export.

Charts and sorting require JavaScript. Prose, metrics, tables and native chart-data disclosures remain usable without it. All data included in an export is readable by recipients; hiding a value is not redaction. Prepare sensitive datasets before rendering.

## Source development

Use Bun 1.4.4 for development and Node 22+ for the published CLI/runtime checks:

```bash
bun install --frozen-lockfile
bun run build

node dist/cli.js examples/storefront/report.md
node dist/cli.js validate examples/storefront/report.md --json
node dist/cli.js build examples/storefront/report.md
```

The first CLI command opens a browser and watches the Markdown and referenced JSON. Add `--no-open` to print the URL without launching a browser. Ctrl-C stops the server. A failed edit shows diagnostics and recovers after you fix it.

Open `examples/storefront/report.html` after export, or try the narrative example in `examples/adoption/report.md`.

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

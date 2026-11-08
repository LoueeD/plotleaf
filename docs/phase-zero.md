# Phase Zero: establish the smallest reliable reporting engine

Research and first implementation: 7 November 2026. The original plan below is now backed by a working local MVP. [Phase Zero results](phase-zero-results.md) records delivered behaviour, measurements, checks and unresolved gates. The initial MVP is published as `plotleaf@0.1.0`; see the [release record](releases/0.1.0.md).

## 1. Recommendation

Build one TypeScript npm package, `plotleaf`, which compiles Markdown directives and local JSON into static semantic HTML. Add a prebuilt browser runtime for SVG charts and table sorting. Use the same compilation path for validation, preview and export. Default to a self-contained HTML file. Extend interaction in stages through explicit input bindings and agent-prepared views, not an analysis backend.

The selected choices are **Bun development/package management, Node-compatible npm distribution, remark/unified + directives, Zod, Apache ECharts, native tables, Node HTTP + server-sent events, Bun core tests, explicit Node consumer checks and Playwright**. The public entry is `npx plotleaf`; users do not need Bun. `Bun.build` passed the output gates and produces a Node-target CLI and browser assets. TSRS remains a development-check candidate alongside authoritative official TypeScript. [The toolchain decision](toolchain.md) evaluates these choices.

Do not build an application platform. No report project, framework configuration, plugin API, database, SQL, AI runtime or hosting integration is needed.

The supplied screenshots are preserved and interpreted in [the design reference](design-reference.md). They establish spacious document layouts, open four-column KPI rows, restrained blue line/area charts, target annotations and quiet, correctly formatted tables. The implementation uses system sans-serif fonts, responsive grid collapse and semantic dark-theme tokens; these are adaptations, not an assertion that the screenshots specified them.

The new capability brief includes flexible publication-quality visualizations, filters, rich tables, maps and reusable/custom components. [The product roadmap](product-roadmap.md) gives these a delivery path and preserves the no-code-execution/offline contract. They are intended product capabilities, not all weekend requirements. Area charts, four-column grids, explicit table formats, literal targets and metric direction/sentiment now belong in the first slice; filters/funnels and more advanced capabilities follow in named increments.

## 2. What Phase Zero must resolve

Phase Zero ends with an evidence-backed technical contract and a small implementation backlog. It does not end with a complete product.

| Work | Deliverable | Exit condition |
| --- | --- | --- |
| Research and constraints | This plan and root `AGENTS.md` | Alternatives, scope and design ownership are explicit. |
| Grammar spike | Small valid/invalid fixtures and parser results | Nesting, literal attributes, code fences, source locations and malformed-directive recovery are understood. |
| Runtime/export spike | A disposable fixture with four metrics, line/area with target, bar and formatted table | One HTML file works through `file://`, offline, at narrow and wide widths; chart styling can match the reference. |
| Consumer packaging spike | Packed/installed Node-target package, tested through its executable and `npx` | Validate/build/preview work on supported Node with no Bun on PATH, no development dependencies and no install-time compilation. |
| Dependency measurement | Resolved Node/Bun/dependency versions, licenses and bundle report | Consumer install size and raw/minified/gzip browser sizes are recorded separately; Node-package and browser-output gates have recorded results. |
| Typechecker evaluation | TSRS/reference diagnostics and cold/warm check timings | Candidate launcher works under Bun; type/configuration correctness and checker performance are evaluated separately from report runtime performance. |
| Security spike | Focused adversarial fixtures | HTML/JSON breakout, path escape, symlink escape and unsafe URLs fail safely. |
| Design handoff | Stored references and component/state inventory | Supplied light-theme design is identifiable; font, mobile and dark adaptations are recorded separately. |
| Future interaction contract | Paper fixture of one region/range transition and its prepared data | KPIs, chart, funnel and table can stay consistent without SQL or arbitrary expressions; runtime/framework choice is revisited only with evidence. |
| Decision record | Results appended to this document | Each gate has evidence, a selected option and any remaining limitation. |

Research, guidance, reference inventory, the core grammar/export/security/package gates and the first MVP are delivered. Local measurements and results are in [the decision record](phase-zero-results.md). Matching-version TSRS conformance/performance and the future filter paper fixture remain open. The [source/CI foundation](source-ci.md) adds remote Linux/Windows verification and immutable source traceability. The initial MVP is published and verified from the public npm registry.

The original spike budget was approximately four focused engineering hours. Keep unresolved gates explicit and narrow implementation scope when needed; do not hide uncertainty behind abstractions.

## 3. Library and grammar research

The evaluations below preserve the upstream research rationale. They are not comparative benchmarks. See the separate results for actual implementation measurements; package installation size is not browser runtime size.

### Markdown and components

| Option | Fit and tradeoff | Recommendation |
| --- | --- | --- |
| unified / remark + `remark-directive` | Markdown AST with positions and existing text, leaf and container directive nodes. More small compiler-side packages, but parsing, sanitation and rendering stay separate. | Preferred. Only permit a small subset of directive forms and attributes. [Directive documentation](https://github.com/remarkjs/remark-directive), [Markdown-to-HTML AST bridge](https://github.com/remarkjs/remark-rehype). |
| Markdoc | Strong alternative with declarative tags, schemas, validation, source locations and HTML rendering. It already separates parse, transform and render. Its variables, functions and conditionals exceed the required language and would need an explicit restricted subset. | Fallback if remark needs significant custom work for reliable diagnostics. [Overview](https://markdoc.dev/docs/overview), [rendering phases](https://markdoc.dev/docs/render), [validation](https://markdoc.dev/docs/validation). |
| markdown-it + container/custom block plugins | Mature, extensible CommonMark parser. A practical option for straightforward HTML generation, but our typed component tree and detailed diagnostics would require more adapter work. | Viable, less aligned with the proposed AST pipeline. [Upstream](https://github.com/markdown-it/markdown-it). |
| Marked + extensions | Small, fast Markdown compiler. Component tokenization and the validation bridge would need additional work; output still requires sanitization. | No clear advantage for this component language. [Upstream and security note](https://github.com/markedjs/marked). |
| MDX / executable JSX | Expressive, but deliberately includes JavaScript expressions and ESM. Restricting it removes much of the reason to choose it. | Reject for V1. [MDX language documentation](https://mdxjs.com/docs/what-is-mdx/). |

Avoid writing a JSX-like parser just to support `<Metric value={5727} />`. A literal-only JSX subset is possible, but adds grammar ownership and invites agents to generate unsupported expressions.

Two safe syntax candidates deserve comparison in the grammar spike:

````markdown
::line{data="./usage.json" x="date" y="operations"}

```plotleaf
{"type":"line","data":"./usage.json","x":"date","y":"operations"}
```
````

Fenced JSON has excellent tooling and literal types, but nested layouts become verbose and prose cannot flow naturally through a JSON container. YAML fences reduce quoting but add indentation sensitivity and a second document language. Prefer directives for the public format; use JSON for component specifications, not a second parallel authoring format.

`remark-directive` parses syntax rather than validating our components. Its Markdown recovery behaviour is a gate: test missing braces, missing/ambiguous closing fences, duplicate attributes, expression-shaped values and unknown names. Some malformed source may become ordinary text rather than a parser error. If useful diagnostics require recreating the grammar, choose restricted Markdoc instead. Do not promise strict syntax diagnostics that the parser has not demonstrated.

### Charts

| Option | Runtime and output implications | Decision |
| --- | --- | --- |
| Apache ECharts, modular SVG | Imports can select chart types, components and renderer. Line, bar, area and donut fit one library; SVG and server-side SVG are supported. Library weight and styling control must be measured. | Leading choice. Use line/bar modules for the MVP, plus SVG, tooltip, grid, ARIA and literal target support. Add pie for donut later. No dataset-transform engine, map modules, toolbox or full-library import in ordinary reports. [Modular imports](https://echarts.apache.org/handbook/en/basics/import/), [SVG SSR](https://echarts.apache.org/handbook/en/how-to/cross-platform/server/). |
| Chart.js, modular canvas | Tree-shakeable, works without a UI framework and covers the desired charts. Canvas needs accessible alternatives; time scales can add a date adapter. Sharp static SVG is not its native output. | Best fallback if ECharts fails the size/customization gate. [Integration](https://www.chartjs.org/docs/latest/getting-started/integration.html), [accessibility](https://www.chartjs.org/docs/latest/general/accessibility.html). |
| Vega-Lite + Vega | Mature declarative graphics with interaction, composition and a compiler/runtime stack. Much of its transformation and encoding language would sit behind our much smaller language. | Too much machinery for this initial scope. [Vega-Lite](https://vega.github.io/vega-lite/). |
| Hand-built SVG / D3 primitives | Maximum control, but axes, scales, legends, tooltips, resize and accessibility become our maintenance burden. | Do not build a charting library to build a report engine. |

ECharts accessibility support must be explicitly imported/enabled; descriptions and patterns help, but do not prove keyboard accessibility. Every chart should include an HTML data alternative. [ECharts accessibility guidance](https://echarts.apache.org/handbook/en/best-practices/aria/).

Never expose ECharts options directly. Its security guide identifies raw HTML, URL and callback surfaces, including tooltip formatters. Construct options in trusted code and keep author input as data. [ECharts security guidance](https://echarts.apache.org/handbook/en/best-practices/security/).

The supplied design justifies promoting area fill and one literal target to the MVP. Test line/area styling together; area is supported through line-series `areaStyle`. Broad visualization flexibility should grow through typed properties and trusted components. Geographic rendering requires a separate capability/size gate; [the roadmap](product-roadmap.md#maps-and-the-offline-boundary) compares ECharts geographic modules, Leaflet and MapLibre without selecting a map dependency now. [ECharts area charts](https://echarts.apache.org/handbook/en/how-to/chart-types/line/area-line/).

### Tables and validation

Use semantic `<table>`, `<caption>`, header buttons, `scope` and `aria-sort` with one-column stable sorting. Add optional explicit column children so counts, percentages and signed changes can match the references. Preserve source order until the reader sorts. Sorting must use typed source values rather than formatted display strings.

TanStack Table is a credible later choice for grouping, pagination, selection or more complex column state. Its headless model preserves control of markup and styling, but introduces state machinery that the initial report table does not yet need. Sparklines, local image cells and prepared subtotal rows have explicit later schemas in [the roadmap](product-roadmap.md#rich-tables); they are planned rather than permanently excluded. [TanStack Table](https://tanstack.com/table/latest).

Use Zod on the compiler/runtime side for strict component property schemas and TypeScript inference. Generate JSON Schema with the stable `z.toJSONSchema` API. Keep schemas JSON-representable; string decoding and cross-field/data checks sit in explicit functions because transforms/refinements cannot all be expressed in JSON Schema. [Zod JSON Schema documentation](https://zod.dev/json-schema).

Recognize frontmatter through `remark-frontmatter` and parse its contents with `yaml`, restricted to the small metadata schema. Disallow aliases and custom tags, reject duplicate keys, and retain YAML error locations. `yaml` supports the necessary document/error APIs without external dependencies. [YAML documentation](https://eemeli.org/yaml/).

### Rendering architecture comparison

| Approach | View-layer browser footprint | Complexity | Portable export |
| --- | --- | --- | --- |
| Static HTML + plain TypeScript enhancements | No third-party view runtime; our small runtime plus the chart library. | Lowest for a document with a few interactive regions. Use real DOM APIs, not a homemade UI framework. | Inline CSS, data and classic script work without a server, subject to the browser gate. **Recommended.** |
| Native custom elements | No library runtime, but lifecycle/attribute glue is ours. | Useful when components need independent public lifecycle APIs. Not required for the initial document compiler. | Possible in one file. Light DOM is simpler for shared typography, printing and data alternatives. |
| Lit web components | Upstream advertises around 5 KB minified/compressed before our code and charts. | Adds reactive templates; shadow styling and SSR introduce more choices. | Possible when bundled; no inherent portability blocker. Revisit only if interaction state grows. [Lit](https://lit.dev/). |
| Preact | Upstream advertises a roughly 3 kB core, excluding other packages and our code. | Convenient stateful components, but SSR/hydration and chart lifecycles need coordination. | Portable when bundled; the author's report would still need no framework knowledge. Revisit with the shared-filter-state fixture before the interaction increment. [Preact](https://preactjs.com/). |

The Lit/Preact figures are upstream descriptions, not apples-to-apples measurements or total report sizes. The chart runtime will likely dominate any view-layer saving; confirm this rather than selecting a framework on its headline size.

The larger brief makes shared state a real future concern. Keep the MVP static-first; later introduce one explicit input store and bindings, or adopt a small view library if that demonstrably simplifies the fixture. Do not prebuild a reactive framework, query engine or plugin platform as preparation for those features.

Use a Bun-executed build script and try `Bun.build` for plotleaf's own package/browser assets. Explicitly target Node for the published CLI and browser for report assets; keep Bun-only APIs out of production source. Its current IIFE output is documented as experimental, so prove both the packed Node CLI and inline browser artifact before adopting it. Use esbuild if either output gate fails. Rolldown is the comparable VoidZero bundler; Vite+ is a broader toolchain. Ship prebuilt assets and reuse them in every report. [Bundler evaluation and sources](toolchain.md#build-bun-esbuild-or-voidzero).

## 4. Smallest useful language

This contract is implemented. The [generated component specification](../schema/components.json) is authoritative for supported properties and defaults. Use standard Markdown for headings, paragraphs, lists, links, code, blockquotes and dividers. Reserve directives for components. Keep leaf directives on one line, close containers explicitly and use longer outer fences when nesting containers. Source-aware linting catches reserved-directive recovery and duplicate attributes without replacing the Markdown parser.

The complete public example is [`examples/storefront/report.md`](../examples/storefront/report.md), with fictional orders, returns and category summaries. Its datasets contain no organization/customer information.

```markdown
---
title: Storefront Overview
description: Fictional retail data for demonstration.
---

# Storefront Overview

:::grid{columns="2"}
::metric{label="Orders" value="12480"}
::metric{label="Returns" value="384" comparison="12% below the previous week" direction="down" sentiment="positive"}
:::

::area{data="./orders.json" x="date" y="orders" xType="date" title="Orders by day" target="2000"}

::bar{data="./returns.json" x="reason" y="count" title="Returns by reason"}

:::table{data="./returns.json" title="Return detail"}
::column{field="reason" label="Reason"}
::column{field="count" label="Returns" format="number"}
:::
```

The companion `orders.json` and `returns.json` files are arrays of flat records. Data, comparisons and findings are prepared by the author.

All directive attributes arrive as strings. Examples always quote them. The registry decodes only declared numeric/enumerated properties; braces never mean JavaScript. No interpolation, expressions, imports, spreads, event handlers, user class names or arbitrary styles. Field names are literal top-level keys, not property paths or expressions.

| Component | Form | Initial properties and behaviour |
| --- | --- | --- |
| `grid` | Container `:::grid … :::` | `columns`: integer 1–4, default 2. Holds block components; no nested grids initially. Collapses responsively. |
| `metric` | Leaf `::metric` | Required `label`, finite numeric `value`; optional `format`, plain-text `comparison`, `direction="up\|down\|flat"` and `sentiment="positive\|negative\|neutral"`. Formatting defaults to `number`; sentiment defaults to `neutral`. No data query or computed value. |
| `line` / `area` | Leaf | Required local `data`, `x`, `y`, `title`; optional `xType="category\|date\|number"`, default `category`; optional `format` for y; optional finite numeric `target` and `targetLabel`. One series. Area shares line semantics and adds the design's fill. |
| `bar` | Leaf | Required local `data`, `x`, `y`, `title`; optional numeric `format`. Category x, numeric y, zero baseline, one series. |
| `table` | Leaf or container | Required local `data`; optional `title`. Leaf infers all fields in first-record key order; container declares ordered `column` children. Consistent record keys and stable single-column sorting. |
| `column` | Leaf, only inside `table` | Required `field`; optional `label`, `format`, `sign="auto\|always"` and `semantics="neutral\|higher-is-better\|lower-is-better"`. Only declared fields are displayed/exported in the explicit form. Unknown or duplicate fields are errors. |
| `callout` | Container | Optional `tone="note\|warning"`, default `note`; optional `title`. Markdown prose/list children; no nested components initially. |

The `format` vocabulary is `number`, `percent`, `percentage-points`, or `currency:XXX` with a validated ISO currency code. `percent` accepts ratios: `0.12` displays as 12%. `percentage-points` accepts point values: `0.8` displays as 0.8 pt. Currency accepts major units: `12.5` with `currency:GBP` displays as £12.50, while `12` displays as £12. Number defaults to at most two decimal places. Use a fixed `en-GB` locale for the first version; locale customization can follow a concrete request. Metrics, chart axes/tooltips and explicit table columns share the same formatters. Text columns reject numeric format/sign/semantics props.

Comparison copy and direction/sentiment are supplied by the agent; explicit direction or sentiment attributes require comparison text. A decrease in errors can be positive. In a numeric change column, `sign="always"` displays the sign and optional declared semantics determine sentiment; neutral is the default. Never infer business meaning from the sign or use colour as the only cue. `targetLabel` requires `target`; a target with no label uses a deterministic accessible default.

For example, the reference's mixed count/percentage table can be expressed without HTML or custom render functions:

```markdown
:::table{data="./adoption.json" title="By plan"}
::column{field="plan" label="Plan"}
::column{field="teams" label="Teams" format="number"}
::column{field="qoq" label="Δ QoQ" format="percent" sign="always" semantics="higher-is-better"}
:::
```

Its prepared `qoq` values are ratios such as `0.41`, displayed as `+41%`. The engine does not calculate quarter-over-quarter change from raw events.

The published [M3 visualization follow-up](m3-visualizations.md) adds `donut` with `data`, `category`, `value`, `title`, plus a native prepared funnel/progress-stage component matching reference 01. Donut values must be nonnegative and categories unique; an all-zero dataset is an empty state. Funnel percentages/status are prepared rather than inferred from an arbitrary stage denominator. Both are trusted renderers; M3 now specifies and validates their explicit prepared-data contracts. There is no separate `section` or `divider` component.

### Data semantics

- A dataset is a JSON array of flat records containing strings, finite numbers, booleans or null. Nested values are rejected initially. Validate the full consumed dataset, not a sample.
- Required fields must be own properties in every row. Reject `__proto__`, `constructor` and `prototype` keys; use explicit property access and never merge records into configuration.
- Line x values are consistently typed according to `xType`; ISO dates are parsed explicitly as UTC. Accept date-only `YYYY-MM-DD` and timestamps with an explicit zone, rejecting invalid calendar dates and ambiguous local times. Use numeric timestamps internally.
- Require line x values to be unique and increasing for numeric/date axes. Category axes preserve source order and require unique category keys. The agent sorts or aggregates beforehand. Bar categories must also be unique.
- Numeric chart values must be numbers, not numeric strings. For line charts, null produces a gap; missing fields are an error. Bar null values are errors. Never coerce null to zero.
- An empty array is valid and renders an explicit empty state; warn that fields cannot be checked without rows. A table with no records cannot infer columns.
- Tables require consistent keys across rows and consistent non-null types within each column, preserve declared column order (otherwise the first record's key order) and show null as an em dash. Text stays text. There is no arbitrary HTML cell renderer.
- Read a local file once per compilation and project only the fields needed by components into exported payloads. An inferred table intentionally includes all source fields; an explicit-column table includes only declared fields. Later interactive components may also need declared binding fields or prepared views; that retention must be explicit and documented.
- These initial flat-row rules are not the future GeoJSON/sparkline/subtotal schemas. Later capabilities extend through dedicated validated contracts, not by accepting arbitrary nested objects everywhere. Explicit reader filters/view selection are allowed in their planned increment; invisible analytical transformations remain prohibited.

Implemented guardrails: 1 MiB Markdown, 10 MiB per JSON file, 25 MiB total input, 64 datasets, 100,000 records per dataset, 10,000 points/categories per chart, 1,000 visible table rows and 40 table columns. Reject over-limit inputs with a preparation hint; never truncate silently. These are safety limits, not scalability promises. Agents can supply a summary dataset for a table and a larger aggregate for a chart. Limits are shared by the resolver and generated specification.

## 5. Compiler, registry and dependencies

```text
Markdown source
  -> parse Markdown/frontmatter/directives with source positions
  -> decode attributes + validate structure using the registry
  -> typed report IR with unresolved local data references
  -> resolve bounded local files + validate complete consumed datasets
  -> resolved report IR
  -> trusted component HAST + Markdown HAST -> sanitize user-content tree
  -> HTML template + escaped JSON payload + prebuilt CSS/JS
  -> preview response OR atomic HTML export
```

The IR is a small discriminated union, not a second parser or a universal document framework. Keep prose as safe Markdown/HTML AST nodes and components as typed nodes, retaining source spans. File resolution returns a dependency set alongside diagnostics, including attempted references where possible. Renderers receive validated data, never filesystem paths.

A registry entry contains the public name, allowed leaf/container forms, strict Zod property schema, allowed children, defaults, examples and a trusted renderer function or key. Generate `schema/components.json` and the CLI's machine-readable specification from these definitions. The browser imports only render code and types it needs; never import the runtime registry and its parser/Zod graph just to discover chart names.

Later named inputs/view bindings add explicit metadata to the resolved IR; composition definitions expand into the same trusted node types before rendering. Do not implement these during the MVP merely to reserve an abstraction. Geometry, rich table cells and required input fields will have their own schemas and payload projection rules when those increments land. The architecture must leave room for these capabilities without making every simple report pay for them.

| Scope | Proposed dependencies | Reason |
| --- | --- | --- |
| Portable CLI compiler | `unified`, `remark-parse`, `remark-directive`, `remark-frontmatter`, `remark-rehype`, `rehype-sanitize`, `rehype-stringify` | Established AST parsing and safe HTML serialization; verify on the Node consumer runtime and in Bun development. No `rehype-raw`. |
| CLI contracts/data | `yaml`, `zod` | Restricted frontmatter, strict props and generated JSON Schema. |
| CLI preview | Built-in Node HTTP, plus `chokidar`, `open` | HTTP/SSE, cross-platform save/rename watching and browser opening without shell command construction; one implementation for users and development. |
| Browser source | `echarts` as a development dependency, plus our TypeScript | Bundle modular SVG chart code into the shipped runtime. Consumers need no separate ECharts installation. Native table sorting and resize/theme handling require no UI framework or table engine. |
| Package development only | `tsrs` candidate, selected official TypeScript reference, `@types/node`, scoped `@types/bun`, `@playwright/test` | Explicit typecheck, Bun-built Node/browser assets and real browser checks. Bun runs core tests; Node runs consumer integration/smoke checks. Add esbuild only if the bundler gate selects it; no default Vitest/Vite+ dependency. |

Keep dependencies because they remove real implementation risk, not just to minimize the count. A multi-package AST ecosystem is acceptable when it never ships to browsers. Pin the development Bun version and dependencies in one `bun.lock`; verify supported Node compatibility, developer Bun compatibility, licenses, maintenance and transitive dependencies. The published package must resolve production dependencies with npm and require no Bun install/build hook. No exact versions are selected by this planning-only change.

TSRS belongs only to development tooling. It can improve typechecking feedback, not report parsing/rendering speed. Keep official TypeScript checking as the reference while the experimental candidate is validated, compare matching upstream versions/configurations, and test `--fast` independently. [TSRS evaluation and adoption gate](toolchain.md#typechecking-tsrs).

Use standard `node:util` argument parsing and Node's built-in HTTP server for the CLI/preview, including when developing under Bun. Keep `Bun.*` and `bun:*` out of the production dependency graph. Avoid a CLI framework, HTTP framework or a second Bun-specific server implementation. [Consumer/runtime boundary and sources](toolchain.md#package-and-runtime-consequences).

Prefer Chokidar over trying to normalize editor atomic saves and cross-platform watcher differences ourselves. Scope it to the report and referenced/attempted dependency paths; do not watch a user's whole directory recursively. [Chokidar upstream](https://github.com/paulmillr/chokidar).

The package ships compiled ESM JavaScript with a Node shebang and a Node 22+ consumer baseline. Report authors need Node/npm, not Bun; readers need only a browser. Bun 1.4.4 is the development tool. Packed npm/npx checks pass locally on Node 22.23.3, 24.22.1 and 26.13.0 with Bun absent from PATH. [Toolchain verification status](toolchain.md#verification-status).

## 6. CLI and filesystem experience

These commands are available in the published npm package and verified from a fresh public installation. For local engine development, use `node dist/cli.js` after `bun run build`:

```bash
npx plotleaf report.md
npx plotleaf dev report.md --no-open
npx plotleaf validate report.md
npx plotleaf validate report.md --json
npx plotleaf build report.md
npx plotleaf build report.md --out ./exports/storefront.html
npx plotleaf schema
```

| Command | Contract |
| --- | --- |
| `plotleaf <file>` | Alias for `dev <file>`. Start loopback preview, print URL, open browser after the first successful compile, watch until Ctrl-C. |
| `dev <file>` | Same preview; `--no-open` supports agents/headless environments; `--port` selects a port. Default to an ephemeral available port, avoiding collision prompts. |
| `validate <file>` | Run full syntax, component, reference and data validation. No browser, server or output artifact. `--json` returns one stable structured result on stdout. |
| `build <file>` | Compile and write self-contained HTML beside the input: `report.md` becomes `report.html`. `--out` changes the destination. Print path and byte size. No browser or server. |
| `schema` | Write versioned JSON component specifications to stdout, generated from the registry. Gives agents a discoverable API without locating npm internals. |

Support `--help` and `--version`. With supported Node/npm installed, no `init`, report configuration file, mandatory project install or remote connection is needed. Publish compiled JavaScript and runtime assets with the npm package; users never build plotleaf itself to view a report. The executable uses `#!/usr/bin/env node` and declares its tested Node engine minimum. Bun is not a consumer prerequisite. `bunx --bun plotleaf ...` is an optional compatibility path to verify against the same artifact. Initial package download time is outside the warm-start performance target.

Resolve the input from the caller's working directory; resolve its data references from the input's own directory. Resolve an explicit `--out` from the caller's working directory. The default output is beside the input. Normal builds may replace their output atomically, but must refuse a destination that resolves to any input/dependency, including via a symlink.

Example user's directory after export:

```text
analysis/
  report.md
  usage.json
  errors.json
  report.html        # generated; contains everything required to view it
```

No hidden cache directory is needed for the first version. Whether generated HTML belongs in version control is the report author's choice.

### Diagnostics

```text
report.md:21:1 E_DATA_FIELD
::bar references y="counts", but ./errors.json has no field "counts".
Available fields: category, count. Use y="count".
```

```json
{
  "valid": false,
  "diagnostics": [
    {
      "code": "E_DATA_FIELD",
      "severity": "error",
      "file": "report.md",
      "line": 21,
      "column": 1,
      "message": "Unknown field \"counts\" in ./errors.json.",
      "hint": "Available fields: category, count."
    }
  ]
}
```

Locations in this diagnostic illustration are illustrative. Real diagnostics use retained source spans, and include dataset row/field information where relevant. Use one-based line/column positions, stable codes, deterministic ordering and concise repair hints. Unknown component/property errors should suggest close matches. Do not print dataset contents or stack traces for routine author errors.

Exit codes: `0` success (possibly warnings), `1` invalid report/reference/data, `2` invalid CLI usage or operational/internal failure. Under `--json`, stdout contains only the JSON result; operational logs belong on stderr. Respect `NO_COLOR` and non-TTY output.

### Preview and reload

Use Node HTTP, Chokidar and server-sent events in one portable implementation. Recompile the whole small report on Markdown or referenced JSON changes; send a reload event and reload the page. Full-page reload is sufficient for V1. HMR, client-state preservation and a bundler dev server are unnecessary. Development process watch modes do not replace the explicit Markdown/JSON dependency graph or missing-file recovery.

Debounce saves, serialize rebuilds and avoid publishing stale intermediate output. Update the watched dependency set after compilation; retain missing/attempted references so creating a missing JSON file recovers. A failed rebuild shows an accessible diagnostic page and recovers on the next valid save, rather than presenting stale data as current.

Serve only the compiled page and explicit preview transport routes. Bind loopback, check request authority, and keep the SSE connection out of exported HTML. Ctrl-C closes watchers, connections and the server.

## 7. Portable export

**A self-contained interactive HTML file is practical for prepared, moderately sized datasets.** Inline the report CSS, classic IIFE browser bundle and an inert JSON payload. If the design calls for distributable fonts, embed licensed WOFF2 assets; do not use a font CDN. The initial MVP can use a clearly temporary system stack in technical fixtures, pending the owner's design.

Do not fetch JSON in the browser or rely on ES module imports, dynamic chunks, web workers or service workers for the first export. Local-file origin handling varies by browser, so an HTTP preview is insufficient proof. Test the actual file in Chromium and WebKit. [Browser file-origin considerations](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy).

Prose, metrics and tables are rendered at build time. Charts initialize as SVG in the browser; a generated HTML data table and chart title remain available without JavaScript. This keeps the weekend slice small. Full chart SVG at build time is optional later: ECharts supports SSR, but responsive sizing and browser re-rendering need care. Do not add SSR/hydration solely because the library offers it.

The artifact needs no network after it is opened and contains no preview client. Normal external hyperlinks are allowed but are not fetched to render the report. Report images are outside the weekend MVP; reject them clearly rather than silently producing an offline-broken file. The planned rich-table increment embeds validated local PNG/JPEG/WebP assets under the same path policy. Arbitrary SVG and remote images remain postponed.

Later filters, image cells, compositions and maps inherit this export contract. Inline every supported prepared view, required local raster asset and selected GeoJSON geometry; resolve/expand component definitions at compile time. No runtime file loads, tile servers, component imports or external glyph/font requests. Keep source/bundle size budgets separate by capability. All exported selectable data is readable by recipients, even when the default filter hides it.

Tradeoffs: each HTML file repeats the runtime; large data increases file size and memory; base64 binary assets add overhead; some email systems remove scripts or block HTML attachments. Portable means a local browser/static web artifact, not an interactive email body.

Use deterministic serialization, document-order IDs and fixed formatting defaults. Do not include build timestamps, absolute paths or random identifiers. Embed only consumed data, never secrets/environment variables. Preserve required third-party license notices inside the single-file distribution.

Do not add a folder export switch initially. If real report sizes justify shared external assets, add one later using the same renderer, relative bundled CSS/JS and embedded data. PDF/image export, a print-perfect layout and browser automation bundled with the CLI are deferred.

## 8. Security contract and verification

The threats are accidental disclosure of local files, resource exhaustion during compilation, and script/content injection in preview or exported HTML. There is no report-code execution feature to sandbox.

| Surface | Required control | Example check |
| --- | --- | --- |
| Markdown / frontmatter | Reject raw HTML; parse YAML without aliases/custom tags; strict metadata keys; sanitize generated content HAST. | Script/iframe/event-handler source, duplicate YAML keys and alias expansion fail safely. |
| Attributes / registry | Allowlisted names and properties; explicit scalar decoding; reject expression-shaped invalid values. | `onclick`, `style`, unknown chart options and `value="{process.env.TOKEN}"` are rejected. |
| Data values / HTML | Context-aware escaping; text-only labels/cells; no user data passed to raw HTML APIs. | Labels containing `<img onerror=...>` render as text and never execute. |
| Embedded JSON | Escape `<` as `\u003c` and other HTML-sensitive characters; never interpolate JSON into executable source. | `</script><script>…` remains data. |
| Local references | Report-relative real paths; containment after symlink resolution; regular files only; JSON extension; deny absolute/remote/hidden references. | `../secret.json`, symlink escapes, encoded traversal and special files fail with reference diagnostics. |
| Object handling | Flat records, own-property checks, reserved-key rejection and no unsafe merges. | `__proto__`/`constructor` fixtures cannot affect configuration or prototypes. |
| Resource use | Bound file reads, file count/aggregate bytes, row counts, chart points and table rows; reject huge nesting. | Over-limit files fail before rendering and suggest preparing smaller data. |
| Later rich inputs/assets | Validate input IDs/defaults/bindings, raster signatures, GeoJSON complexity and composition expansion with dedicated schemas. | Unknown bindings, cyclic definitions, oversized geometry and image-path escapes fail before export when those features land. |
| Links / assets | Allow safe explicit schemes such as HTTPS/HTTP/mailto and same-document anchors; block active schemes and report-authored embedded assets initially. | `javascript:` links and remote image nodes cannot become active report content. |
| Preview server | Loopback, explicit routes, Host/Origin checks where relevant, no permissive CORS or arbitrary static root. | Requests for source paths/dotfiles and unexpected hostnames are refused. |
| Output writes | Check output/dependency identity and symlinks; write temp file then rename; do not create a partial export on validation failure. | `--out` cannot overwrite the input or a dataset. |

Sanitize the complete user-derived content tree after Markdown/component transformations, before adding the trusted outer shell, runtime and inert data blocks. Never broaden the allowlist to allow report scripts or styles. `rehype-sanitize` is allowlist-based and includes guidance on DOM clobbering; prefix generated heading IDs and do not resolve runtime objects through named DOM globals. [Sanitizer guidance](https://github.com/rehypejs/rehype-sanitize).

Add a restrictive CSP using a hash for the exact trusted inline script; no `unsafe-eval` or author inline handlers. Block outgoing runtime connections in exports. ECharts may manipulate trusted SVG style attributes, so test the style policy with the chosen modules before promising a strict style CSP. Preview requires an explicitly scoped local connection policy. CSP complements escaping/sanitization and cannot replace them. [CSP script policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).

Path checks must use platform-aware relative-path containment, not a naive string prefix. Check again on each rebuild. The CLI does not promise isolation from another local process concurrently replacing the filesystem; document that boundary rather than claiming a sandbox.

## 9. Design integration contract

The three supplied screenshots are stored in `docs/design/references/`; [the design reference](design-reference.md) records their provenance, visual language and acceptance checklist. They establish light-theme desktop/cropped views. Exact fonts, dark-theme values, responsive behaviour and interactive open states are still unspecified, so adapt the established language and record those decisions rather than claiming those states were supplied.

| Area | Technical contract to prepare | Visual authority |
| --- | --- | --- |
| Typography | Body, heading, label and numeric roles; readable measure and tabular figures. Embed distributable fonts when selected. | Neutral sans-serif hierarchy, dark headings and spacious prose from references 01–03; exact font not identified. |
| Themes | Semantic CSS variables for canvas/text/muted/rule/focus/status and chart series. Follow system preference through `prefers-color-scheme`. | Supplied light theme; derive a restrained dark theme and verify contrast. |
| Layout | Fluid reading/report width, consistent spacing, 1–4-column grids and isolated table overflow. | Wide analysis in reference 01 and narrative flow in 02; mobile is an adaptation, not a supplied crop. |
| Metrics | Label/value/comparison hierarchy, explicit direction/sentiment, long-value handling. | Open KPI rows in 01, without enclosing decorative cards. |
| Charts | Shared fonts/formatters, restrained blue line, subtle area fill, literal target, quiet axes/tooltips, `ResizeObserver` and theme updates. | Line/area in 01–03 and target in 03; no default chart-library skin. |
| Tables | Declared formats/signs, numeric alignment, subtle rules, sort/focus states and local narrow-screen overflow. | Low-chrome formatted tables in 01–03. |
| Content | Headings, links, emphasis, code, quotes, callouts and dividers. | Narrative summary/findings in 02–03. Breadcrumbs are reference context, not a routing requirement. |
| Later controls | Native labelled inputs and explicit bindings, segmented choices, reset/empty states. | Date/region controls in 01; no inert controls in the MVP. |

Accessibility is part of implementation: readable contrast, visible focus, text alternatives, chart data access through a native disclosure/table, keyboard-operable sort controls, meaningful titles, touch access and reduced motion. Do not encode information through colour alone. Start chart animation disabled; any later motion must follow the design and respect user preferences.

Keep token values internal in V1. No theme editor, arbitrary per-report CSS or public theming configuration is needed. A manual theme switch is optional later; automatic system preference is the baseline.

Compare the delivered components against applicable reference regions; verify dark/mobile adaptations separately. The weekend slice does not reproduce reference 01's complete functional dashboard because filters and funnel come later. Do not claim that reference composition is fully implemented until its behaviours exist. Rich table cells, maps and reuse follow the roadmap and inherit this visual system.

## 10. Repository structure

The implemented repository uses one package and ordinary modules:

```text
plotleaf/
  AGENTS.md
  README.md
  package.json
  bun.lock
  bunfig.toml
  tsconfig.json
  tsconfig.browser.json
  tsconfig.dev.json
  src/
    cli.ts                 # argument parsing, commands, exit codes
    compiler/
      parse.ts             # Markdown/frontmatter -> source-positioned IR
      ir.ts
      registry.ts          # properties, docs metadata, child rules, render keys
      data.ts              # bounded/path-safe JSON resolution and data checks
      diagnostics.ts
      compile.ts           # shared orchestration
    render/
      content.ts           # trusted HAST component handlers and sanitization
      html.ts              # document shell, CSP and asset assembly
      styles.css           # owner's design via semantic tokens
    browser/
      base.ts              # typed stable table sorting
      charts.ts
    shared/
      format.ts            # deterministic formatters shared with browser
      payload.ts
      serialize.ts
      limits.ts
    preview.ts             # HTTP + SSE + dependency watching
    export.ts              # safe serialization and atomic file output
  scripts/
    build.ts               # Bun-executed Node-target CLI/browser asset build
    measure.mjs            # repeatable local Node/browser measurements
  schema/
    components.json        # generated; checked for drift
  skills/
    plotleaf/
      SKILL.md             # distributable guide for report authors
  examples/
    storefront/
      report.md
      orders.json
      returns.json
      categories.json
    adoption/
      report.md
      adoption.json
      plans.json
  tests/
    core/                  # Bun test discovery scoped here
      helpers.ts           # bounded temporary fixtures and explicit Node CLI
      compiler.test.ts
      security.test.ts
      cli.test.ts
    browser/               # separate Playwright test discovery
      report.spec.ts
    consumer/              # Node/npm-only packed-artifact smoke checks
      smoke.mjs
  docs/
    phase-zero.md
    phase-zero-results.md
    phase-zero-metrics.json
    toolchain.md
    design-reference.md
    product-roadmap.md
    design/references/     # preserved owner-supplied screenshots; not npm assets
  dist/                    # generated npm package JS + prebuilt runtime assets
```

Keep these boundaries concrete rather than designing an adapter framework. The build script also generates the specification and bundled license notices. Publish only compiled files, runtime assets, schema, authoring skill, examples and required documentation/license notices. Reference screenshots and development-only documentation are excluded from the runtime package. Later input/map/composition modules are added only when their increments begin.

## 11. Weekend MVP and implementation sequence

Assume one developer, roughly 16–18 focused hours **after the technical gates pass**, using the supplied design references and including area/target/formatting needs. It is a scope target, not a promise that the full V1 or capability roadmap fits a weekend. If visual calibration needs more time, reduce component scope explicitly or extend the timebox.

| Order | Timebox | Deliverable |
| --- | --- | --- |
| 1 | 1 h | Verified Node consumer/Bun development toolchains, one TypeScript/ESM package, build/test scripts, `bun.lock` and Node-shebang packaged CLI entry. |
| 2 | 3 h | Parser, small IR, registry, safe data resolver and source-positioned human/JSON diagnostics. Prove `validate` first. |
| 3 | 4 h | Reference-led Markdown, 1–4-column grid, metric/comparison direction and sentiment, callout and native table with explicit column formatting. Both automatic themes and responsive layout. |
| 4 | 3 h | Single-series line/area/bar SVG charts with one literal target, consistent formatting, safe tooltips and data alternatives. |
| 5 | 2 h | Self-contained deterministic HTML build, offline checks and output protections. |
| 6 | 2 h | Loopback preview, browser opening, dependency watch and reload/error recovery. |
| 7 | 1–3 h | Agent authoring skill, generated spec, representative example, CLI smoke checks and visual/browser acceptance. |

Keep this dependency order: a correct shared compiler before a watch server; an export that works before extra export formats; one approved report before more chart types. Check security behaviours while implementing each boundary rather than leaving them to the final hour.

### MVP acceptance criteria

- An agent following only the shipped authoring skill and component spec can create the storefront example from prepared JSON, without scaffolding an application or account.
- `validate` accepts that report and returns actionable source locations for unknown components/props, bad numeric values, missing files, invalid JSON and missing fields. Grammar recovery limitations are documented and tested.
- `plotleaf report.md` opens a local preview; `--no-open` prints a usable URL. Markdown and referenced JSON edits reload the report, including recovery from temporary invalid/missing files.
- `build` creates one HTML file. Copy it away from its sources and open it through `file://` in Chromium and WebKit with networking blocked: line/area/bar interaction, target marks and typed table sorting/formatting still work, without console errors or runtime requests.
- With JavaScript disabled, prose, KPIs, tables and chart data alternatives remain readable. Chart graphics themselves are not promised without JavaScript in this slice.
- Applicable light-theme desktop components match the stored references: open four-metric row, quiet chart/table treatment and narrative findings. Dark mode and 375 px mobile are verified adaptations with readable contrast. Focus/sort/disclosure behaviour works by keyboard and table overflow stays inside its container. No inactive filter controls or claims that the full onboarding dashboard is complete.
- Hostile labels and script-terminating JSON values do not execute. Outside-root/symlink references, unsafe URLs, oversized inputs and input-overwriting destinations fail safely.
- Two builds with identical input/package assets produce identical bytes. Unused dataset fields and absolute source paths do not appear in the export.
- A packed/installed npm package runs through Node and its `npx` executable from an unrelated directory with Bun absent from PATH. It requires no repository files, development dependencies, install-time build or per-report JavaScript bundling. Test validate, build and preview/watch recovery on supported Node releases.
- New code passes explicit typechecking, focused Bun core tests, Node CLI integration, a Node-only consumer smoke gate and Playwright against the Node preview/export path. Documentation describes only available commands and supported syntax.

### Measurement gates

Use a fixed fixture of four metrics, two 1,000-row charts (area with a target and bar) and a formatted 100-row table, with no images. Measure consumer performance under Node; record machine, Node version, development Bun version, dependencies, bundler/settings and command. Measure five warm runs; report median and spread. Development/Bun timings are separate from consumer runtime evidence. Targets are provisional until the spike supplies results:

| Measure | Initial target | If it misses |
| --- | --- | --- |
| Warm CLI start to preview listening | Under 1 second, excluding package download/browser launch | Profile imports; defer chart loading for validate; remove runtime compilation. |
| Valid edit to browser reload | Under 500 ms after save stabilization | Inspect watcher/debounce and compile cost before adding caches. |
| Core chart modules + browser runtime | Original provisional 200 KiB; explicitly revised to 210 KiB for M3, excluding CSS/fonts/data | Measure line/area/bar/target and the prospective donut module; compare Chart.js if needed. Maps and rich interaction get separate future budgets. |
| Chart-free report | No chart runtime in output | Select the prebuilt runtime only when required; no per-report bundling. |
| Portability | Zero required network requests; real local-file browser pass | Remove fetch/module/chunk dependencies; do not substitute an HTTP-only test. |

Measure both the actual MVP chart runtime and the prospective line/bar/area/donut/target runtime, rather than only a toy line chart. Area and target are now in the MVP; donut follows later. Use prebuilt text-only and chart-enabled runtime variants if needed; avoid combinatorial per-component bundles. Geography must not inflate ordinary reports and has a separate budget when implemented. Also record npm packed size and installed/transitive size, without presenting them as transfer/runtime measurements.

### Staged capabilities and deliberate deferrals

Use [the product roadmap](product-roadmap.md) as the scope authority beyond the weekend: V1 increments cover donut/funnel, safe rich tables and local raster assets, explicit filters/prepared views, then declarative reuse/prepared subtotals. A later geographic increment covers custom local GeoJSON, heatmaps and geographic selection as input. These are planned product capabilities, not permanent exclusions. Filter input primitives may appear beside any report content once their binding/state contract is implemented.

Keep advanced multi-series/stacked/dual-axis charts, unrestricted cross-filtering, drilldowns, arbitrary annotations beyond the single target, computed metrics, general analytical transformations, nested layouts, multi-page navigation, report includes, arbitrary CSS, executable custom components/plugin loaders, schema migration frameworks, advanced data grids, SSR chart hydration, PDF/image export, asset-folder export and a documentation website deferred until justified. Plain Markdown already provides contextual annotations. Declarative reuse and explicit prepared-view selection do not authorize report JavaScript or a query engine.

Continue to exclude all explicitly out-of-scope platform features: hosting integrations (including Cloudflare), accounts, infrastructure, AI/chat, MCP, drag-and-drop, collaboration, scheduling and enterprise permissions.

## 12. Decision status and next work

| Item | Current status | Next evidence |
| --- | --- | --- |
| Product principles / exclusions | Established by owner | Preserve in implementation reviews. |
| Design authority | Three references preserved; owner-reviewed MVP published with responsive currency fixes | Every later renderer release needs owner visual review; onboarding filters remain unbuilt; M3 funnel/donut are published as 0.2.0 after the preview review handoff. |
| Expanded capabilities | Staged roadmap delivered | Prioritize increments after the revised MVP; no filters/maps/reuse implementation claimed. |
| Consumer runtime / development tools | Packed checks pass on Node 22/24/26; Bun 1.4.4 pinned | Platform matrix and measured remote results are recorded in [source/CI evidence](source-ci.md). |
| Package asset bundler | Bun.build selected; Node ESM and browser IIFEs pass | Watch future output regressions; no competing bundler installed. |
| Core / consumer / browser tests | 46 core and 14 Chromium/WebKit checks pass locally; consumer checks exclude Bun | Linux/Windows CI is implemented; see [source/CI evidence](source-ci.md). Vitest remains deferred. |
| Typechecker | Official TypeScript authoritative; TSRS passes same configurations with fast disabled | Matching-version conformance and repeated time/memory comparison remain open. |
| Directive DSL / remark | Implemented with source-aware recovery lint | Extend fixtures when syntax changes; preserve literal-only language. |
| Static renderer / no framework | Implemented; offline, theme and resize checks pass | Revisit only with a real future shared-input fixture. |
| Modular ECharts SVG | Implemented; current bundle meets provisional budget | M3 includes donut at about 203.5 KiB gzip under an explicit 210 KiB build-enforced ceiling; see [M3 evidence](m3-visualizations.md). |
| Native tables | Formatted columns and stable keyboard-accessible sorting implemented | Richer cells/subtotals follow dedicated contracts. |
| Single-file HTML default | Offline `file://` interaction passes in both browsers under CSP | Larger assets and other export formats remain deferred. |
| Data semantics and limits | Shared implementation/specification; adversarial fixtures pass | Validate future dataset kinds through separate schemas. |
| Versions/licenses/performance | Pinned versions, retained notices and local measurements recorded | No comparative checker-speed or cross-machine performance claim. |
| AGENTS.md / documentation / authoring skill | Delivered and synchronized with actual commands | Keep future capability claims separate from delivered features. |

The first MVP is published as `plotleaf@0.1.0` after owner visual review and fresh public npm/npx verification. The [source/CI foundation](source-ci.md) establishes public source/release traceability and remote platform verification. The [delivery roadmap](product-roadmap.md) keeps small feature increments next. A concrete prepared-view fixture must precede reader-input implementation. See [implementation evidence and remaining limits](phase-zero-results.md).

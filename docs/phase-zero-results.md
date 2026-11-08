# Phase Zero and first MVP results

Recorded: 7 November 2026, macOS arm64 on Apple M4. The initial MVP is published as `plotleaf@0.1.0` and verified from a fresh public npm installation. Configured GitHub Actions have not run remotely.

## Selected architecture

One TypeScript/ESM package, developed with Bun 1.4.4 and distributed as Node-compatible JavaScript for Node 22+. Bun.build emits the Node-target CLI and fixed browser IIFEs. Consumers need Node/npm; report readers only need a browser. Rendering a report never invokes a JavaScript bundler.

The compiler uses unified/remark, frontmatter and directive extensions, Zod property validation, a typed intermediate representation and a separate local JSON resolver. A single registry generates the public component specification. Trusted HAST handlers render semantic content; rehype-sanitize enforces the user-content allowlist before serialization. Plain browser TypeScript enhances native tables; modular ECharts supplies SVG charts. There is no application framework or plugin layer.

The preview uses Node HTTP, SSE and Chokidar. It renders through the export path, adds a reload client and watches both resolved and attempted dataset references. Invalid edits show diagnostics and recover when fixed. Exports are atomic, self-contained HTML with embedded styles, selected fields, browser assets and required license notices. They contain no preview transport or source paths.

Bun's current IIFE output passed the actual package and offline-browser gates, so esbuild was not added. Rolldown, Vite/Vite+ and Vitest remain evaluated alternatives rather than dependencies. See [toolchain rationale](toolchain.md).

## Delivered surface

| Area | Implemented |
| --- | --- |
| Authoring | Markdown prose, headings, lists, emphasis, links, code fences, rules and strict `title`/`description` frontmatter. |
| Layout/content | Responsive 1–4-column grids, metrics with prepared comparison/direction/sentiment and Markdown callouts. |
| Charts | Single-series line, area and category bar; literal line/area targets, safe tooltips, native HTML data alternatives. |
| Tables | Inferred or explicit columns; typed formats, sign display, declared sentiment semantics and stable keyboard-accessible sorting. |
| CLI | Report-path alias, `dev`, `validate`, `validate --json`, `build`, `schema`, help and version. |
| Portability | One HTML file; no CDN, fetch, source files or server needed after export. |
| Agent guidance | Root AGENTS.md, generated component JSON specification, examples/datasets and distributable `skills/plotleaf/SKILL.md`. |
| Appearance | Reference-led typography, open KPIs, restrained chart styling, light/dark system preference and responsive layouts. |

Run from this checkout:

```bash
bun install --frozen-lockfile
bun run build
node dist/cli.js examples/storefront/report.md
node dist/cli.js validate examples/storefront/report.md --json
node dist/cli.js build examples/storefront/report.md
```

The adoption example adds a narrative layout, February–June area chart, target and signed percentage table. Both examples use illustrative, agent-prepared data. The public `npx plotleaf` interface is verified through both audited tarball installations and a fresh public npm/npx installation; see the [release record](releases/0.1.0.md).

## Grammar and data decisions

Directives stay literal and predictable: one line per leaf, explicit closing fences for containers, and longer outer fences when nesting a table/callout inside a grid. The mature Markdown parser remains responsible for the AST. A narrow source-aware lint catches reserved directive lines that would otherwise recover into prose, missing closures and duplicate attributes. Inline/list/blockquote components, label shorthand, raw HTML, arbitrary attributes and expressions are rejected. Code fences remain inert.

JSON is an array of flat scalar records. Charts retain the prepared order, require unique x values and require numeric/date axes to increase. Date-only values and explicitly zoned timestamps are validated as real dates and displayed in UTC. Line/area nulls create gaps; bars reject null values. Missing, mixed or nonfinite values fail with positioned diagnostics rather than becoming zero. Empty datasets produce explicit empty states. Tables sort raw values and export only declared columns, or all fields when columns are inferred.

Limits are shared with the machine-readable specification: 1 MiB Markdown, 10 MiB per JSON file, 25 MiB aggregate input, 64 datasets, 100,000 dataset rows, 10,000 chart rows, 1,000 table rows and 40 table columns. Component/Markdown nesting and diagnostic output are bounded. These are safety limits, not a tested scalability claim.

Local file references must remain within the report directory after realpath/symlink resolution. Remote, absolute, encoded, hidden and nonregular inputs are rejected. Reads are bounded before parsing; named pipes cannot hang compilation. Export destinations cannot replace input files through ordinary paths, symlinks or hardlinks. Preview binds only to loopback, validates Host/Origin and serves explicit routes rather than a filesystem directory.

HTML-sensitive JSON is escaped in inert payloads and data attributes. Generated chart options expose no callbacks or author HTML. CSP permits only hashes of the assembled scripts; exports deny network connections. Trusted chart inline styles require the documented style policy. All embedded data remains readable to recipients; filtering or hiding content would not redact it.

## Local verification

| Check | Evidence |
| --- | --- |
| Frozen install | Bun 1.4.4 installs the exact locked dependency graph. |
| Official typecheck | TypeScript 7.0.2 passes production, browser and development configurations. Production declarations exclude Bun; browser declarations exclude Node/Bun. |
| Candidate typecheck | TSRS `0.23.0-ts7.1.0-beta` passes the same configurations with `--fast false`. |
| Core/integration | 46 passing Bun tests, including currency-format regression cases and actual Node subprocesses for CLI and preview. |
| Browsers | 14 passing Playwright 1.65.0 checks across Chromium and WebKit: copied offline `file://` HTML, SVG/tooltip, typed/keyboard sort, CSP/hostile values, system theme, 375 px layout, JS-disabled alternatives, distinct UTC month labels in another time zone and preview recovery. |
| Packed consumers | npm tarball installed without development dependencies; `npx` validate/build and Node preview pass on 22.23.3, 24.22.1 and 26.13.0 with Bun absent from PATH. |
| Determinism | Export bytes match across repeated builds; generated specification is checked for registry drift. Fixed package assets/spec/notices also match across consecutive package builds. |
| Agent skill | The authoring skill passes the skill-creator frontmatter validator. |

Screenshots were inspected in light, dark and mobile layouts. The storefront report preserves open KPI rows, quiet blue charts with a transparent area fill, subtle tables and document hierarchy. Fonts use the platform's system sans-serif stack without downloads. Dark and mobile layouts are deliberate adaptations; the references supplied neither. The implementation does not claim the complete onboarding reference, whose functional filters and funnel are still future work. Final visual calibration remains open to owner feedback.

The TSRS and official compiler pins follow different upstream TypeScript versions. Successful project checks do not establish full conformance or a measured speed improvement. Matching-version deliberate-error comparisons and repeated cold/warm time/memory measurements remain open before making TSRS the sole checker.

## Measurements

These figures are the original implementation snapshot. The renamed package's current archive and verification evidence are recorded in the [plotleaf release review](releases/0.1.0.md).

[Raw results](phase-zero-metrics.json) record the fixture, exact versions and five warm runs under Node 22.23.3. The fixture contains four metrics, two 1,000-row charts and a formatted 100-row table. These are local warm-process measurements, not package-download or cross-machine promises.

| Measure | Result | Initial gate |
| --- | --- | --- |
| CLI report build | Median 280.4 ms; 270.6–328.2 ms | Recorded separately from startup. |
| Preview process to listening | Median 270.7 ms; 265.9–272.1 ms | Under 1 second. |
| JSON write to visible browser reload | Median 301.4 ms; 297.9–311.9 ms | Under 500 ms; includes stabilization, compilation and full reload. |
| Chart browser IIFE | 580,944 bytes raw; 198,890 bytes / 194.2 KiB gzip using Node zlib | At most 200 KiB gzip, excluding CSS/data. Bun's compressor reports about 196 KiB. |
| Table browser IIFE | 968 bytes raw; 577 bytes gzip | Chart-free reports omit the chart IIFE entirely. |
| npm tarball | 232,253 bytes / 226.8 KiB; own unpacked content 709,794 bytes | Includes examples/skill/schema/notices, excludes source/tests/references. |
| Production installation | 10,919,955 regular-file bytes / 10.4 MiB across 102 package entries including plotleaf | Logical installed bytes, not allocation or transfer size; development dependencies omitted. |
| Storefront HTML | Approximately 599 KiB | Fully offline; no additional assets. |

A disposable prospective pie/donut module probe measured 600,366 bytes raw and 208,080 bytes / 203.2 KiB gzip with Bun's compressor. It slightly exceeds the initial chart budget, so donut is not silently included in the MVP. Review a separate prebuilt capability or the budget before shipping that increment. No esbuild/Chart.js comparative benchmark was needed for the passing current slice.

Reproduce runtime measurements after building and installing Playwright browsers:

```bash
node scripts/measure.mjs
```

The measurement script replaces the raw runtime-results JSON. Consumer checks can separately emit package sizes using `PLOTLEAF_CONSUMER_METRICS=/absolute/path/results.json bun run test:consumer`. Compression implementation and exact package contents can affect recorded sizes.

## Remaining work

Configured Linux CI has not run remotely, and Windows has not been verified. Browser auto-opening uses the mature `open` package; headless suites exercise `--no-open`. The public npm release and registry invocation are verified. Source repository URLs and remote CI remain separate work.

The first MVP deliberately omits filters/prepared-view bindings, donut/funnel, image/sparkline/subtotal cells, maps/GeoJSON and reusable compositions. Those remain the [roadmap](product-roadmap.md), with their own data, interaction, security and size gates. Before adding shared input state, complete one concrete region/range prepared-view fixture. No account, hosted service, SQL, embedded AI, MCP server or arbitrary report execution is required.

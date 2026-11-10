# Product capabilities and staged delivery

Updated: 8 November 2026. **The current release is `plotleaf@0.3.1`, including M4 and the agent-discovery patch.** The initial MVP is archived as 0.1.0. Its public npm archive matches the reviewed artifact, and fresh public `npx plotleaf` checks pass without Bun. See the [current release record](releases/0.3.1.md), [initial release](releases/0.1.0.md) and [implementation results](phase-zero-results.md). This document tracks delivered scope and the recommended delivery order; later capabilities remain proposed contracts, not shipped features or committed release dates.

## Delivery position

Delivered: Markdown/local JSON compilation, responsive grids, prepared metrics/comparisons, line/area/bar charts and literal targets, formatted/sortable tables, callouts, validation/schema discovery, live reload, deterministic single-file offline HTML and the authoring skill. The published renderer includes the owner-reviewed currency wrapping/whole-amount formatting fixes.

The original local evidence covers 46 core tests, 14 Chromium/WebKit checks, audited package checks on Node 22/24/26 and a clean public npm/npx install without Bun on macOS arm64. The [source/CI foundation](source-ci.md) now adds public source, immutable release traceability and remote Linux/Windows verification; its evidence record tracks the platform results. M3 publishes its prepared funnel and donut views in `0.2.0`; functional filters remain unbuilt. [M3 contracts and review status](m3-visualizations.md) include the completed technical and publication checks.

**M1–M4 are complete. M4 rich table cells and the cumulative review report are published as `0.3.0`**, technically verified and owner-approved. Prepared-view interactions, reuse and geography follow. The initial package is shipped; the broader V1 capability set is still in progress. A planning update does not change the published `0.1.0` artifact.

## Product direction

| Capability | Intended experience | Constraint to preserve |
| --- | --- | --- |
| Visualizations | Publication-quality, interactive visuals with broad control through a small declarative API. | Consistent design; safe typed properties; no raw library-option dump or report-authored callbacks. |
| Filters | Dropdowns, inputs and toggles can be placed alongside any report content. | Explicit local bindings, predictable state and offline operation; no backend/query service. |
| Data tables | Formatting, sparklines, subtotals and images alongside accessible sorting and navigation. | Native table semantics, prepared data, declared calculation scope and safe assets. |
| Maps | Heatmaps, custom GeoJSON and map selection as input to other views. | Local geometry, bounded complexity and an offline export path; no required tile server or key. |
| Custom components | Agents can create useful visuals and package repeatable team presentations. | Declarative reuse first; new executable renderers belong to trusted engine/package development. |

Treat these as the intended product direction. The staging below keeps the first release useful and reviewable while recognizing that the full brief exceeds a weekend. User-requested changes to priorities can move an increment without changing the security or portability contract.

## Delivery stages

| Stage | Status | Scope | Exit evidence |
| --- | --- | --- | --- |
| Phase Zero core contract | Delivered; follow-ups open | Grammar, registry, export/security/runtime checks, measurements and design references. | Results are recorded. Matching-version TSRS evaluation and the future input-state fixture remain open; neither is claimed complete. |
| M1 — Initial MVP | Published: `0.1.0` | Markdown, 1–4-column grids, prepared metrics/comparisons, line/area/bar and targets, formatted/sortable tables, callouts; validate/preview/build/schema and authoring guide. | Public npm/npx verification, offline browser checks, owner visual review and exact-archive integrity recorded. |
| M2 — Release foundation | Delivered: 8 November 2026 | Public source repository, immutable `v0.1.0` baseline, pinned CI, shared-archive Node 22/24/26 consumers on Linux/Windows and platform core/browser checks. | [Source/CI evidence](source-ci.md) records reproduction, actual platform results and limitations. |
| M3 — Visualization increment | Published: `0.2.0`, 8 November 2026 | Prepared funnel/progress stages, bounded donut categories, native data alternatives and fictional onboarding example. | [M3 evidence](m3-visualizations.md); chart budget explicitly revised to 210 KiB gzip and enforced by build. Owner authorized publication after the preview review handoff. |
| M4 — Rich table cells | Published: `0.3.0`, 8 November 2026 | Local PNG/JPEG cells, deduplicated offline assets, bounded static sparklines with shared column scales and explicit scalar sort keys. | [M4 contracts and evidence](m4-rich-tables.md): 116 local/Linux core tests, 114 Windows passes + two skips, 34 browser checks per platform, all 11 CI jobs, audited 29-file archive and cumulative review report. Owner visual acceptance, final CI, exact public archive and fresh anonymous npx verification are complete. |
| M5 — Interaction increment | Planned; contract fixture first | Dropdown, text/number input, toggle, segmented choice and supported date-range selection; explicit bindings, reset/no-match states and prepared views. | One real region/range transition is specified before implementation. Bound metrics, charts, funnel, tables and alternatives update coherently offline. |
| M6 — Reuse increment | Planned | Versioned declarative compositions, typed props and reusable definitions in companion JSON. Prepared subtotal rows with explicit scope. | One composition is reused in two reports; cycles/unknown props fail; exports work without definition files and subtotals retain their declared scope. |
| M7 — Geographic increment | Later, planned | Local GeoJSON/region maps, then point-density heatmaps and selection linked to input state. | Offline fixtures, bounded geometry, accessible selection alternatives and a separate bundle/performance budget. |
| Advanced extensions | Deferred | New trusted renderers, broader table engines, reducers or view frameworks only when demonstrated needs justify them. | An explicit trust/packaging decision; no arbitrary report JavaScript or incidental plugin platform. |

The V1 increments are ordered defaults; their estimates must follow the MVP results. Maps and arbitrary new renderer extensibility are planned beyond the weekend and initial V1 increments. They are not permanently out of scope. The original exclusions for accounts, SQL/connectors, hosting, embedded AI/MCP, visual editing, collaboration and scheduled refresh still apply.

## Agent discovery patch before M5

Published [0.3.1](releases/0.3.1.md) adds a copy/paste report-authoring prompt to the README and `npx plotleaf guide`. The command prints the already bundled `skills/plotleaf/SKILL.md` from its package location; `schema` remains the exact component API. The user-facing prompt delegates setup, syntax discovery, validation, export and preview instructions to the agent through the guide command. No skill installer, project scaffolding, additional dependency, renderer change or M5 interaction implementation is needed. The owner authorized publication; final-source CI, exact public archive and fresh anonymous npx guide/schema/validate/build checks pass.

## Minimal website

The owner explicitly authorized a minimal Astro website in the same repository under `site/`, deployed to [https://plotleaf-site.loueed.workers.dev](https://plotleaf-site.loueed.workers.dev). Its `/agent` route imports the existing authoring guide and `/schema.json` imports the generated component specification. Site tooling is private and isolated from the engine/npm package; reports still require no hosted infrastructure. The agent prompt now links directly to the live guide. This does not implement M5 or add report hosting integrations. See [website setup](site.md).

## Next delivery slice

The source/CI foundation is delivered, with all 11 remote jobs passing on Linux/Windows. Public source is [LoueeD/plotleaf](https://github.com/LoueeD/plotleaf), and `v0.1.0` reproduces the published artifact. Source/issue links are included in 0.2.0. Keep `examples/report.md` as the cumulative owner-review report at the same live preview URL; add milestone features there while retaining earlier demonstrations. Keep the manual owner visual-review step and exact-tarball audit/consumer checks for renderer releases. Continue using fictional examples only; a plan or CI change does not require npm publication.

M3 is published as `0.2.0`: prepared funnel/progress stages and donut views through the existing registry/data contracts. The single chart runtime measures about 203.5 KiB gzip under the explicitly revised 210 KiB build ceiling. Native funnel-only reports retain the small base runtime. The owner authorized this renderer release after the preview handoff; future renderer changes require another manual review; passing CI is a separate technical gate. M4 now implements both local image and static sparkline column kinds in the existing native table; see [its contract](m4-rich-tables.md). The owner approved the cumulative preview; final M4 validation, publication and public verification are complete in [release 0.3.0](releases/0.3.0.md).

The interaction contract can be prepared independently as a small documented fixture: one region/range transition with ready-to-render metric, series, funnel and table values. Implement one native selector and its prepared-view bindings before expanding to every control type. M4 images/sparklines use native table markup and no data-grid engine; preserve this boundary during later interaction work. Dates and effort estimates are not committed until these slices are scoped against the code and platform results.

Matching-version TSRS conformance/speed measurement remains an optional development-tool follow-up while official TypeScript stays authoritative. It does not block the published renderer or justify weakening release checks. A documentation website, new UI framework, MCP server or deployment service is not needed for the next batch.

## Visualization flexibility

Express common needs as a small number of typed properties: fields, series, units, orientation, literal targets and labels. Keep typography, palette, axis rules and tooltip treatment cohesive and owned by the design system. Exposing every ECharts setting would expand validation/security obligations and make agent output less predictable.

Area charts and literal `target`/`targetLabel` properties are shipped. ECharts expresses area through its line-series configuration; M3 now adds explicit funnel/donut contracts and fixtures; broader multi-series options remain future work. Keep a general annotation language deferred. [ECharts area chart](https://echarts.apache.org/handbook/en/how-to/chart-types/line/area-line/), [style controls](https://echarts.apache.org/handbook/en/concepts/style/).

“Publication quality” means carefully formatted, well-composed browser/static-web output in the first release. It does not claim that automated PDF export or journal-specific print formats already exist. Keep vector rendering where practical; evaluate print/export requirements separately.

## Filters and shared state

Filters are explicit reader interaction with prepared data. They do not turn plotleaf into an analysis engine.

- Each input has a stable ID, label, type, default and an allowed value domain. Components declare their bindings; nothing filters globally by accident.
- Prefer native select/input/checkbox controls. Segmented choice uses accessible radio/button semantics. A date-range can initially use two labelled native date inputs; a custom calendar is a separate UX decision.
- Initial row operations are typed equality, range and literal text matching. Text is not evaluated as a regular expression or expression language. Date boundaries and null behaviour must be specified.
- Keep one small explicit state store and update queue. Do not build an event-bus framework or dependency-DAG platform. Reevaluate Preact/Lit only if a real filter fixture makes lifecycle/state code simpler.
- A data-consuming component and its HTML alternative share the same selected view. Sorting does not mutate the original dataset. Control labels, reset, no-match and invalid-value states are part of the feature.
- No URL state, local-storage persistence, remote fetch or analytics is needed initially. Deterministic defaults keep exported files reproducible.

Illustrative future syntax, deliberately limited to an unambiguous table example:

```markdown
::select{id="region" label="Region" data="./accounts.json" field="region"}

::table{data="./accounts.json" title="Accounts" filters="region"}
```

This syntax is not supported by the MVP. The initial “All” state means no row predicate, with a distinct internal value rather than a magic string that can collide with a real region. Derive/select options deterministically and validate defaults/bindings. A filtered table is not a mechanism for computing totals or chart aggregates.

### Coherent dashboard filtering without an analytics engine

The onboarding screenshot's date/region controls imply that KPIs, chart series, funnel and table agree. Selecting rows from an already aggregated time series does not automatically recompute a conversion rate or the correct denominator.

For those dashboards, prefer **agent-prepared view bundles**: a companion JSON file enumerates supported input combinations and their ready-to-render metrics/series/stages/table rows. Runtime input changes choose a declared view; they do not execute calculations. Validate view keys, unique combinations, compatible schemas, supported date ranges, size and a valid default. Bundle all selectable data so export stays offline.

Do not claim every arbitrary date range is supported by a prepared bundle. Constrain controls to supplied ranges and show a clear unavailable/no-match state. Free date ranges over raw event rows would require explicitly defined bounded reducers or externally prepared data, and are outside the first interaction contract.

The view-bundle schema and binding syntax remain a design task for the interaction increment. Before implementing it, a paper fixture must show one real region/range transition across all four component types and account for the extra retained fields/data. Do not freeze a broad query DSL to reserve future functionality.

Plain Markdown does not automatically become reactive. Time-bound prose must identify its scope, or later use a small declared data-value binding. A static metric inside a filtered page must be labelled as unfiltered unless it participates in the prepared view.

## Rich tables

Column metadata preserves the native table: fields, labels, number formats, sign display and semantic direction. M4 adds explicit image/sparkline kinds; subtotals remain proposed for M6:

| Column or row feature | Data contract / stage | Required behaviour |
| --- | --- | --- |
| Formatted scalar | Field + declared format, optional sign display, optional `higher-is-better`/`lower-is-better` semantics. | Sort by raw typed value, display the correct units and never infer that every increase is positive. |
| Sparkline | M4: an explicit `kind="sparkline"` field containing at most 64 numeric/null samples, or null. | A narrow exception to flat scalar rows, allowed only by the sparkline schema. Include a text summary and shared scale policy. No full chart instance per cell by default. |
| Image | M4: an explicit `kind="image"` local static PNG/JPEG path plus `alt` field; fixed 64 × 48 box. | Apply containment/signature/byte limits, deduplicate and embed assets. No remote tracking pixels, arbitrary data URLs or active SVG. |
| Subtotal | Agent-prepared rows with explicit group identity and row kind; declare whether they apply to the full dataset or a prepared filtered view. | Keep subtotal rows attached to their groups when sorting. Never add percentages together or present full-report subtotals as filtered totals. |

Prepared subtotal metadata is a separately validated table shape, not an arbitrary magic property accepted on every dataset. Client row filters must not quietly reuse stale subtotal rows: use the matching prepared view, suppress explicitly incompatible subtotals, or reject the binding. A future declared `sum`/`count` reducer would be a separate scoped feature with documented null/denominator behaviour.

Reconsider TanStack Table when grouping, pagination, column visibility or stateful table interactions materially reduce our implementation burden. Its headless design preserves control over markup. Do not adopt a styled enterprise grid just to gain sparklines or images. [TanStack Table](https://tanstack.com/table/latest).

## Maps and the offline boundary

Start with local GeoJSON polygons and prepared region values. The schema binds a feature ID to a dataset field explicitly; validate unique IDs, unmatched regions, finite coordinates, geometry types, coordinate reference assumptions, file size, feature count and total coordinate count. Polygon/point structures have their own schema; ordinary datasets stay flat by default.

A choropleth encodes a value per region. A density heatmap encodes weighted points; they are different chart contracts and must not be conflated. Geographic selection can later write feature IDs into the existing input store. Provide a list/table control as an equivalent selection path; map-only pointer interaction is insufficient.

| Candidate | Fit | Investigate when geography begins |
| --- | --- | --- |
| ECharts geographic modules | Reuses chart styling/runtime; upstream supports registered GeoJSON maps and geographic interaction. | First candidate for local region maps. Measure added modules and verify SVG/canvas requirements for each heatmap type. No guarantee that every geographic feature works with the core SVG choice. [ECharts geographic maps](https://echarts.apache.org/handbook/en/how-to/component-types/geo/svg-base-map/). |
| Leaflet | Established geographic layers and GeoJSON, with pan/zoom and a plugin ecosystem. Does not require a particular tile provider. | Use if genuine map interaction needs it. Keep any basemap local; measure CSS, assets and heatmap plugin cost separately. [Leaflet](https://leafletjs.com/). |
| MapLibre GL JS | Broad geographic rendering capabilities, with a larger set of resource/CSP/runtime considerations. | Consider only if WebGL/vector-tile requirements justify it. Audit workers, styles, glyphs/sprites and tile dependencies before claiming self-contained export. [MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/). |

Do not select/install a second map library now. The first offline geographic artifact can omit a basemap and render its embedded boundaries. Remote tiles, geocoding, geolocation permissions, provider keys and network-dependent maps are outside this contract. Do not embed an entire world basemap by default.

Give map-enabled output its own measurement gate. An ordinary report must not carry geographic runtime code or geometry. Use a small fixed set of prebuilt runtime capabilities if needed, not per-report application bundling or an exponential build matrix.

## Reusable and custom components

There are two different trust levels:

1. **Reusable composition:** a typed JSON definition combines registered components and substitutes declared literal props/data references. This supports repeatable team layouts without executing code. Definitions resolve relative to their own file, stay within the report's allowed root, are watched in preview, and are fully expanded/validated into the artifact. Include version, cycle, depth and expansion-size checks. No loops, expressions, remote imports or arbitrary HTML.
2. **New rendering behaviour:** genuinely new primitives require reviewed TypeScript in the engine or a future explicitly trusted package-build workflow. A report cannot import arbitrary renderer code. No plugin loader or extension marketplace is implied for V1.

Illustrative future report reference:

```markdown
::component{src="./components/adoption-summary.json" data="./adoption.json"}
```

The definition format is not frozen or implemented. Its component/prop names must still come from the registry; declaration/substitution must not grow into an executable template language. Generated machine-readable specs should identify supported built-ins and resolved composition props.

This makes reuse a product goal without falsely claiming that declarative composition can generate every conceivable new visual. Agents can propose new primitives and contribute their trusted implementation; report generation itself stays a text-and-data workflow.

## Additional acceptance gates

Before marking a later capability complete:

- Filters: schema/default/binding errors are actionable; reset and empty states work; all affected views and data alternatives agree; unsupported ranges do not display stale values.
- Rich tables: sorts use raw values; group/subtotal scope is correct; sparklines and raster images work offline without exposing unused records or paths.
- Maps: geometry is bounded/validated; selected feature IDs are stable; keyboard/table selection is equivalent; no tile/glyph/service request escapes the offline artifact.
- Compositions: two reports reuse one definition; source locations identify report and definition; cycles/unknown props fail; copied HTML works after all source files are removed.
- Every increment: export includes the data needed for all supported states, and documentation says it is readable by recipients. Filtering is not redaction or row-level authorization.

Preserve minimal authoring and excellent diagnostics as these features land. If a capability needs a new trust model, a general query engine or substantial runtime infrastructure, make that an explicit later decision instead of weakening the original contract silently.

### Website documentation and playground

The website now provides canonical authoring docs, a generated component reference, five real example exports and four editable browser projects. The browser playground shares the compiler/renderer, supports Markdown/JSON up to 1 MiB and 16 JSON files, and downloads standalone HTML without uploading report data. Image imports remain CLI-only. This supporting authoring workflow does not complete or expand M5 reader inputs. See [website architecture and checks](site.md).

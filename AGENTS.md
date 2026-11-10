# plotleaf — agent guidance

## Purpose

plotleaf is an open-source, agent-first reporting engine. It turns one Markdown file, optionally accompanied by prepared JSON datasets, into a beautiful, interactive, portable report.

**The agent does the thinking. We do the rendering.**

Agents retrieve, analyse and prepare data outside plotleaf. plotleaf parses, validates, renders, previews and exports. A report must not require an application, account, API key, database, project configuration or hosted service.

## Current stage

The **current release is `plotleaf@0.3.2`**, including website/docs/examples/playground links, the current agent setup prompt/guide command, M4 rich table cells and the cumulative review report. The initial MVP remains recorded as 0.1.0. Read [the implementation results](docs/phase-zero-results.md), [Phase Zero plan](docs/phase-zero.md), [toolchain decision](docs/toolchain.md), [design reference](docs/design-reference.md) and [product roadmap](docs/product-roadmap.md) before changes.

Implemented: safe Markdown directives, local JSON validation, responsive grids, metrics/comparisons, line/area/bar charts with literal targets, formatted/sortable tables, callouts, live preview/reload, self-contained HTML export, component specifications and a report-authoring skill. Version `0.2.0` adds donut and prepared funnel/progress views; see [M3 contracts](docs/m3-visualizations.md). Version `0.3.0` publishes M4: local PNG/JPEG image cells and bounded static sparklines through explicit column kinds; see [M4 contracts](docs/m4-rich-tables.md). Filters, maps, subtotals and reusable compositions remain future increments. M3 was published on 8 November 2026 after the owner authorized publication following the preview review handoff. The public package is available through `npx plotleaf`.

Distinguish measured results, configured CI and unrun platform checks. The M1/M2 evidence covers macOS arm64, Node 22/24/26 and Chromium/WebKit. M3 adds 75 passing local/Linux core tests, 74 passing Windows tests plus one POSIX-only skip, 22 browser checks on each CI platform and a 22-file archive. Its 11 remote jobs pass; see [M3 verification](docs/m3-visualizations.md). M3 publication was authorized after the preview review handoff. Remote Linux/Windows CI passes all 11 jobs, including six Node consumer jobs and both browser suites; see [source/CI evidence](docs/source-ci.md) for counts and limitations. Keep this section synchronized with delivered scope.

The source/CI foundation is implemented: [public repository](https://github.com/LoueeD/plotleaf), immutable `v0.1.0` source baseline, pinned read-only CI, one audited archive tested across Linux/Windows on Node 22/24/26, platform core tests and offline Chromium/WebKit checks. Consult [verification evidence](docs/source-ci.md) before claiming platform results. M1–M4 are delivered; M4 is published as 0.3.0. M4 passes 116 local core tests, both type checkers and the initial image/sparkline browser checks. The cumulative preview follow-up adds two composition checks (34 browser checks per CI platform total) and an audited 29-file archive/Node 22 installed consumer. All 11 remote jobs pass for the M4 source, including six Linux/Windows Node consumers, 34 browser checks per platform and Windows core (114 pass, two POSIX-only skips); see [M4 evidence](docs/m4-rich-tables.md). The owner approved the cumulative preview, M4 acceptance was validated, and publication is complete. Public version/latest metadata, the exact tarball bytes and a fresh anonymous unversioned npx validation/build are verified; see [release 0.3.0](docs/releases/0.3.0.md). M5 starts with a documented prepared-view transition fixture after this milestone. The [delivery roadmap](docs/product-roadmap.md) keeps rich table cells and an explicit prepared-view fixture before reader inputs in later milestones. No release dates are committed.

Release name: **plotleaf**, selected by the owner on 7 November 2026. The public package and CLI must remain unscoped and single-word: `npx plotleaf report.md`. Version `0.3.1` is published and verified from the public registry, including fresh anonymous unversioned npm/npx checks without Bun. See the [current release record](docs/releases/0.3.1.md), [initial release](docs/releases/0.1.0.md) and [naming decision](docs/naming.md). Future changes need a new version; do not republish an existing version.

The **0.3.1 agent-discovery patch** is published before M5: the README copy/paste prompt and `plotleaf guide`, which prints the existing bundled authoring skill. Keep that guide as the single source of authoring instructions and `schema` as the machine-readable API. Keep the README copy/paste prompt focused on the report brief and desired result. Put runtime requirements, schema discovery, validation commands and preview-server mechanics in the agent guide or technical documentation. Documentation commands must work from any directory without writing files or starting a server. The README agent prompt links to the live website's `/agent` route; `plotleaf guide` remains available locally since 0.3.1. All 11 final-source CI jobs pass (117 Linux core tests, 115 Windows passes plus two POSIX-only skips, 34 browser checks per platform and six Node consumers). Exact local/CI/public archive bytes match, and a fresh anonymous unversioned npx guide/schema/validate/build check passes without Bun. See [release 0.3.1](docs/releases/0.3.1.md). This work does not start M5.

The **0.3.2 website-discovery patch** was authorized and published on 10 November 2026. It updates the npm homepage, site/docs/examples/playground links and simple agent prompt. The shared browser-compiler extraction is included without changing any of the five bundled reports' exported bytes from 0.3.1. All 11 candidate-source CI jobs pass, the audited 29-file archive matches CI and public npm bytes, and fresh anonymous unversioned npx guide/schema/validate/build checks pass without Bun. No M5 features or new runtime dependencies are added. See [release 0.3.2](docs/releases/0.3.2.md); earlier release tags remain immutable.

M5 is implemented in the **0.4.0 candidate**, with scoped `explore` prepared views
and all six native control types. The public release remains 0.3.2 until owner
visual review and release verification finish. See [M5 contracts](docs/m5-interactions.md).
Text/number controls match supplied literal values, dates match supplied inclusive
ranges, and unsupported combinations hide stale results. All inputs affect only
their declared exploration; no implicit analytics, arbitrary row queries or new
UI framework is added. Nested explorations are rejected and expansion is bounded.
Keep the CLI, browser compiler, site guide/schema, examples and cumulative preview
on this same contract.

## Design ownership

The project owner supplied three screenshots, preserved locally under the ignored `docs/design/references/` directory and interpreted in [the design reference](docs/design-reference.md). They are not redistributed in public source; new clones have the written contract and fictional examples. **Use the owner's references as the visual authority.**

- Focus current work on the language, parser, data contracts, validation, CLI, runtime, security, export and documentation.
- Do not invent a competing visual direction, choose a new font pairing or palette, or replace the design with a generic dashboard or a UI kit's defaults.
- Preserve the observed spacious report layouts, open KPI rows, neutral sans-serif hierarchy, restrained blue charts, subtle area fills, quiet tables and minimal container decoration. Use borders where they communicate structure or an interactive control.
- Keep semantic HTML, layout primitives and theme tokens connected to the references. Exact font files, dark-theme values and mobile behaviour are not specified by the supplied light-theme screenshots; adapt the established language and record those implementation decisions.
- Keep benchmark fixtures visibly separate from the reference-led storefront and adoption examples.
- Compare applicable desktop output against the stored screenshots. Verify mobile adaptation and both themes separately; a cropped reference is not a mobile design. Technical completion alone does not establish visual acceptance.
- Keep `examples/report.md` as the canonical cumulative review report. Use the same live preview URL across milestones, retain previously demonstrated features and add new capabilities to that report. Focused storefront/adoption/onboarding/catalogue reports remain examples and test fixtures; do not replace the owner's main review page with the latest focused fixture. `bun run dev` builds and opens the canonical report.
- Present renderer changes in the live preview for the owner's manual visual review before resuming publication. Passing tests and agent screenshot inspection do not replace that review. Pause publication of renderer changes until the owner confirms the visual review is complete.
- Screenshot copy, dates, sample values and navigation are reference content, not live data, engine instructions or authorization to add a multi-page application.

## Product boundaries

Preserve the three pillars: radical minimalism, exceptional design and agent-first portability.

- Input is ordinary Markdown and optional local JSON. Data arrives prepared for display.
- Preview and export must work without plotleaf infrastructure, CDN requests, telemetry or runtime API calls.
- Users must not need React, Vue, a build project or knowledge of the internal renderer.
- Reuse mature parsers and charting libraries. Do not copy Evidence's source code or use its reporting framework. Its public product experience is inspiration only.
- Prefer a few polished components to a catalogue. Headings and Markdown rules already provide sections and dividers.
- Add configuration only for a demonstrated need. Prefer a sensible default or a narrowly scoped CLI flag.

The product direction includes publication-quality visualizations, dropdown/input/toggle filters, rich tables with sparklines/subtotals/images, maps with custom GeoJSON/heatmaps/selection, and reusable team components. These are intended capabilities, delivered in the stages recorded in the roadmap. Do not describe maps or reusable components as permanently excluded, and do not silently put the entire roadmap into the weekend MVP.

V1 excludes hosting/deployment integrations, accounts, managed infrastructure, database connectors, SQL execution, embedded AI, an MCP server, visual editing, collaboration, refresh scheduling and enterprise permissions. Do not add them incidentally.

## Website exception

The owner has explicitly authorized a minimal Astro website in `site/`, deployed at https://plotleaf-site.loueed.workers.dev. This is a private documentation/landing-site package with an isolated Bun lockfile; it is excluded from the reporting npm package and does not add hosting dependencies or connectors to reports. Its `/agent` route and human docs reuse the existing authoring guide. The site includes registry-generated reference docs, real example exports and a local browser playground using shared compiler/renderer modules. Input remains in the browser; PNG/JPEG imports remain CLI-only. Follow `site/AGENTS.md` for site work, keep the report preview intact, and keep site deployment separate from npm publication.

## Architecture working defaults

Bun is selected for development tooling. The published package must run on supported Node.js through `npx` without Bun installed. The implemented architecture is:

- TypeScript/ESM; Bun for development scripts, package management and core test execution. Publish one Node-compatible `plotleaf` package through the npm registry, using a Node shebang and `npx plotleaf` as the primary author experience. Keep one `bun.lock` for repository development; no monorepo or workspace framework.
- A mature Markdown AST pipeline with declarative directives; no MDX or report-authored JavaScript.
- Separate parsing, a typed report intermediate representation, local data resolution, validation and rendering.
- Static semantic HTML with small browser enhancements. No general application framework initially.
- Modular Apache ECharts with SVG rendering, safe tooltips and native HTML data alternatives. Keep its browser bundle within the documented budget: M3 explicitly revises the provisional ceiling to 210 KiB gzip for the single chart asset; the base runtime is capped at 5 KiB. Both are enforced by the build. Funnel-only reports use native HTML and the base runtime.
- Native HTML tables with narrowly scoped sorting. Introduce a table engine only when the feature set warrants it.
- A prebuilt browser bundle shipped inside the npm package. Rendering a user's report must not invoke a bundler or install dependencies.
- One shared compile/validation path for `validate`, `dev` and `build`.
- Self-contained HTML as the first export format, verified with real offline `file://` browser tests.
- Node's built-in HTTP server for preview, with SSE and scoped Chokidar dependency watching. Use the same implementation when developing under Bun; do not maintain parallel runtime-specific servers.
- `Bun.build` produces Node-target ESM and browser IIFEs; the packed consumer and offline/CSP checks pass. Use esbuild as a fallback only if a concrete output regression requires it. Do not maintain competing production build pipelines. Rolldown/Vite+ are evaluated alternatives, not dependencies.
- `bun test` for core/compiler/security checks and integration orchestration, with published-CLI integration tests explicitly launching Node. A Node-only consumer smoke job must pass without Bun on PATH. Playwright verifies actual browsers against the Node preview/export path. Keep explicit TypeScript checking; defer Vitest unless a real need justifies it.
- TSRS is an installed development-check candidate, not a runtime dependency or report-performance feature. Official TypeScript remains authoritative; both check the same three configurations. Keep `--fast false` explicit. Their upstream compiler versions differ, so passing checks are not full conformance or comparative speed evidence. See [the TSRS plan](docs/toolchain.md#typechecking-tsrs).
- Build published CLI JavaScript for Node, not `target: "bun"`. Do not use `Bun.*`, `bun:*`, `bun:test` or Bun subprocesses in our production source; production dependencies must run without Bun. A build target cannot polyfill Bun-only APIs. Keep Bun APIs confined to development scripts/tests and leave them out of production type declarations.

Use the plan's alternatives when a gate fails. Record the evidence and update the recommendation; do not add multiple competing implementations pre-emptively.

Later filter work needs a small, explicit input-state/binding contract. Reassess the plain-TypeScript choice with a real shared-state fixture if it stops simplifying the implementation; do not build a homemade reactive framework. Map modules must not inflate ordinary reports. Reusable components initially mean declarative compositions of trusted built-ins; genuinely new renderers require reviewed engine/package code, not scripts loaded from a report.

## Language and component contracts

- Parse Markdown with a maintained parser. Do not build a Markdown/component parser from regular expressions.
- Keep the public language small: literal attributes, known components and explicit local dataset references.
- Never evaluate expressions, imports, callbacks, templates or code supplied by a report. Code fences are inert displayed text.
- A component registry owns names, allowed directive forms, property schemas, defaults, child rules, documentation metadata and trusted rendering behaviour or renderer keys.
- Generate machine-readable component specifications from that registry. Do not maintain a second independent definition of the public API.
- Keep coercion from directive strings explicit. Reject unknown properties, invalid enums and invalid numbers instead of guessing.
- Keep source positions through compilation. Report stable diagnostic codes, file, line, column, the invalid value and an actionable repair where possible.
- Treat malformed syntax recovery as a real parser risk. Demonstrate diagnostics with fixtures before promising that every malformed component will be detected.
- Keep leaf directives on one line and close containers explicitly; longer outer fences support nested containers. Preserve directive lines when formatting authored Markdown. `bun run format` deliberately covers code/configuration, not report Markdown.
- Document any public syntax or semantics change with an example and a diagnostic fixture where appropriate.

## Data rules

- Keep filesystem access out of chart and table renderers. Resolve and validate data before rendering.
- JSON datasets are arrays of flat records except bounded numeric/null arrays in explicitly declared table sparkline fields. Charts and inferred/scalar tables still require flat scalar datasets, including on cache hits. Preserve input order; do not silently aggregate, join, filter or sort chart data. Future GeoJSON requires a separate explicit schema.
- Planned filters may explicitly select local rows or agent-prepared views. They do not authorize SQL, arbitrary expressions, joins or automatic analytical calculations. Every input must declare which components it affects; static metrics and prose must not appear to update when they do not.
- Planned subtotals must be agent-prepared or use narrowly specified, declared reducers. Never sum ratios or percentages by default. See the roadmap for the boundaries around prepared views and reusable compositions.
- Validate referenced columns and every row that a component consumes. Never silently turn missing or invalid values into zero.
- Define null, date, number, empty-data and formatting behaviour explicitly. Use fixed locale/time-zone defaults rather than host preferences.
- Cache each resolved dataset once per compilation. Include attempted dependencies in preview watching so fixing a missing file can recover.
- Export only the fields used by report components. Do not embed whole source datasets merely because they are available.
- Exported values are readable by recipients, including values in collapsed tables or runtime payloads. Hiding an element is not redaction. Explicit rich-cell sort keys, image alternatives and complete original raster bytes/metadata are readable too. Never infer sparkline aggregation, a sort key or business sentiment. All rows of one sparkline column share its observed min/max scale; nulls create gaps.
- Filters and map selection are presentation controls, not access controls. Rows, prepared views and local geometry included for interaction remain readable in the artifact.

## Security boundaries

Treat report text, attributes, frontmatter, JSON values and local references as untrusted input.

- No `eval`, `new Function`, dynamic imports from reports, report-provided scripts, event handlers, arbitrary CSS, executable frontmatter or raw chart option passthrough.
- Reject raw HTML in reports and sanitize generated user-content HTML with an explicit allowlist. Escape values at each output context; never concatenate unescaped data into HTML.
- Construct chart options in trusted code. Keep tooltip content safe and do not expose chart-library callback or HTML APIs to authors.
- Embed JSON as inert data and escape HTML-sensitive characters, particularly `<`, so a value containing `</script>` cannot break out of its container.
- Resolve local references relative to the report file, not the process working directory. Canonicalize paths, resolve symlinks and enforce containment within the report directory. Reject remote sources, absolute paths, disallowed hidden paths and non-regular files.
- Use bounded reads and documented limits. Reject unsupported data shapes and dangerous object keys; do not merge input objects into runtime configuration.
- M4 images share JSON containment, regular-file checks, bounded reads, attempted/canonical dependency watching and the 25 MiB compilation budget. Accept static PNG/JPEG only; verify signature/extension, dimensions/pixels and reference/file limits. Deduplicate by content hash and pass only validated bytes/IDs to the renderer. `image-size` reads buffer headers in the CLI, not browser code; it is not a full pixel decoder.
- Extend local-file policy to every later component/column definition and GeoJSON reference. Bound composition depth/expansion and geometry complexity. Never load report-authored executable components or remote tiles implicitly.
- Allow only documented link schemes. Report-authored active SVG, iframes and remote images are outside the initial scope.
- Bind preview to loopback, validate Host/Origin where relevant, and serve only explicit preview routes. Never expose a directory listing or arbitrary filesystem route.
- Export must contain no preview transport, absolute source paths, source maps, environment values or unused source data.
- Never overwrite an input or dependency through an output path or symlink. Write completed exports atomically.

The plan contains the threat model and concrete security acceptance checks. Sanitization, path isolation, safe serialization and output tests are part of the implementation, not optional release polish.

## Determinism and portability

For the same inputs, plotleaf version and bundled assets, exported bytes should match. Avoid build timestamps, random IDs, absolute paths, host locale and host time zone in artifacts. Assign component IDs in document order.

Browser responsiveness may adapt the display, but must not change the underlying data. Preview must use the export renderer and add only preview-specific behaviour. Browser interaction must continue to work with networking disabled after opening the exported file. When filters land, preserve deterministic default input state and update bound charts/tables/data alternatives together. A selected subset must be identified as a subset.

## Repository conventions

The source layout lives in the plan. Keep ordinary modules in one package. Add abstractions only when there is a concrete second use or a boundary that protects correctness.

- Keep CLI parser/schema/server dependencies outside the browser bundle. Production modules use Node-standard APIs; Bun is optional tooling for users and required only for the repository's selected development workflow.
- Keep report input and output separate from plotleaf's own package build output.
- Pin exact dependency versions and maintain one `bun.lock`; use frozen installs in CI. Record development versions, licenses and measured bundle sizes in the Phase Zero results.
- Ship compiled JavaScript and prebuilt assets; consumers should not need a TypeScript runner or build tool.
- Keep report-author guidance in the distributable `skills/plotleaf/SKILL.md`. This `AGENTS.md` governs development of the engine and is not a substitute for that authoring guide.
- Public examples must be purpose-built, explicitly fictional and free of internal-project context. Never package copied customer/organization reports, local paths, credentials, reference screenshots, generated example HTML or planning/agent-development notes. Maintain the explicit file list and run the tarball audit before publishing.

## Verification

Use Bun 1.4.4 for development and Node 22+ for consumers. `package.json` scripts are authoritative:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run typecheck:tsrs
bun run build
bun test
bun run test:consumer
bun run test:browser
```

Build before integration checks. Install Playwright's Chromium/WebKit browsers before the browser suite. `bunfig.toml` scopes core discovery; Playwright has separate discovery. `PLOTLEAF_NODE` selects the actual Node executable used by integration/browser tests. The consumer smoke test packs/installs the artifact with npm, removes Bun from its PATH and invokes `npx`, including from outside the repository. It needs registry access initially; `PLOTLEAF_OFFLINE=1` uses the warmed npm cache. A passing Bun suite alone does not prove Node compatibility.

Require passing remote CI for the candidate source commit and preserve immutable release tags. The `v0.1.0` tag rebuilds all 18 original published files byte for byte. The `v0.2.0` tag preserves the 22-file M3 release. The `v0.3.0` tag preserves the 29-file M4 release. The current `v0.3.1` tag preserves the 29-file agent-discovery patch; its exact audited archive matches the CI consumer artifact and public registry bytes. Follow [CONTRIBUTING.md](CONTRIBUTING.md) for the platform matrix and source reproduction.

Publishing uses the reviewed tarball, not a freshly repacked directory. `bun run audit:package path/to/plotleaf.tgz` inspects the archive's exact file list and content and writes its SHA-512 manifest. `PLOTLEAF_PACKAGE_TARBALL=/absolute/path/plotleaf.tgz bun run test:consumer` verifies that same artifact. See [release instructions](docs/release.md). Pattern checks supplement manual content review; do not present them as a general guarantee that secrets cannot exist.

The initial checkout's shell aliases pointed to toolchain launchers; use verified binaries if a version probe unexpectedly downloads a runtime. Do not replace environment state or assume a shim proves the installed runtime version. Local sandbox environments may need permission to bind loopback ports or launch real browsers; distinguish those restrictions from product failures.

Prefer tests that establish behaviour: malformed input diagnostics; path/symlink containment; hostile strings; data validation; deterministic output; JSON reload; and offline browser interaction. Do not add tests that simply mirror private functions or create snapshot churn for incidental markup.

For render changes, inspect real output in a browser against [the design checklist](docs/design-reference.md). Include narrow widths, light/dark preferences, keyboard access, empty data and large labels. Check exported `file://` output separately from HTTP preview; one does not prove the other works. As later capabilities land, verify input reset/empty states, numeric formatting, subtotal scope, map keyboard alternatives and shared-state consistency.

## How to work here

- Read the relevant files before changing them and keep the requested scope intact.
- Make routine reversible technical decisions autonomously. Explain tradeoffs when they affect the public language, dependency budget or product scope.
- Keep changes small enough to review and avoid unrelated cleanup.
- When adding a dependency, state which concrete requirement it solves and what it adds to runtime installation or browser output.
- Distinguish completed work from unrun checks and remaining gates. Do not call the product visually complete without comparing it to the owner's design.
- Update the plan and this guidance when accepted decisions or actual commands change.

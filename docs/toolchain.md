# Runtime, build and testing decisions

Evaluated and implemented: 7 November 2026. Bun is the development/package-management tool; the compiled CLI supports Node and `npx` without Bun installed. Bun.build passed the package/browser gates and is selected. TSRS is installed as a development-check candidate alongside authoritative official TypeScript. [Implementation results](phase-zero-results.md) distinguish local evidence from remaining gates; comparisons below preserve the decision rationale.

## Recommended stack

| Concern | Choice | Status |
| --- | --- | --- |
| Consumer runtime | Node 22+; compiled TypeScript/ESM with a Node shebang | Primary `npx plotleaf` experience. Verify the minimum and supported LTS releases; users need no Bun installation. |
| Development runtime/scripts | Bun 1.4.4 | Pinned in package metadata/CI; Bun-only APIs stay in development code. |
| Dependencies | `bun install`, committed `bun.lock`, frozen installs in CI | Accepted direction. Continue distributing the single package through the npm registry. |
| CLI preview | Node HTTP, SSE, Chokidar and `open` | One Node-compatible implementation, also used during Bun development. |
| Package/browser build | `Bun.build`: Node target for CLI, browser target for report assets | Selected after packed Node, offline, CSP and deterministic-output checks. |
| Bundler fallback | esbuild, invoked by a Bun build script | Use if Bun cannot reliably produce the required Node/browser artifacts; select one tool after the spike. |
| Core tests | `bun test` / `bun:test` | Developer runner; Node integration and a Node-only package smoke gate establish consumer compatibility. |
| Browser/export tests | Playwright in Chromium and WebKit, exercising the Node preview/export path | Required separately from core checks; the developer runner may execute under Bun when supported. |
| Typechecking | TSRS `--noEmit` as a fast development-check candidate; official TypeScript as reference/fallback | Development-only. Verify compiler compatibility and actual speed before making TSRS the sole release check. |

Bun handles repository installs/scripts and package builds; the npm registry remains the distribution channel. Report authors use Node/npm with `npx`; report readers only need a browser. Bun's text lockfile is `bun.lock`; commit it for repository development and use frozen resolution in CI. Consumers do not need Bun or its lockfile to run the published package. [Bun lockfile documentation](https://bun.sh/docs/pm/lockfile), [npm execution](https://docs.npmjs.com/cli/v11/commands/npm-exec/).

## Build: Bun, esbuild or VoidZero?

VoidZero is the organization/ecosystem behind tools including Rolldown, Vite, Vitest and Vite+. The comparable bundler is **Rolldown**. Vite+ is a broader integrated development toolchain; it can work with Bun package management but is not itself a replacement for the Bun runtime. [VoidZero tools](https://voidzero.dev/), [Vite+ package management](https://viteplus.dev/guide/package-management).

| Option | What it buys us | Cost or limitation | Recommendation |
| --- | --- | --- | --- |
| `Bun.build` | Built-in TypeScript/JavaScript bundling, Node/browser targets and minification, using the selected development tool. | Current documentation labels CJS/IIFE formats experimental. A Node target does not replace Bun-only APIs in source. | First candidate. Prove the packed Node CLI plus actual ECharts output, inline safety, CSP, determinism and local-file interaction. [Bun bundler](https://bun.sh/docs/bundler). |
| esbuild | Direct TypeScript bundling, tree shaking, minification and documented IIFE output. Fits a short package-maintainer build script. | Adds a development dependency and its platform binary. | Practical fallback if Bun cannot reliably emit the Node/browser artifacts. The developer runtime and artifact bundler are independent choices. [esbuild API](https://esbuild.github.io/api/#format-iife). |
| Rolldown | Direct bundler with Rollup-compatible APIs, TypeScript handling and IIFE output. A credible option for future plugin/library packaging needs. | Adds another tool and native package compatibility to verify. No requirement currently depends on its plugin ecosystem. | Evaluate if Bun's output fails and Rolldown solves something esbuild does not, or a real plugin requirement appears. Do not install both as insurance. [Rolldown](https://rolldown.rs/), [IIFE output](https://rolldown.rs/reference/OutputOptions.format). |
| Vite / Vite+ | Vite adds an application dev server/build workflow; Vite+ integrates broader checks/test/build tools. `vp pack` uses tsdown for library/executable packaging. | We already own a report compiler/preview and have no report application to scaffold. The wider integration is not currently necessary. | Defer. Revisit for a separate documentation/demo application or substantially more complex package publishing. [Vite](https://vite.dev/guide/), [Vite+ pack](https://viteplus.dev/guide/pack). |

This decision is about output correctness and a smaller toolchain, not unmeasured speed rankings. Package assets are built once by maintainers; a millisecond bundler difference is less important than reliable small output and readable build configuration.

### Build contract

- Use a Bun-executed `scripts/build.ts` to produce the compiled ESM CLI and fixed browser assets. Set the CLI target explicitly to Node and the report-asset target to browser. The executable has `#!/usr/bin/env node`.
- Published CLI source uses Node-standard HTTP/filesystem/process APIs. No `Bun.*`, `bun:*`, `bun:test`, Bun-target bytecode or spawning `bun` in the runtime graph. `target: "node"` controls bundling/resolution; it cannot polyfill Bun-only runtime functionality.
- Keep language features within the Node baseline. Execute output on that baseline rather than assuming a build target establishes syntax/API compatibility. Use production typechecking with Node globals and keep Bun declarations scoped to development scripts/tests.
- Browser output is one IIFE/classic script per selected runtime capability, with no external imports, split chunks, `Bun` globals or runtime Node APIs. Our browser entry performs initialization and needs no global export name.
- Disable automatic environment-variable substitution/inlining; include only deliberately defined nonsecret build constants. Preserve required third-party license notices and keep source maps out of report artifacts.
- Keep CSS as an authored design asset unless bundling it solves a demonstrated need. The export assembler embeds the prebuilt CSS/JS and escaped report data.
- Build no report-authored code. `plotleaf build report.md` runs the report compiler and HTML assembler; it does not invoke the JavaScript bundler.
- Bun also documents standalone HTML bundling. It is relevant to a packaging experiment, but it is not a substitute for our Markdown validation, safe serialization or prebuilt-runtime contract. Do not bundle an application anew for each report. [Bun standalone HTML](https://bun.sh/docs/bundler/standalone-html).

### Phase Zero bundler gate

Use the reference-led chart/table fixture with the planned ECharts modules, targeting the actual supported browsers. Record the resolved Bun version and settings.

1. Produce a browser IIFE, inline it with real report data/CSS and verify the file with networking disabled in Chromium and WebKit.
2. Exercise charts, literal target, sorting, theme changes and resize. Confirm no imports, extra chunks, environment leakage, unsafe inline-script terminators or unexpected network requests.
3. Build twice and compare bytes. Check license retention and the CSP hash against the final script bytes.
4. Measure minified/raw/gzip size against the plan's budget. Compare esbuild output if Bun fails correctness or materially misses the size target; compare runtime behaviour, not only byte counts.
5. Produce/package the Node-target CLI and test it in a clean Node/npm environment without Bun on PATH. Exercise help, validate, build and preview/reload through the installed executable and `npx` entry. Verify assets/dependencies resolve away from the repository; no install-time build, Bun subprocess or hidden development dependency is allowed.
6. Record one chosen bundler. Retain a simple build script; do not introduce a bundler abstraction or parallel production pipelines.

The experimental IIFE label is a reason for this gate, not evidence that Bun's output is broken. If Node packaging and browser output pass, use Bun for builds. If they fail, use esbuild for package assets while keeping Bun as the developer runtime, package manager and core test runner. [Bun Node-target behaviour](https://bun.sh/docs/bundler#target).

## Typechecking: TSRS

`tsrs` is a Rust port of the TypeScript compiler and language server, incubated in Oxc. It targets faster type checking and lower memory use; it is not a JavaScript runtime or a bundler. Use it to check plotleaf's TypeScript during development, while Bun executes developer scripts/tests and builds Node/browser package assets. It does not directly accelerate Markdown parsing, chart rendering or exported reports. [Oxc typechecker overview](https://oxc.rs/docs/guide/usage/typechecker.html).

Installed development-check command:

```bash
bun run typecheck:tsrs
```

Install it as a development dependency, pin the resolved version in `bun.lock`, and keep it out of the published CLI's runtime dependencies and report payloads. Its launcher currently has a Node shebang, so invoke it explicitly through Bun and verify the launcher/native binary on supported development platforms. [TSRS launcher](https://github.com/oxc-project/tsrs/blob/main/npm/tsrs/bin/tsrs).

Upstream currently marks TSRS experimental and documents remaining compatibility differences. The pinned `0.23.0-ts7.1.0-beta` targets TypeScript 7.1 beta; the project's official reference is TypeScript 7.0.2. Both pass the three project configurations, but these are different upstream versions. The matching-version conformance and comparative performance gate is unfinished; official TypeScript remains authoritative. [Compatibility status](https://github.com/oxc-project/tsrs/blob/main/docs/COMPATIBILITY.md).

The opt-in `--fast` preset can alter checker scheduling/history and diagnostics, including exit status for some programs. Keep it disabled for the initial reference comparison; ensure CI does not inherit `TSRS_FAST=1`. Evaluate it separately for local feedback after default-mode correctness is established. Do not weaken `strict`, alter `skipLibCheck` or change the checked file set just to produce a faster number. [TSRS performance options and side effects](https://github.com/oxc-project/tsrs/blob/main/docs/USAGE.md).

### TSRS adoption gate

1. Verify the pinned package launcher/native binary under Bun and record the platform, compiler version and TypeScript source version it follows.
2. Check actual engine, browser and test source/dependency types with the same configurations as the reference compiler. Include deliberate type-error fixtures and runtime/browser-global boundary violations, not only an already valid project.
3. For parity claims, compare against the official compiler matching TSRS's declared upstream version/pin. Resolve any difference from the project's selected language version explicitly; do not attribute changed language semantics to checker speed.
4. Measure cold and warm check time and peak memory, recording cache mode, file set, compiler flags, checker counts and repeated-run spread. Measure default mode and `--fast` separately. Published upstream gains are not plotleaf measurements.
5. If the diagnostics/configuration contract holds and the result is useful, select TSRS for normal developer checks. Retain the reference check until release confidence is established; do not maintain duplicate checks forever without a reason.

Use `--noEmit` for this role even though TSRS also supports compiler emit. Do not introduce a second package-emission pipeline or adopt its language server, WASM/API or lint integration incidentally. The separate TypeScript check remains required; passing Bun tests or transpilation does not replace it.

## Testing: Bun or Vitest?

Use **Bun's runner for core tests** as part of the selected development toolchain. It provides TypeScript support, hooks, mocks, snapshots and watch mode without introducing another test-runner dependency. Prefer behaviour assertions over broad markup snapshots. Passing these tests under Bun is not evidence that the published package works on Node. [Bun test runner](https://bun.sh/docs/test).

Vitest is a capable alternative, particularly for Vite-based component work and Node-hosted unit suites. We currently have no Vite configuration to reuse, and Bun is already selected for development. Keep its runner for core checks and add explicit Node package verification; consider Vitest if maintaining cross-runtime checks becomes less simple than using a Node-native unit suite. [Vitest setup](https://vitest.dev/guide/), [Vitest Browser Mode](https://vitest.dev/guide/browser/).

Integration tests must explicitly launch `node` against the built CLI; do not use `process.execPath` from a Bun test process and accidentally test Bun again. Cover validation, exports, security boundaries and preview/watch shutdown on the actual production runtime. Add a Node-only consumer smoke job against the packed/installed artifact, with no Bun on PATH. Run on the minimum Node 22 and supported LTS lines; the current release table lists 22, 24 and 26 as LTS. Do not maintain duplicate full Bun/Vitest suites without a demonstrated need. [Node release status](https://nodejs.org/en/about/previous-releases).

### Browser verification remains separate

Core tests cannot prove chart layout, keyboard interaction, system-theme adaptation, CSP or `file://` portability. Use Playwright for actual Chromium/WebKit checks against the Node preview server and Node-generated exports. Its developer runner may execute under Bun: Playwright's 1.65 release notes document `bunx --bun playwright test`, with limitations around watch/UI behaviour. Pin a compatible pair and prove it during setup. The consumer smoke job must still run without Bun. [Playwright Bun support](https://playwright.dev/docs/release-notes#version-165).

Keep Bun core tests and Playwright files in separate directories, with explicit test discovery so `bun test` does not accidentally execute Playwright's `.spec.ts` files. Configure the actual commands during package setup. DOM simulators are optional for a demonstrated unit-test need; they do not replace the offline browser checks.

Implemented script responsibilities:

| Script | Responsibility |
| --- | --- |
| `typecheck` | Authoritative official TypeScript check of production, browser and development configurations; production declarations exclude Bun, browser declarations exclude Node/Bun. |
| `typecheck:tsrs` | Candidate checker against the same configurations with `--fast false`. |
| `test` | Bun core suite: compiler, schemas, formatting and bounded/path-safe data resolution. Integration orchestration explicitly launches Node for the built CLI. |
| `test:consumer` | Packed/installed artifact verification in a Node/npm-only environment; no Bun on PATH or development dependencies. |
| `test:browser` | Playwright suite against the Node preview/export path: offline files, responsive/theme behaviour and critical accessibility interactions. |
| `build` | Bun-executed package/assets build and specification generation. |

## Package and runtime consequences

The public examples use Node/npm:

```bash
npx plotleaf report.md
npx plotleaf dev report.md --no-open
npx plotleaf validate report.md --json
npx plotleaf build report.md
```

Use `#!/usr/bin/env node` on the published executable, point `package.json#bin` at its compiled JavaScript and declare the tested Node engine minimum. Package all required prebuilt assets and production dependencies; require neither Bun, TypeScript, TSRS nor an install-time build to run the package. One artifact serves Node users and Bun users. [npm package execution](https://docs.npmjs.com/cli/v11/commands/npm-exec/).

For Bun users, ordinary `bunx plotleaf ...` respects the Node shebang and uses Node. Direct Bun execution of the same portable artifact, `bunx --bun plotleaf ...`, is an optional compatibility path to verify, not a prerequisite for using plotleaf. Do not ship a second Bun-specific runtime or silently download Bun from an npm lifecycle script. [bunx shebang behaviour](https://bun.sh/docs/pm/bunx#shebangs).

Use Node's built-in HTTP server, `node:path`, filesystem/process APIs and `node:util` argument parsing in the published source. Keep one implementation when running development code under Bun. Chokidar watches prepared JSON/Markdown dependencies and handles recovery from failed/missing references; `open` handles browser launch. Verify consumer behaviour on the Node versions/platforms promised by the package. No Bun-specific transport, application framework or bundler dev server is needed.

## Verification status

Verified locally on macOS arm64: Bun 1.4.4; Node 22.23.3, 24.22.1 and 26.13.0; Playwright 1.65.0 with Chromium and WebKit. The initial shell shims were bypassed using installed binaries. Frozen dependency installation, both project typecheck commands, 46 core tests, 14 browser checks and packed npm/npx consumer checks on all three Node lines pass. The consumer PATH excludes Bun and installs omit development dependencies.

The current chart IIFE measures approximately 194–196 KiB gzip depending on the Node/Bun compressor, below the provisional 200 KiB budget. There is no esbuild, Vite, Rolldown or Vitest dependency. The [source/CI foundation](source-ci.md) now verifies the shared audited archive on Linux/Windows across Node 22/24/26 and includes Windows core and cross-platform browser jobs; its evidence record distinguishes actual results. See [results and limitations](phase-zero-results.md) and [raw local measurements](phase-zero-metrics.json). TSRS has no established full conformance or comparative speed claim.

The owner-approved `plotleaf@0.1.0` release is published. Its public archive matches the audited SHA-512 integrity, and a fresh public `npx plotleaf` installation/validation/build plus published-package preview passed without Bun. See the [release record](releases/0.1.0.md).

# Plotleaf website

Deployed: 9 November 2026, at [https://plotleaf-site.loueed.workers.dev](https://plotleaf-site.loueed.workers.dev). The owner requested a minimal Astro site in this repository with an agent route and a free workers.dev address. No custom domain or paid resource was configured.

## Architecture

- Private package in `site/`: Astro 7.4.8, Wrangler 4.159.0, Node 24.22.1 and an isolated Bun lockfile. The report engine's dependency graph and public npm file allowlist stay independent.
- Pre-rendered Astro HTML and assets served by Workers Static Assets. No application SSR adapter, handwritten Worker runtime, database, account flow, analytics or report upload.
- `/agent` is Markdown imported directly from `skills/plotleaf/SKILL.md`. `/schema.json` imports the registry-generated `schema/components.json`. Installed CLI schema remains authoritative for the installed version.
- A small external script copies the agent prompt using the current origin. With JavaScript disabled the prompt falls back to `npx plotleaf guide`; clipboard failure selects the prompt for manual copying.
- System typography, restrained report colours, responsive layout and automatic light/dark preference preserve the existing design language.
- `_headers` supplies the Markdown/JSON content types, security policy and fingerprinted CSS caching. Missing paths return the Astro 404 page.

## Deployment and verification

Cloudflare authentication was verified, and the Worker name `plotleaf-site` was confirmed unused before creation. Wrangler's dry run passed, then deployment succeeded with version `0fa2b6e0-fb90-42a0-869e-bf7736a4de3e`. The site uses its workers.dev address and the existing account; no DNS configuration was changed.

Build-time checks compare the emitted guide/schema with their canonical source files. Wrangler preview checks cover real HTTP content types, exact bodies and 404 behaviour. Chromium/WebKit checks cover copying, clipboard-denial fallback, light/dark modes, 320/375/768/1440 px widths, no page errors and JavaScript-disabled fallback. Screenshots and HTTP/browser evidence are kept in ignored `.cache/site/` files. The same checks pass against the live workers.dev deployment, including exact Markdown/JSON bodies, content types, 404 responses, both browsers/themes and all four widths. The root npm content audit still passes its unchanged 29-file allowlist and excludes the entire private website.

The [site verification workflow](../.github/workflows/site.yml) uses pinned actions, a frozen install, static build, canonical-content checks and a deployment dry run without credentials. It does not deploy automatically. Use the commands in [site/README.md](../site/README.md) for maintenance and explicit deployment. Site deployment and npm publication remain separate operations.

Small helper/status text colours were calibrated to exceed 4.5:1 contrast on the prompt surface (light mode: 4.89:1 muted text and 4.97:1 accent text). Both themes are checked against the deployed CSS. [Initial website CI](https://github.com/LoueeD/plotleaf/actions/runs/42712062514) passes, and [engine CI](https://github.com/LoueeD/plotleaf/actions/runs/42712062582) passes all 11 jobs for the website setup source.

## Documentation and browser playground expansion — 10 November 2026

The website now includes `/docs/`, `/docs/components/`, `/examples/` and `/playground/`. Human instructions render the canonical skill and the component reference renders the generated schema. Five fictional reports are compiled with the CLI path at build time; four smaller projects can be edited directly in the browser. The existing cumulative report preview is preserved.

The compiler now separates platform-independent parsing, data validation and HTML rendering from local filesystem and SHA-256 adapters. The Node facade retains its API. A memory adapter resolves only supplied relative JSON files, while a dedicated browser Worker uses Web Crypto for the exact same export CSP. Parity tests compare IR and complete HTML bytes for storefront, adoption and onboarding reports. There are no browser Node polyfills, new runtime dependencies, application framework or second reporting language.

The playground supports Markdown/JSON editing, file import, diagnostics and recovery, a sandboxed live preview and standalone HTML download. Input is capped at 1 MiB and 16 JSON files, with a five-second compilation deadline after compiler loading. Worker replacement and revision guards prevent stale exports. Local image imports remain CLI-only; the catalogue remains available as a complete generated report. This is authoring, not M5 reader filtering.

Report input stays in memory and is neither uploaded nor persisted. The editor loads static website assets and a static preview bootstrap; it is not an offline application. The exported report is self-contained and works offline. The preview iframe has an opaque origin, permits only scripts and accepts generated HTML through a single origin/source-checked parent message. Parent pages retain a self-only script policy, report scripts retain the shared renderer's hash-based policy, and preview connections are disabled. Cloudflare static asset header rules are route-scoped so the parent policy does not prevent sandboxed reports from rendering. See [Cloudflare headers](https://developers.cloudflare.com/workers/static-assets/headers/).

Site CI installs both frozen lockfiles, builds the shared engine/assets/examples, checks browser/worker TypeScript and canonical content, performs a deployment dry run, and runs Chromium/WebKit checks. Browser checks cover mobile overflow, themes, real charts, invalid JSON recovery, hostile text, opaque sandbox origin, absence of uploads and offline downloadable HTML byte parity with CLI output. Website work does not publish a new npm version; the public CLI remains 0.3.1.

Local verification for this expansion: official TypeScript and TSRS pass, all 129 core tests and all 34 existing engine browser checks pass, and all six website checks pass across Chromium/WebKit. The packed Node 22 consumer passes npm/npx validation/build/preview without Bun; its unchanged 29-file allowlist excludes the website. Screenshots in `.cache/site-expansion/` were inspected at desktop/mobile widths and both themes. Wrangler's deployment dry run passes. Remote CI/deployment results are recorded separately below after they finish.

The expansion is deployed as Cloudflare version `ac534263-2dbc-46f9-baba-5956c144b351` from source `c52c223147f786ebbe118d6899c70439ef0981d4`. All six browser checks also pass against the live workers.dev site, including real browser compilation, sandbox isolation, exact CLI/export byte parity and offline file opening. Exact live guide/schema bodies, route status, security headers and 404 behaviour pass. [Website CI](https://github.com/LoueeD/plotleaf/actions/runs/42885188639) passes for the site source; the subsequent commit only restores a root test import. Local evidence is retained in ignored `.cache/site-expansion/` files.

[Engine CI for the final code](https://github.com/LoueeD/plotleaf/actions/runs/42885356309) passes all 11 jobs: 129 Linux core tests, 127 Windows passes plus two POSIX-only skips, 34 browser checks on each CI platform, and six installed consumers across Linux/Windows and Node 22/24/26. No npm release was performed. The final archive audit still contains exactly 29 approved files and excludes all website sources/generated assets.

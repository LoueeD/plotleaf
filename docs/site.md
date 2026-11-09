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

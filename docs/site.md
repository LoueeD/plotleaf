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

Cloudflare authentication was verified, and the Worker name `plotleaf-site` was confirmed unused before creation. Wrangler's dry run passed, then deployment succeeded with version `5ce00b19-d360-4fd2-9913-a75c047e5a12`. The site uses its workers.dev address and the existing account; no DNS configuration was changed.

Build-time checks compare the emitted guide/schema with their canonical source files. Wrangler preview checks cover real HTTP content types, exact bodies and 404 behaviour. Chromium/WebKit checks cover copying, clipboard-denial fallback, light/dark modes, 320/375/768/1440 px widths, no page errors and JavaScript-disabled fallback. Screenshots and HTTP/browser evidence are kept in ignored `.cache/site/` files. The same checks pass against the live workers.dev deployment, including exact Markdown/JSON bodies, content types, 404 responses, both browsers/themes and all four widths. The root npm content audit still passes its unchanged 29-file allowlist and excludes the entire private website.

The [site verification workflow](../.github/workflows/site.yml) uses pinned actions, a frozen install, static build, canonical-content checks and a deployment dry run without credentials. It does not deploy automatically. Use the commands in [site/README.md](../site/README.md) for maintenance and explicit deployment. Site deployment and npm publication remain separate operations.

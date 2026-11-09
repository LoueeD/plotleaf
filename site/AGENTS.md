# Plotleaf website

This is the explicitly authorized, private Astro website for Plotleaf. It is separate from the report engine and excluded from the npm archive. Keep the landing page minimal and preserve the report's existing typography, spacing and light/dark colour language.

- `/agent` is static Markdown imported from the root `skills/plotleaf/SKILL.md`; never duplicate the guide.
- `/schema.json` imports the root's generated `schema/components.json`; the installed CLI's schema remains authoritative for that installed version.
- Generate static assets with Astro. Deploy them through Workers Static Assets using `wrangler.jsonc`; no SSR adapter, Worker runtime, database, telemetry, account system or report upload is needed.
- Keep the copy/paste prompt focused on the report brief and outcome. Its absolute guide URL comes from the current origin so workers.dev and a future custom domain both work.
- This private site is an intentional exception to the engine's single-package tooling default: its own package manifest and Bun lock isolate Astro/Wrangler from engine consumers. No monorepo framework is required.
- Use the Node version in `.node-version`, Bun 1.4.4 and pinned local tools. Run `bun install --frozen-lockfile`, `bun run build`, `bun run check`, then Wrangler's dry run before deployment.
- Verify Cloudflare authentication before deploying. Use `bun run deploy` from this directory. Do not add credentials to source or configure a custom domain without a request.
- Verify actual HTTP status/content type and exact `/agent`/schema bodies through Wrangler and the deployed URL. Check keyboard copy behaviour, light/dark themes and mobile widths. Build-time endpoint response headers need matching rules in `public/_headers` for static deployment.
- Keep the engine's cumulative report preview at its existing URL; the website is a separate surface.

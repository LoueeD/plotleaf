# Plotleaf website

This is the explicitly authorized, private Astro website for Plotleaf. It is separate from the report engine and excluded from the npm archive. Keep the landing page minimal and preserve the report's existing typography, spacing and light/dark colour language.

- `/agent` is static Markdown imported from the root `skills/plotleaf/SKILL.md`; never duplicate the guide.
- `/schema.json` imports the root's generated `schema/components.json`; the installed CLI's schema remains authoritative for that installed version.
- Generate static assets with Astro. Deploy them through Workers Static Assets using `wrangler.jsonc`; no SSR adapter, Worker runtime, database, telemetry, account system or report upload is needed.
- Keep the copy/paste prompt focused on the report brief and outcome. Its absolute guide URL comes from the current origin so workers.dev and a future custom domain both work.
- This private site is an intentional exception to the engine's single-package tooling default: its own package manifest and Bun lock isolate Astro/Wrangler from engine consumers. No monorepo framework is required.
- Use the Node version in `.node-version`, Bun 1.4.4 and pinned local tools. Install root dependencies and then site dependencies with `bun install --frozen-lockfile` in each directory. Run `bun run build`, `bun run check`, `bun run test:browser`, then Wrangler's dry run before deployment.
- Verify Cloudflare authentication before deploying. Use `bun run deploy` from this directory. Do not add credentials to source or configure a custom domain without a request.
- Verify actual HTTP status/content type and exact `/agent`/schema bodies through Wrangler and the deployed URL. Check keyboard copy behaviour, light/dark themes and mobile widths. Build-time endpoint response headers need matching rules in `public/_headers` for static deployment.
- Keep the engine's cumulative report preview at its existing URL; the website is a separate surface.

## Docs, examples and playground

- Human docs reuse the canonical skill; component reference tables reuse the registry-generated schema. Do not maintain parallel API definitions.
- `scripts/prepare.ts` builds five fictional reports with the real CLI compiler/renderer and prepares four editable examples. Generated public reports/projects are ignored; rebuild them before Astro.
- The playground uses `src/compiler/memory.ts`, the shared parser/data resolver and `src/render/document.ts` in a dedicated Web Worker. Keep filesystem/hash adapters separate; do not fork validation or introduce Node polyfills.
- The compiler is loaded only on the playground page. Preserve the upstream `worker` resolution condition (named character entity decoding must not require the DOM). Worker-only Zod disables JIT to respect CSP.
- Report input stays in memory: no uploads, persistence, share URLs, analytics or server execution. Limit input to 1 MiB and 16 JSON files; terminate compilation after five seconds. PNG/JPEG imports remain CLI-only.
- Preview HTML executes only inside an opaque-origin iframe (`sandbox="allow-scripts"`). The static bootstrap accepts one message from its own parent origin. Do not add `allow-same-origin` or weaken parent CSP. Exports keep the renderer's hash-based CSP and work offline.
- Verify real compilation, diagnostics/recovery, malicious text isolation, byte equality with CLI exports, offline HTML, both browsers/themes and mobile widths. Site CI installs root and site dependencies independently and runs browser checks.
- This authoring playground does not implement reader filters or advance M5. Website deployment does not authorize npm publication.

- Keep ordinary page content, including the entire examples index, at 640px. Center documentation sidebar + 640px content together as an 860px group; its header/nav spans that group. Sidebar flows above content on smaller screens. Open example reports as full pages instead of scrolling gallery iframes.
- The playground is a separate full-viewport workspace: top toolbar including site navigation, adjacent resizable editor/preview panes, file tabs with a final add-JSON action, and a slim footer, all within 100dvh. Keep resizing pointer- and keyboard-accessible; preserve the opaque-origin preview sandbox.

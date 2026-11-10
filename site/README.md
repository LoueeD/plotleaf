# Plotleaf website

Live: [https://plotleaf-site.loueed.workers.dev](https://plotleaf-site.loueed.workers.dev) · [Agent guide](https://plotleaf-site.loueed.workers.dev/agent)

Astro documentation, real report examples, a browser playground and machine-readable agent guide, deployed to Cloudflare Workers Static Assets. No SSR adapter or Worker script is needed.

Use Node 24.22.1 (see `.node-version`) and Bun 1.4.4:

```bash
bun install --frozen-lockfile
cd site
bun install --frozen-lockfile
bun run build
bun run check
# First time: install Chromium/WebKit using the root Playwright CLI
bun run test:browser
bun run preview
```

`preview` uses Wrangler so `/agent` has the deployed Markdown content type, security headers and routing. For Astro's development server, use `bun run dev`.

```bash
bunx wrangler whoami
bunx wrangler deploy --dry-run
bun run deploy
```

Authenticate with `bunx wrangler login` if needed. The configured Worker is `plotleaf-site`, using its free `workers.dev` address. No custom domain, paid service or deployment secret is configured. CI builds and validates; deployment is an explicit maintainer action.

Routes:

- `/`: landing page with a copyable agent prompt. Its guide URL uses the current origin.
- `/docs/`: human authoring guide and `/docs/components/` registry-generated reference.
- `/examples/`: six real, downloadable standalone reports with fictional data.
- `/playground/`: Markdown/JSON editing, local compilation, diagnostics, preview and HTML download.
- `/agent`: plain Markdown from `../skills/plotleaf/SKILL.md`.
- `/schema.json`: the generated specification from `../schema/components.json`.

The website's manifest/lock are private and isolated from the reporting package. Root npm packaging retains its explicit allowlist and excludes this entire directory. Keep the site deploy separate from npm publication.

The playground runs the shared engine in a browser Web Worker; report data is never uploaded or persisted. It accepts up to 1 MiB and 16 JSON files. Local image imports and larger reports use the CLI. Exported HTML works offline; the editor itself loads website assets and a static sandbox bootstrap. Source edits are cleared on refresh.

Build first from the repository root dependencies: the site compiles the existing renderer assets and examples before Astro runs. There is no second engine or reporting framework. Browser tests use the root Playwright dependency; install browsers with `node ../node_modules/@playwright/test/cli.js install chromium webkit` from `site/`.

The interactions example demonstrates scoped prepared-view controls through the same compiler/renderer used by exported reports. The playground edits its Markdown and JSON bundles locally; it never executes report code or analytics.

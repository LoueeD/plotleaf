# Plotleaf website

Live: [https://plotleaf-site.loueed.workers.dev](https://plotleaf-site.loueed.workers.dev) · [Agent guide](https://plotleaf-site.loueed.workers.dev/agent)

Minimal Astro landing page and machine-readable agent guide, deployed to Cloudflare Workers Static Assets. No SSR adapter or Worker script is needed.

Use Node 24.22.1 (see `.node-version`) and Bun 1.4.4:

```bash
cd site
bun install --frozen-lockfile
bun run build
bun run check
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
- `/agent`: plain Markdown from `../skills/plotleaf/SKILL.md`.
- `/schema.json`: the generated specification from `../schema/components.json`.

The website's manifest/lock are private and isolated from the reporting package. Root npm packaging retains its explicit allowlist and excludes this entire directory. Keep the site deploy separate from npm publication.

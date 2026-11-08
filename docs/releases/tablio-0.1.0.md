# tablio 0.1.0 release review

Status: audited and tested; npm publication rejected with E403. Browser authentication completed, but npm blocks the unscoped name `tablio` as too similar to `table` and `twilio`. No release was published. The owner requires an unscoped single-word name and declined the scoped alternative. The owner subsequently selected `plotleaf`; see [naming decision](../naming.md). This record preserves the earlier artifact and does not describe the renamed package. The artifact below records the failed unscoped attempt, not a public release.

The previous internal-project demo was removed before release. Public examples are purpose-built fictional storefront performance and product adoption reports, each explicitly labeled as fictional. The live local preview uses the storefront example.

The release uses one exact tarball, reviewed before publication and tested without Bun on Node 22.23.3, 24.22.1 and 26.13.0. Official TypeScript and candidate TSRS checks pass; 45 core tests and 12 Chromium/WebKit checks pass. Deliberately modified archives containing internal demo context, local paths, a credential marker or an unexpected file are rejected by the audit.

## Public files

- `LICENSE`
- `README.md`
- `THIRD_PARTY_NOTICES.txt`
- `dist/assets/base.js`
- `dist/assets/charts.js`
- `dist/assets/notices.txt`
- `dist/assets/styles.css`
- `dist/cli.js`
- `examples/adoption/adoption.json`
- `examples/adoption/plans.json`
- `examples/adoption/report.md`
- `examples/storefront/categories.json`
- `examples/storefront/orders.json`
- `examples/storefront/report.md`
- `examples/storefront/returns.json`
- `package.json`
- `schema/components.json`
- `skills/tablio/SKILL.md`

No development/planning documents, source tests, design reference screenshots, caches, generated example HTML or internal-project fixtures are included. No consumer install/build hooks are defined.

## Artifact

- Version: `0.1.0`
- Registry: `https://registry.npmjs.org/`
- Tag: `latest`
- Archive: `232,340` bytes; unpacked content: `710,721` bytes.
- Integrity: `sha512-h9yNe2cC9go1tzNmGwcuZDquPu+LaBe6x+zTdI/Rq60iSS0GdfXtoLOH+CzlCUeKvbnYXVl7W3GYRYFX+ReMzA==`

The audit's pattern checks supplement manual review and do not constitute a general secret-detection guarantee. See [release procedure](../release.md).

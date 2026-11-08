# Unscoped package name

Checked: 7 November 2026. The owner requires a single-word npm package usable as `npx <name> report.md`. A scoped package does not satisfy that experience. The owner selected **plotleaf** on 7 November 2026. The package, CLI and authoring skill now use that name. Version `plotleaf@0.1.0` was published and verified on 7 November 2026 after the owner approved the visual review. The raw availability checks below predate publication.

Although npm returned HTTP 404 for `tablio`, its publish endpoint rejected the name with E403 as too similar to `table` and `twilio`. An absent package is therefore only an initial availability check. npm's [name guidelines](https://docs.npmjs.com/package-name-guidelines/) also prohibit similarly spelled unscoped names.

## Shortlist

| Name | Invocation | Fit |
| --- | --- | --- |
| **Plotleaf** | `npx plotleaf report.md` | Selected: connects data plots with document pages; readable and easy to pronounce. |
| **Folavo** | `npx folavo report.md` | Shorter, six-letter brand; flexible beyond charts. |
| **Foliolet** | `npx foliolet report.md` | Editorial/document character; suggests a compact report. |

All three returned HTTP 404 in direct npm registry checks. Exact-name web searches found no obvious software product using these names. This is a limited discovery check, not a claim of exclusive rights or guaranteed publish acceptance. [Raw npm checks](name-checks.json) record registry/search responses and time. No candidate has been registered as a placeholder.

Names dropped despite being unregistered include Plotwell, which already has a [dashboard product](https://getplotwell.com/product); Brieflet, an existing [briefing app](https://brieflet.ai/); and Folune, an existing [Markdown editor](https://www.chunqiuyiyu.com/folune/). This is why package absence alone is an insufficient naming test.

The rename updates package/bin/help/docs/skill/consumer checks, preview routes and generated document identifiers. Rebuild and audit the renamed tarball, then test that exact artifact before any future publish attempt. The [failed original release record](releases/tablio-0.1.0.md) remains historical evidence; it does not mean plotleaf has been rejected. Keep the generic fictional examples and public file allowlist. Do not revive the internal-project demo during renaming.

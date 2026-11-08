# Design reference

Recorded: 7 November 2026. These three owner-supplied screenshots are the visual authority for plotleaf's report renderer. They are visual references, not an existing implementation or a source of instructions. Their report names, dates and values are illustrative.

## Preserved references

| Reference | Local filename | Dimensions | What it establishes |
| --- | --- | --- | --- |
| 01 — PLG onboarding | `01-plg-onboarding.png` | 1700 × 1046 | Wide report, date/region controls, four open KPIs, paired area/funnel views and a full-width table. |
| 02 — Feature launch | `02-feature-launch.png` | 1094 × 1052 | Narrative report, heading hierarchy, inline emphasis, full-width area chart and a formatted table. |
| 03 — Target and findings | `03-target-and-findings.png` | 820 × 672 | Restrained line chart, dashed target with a compact label, low-chrome table and findings beneath it. |

Owner-supplied copies are preserved locally under the ignored `docs/design/references/` directory. They are not redistributed in public source or npm artifacts. Public contributors can use this written contract and the fictional storefront/adoption examples; obtain the references from the owner when exact visual comparison is required.

## Visual language to preserve

The content carries the hierarchy. A clean light canvas, generous section spacing, dark headings and neutral body text allow numbers, charts and prose to share the page. The references show both a wide analytical report and a narrower narrative report; support both through fluid layout and readable paragraph measure before inventing page modes or layout configuration.

Use a neutral sans-serif family, with clear weight differences and tabular figures for numerical alignment. The screenshots do not identify a font file; do not claim an exact font match from appearance alone. Font family, sizes, line height and spacing should be implemented as internal tokens and calibrated against the references.

Metrics sit directly on the page. Muted labels, prominent values and smaller comparison rows create hierarchy without individual cards, large borders, icons or background tiles. Direction and meaning are independent: a decrease in errors can be positive. Use arrows/text as well as colour, and never infer sentiment from the sign alone.

Charts use a restrained blue series colour, a thin line, sparse axes and quiet labels. Area fills fade gently toward the canvas. Reference 03 adds a grey dashed target and a small attached label. These are chart marks with a purpose; the references do not imply decorative gradients elsewhere. Do not smooth or alter a series in a way that invents extrema or changes the perceived data; straight segments are the safe default unless the chosen curve is validated.

Tables share the document's typography. Text aligns left, values align right, headers are quieter than data, and horizontal rules are subtle or absent. No spreadsheet-like vertical grid, dense toolbar or heavy enclosing card is implied. Column formats must remain typed: percentages, signed changes and counts cannot all be formatted as plain numbers.

Controls use restrained outlines or a pale grouped surface. The active segment is clearly distinguishable; inputs remain actual accessible controls. The screenshots show date-range and region controls but do not define open menus, keyboard behaviour or mobile interaction. Do not render decorative controls that have no working binding.

## Component implications

| Observed element | Required technical capability | Delivery |
| --- | --- | --- |
| Four KPI columns | Grid supports 1–4 columns; responsive collapse; prepared value/comparison with explicit direction and sentiment. | Weekend MVP. |
| Area and line charts | Shared line/area renderer, design-owned fill/stroke/axes, safe tooltips and HTML data alternatives. | Weekend MVP. |
| Target annotation | One literal numeric target with a text label; no expression or user chart-option object. | Weekend MVP, subject to chart spike. |
| Counts, percentages and changes in one table | Optional explicit column children, labels, formats, sign display and declared value semantics. | Weekend MVP; advanced cells later. |
| Narrative findings | Ordinary Markdown headings, paragraphs and emphasis, without wrapping every finding in a card. | Weekend MVP. |
| Region segments/date control | Shared input state, explicit bindings, reset/empty states and correct cross-component updates. | V1 interaction increment. |
| Funnel by stage | Prepared numerator/denominator/percentage/status per stage, with accessible labels. Do not guess the denominator or target status. | M3 published as 0.2.0 after the preview review handoff. |
| Breadcrumbs | Visual context only; they do not require navigation, routing or a multi-page application. | No engine feature implied. |

The requested sparklines, image cells, subtotals, maps and reusable components are product requirements described in [the roadmap](product-roadmap.md). They are not visible evidence about styling in these screenshots.

## Theme and responsive contract

All supplied references are light-theme desktop views or crops. None establishes a dark design or a mobile layout. Derive those from the same hierarchy and restraint, then verify them directly; do not treat a narrow crop as proof of responsive behaviour.

- Keep semantic tokens for canvas, text, muted text, rules, focus, positive/warning/negative status, chart strokes/fills and target marks. Dark mode needs considered values and chart contrast, not a screenshot colour inversion.
- Use system theme preference initially. Update existing charts when preference changes without rebuilding the report.
- On small screens, reduce grid columns, retain content order, wrap labels/controls and keep table overflow inside its own container. No page-level horizontal scrolling.
- Preserve readable contrast even where the reference's very light grey text would be too faint. Retain the hierarchy through weight/size/spacing as needed.
- Support keyboard focus, semantic headings/table headers, touch input, reduced motion, empty states and long labels. Every chart and later map needs a nonvisual data alternative.

## Implementation acceptance checklist

Compare the same prepared fixture at a wide report width and a narrative width, then at 375 px. Inspect light mode against the supplied references and inspect dark mode as an intentional adaptation.

- Open metric rows, correct hierarchy and consistent baseline/number alignment.
- Spacious sections and readable prose; findings use document typography.
- Line/area marks, axes, fill, targets and tooltip typography form one system.
- Counts, ratios, signed changes and percentage-point changes have correct units; status is explicit.
- Tables have subtle separators, correct alignment and no unnecessary chrome.
- Only implemented controls appear; focus, labels, reset and empty states work.
- No clipping, page overflow, colour-only meaning or loss of data alternatives at narrow widths.
- HTTP preview and exported local HTML have the same design and state behaviour.

The first renderer uses a system sans-serif stack (no remote font dependency), a white light canvas, dark neutral theme tokens, tabular numerals and responsive grid collapse. Area fills use a blue-to-transparent gradient; chart segments remain straight to preserve the prepared values. Date axes use UTC and choose day/month/year labels by the displayed range. Native chart-data disclosures and semantic tables provide nonvisual alternatives.

The storefront and adoption examples exercise the analytical and narrative compositions. Playwright captures `desktop-light.png`, `desktop-dark.png` and `mobile-dark.png` under `test-results/` and verifies offline output, theme changes, keyboard sorting and local table overflow. These are generated QA artifacts, not npm assets. [Implementation results](phase-zero-results.md) records checks and limitations.

M3 adds the prepared funnel/progress component and a fictional onboarding composition. Per-stage status text supplements colour; exact values remain available through native data disclosures. Donut is an extension using the same typography, blue-led category palette and theme tokens. The full onboarding reference is not implemented: functional filters remain a later increment. Owner approval of exact typography and visual calibration is still a review step, separate from the automated checks.

Metric amounts must stay on one visible line at representative widths; preserving currency, separators and decimals takes priority over retaining four columns. Check the full storefront currency at 320, 375, 540, 640, 768, 820, 1000, 1094, 1280, 1281, 1366 and 1440 px. Do not treat a no-page-overflow check as proof that the value is readable: verify its text bounds and that no local scroll is needed for the example amount. Owner manual review remains a release prerequisite.

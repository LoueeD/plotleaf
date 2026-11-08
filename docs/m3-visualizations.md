# M3: prepared funnel and donut views

Updated: 8 November 2026. M1 (the published MVP) and M2 (source/CI foundation) are complete. M3 adds two components in `0.2.0`. The owner authorized publication on 8 November 2026 after the preview review handoff. Registry publication is in progress; technical verification and publication approval are recorded separately.

## Scope and acceptance

Add a reference-led funnel/progress view and a restrained donut view through the existing registry, compiler and offline renderer. Keep one Markdown file plus prepared flat JSON, no application framework, no report JavaScript and no extra dependency. Do not include rich table cells or filter state in this slice.

- Both directives validate with actionable source/row diagnostics and appear in the generated specification.
- Source order and explicit fields survive compilation; unused fields never enter exported content.
- Funnel values, denominators, shares and statuses remain author-prepared. No conversion baseline or business status is inferred.
- Offline Chromium/WebKit interaction, both themes, 320–1440 px layouts, hostile labels and readable content with JavaScript disabled are checked.
- The same audited npm archive validates/builds/previews through `npx` without Bun on supported Node versions and CI platforms.
- Owner manual review of the running preview is required before releasing the renderer. Automated checks do not establish visual acceptance.

## Funnel contract

```markdown
::funnel{data="./funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}
```

```json
[
  { "stage": "Visited", "teams": 100, "baseline": 100, "share": 1, "status": "on-target" },
  { "stage": "Activated", "teams": 25, "baseline": 100, "share": 0.25, "status": "below-target" }
]
```

All attributes are literal field references except `title` and optional numeric `format`. The `status` mapping is optional; omitting it produces neutral styling. If mapped, every row must contain one of `on-target`, `below-target`, `at-risk` or `neutral`. Labels are unique, nonblank strings of at most 1000 characters; at most 20 stages are supported. All mapped field names must differ.

Values are finite, nonnegative numbers no greater than their positive denominators. Shares are numbers in `[0,1]` and must agree with `value / total` within `0.0005`, allowing preparation rounded to 0.1 percentage point. This is consistency validation, not a fallback calculation. A row without a valid share fails; the engine does not replace it. Use `[]` when no baseline exists; zero denominators are invalid.

Rows stay in source order. Each denominator is explicitly displayed; they may differ between stages, so the author must explain any baseline/step-rate distinction in prose. The component does not infer a monotonic funnel, connect cohorts or sort stages. Adjacent KPI rates can use another denominator only when their meaning is clear.

The renderer uses semantic HTML meters and status text, with compact visual counts, full accessible labels and a native full-value data disclosure. It works without JavaScript and uses the small base runtime when no interactive charts are present. Bars and spacing follow reference 01; per-row status text makes meaning available without relying on colour or a colour-key legend.

## Donut contract

```markdown
::donut{data="./plans.json" category="plan" value="teams" title="Teams by plan"}
```

```json
[
  { "plan": "Pro", "teams": 5100 },
  { "plan": "Team", "teams": 1900 },
  { "plan": "Free", "teams": 612 }
]
```

Categories are unique, nonblank strings of at most 1000 characters, limited to eight slices. Values are finite, nonnegative numbers and their sum must remain finite. Nulls, numeric strings, negatives, duplicates and over-limit inputs fail with source/row diagnostics. Prepare mutually exclusive parts of one whole; perform any grouping into an Other category before rendering.

Zero categories stay in the visible legend and native data table, with no fabricated slice area. An all-zero dataset shows an explicit empty state and omits the chart runtime if no other charts need it. Percent shares are the chart's direct part-to-whole encoding, not an inferred business conversion metric. Source order is preserved; there is no automatic sorting, aggregation, legend filtering or arbitrary chart-option passthrough.

ECharts' modular pie series renders an SVG ring. Safe rich-text tooltips share existing numeric formats. A visible HTML legend includes labels, full values and shares; native data remains available without JavaScript. The first colour preserves the established series blue. Additional restrained category tokens, with separate dark values, are a necessary extension for categorical charts; they do not redefine the report typography or layout.

## Bundle decision

The original 200 KiB gzip chart budget was provisional. Adding modular pie support to the existing line/bar runtime produces approximately **203.5 KiB gzip using Bun**, about **7.4 KiB** above the M1 chart asset with the same compressor. Node zlib measures about 201.6 KiB; keep compressor results separate. The M3 ceiling is explicitly revised to **210 KiB gzip**, enforced by the build; the base asset has a separate 5 KiB ceiling and remains about 0.6 KiB gzip. CSS, notices and report data are outside those JavaScript budgets. See [measured assets](m3-metrics.json).

Keep one chart bundle. Existing chart-enabled reports incur this small increase; text/metric/table/funnel-only reports retain the base runtime. Avoid duplicated ECharts cores, component-specific bundle combinations, dynamic runtime imports or another bundler for this change. No production or development dependency was added. [ECharts modular imports](https://echarts.apache.org/handbook/en/basics/import/), [donut series](https://echarts.apache.org/handbook/en/how-to/chart-types/pie/doughnut/).

## Review and verification

The explicitly fictional [onboarding report](../examples/onboarding/report.md) exercises four metrics, an area chart beside the funnel, plan donut/table and narrative findings. Its plan counts add to the same 7,612 activated teams shown elsewhere. It clearly distinguishes visitor-based funnel shares from signup-based KPI conversion. No decorative filter controls imply unimplemented functionality.

Local verification passes: official TypeScript, TSRS, **75 compiler/security/Node tests**, **22 Chromium/WebKit tests** and an audited **22-file npm archive** installed through npm/npx on Node 22.23.3 without Bun or dev dependencies. Real screenshots were inspected against the supplied reference and in dark/mobile adaptations. [Remote run 42484507050](https://github.com/LoueeD/plotleaf/actions/runs/42484507050) passed all **11 jobs** for source commit `ca36b26`: Linux build/core/typechecks, Windows core (**74 pass, 1 explicit POSIX FIFO skip**), all six Node 22/24/26 consumers on Linux/Windows, **22 browser checks on each platform**, and the immutable 0.1.0 source reproduction. The six consumer jobs use one audited 22-file archive. CI does not publish to npm. M2's earlier 46-core/14-browser results remain a historical baseline, not the M3 test counts.

A local candidate archive is saved under ignored `.cache/m3/plotleaf-0.2.0.tgz`, with its content/integrity audit beside it; that exact archive passes Node 22 npm/npx checks without Bun. Publication was subsequently authorized; the final release archive updates release-facing wording while preserving the reviewed compiled assets.

The live review uses `node dist/cli.js dev examples/onboarding/report.md --no-open`. Inspect the reference-led desktop composition, native meters, category legend, narrow layouts, both themes, data disclosures and offline HTML. The owner subsequently authorized publication after this preview handoff. Preserve the reviewed rendered assets during release preparation; future renderer changes require another manual review. Follow [the release procedure](release.md) for the exact candidate archive.

M4 follows with narrowly scoped rich table cells. The prepared-view transition fixture must still precede the later input-state milestone; no filter, map or composition implementation is claimed by M3.

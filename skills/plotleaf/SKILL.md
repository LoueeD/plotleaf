---
name: plotleaf
description: Create and revise plotleaf Markdown reports from prepared JSON, then validate, preview and export portable interactive HTML. Use for plotleaf report authoring, not development of the reporting engine.
---

# plotleaf report authoring

Create one Markdown file with optional local JSON datasets. The agent retrieves, analyses and prepares data; plotleaf renders it. Do not scaffold an application or put analysis code, SQL, JavaScript expressions or scripts into the report.

Use an installed `plotleaf` CLI or `npx plotleaf`. The CLI requires Node 22 or newer; Bun is not required for report authors. In an unpublished source checkout, build it with `bun run build` and use `node dist/cli.js` from the package root instead of fetching an npm release.

## Discover the contract

Run `plotleaf schema` (or `npx plotleaf schema`) for the current machine-readable component/prop specifications, rules and input limits. Prefer that output over remembered syntax. Supported components include `grid`, `metric`, `line`, `area`, `bar`, `donut`, `funnel`, `table`, `column` and `callout`. Donut and funnel require plotleaf 0.2.0 or newer; check the installed CLI's schema when using an older version.

Use ordinary Markdown for headings, prose, findings, emphasis, lists, links and dividers. Headings provide sections. Design is built in; do not add custom CSS, raw HTML or framework components. Image/sparkline column kinds require 0.3.0 or newer; check the installed CLI version and schema. Scoped prepared-view controls are available since 0.4.0; maps, subtotals and executable/custom components remain future capabilities.

## Author prepared content

```markdown
---
title: Adoption report
description: Team adoption and growth from prepared data.
---

# Adoption report

An overview of the prepared dataset, its period and relevant findings.

:::grid{columns="2"}
::metric{label="Teams" value="1492" comparison="34% vs previous quarter" direction="up" sentiment="positive"}
::metric{label="Conversion" value="0.103" format="percent"}
:::

::area{data="./usage.json" x="date" y="teams" xType="date" title="Teams with an alert" target="1600" targetLabel="Target"}

:::table{data="./plans.json" title="By plan"}
::column{field="plan" label="Plan"}
::column{field="teams" label="Teams" format="number"}
::column{field="change" label="Δ QoQ" format="percent" sign="always" semantics="higher-is-better"}
:::
```

Literal attributes are quoted strings, decoded by the component schema. `::` is a leaf; `:::` encloses a container. Close every container explicitly. Use a longer outer fence (`::::grid`) when placing another container, such as a table, inside it. Put components at the document root or in allowed component containers, not inline or inside lists/blockquotes. `column` belongs only inside a table. A plain `::table{data="./file.json"}` infers all fields; explicit columns select/order/format fields and exclude unused columns from export.

- Datasets are JSON arrays of flat scalar records, except explicitly declared table sparkline fields. Paths resolve from the Markdown file's directory. Keep them there or in subdirectories; remote, hidden, absolute and outside-root/symlink paths are rejected.
- Chart fields are literal keys. Charts do not aggregate, join or sort. Prepare a distinct category per bar; date/number x values must be unique and increasing. `xType="date"` accepts real `YYYY-MM-DD` dates or timestamps with an explicit zone. Dates are displayed in UTC.
- y values are finite JSON numbers. Line/area nulls create gaps; bar nulls are invalid. Missing fields are errors. Empty arrays produce an explicit no-data state and a warning.
- Table records have consistent keys and non-null types per column. Scalar values stay text; rich cells use explicit column kinds, never HTML templates. Sorting uses raw values. Use a smaller prepared summary if validation reports table/point limits; the engine never truncates silently.
- Numeric formats are `number`, `percent`, `percentage-points` and `currency:GBP` (validated ISO code). Percent uses ratios (`0.12` → 12%); percentage-points uses point values (`0.8` → 0.8 pt); currency uses major units. Whole currency amounts omit `.00`; nonzero cents retain two decimal places. Formatting uses `en-GB`.
- Metrics, comparisons and business sentiment are supplied by the agent. An increase is not automatically positive. Comparison direction and sentiment are independent; both require comparison text when explicitly supplied. Numeric table changes can declare `higher-is-better` or `lower-is-better` semantics.
- Include data period, provenance and limitations in the prose where they help readers assess the report. Do not invent findings or imply filters/refresh that the file does not provide.

## Part-to-whole and stage views

```markdown
::donut{data="./plans.json" category="plan" value="teams" title="Teams by plan"}
::funnel{data="./funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}
```

- Donuts require at most eight unique, nonblank string categories and finite nonnegative values with a finite sum. Prepare mutually exclusive parts of one whole; group a tail into an explicit Other row before rendering if appropriate. Zero values remain in the legend/data; all-zero data is an empty state, never equal slices.
- Funnel rows supply value, positive denominator and share explicitly, such as `{"stage":"Activated","teams":25,"baseline":100,"share":0.25,"status":"below-target"}`. Shares use ratios and must match value / total within 0.0005 (rounding to 0.1 percentage point). No baseline means an empty array, not a zero denominator.
- Funnel stage names are unique nonblank strings, with at most 20 stages in source order. Each stage can have its own denominator; explain that choice in prose. Status values are `on-target`, `below-target`, `at-risk` or `neutral`. Omit the status mapping for neutral styling; the engine never infers business status. All mapped fields must differ.
- Use the full-value data disclosures to check counts behind compact funnel labels. Both components retain readable HTML data without JavaScript. Keep the denominator of any nearby conversion KPI explicit when it differs from the funnel baseline.

## Rich tables (0.3.0 or newer)

```markdown
:::table{data="./products.json" title="Products"}
::column{field="image" kind="image" alt="description" label="Preview"}
::column{field="product" label="Product"}
::column{field="weekly_orders" kind="sparkline" sortBy="last_week" label="Weekly orders"}
:::
```

- Omitted `kind` means scalar. Images require an `alt` field containing a nonblank string for each non-null image; null image cells may have null alternatives. Image fields contain a local static PNG/JPEG path or null, resolved from the Markdown directory. Do not supply SVG, GIF/WebP, remote/data URLs or absolute/hidden/outside-root paths. The display box is 64 × 48; prepare images within the schema's byte/dimension/reference limits.
- Each unique image is embedded once. Its complete original bytes and metadata are readable by recipients; prepare assets for that disclosure. Alternatives are text, not markup. No image styling or numeric-format properties are supported.
- Sparkline fields contain at most 64 finite numbers/nulls or null. Only explicitly declared sparkline fields may contain sequences. Use a separate flat dataset for a chart or an inferred/scalar table. Nested objects/arrays and numeric strings are invalid; rows retain consistent keys.
- Sparkline x positions follow sample order. All rows in the same column share its observed min/max y scale. Nulls are gaps; last-sample labels remain missing when the final sample is null. Empty/all-null series show no invented values. Use `format` for numeric labels; sign/sentiment settings apply only to scalar columns.
- Rich columns are unsortable unless `sortBy` names a separate scalar field with consistent non-null types. Prepare any sort key explicitly, such as `last_week`; it is readable in the export. The engine does not compare arrays or derive a total/trend. Scalar columns keep their existing raw-value sort.
- Check image alternatives, line gaps/shared scale, keyboard value disclosures, row sorting, both themes and narrow table scrolling. Images/sparklines remain visible without JavaScript. The fictional catalogue example demonstrates this syntax.

## Validate, preview and export

```bash
npx plotleaf validate report.md --json
npx plotleaf dev report.md --no-open
npx plotleaf build report.md --out ./report.html
```

Repair diagnostics using their code, one-based source location, message and hint, then validate again. Preview watches Markdown, referenced JSON and local table images; an invalid edit displays diagnostics and recovers after repair. Omit `--no-open` to open a browser. No backend/account is required.

Export is one self-contained interactive HTML file. Check it after copying it away from sources and disabling networking. Charts require JavaScript; prose, metrics, tables and native chart-data disclosures remain readable without it. All displayed/embedded values are readable by recipients: collapsing a table or hiding a field visually is not redaction. Prepare sensitive data before rendering; explicit-column tables and chart field projection help avoid exporting unused fields.

Inspect the result at a narrow viewport and in both system themes. Preserve the source's meaning and the product's quiet editorial design when making revisions.

## Scoped interactions (0.4.0 or newer)

Use `::explore{data="./views.json" title="Regional performance"}` for a complete
agent-prepared interactive section. Check the installed schema first: older
releases do not support this directive. No calculation, arbitrary query or code
execution occurs when a reader changes controls.

Prepare one JSON bundle with `inputs` and `views`. Each input declares `id`,
`label`, `type`, `default` and (except toggle) `options` containing `{value,label}`.
Types are `select`, `segmented`, `toggle`, `text`, `number`, and `date-range`.
Text/number inputs accept declared literal values; unsupported values display an
unavailable state. A date-range value is `{start:"2026-11-01",end:"2026-11-07"}`:
real inclusive ISO calendar dates, and only supplied start/end pairs are supported.
Select All is an ordinary prepared value, not a special string or hidden reducer.

Each view declares `id`, `label`, `when` (exactly every input ID), `markdown` and
optional `datasets`. Markdown uses the same built-in components. A dataset named
`sales.json` resolves from `./sales.json` inside that view; undeclared dataset
references resolve from the report directory. Inline datasets undergo the same
shape/field/null/date/image/sparkline validation and field projection as ordinary
JSON. Nested explorations are rejected.

```json
{
  "inputs": [{
    "id": "region", "label": "Region", "type": "select", "default": "all",
    "options": [{"value": "all", "label": "All regions"}, {"value": "emea", "label": "EMEA"}]
  }],
  "views": [
    {"id": "all", "label": "All regions", "when": {"region": "all"},
     "markdown": "::metric{label=\"Orders\" value=\"100\"}\n\n::table{data=\"./sales.json\"}",
     "datasets": {"sales.json": [{"region": "All regions", "orders": 100}]}},
    {"id": "emea", "label": "EMEA", "when": {"region": "emea"},
     "markdown": "::metric{label=\"Orders\" value=\"40\"}\n\n::table{data=\"./sales.json\"}",
     "datasets": {"sales.json": [{"region": "EMEA", "orders": 40}]}}
  ]
}
```

Prepare metrics, comparisons, denominators, chart series, funnel stages, table rows
and scope-specific prose together. Every control affects only its exploration;
static content outside it stays fixed and must identify its scope. Every view
binds all inputs, duplicate conditions are invalid, and defaults must select one
view. Unsupported combinations hide the previous view; Reset restores defaults.
No view infers a total, percentage, business sentiment or arbitrary date range.

Bounds: four explorations per report, six inputs per exploration, 20 choices per
input, 32 views per exploration, 512 expanded components, 20,000 expanded component
rows, 8 MiB expanded prepared data and 2 MiB expanded Markdown per compilation. Bundles allow at most 32 JSON nesting
levels and 100,000 JSON containers, in addition to ordinary file and
data limits. Keep prepared bundles small. All selectable views/data remain
readable in exports; hiding views is not redaction. Default content and data
alternatives remain readable without JavaScript, with disabled controls.

Validate every view, then test transitions, reset, invalid/unavailable values,
empty data, keyboard access, narrow widths and both themes. Export and interact
offline after removing source files. The fictional interactions example and the
browser playground demonstrate all six control types. No URL state, persistence,
remote fetch, free-form row query or analytics engine is implied.

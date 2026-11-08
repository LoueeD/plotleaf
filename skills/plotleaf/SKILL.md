---
name: plotleaf
description: Create and revise plotleaf Markdown reports from prepared JSON, then validate, preview and export portable interactive HTML. Use for plotleaf report authoring, not development of the reporting engine.
---

# plotleaf report authoring

Create one Markdown file with optional local JSON datasets. The agent retrieves, analyses and prepares data; plotleaf renders it. Do not scaffold an application or put analysis code, SQL, JavaScript expressions or scripts into the report.

Use an installed `plotleaf` CLI or `npx plotleaf`. In an unpublished source checkout, build it with `bun run build` and use `node dist/cli.js` from the package root instead of fetching an npm release.

## Discover the contract

Run `plotleaf schema` (or `npx plotleaf schema`) for the current machine-readable component/prop specifications, rules and input limits. Prefer that output over remembered syntax. Supported components in 0.2.0 include `grid`, `metric`, `line`, `area`, `bar`, `donut`, `funnel`, `table`, `column` and `callout`. Donut and funnel require plotleaf 0.2.0 or newer; check the installed CLI's schema when using an older version.

Use ordinary Markdown for headings, prose, findings, emphasis, lists, links and dividers. Headings provide sections. Design is built in; do not add custom CSS, raw HTML or framework components. Filters, maps, image/sparkline cells and executable/custom components are future capabilities, not supported syntax.

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

- Datasets are JSON arrays of flat scalar records. Paths resolve from the Markdown file's directory. Keep them there or in subdirectories; remote, hidden, absolute and outside-root/symlink paths are rejected.
- Chart fields are literal keys. Charts do not aggregate, join or sort. Prepare a distinct category per bar; date/number x values must be unique and increasing. `xType="date"` accepts real `YYYY-MM-DD` dates or timestamps with an explicit zone. Dates are displayed in UTC.
- y values are finite JSON numbers. Line/area nulls create gaps; bar nulls are invalid. Missing fields are errors. Empty arrays produce an explicit no-data state and a warning.
- Table records have consistent keys and non-null types per column. Scalar values stay text; no HTML cell templates. Sorting uses raw values. Use a smaller prepared summary if validation reports table/point limits; the engine never truncates silently.
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

## Validate, preview and export

```bash
npx plotleaf validate report.md --json
npx plotleaf dev report.md --no-open
npx plotleaf build report.md --out ./report.html
```

Repair diagnostics using their code, one-based source location, message and hint, then validate again. Preview watches Markdown and referenced JSON; an invalid edit displays diagnostics and recovers after repair. Omit `--no-open` to open a browser. No backend/account is required.

Export is one self-contained interactive HTML file. Check it after copying it away from sources and disabling networking. Charts require JavaScript; prose, metrics, tables and native chart-data disclosures remain readable without it. All displayed/embedded values are readable by recipients: collapsing a table or hiding a field visually is not redaction. Prepare sensitive data before rendering; explicit-column tables and chart field projection help avoid exporting unused fields.

Inspect the result at a narrow viewport and in both system themes. Preserve the source's meaning and the product's quiet editorial design when making revisions.

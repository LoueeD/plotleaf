# M5 — prepared-view interactions

Implemented in the 0.4.0 candidate. Public release remains 0.3.2 until owner visual review and release gates complete.

## Contract and transition fixture

An exploration explicitly scopes every control to a complete prepared view. Static content outside it does not update. The agent prepares all metric values, comparisons, series, denominators, table rows and view-specific prose. Plotleaf never executes queries, report expressions, reducers or arbitrary JavaScript.

```markdown
## Regional performance

The controls below affect this exploration only. All data is fictional.

::explore{data="./regional-views.json" title="Regional performance"}
```

The companion JSON has `inputs` and `views`. Each input declares an ID, label, native control type, default and finite supported domain. Each view declares a unique ID/label, a `when` entry for **every** input, Markdown using existing components, and optional prepared `datasets` arrays. A view's `./sales.json` resolves to its own declared `sales.json`; other local datasets resolve from the report directory. All consumed data goes through the existing validators and export field projection. Nested explorations are rejected.

The initial region/range fixture uses All regions versus EMEA and two supplied date ranges. Transition from All regions / first range to EMEA / second range must update the visible metric, trend, funnel, table, chart alternatives and scope label together. The default must map to exactly one view. No catch-all/magic All value or implicit global binding exists: All is simply an explicitly prepared domain value.

Dropdown (`select`), radio-group (`segmented`), checkbox (`toggle`), literal text (`text`), number (`number`) and paired native dates (`date-range`) are supported. Text and numeric controls select declared literal values, not a query language. Date ranges are inclusive, date-only UTC calendar values; only supplied start/end pairs are supported. Free-form inputs can temporarily be invalid or unavailable. No matching view means no stale metrics/charts/table; reset restores declared defaults. Ambiguous/duplicate combinations, unknown/missing input keys, wrong value types, duplicate domains and unsupported defaults fail compilation. Null is not an input value; null dataset behaviour remains the existing component contract.

This first contract selects complete prepared views. Arbitrary row predicates, substring search over raw events, aggregation and unconstrained date ranges are not implied. A future row-selection contract must separately preserve metric denominators and subtotal scope. Prepared views keep the M5 scope coherent without silently calculating analysis.

## Bounds and export

At most six controls, 20 domain choices per control, 32 views per exploration and four explorations per report. Expanded view content is additionally bounded across the compilation: 512 components, 20,000 component rows, 8 MiB prepared data and 2 MiB Markdown; all selectable data remains readable by recipients. JSON is preflighted for reserved keys, at most 32 nesting levels and 100,000 containers before schema decoding. Unused dataset fields are projected out, but hidden views are not redaction. Export defaults and component IDs are deterministic. Source references share the CLI's local-file containment and total byte budget. Browser compilation uses the same contract and its existing smaller input cap.

Without JavaScript, the declared default view and data alternatives remain readable and controls are disabled. With JavaScript, scoped native controls select a view; charts initialize only while visible and are disposed when hidden. No URL state, local storage, remote requests or new UI framework is introduced.

## Acceptance gates

- All six control types are exercised with declared domains and working reset/unavailable states.
- The region/range fixture updates all bound component types and alternatives together, including empty data.
- Unknown, duplicate, malformed, hostile and oversized inputs fail predictably with repairable diagnostics.
- Local and in-memory compilers agree. Referenced-file watching recovers after edits/deletion.
- Deterministic HTML, offline file interaction, CSP, keyboard operation, mobile layout and both themes pass real browser checks.
- Cumulative review report retains existing components; examples, guide, generated schema, human docs and playground are updated.
- Exact release archive passes audit/Node consumers and candidate-source CI. Owner visual review precedes renderer publication.


## Local candidate verification

- Official TypeScript and TSRS pass for the engine; browser/worker site types pass.
- 153 core/compiler/security/CLI checks pass, including 24 prepared-view tests.
- 46 report browser checks pass across Chromium/WebKit, including offline transitions for all six native controls, coherent component/alternative updates, keyboard and theme/mobile checks, hostile text, no-JavaScript defaults and bundle deletion/recovery.
- 10 website browser checks pass, including live editing of a prepared-view JSON bundle through the real browser compiler.
- Build budgets remain within their existing limits: base runtime about 1.3 KiB gzip, chart runtime about 204.3 KiB gzip (5/210 KiB ceilings).
- The final 32-file candidate archive matches current build/source files exactly. Node 22/24/26 installed-consumer checks and remote candidate-source CI are verified before the review handoff.

The owner-review report stays at `http://127.0.0.1:51114/`, with the new exploration sections appended. The local website playground is `http://127.0.0.1:8787/playground/?example=interactions`. These are local review surfaces, not public deployment evidence. Website deployment and npm publication remain pending manual visual acceptance.


Final candidate source `ceffd6d4ad709b3750c8ee2c8eb0f705fd017c85` passes all [11 engine CI jobs](https://github.com/LoueeD/plotleaf/actions/runs/42906308955) and [website CI](https://github.com/LoueeD/plotleaf/actions/runs/42906308469). The final archive matches the CI-tested bytes and installed Node 22/24/26 consumers pass. [Release evidence](releases/0.4.0.md) records the integrity and pending owner review gate. Implementation and local website updates are complete; public deployment/publication remain pending visual approval.

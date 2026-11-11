# M6 implementation contract

M6 adds declarative reuse and agent-prepared table subtotals. This document records the candidate contract while implementation and verification are in progress; the feature is not published yet.

## Reusable compositions

A report invokes a definition with `::component{src="./components/summary.json" label="Orders" value="1284"}`. `src` is required; every other literal attribute is a declared parameter. A version 1 definition is JSON with `version`, `props` and `components`:

```json
{
  "version": 1,
  "props": {"label": {"type": "string"}, "value": {"type": "number"}},
  "components": [
    {"name": "metric", "props": {"label": {"prop": "label"}, "value": {"prop": "value"}}}
  ]
}
```

Properties have explicit `string`, `number` or `boolean` types; required values and any optional defaults are validated before expansion. A `{ "prop": "name" }` value substitutes the complete literal value only; it is not string interpolation. Static literal props, component children, and nested `component` references allow registered built-ins to be composed. All resulting components pass the same registry, context, property and data validation as authored directives. Unknown properties, unsupported types, missing required props, missing references, invalid values and unsupported definition versions produce actionable diagnostics. Names in definitions are checked against the registry. Definitions do not accept Markdown, arbitrary HTML, scripts, expressions, loops or dynamic imports.

Definition references and static resource references in a definition resolve from that definition's directory, while caller-supplied resource paths resolve from the calling report or enclosing definition. All resolved paths must remain in the report root, be watched by preview and use shared bounded reads. Implementations must handle CLI filesystem and browser-memory sources identically. Cache definitions within a compilation, reject cycles by canonical identity, and apply explicit depth, definition and expanded-node budgets shared across explorations and nested compositions. Do not expose definition paths in the exported report. Expansion creates normal IR before data resolution; static standalone HTML includes everything required without definition files.

Machine-readable schema must describe the definition, parameter types and limits from the same contracts used for validation. Generated schema and guide must explain resolution rules and diagnostics.

## Prepared subtotal tables

A table opts into a separate JSON shape with `prepared="grouped"`; ordinary flat-record datasets do not acquire magic fields. The shape carries a version, a human-readable scope, ordered groups, detail rows and one prepared subtotal per group. The agent supplies every displayed value; Plotleaf does not calculate or validate arithmetic totals, infer percentage denominators, or merge groups.

Each group has a unique nonblank identity and at least one detail row; all detail and subtotal records obey the same table column and rich-cell validation. Scope is required and rendered visibly. In a prepared exploration the author must provide the matching scoped subtotal data for each view; no totals are shared or dynamically filtered. Sorting operates on details within each group, with each subtotal pinned after its group's details and group order preserved. Sort indicators describe the selected column; empty datasets, nulls and rich sort keys follow ordinary table rules. The export includes only projected fields and explicit labels/scope needed for rendering, not hidden source fields.

## Acceptance fixtures and gates

- One definition is invoked from two reports with different typed parameters and data; both produce deterministic portable HTML with no definition file at runtime.
- Missing, unknown and mistyped parameters; unknown components; invalid built-in props; unsafe paths; malformed JSON; cycles and expansion limits are rejected. Preview recovers when a referenced definition is created or edited.
- Grouped detail rows and prepared subtotals preserve scope and group/subtotal placement through ascending and descending sorting, including offline export and a prepared-view transition.
- CLI and browser compiler produce equivalent output and diagnostics for the shared contracts. Existing image, sparkline, chart, accessibility, containment, CSP and size-budget checks continue to pass.
- Add the feature to the canonical cumulative review report, agent guide, generated schema, site docs, examples and playground. Obtain the owner's visual review before deploying or publishing renderer changes.

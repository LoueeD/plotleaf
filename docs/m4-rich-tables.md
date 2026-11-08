# M4: image and sparkline table cells

Updated: 8 November 2026. M1–M3 are complete; npm provides `plotleaf@0.2.0`. M4 is implemented in the unreleased `0.3.0` candidate, pending final technical verification and owner visual review. Use the source CLI to try these columns before publication.

## Scope

Extend the existing native table and column registry with two explicit cell kinds. Keep ordinary Markdown, prepared JSON, offline HTML and scalar sorting. No table framework, client chart per row, image server, report JavaScript or automatic analytical calculation is introduced. Subtotals remain in M6; filters/prepared views remain in M5.

```markdown
:::table{data="./products.json" title="Product performance"}
::column{field="image" label="Preview" kind="image" alt="description"}
::column{field="product" label="Product"}
::column{field="weekly_orders" label="Weekly orders" kind="sparkline" sortBy="last_week"}
::column{field="revenue" label="Revenue" format="currency:USD"}
:::
```

```json
[
  {
    "image": "./assets/notebook.png",
    "description": "A green field notebook",
    "product": "Field notebook",
    "weekly_orders": [60, 63, null, 64, 62, 69, 72, 78],
    "last_week": 78,
    "revenue": 10540
  }
]
```

Omitted `kind` means the existing scalar column. Unknown kinds/properties fail validation. `alt` and `sortBy` are literal field references. Images require `alt`; other column kinds reject it. Rich columns reject scalar-only sign/sentiment settings; image columns also reject numeric formats. Sparklines support the existing numeric formats for their summaries/end labels.

## Static image contract

The image field contains a local PNG/JPEG path or null. Paths resolve from the Markdown report directory, including when JSON lives in a subdirectory. Remote URLs, data URLs, absolute/backslash/encoded/hidden paths, outside-root symlinks, active SVG, GIF/WebP and animated PNG are unsupported. Both the reference and resolved extension must agree with the detected PNG/JPEG signature.

Every displayed image requires a nonblank string alternative of at most 1000 characters in the `alt` field. The field must exist in all rows; it may be null when the image is null. Null image cells display a dash and retain an explicitly declared sort key. Thumbnails use a fixed 64 × 48 box, preserving aspect ratio. There is no custom CSS or image-style API.

Limits are generated from the shared registry/specification: at most 64 image references, 1 MiB per file, 4096 pixels per side and 4,000,000 pixels total. JSON, Markdown and image reads share the existing 25 MiB compilation byte budget. Attempted image paths count toward the reference cap so invalid files cannot create unbounded watches. Regular-file checks precede reads; input/dependency overwrite protection also covers images.

`image-size@2.1.0` (MIT, zero dependencies, Node ≥18) adds approximately 98.7 kB of installed package files for image header dimensions; no image code is shipped to the browser. We use its buffer API after bounded reads and signature/container checks, not its filesystem API. Full raster decoding remains the browser's responsibility: header/container validation is not a guarantee that every corrupt pixel stream will decode. Original image bytes and metadata are embedded as provided and are readable by recipients; prepare assets with that disclosure boundary in mind. [Maintained upstream](https://codeberg.org/image-size/image-size), [header-only API/limitations](https://github.com/image-size/image-size#limitations).

Each unique content hash is embedded once in a trusted SVG symbol containing a raster data URI. Cells reference only generated local fragment IDs, with their own text alternatives. Both Chromium and WebKit render these offline without JavaScript under the existing CSP; no image source paths are retained and no external asset routes are served. The compiler resolves data/assets; the renderer receives validated cells and embedded bytes only. Author-supplied SVG remains rejected.

## Bounded sparkline contract

Only an explicit `kind="sparkline"` declaration permits a numeric/null sequence in its field. At most 64 points are accepted, preserving sample order. Nested objects, nested arrays, numeric strings, infinities and undeclared sequence fields fail. A rich dataset cannot be consumed by a chart or inferred scalar table; prepare its flat chart data separately. This policy is checked on cache hits as well as the first load.

The observed min/max across all rows of that column form one shared y scale. There is no per-row normalization, resampling, smoothing, trend inference or business sentiment colouring. Nulls split line segments; isolated observations use a point. Constant series remain valid. Empty/all-null series show no fabricated marks. The last-sample label stays a dash if the final sample is null, even when an earlier sample was recorded.

Sparklines render as small, trusted static SVG paths with the established series token and theme. Extreme finite numbers are normalized before coordinate arithmetic so a valid range cannot produce infinite/NaN geometry. Accessible summaries state recorded count, first/last sample and shared scale. A keyboard-accessible native disclosure retains all original numeric/null values in sample order, without JavaScript.

## Sorting and projection

Scalar columns keep existing raw-value sorting. A rich column has a plain header unless it declares `sortBy`, which must name a scalar field with consistent non-null types. Null keys sort last and ties preserve source order. `sortBy` cannot reference the rich field itself: array comparison and image-path sorting are not implicit behaviours. Plain headers do not acquire an `aria-sort` state when another column is sorted.

Only selected cell content, required alternatives and explicit sort keys enter the artifact. Sort keys and all image bytes remain readable. Unused fields and unreferenced local images are excluded. Sorting moves complete rows, including their image references, SVGs and data disclosures; it does not mutate prepared data or calculate totals.

## Preview, package and acceptance

The fictional [catalogue report](../examples/catalog/report.md) uses four rows, three original raster illustrations, repeated imagery, a null week, shared sparkline scales and prepared scalar comparisons. Illustrations were generated from trusted vector code rendered to PNG/JPEG; no owner reference, customer asset or third-party product photograph is redistributed. Their exact hashes are pinned in the package audit rather than scanning compressed binary pixels as text. Other public files retain content-pattern checks and the exact archive allowlist.

Preview watches attempted and canonical image paths. Replacing image bytes updates its generated ID; deletion or invalid replacement shows diagnostics; restoring the file recovers. The report export is still one self-contained HTML file and renders after its source directory is removed. A table-only catalogue uses the small base runtime, not ECharts. The existing 5 KiB base / 210 KiB chart gzip ceilings remain enforced.

Local verification passes: official TypeScript and TSRS across all three configurations; **116 core/compiler/security/Node tests**; **32 Chromium/WebKit checks**; the **27-file package audit**; and an installed npm/npx consumer on Node 22.23.3 without Bun or development dependencies. Agent inspection covers desktop light/dark and mobile dark output. Remote Linux/Windows verification is pending and will be recorded here after completion. No npm publication or 0.3.0 release tag is authorized by this implementation task.

The catalogue export measures about **32.1 KiB**, with four image cells and only three embedded rasters. The base asset remains about **0.6 KiB gzip**, and charts remain about **203.5 KiB gzip** using Bun. The installed production package tree measures about **10.6 MiB** in logical regular-file bytes on macOS arm64/Node 22 (103 package manifests, including plotleaf). This includes Markdown/compiler dependencies, not just browser output; it is not a filesystem allocation measurement. See [local measurements](m4-metrics.json).

For manual review, run `node dist/cli.js dev examples/catalog/report.md --no-open`. Check the quiet table typography, image framing, sparkline scale/gaps, keyboard value disclosures, row sorting, both themes, narrow table scrolling and offline `file://` output. Automated checks do not replace the owner's visual acceptance before a renderer release.

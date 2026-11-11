import "./exploration.js";
const collator = new Intl.Collator("en-GB", {
  numeric: true,
  sensitivity: "base",
});

for (const table of document.querySelectorAll<HTMLTableElement>(
  "table[data-plotleaf-table]",
)) {
  const bodies = [...table.tBodies].map((body) => ({
    body,
    original: [...body.rows],
  }));
  if (!bodies.length) continue;
  let active = -1;
  let descending = false;
  for (const button of table.querySelectorAll<HTMLButtonElement>(
    "thead button[data-column]",
  )) {
    button.disabled = false;
    button.addEventListener("click", () => {
      const column = Number(button.dataset.column);
      descending = active === column ? !descending : false;
      active = column;
      for (const { body, original } of bodies) {
        const header = original.filter((row) =>
          row.hasAttribute("data-plotleaf-group-header"),
        );
        const subtotal = original.filter((row) =>
          row.hasAttribute("data-plotleaf-subtotal"),
        );
        const sorted = original
          .filter((row) => !header.includes(row) && !subtotal.includes(row))
          .map((row, index) => ({
            row,
            index,
            value: JSON.parse(row.cells[column]?.dataset.raw ?? "null") as
              string | number | boolean | null,
          }));
        sorted.sort((a, b) => {
          if (a.value === null || b.value === null)
            return a.value === b.value
              ? a.index - b.index
              : a.value === null
                ? 1
                : -1;
          const comparison =
            typeof a.value === "number" && typeof b.value === "number"
              ? a.value - b.value
              : collator.compare(String(a.value), String(b.value));
          return (descending ? -comparison : comparison) || a.index - b.index;
        });
        body.replaceChildren(
          ...header,
          ...sorted.map((item) => item.row),
          ...subtotal,
        );
      }
      table.querySelectorAll("thead th[aria-sort]").forEach((header) => {
        const selected = header.contains(button);
        header.setAttribute(
          "aria-sort",
          selected ? (descending ? "descending" : "ascending") : "none",
        );
        const indicator = header.querySelector(".sort-indicator");
        if (indicator)
          indicator.textContent = selected ? (descending ? "↓" : "↑") : "↕";
      });
    });
  }
}

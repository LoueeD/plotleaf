import type { ReportPayload } from "../shared/payload.js";
import type { InputValue } from "../compiler/exploration-schema.js";
import { valueKey } from "../shared/exploration.js";
const payload = JSON.parse(
  document.getElementById("plotleaf-data")?.textContent ?? "{}",
) as Partial<ReportPayload>;
for (const config of payload.explorations ?? []) {
  const scope = document.getElementById(`${config.id}-title`)?.parentElement;
  if (!scope) continue;
  const controls = (id: string) =>
    [
      ...scope.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "[data-plotleaf-input]",
      ),
    ].filter((control) => control.dataset.plotleafInput === id);
  const status = scope.querySelector<HTMLElement>("[data-plotleaf-status]")!;
  function update() {
    const values = new Map<string, string>();
    let valid = true;
    for (const input of config.inputs) {
      const elements = controls(input.id);
      const first = elements[0]!;
      let value: InputValue;
      if (input.type === "select")
        value = input.options[Number(first.value)]?.value ?? "\0";
      else if (input.type === "segmented")
        value =
          input.options[
            Number(
              elements.find((element) => (element as HTMLInputElement).checked)
                ?.value ?? -1,
            )
          ]?.value ?? "\0";
      else if (input.type === "toggle")
        value = (first as HTMLInputElement).checked;
      else if (input.type === "date-range")
        value = {
          start: elements.find(
            (element) => element.dataset.rangePart === "start",
          )!.value,
          end: elements.find((element) => element.dataset.rangePart === "end")!
            .value,
        };
      else
        value =
          input.type === "number"
            ? first.value === ""
              ? NaN
              : Number(first.value)
            : first.value;
      const key = valueKey(value);
      values.set(input.id, key);
      const supported =
        input.type === "toggle" ||
        input.options.some((option) => valueKey(option.value) === key);
      for (const element of elements)
        element.setAttribute("aria-invalid", String(!supported));
      valid &&= supported;
    }
    const match = valid
      ? config.views.find((view) =>
          config.inputs.every(
            (input) => values.get(input.id) === valueKey(view.when[input.id]!),
          ),
        )
      : undefined;
    for (const panel of scope!.querySelectorAll<HTMLElement>(
      "[data-plotleaf-view]",
    ))
      panel.hidden = panel.dataset.plotleafView !== match?.id;
    status.textContent = match
      ? `Showing ${match.label} · Prepared view`
      : "No prepared view for these selections. Choose supported values or reset.";
    scope!.dispatchEvent(new Event("plotleaf:viewchange", { bubbles: true }));
  }
  function reset() {
    for (const input of config.inputs)
      for (const element of controls(input.id)) {
        if (input.type === "toggle")
          (element as HTMLInputElement).checked = input.default;
        else if (input.type === "date-range")
          element.value =
            input.default[element.dataset.rangePart as "start" | "end"];
        else if (input.type === "segmented")
          (element as HTMLInputElement).checked =
            valueKey(input.options[Number(element.value)]!.value) ===
            valueKey(input.default);
        else if (input.type === "select")
          element.value = String(
            input.options.findIndex(
              (option) => valueKey(option.value) === valueKey(input.default),
            ),
          );
        else element.value = String(input.default);
      }
    update();
  }
  for (const input of config.inputs)
    for (const control of controls(input.id)) {
      control.disabled = false;
      control.addEventListener("input", update);
      control.addEventListener("change", update);
    }
  const resetButton = scope.querySelector<HTMLButtonElement>(
    "[data-plotleaf-reset]",
  )!;
  resetButton.disabled = false;
  resetButton.addEventListener("click", reset);
  update();
}

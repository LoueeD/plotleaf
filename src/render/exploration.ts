import type { ComponentBlock, Block } from "../compiler/ir.js";
import type { ExplorationConfig } from "../compiler/exploration-schema.js";
import { valueKey } from "../shared/exploration.js";
import { h, t, type Child } from "./tree.js";
export function exploration(
  block: Extract<ComponentBlock, { name: "explore" }>,
  id: string,
  render: (blocks: Block[], namespace?: string) => Child[],
  configs: ExplorationConfig[],
): Child[] {
  const data = block.exploration;
  if (!data) return [];
  configs.push({
    id,
    inputs: data.inputs,
    views: data.views.map(({ id, label, when }) => ({ id, label, when })),
  });
  const controls = data.inputs.map((input) => {
    const controlId = `${id}-${input.id}`;
    const attrs = {
      disabled: true,
      dataPlotleafInput: input.id,
      id: controlId,
    };
    if (input.type === "segmented")
      return h("fieldset", { className: ["explore-segmented"] }, [
        h("legend", {}, [t(input.label)]),
        h(
          "div",
          { className: ["explore-segment-options"] },
          input.options.map((option, index) =>
            h("label", {}, [
              h("input", {
                ...attrs,
                id: `${controlId}-${index}`,
                type: "radio",
                name: controlId,
                value: String(index),
                checked: valueKey(option.value) === valueKey(input.default),
              }),
              t(option.label),
            ]),
          ),
        ),
      ]);
    if (input.type === "date-range")
      return h("fieldset", { className: ["explore-dates"] }, [
        h("legend", {}, [t(input.label)]),
        ...(["start", "end"] as const).map((part) =>
          h("label", {}, [
            t(part === "start" ? "From" : "Through"),
            h("input", {
              ...attrs,
              id: `${controlId}-${part}`,
              type: "date",
              dataRangePart: part,
              ariaDescribedBy: [`${controlId}-ranges`],
              value: input.default[part],
            }),
          ]),
        ),
      ]);
    if (input.type === "toggle")
      return h("label", { className: ["explore-toggle"] }, [
        h("input", { ...attrs, type: "checkbox", checked: input.default }),
        t(input.label),
      ]);
    if (input.type === "select")
      return h("div", { className: ["explore-field"] }, [
        h("label", { htmlFor: [controlId] }, [t(input.label)]),
        h(
          "select",
          attrs,
          input.options.map((option, index) =>
            h(
              "option",
              {
                value: String(index),
                selected: valueKey(option.value) === valueKey(input.default),
              },
              [t(option.label)],
            ),
          ),
        ),
      ]);
    return h("div", { className: ["explore-field"] }, [
      h("label", { htmlFor: [controlId] }, [t(input.label)]),
      h("input", {
        ...attrs,
        type: input.type === "number" ? "number" : "text",
        value: String(input.default),
        ...(input.type === "number" ? { step: "any" } : {}),
        list: `${controlId}-choices`,
      }),
      h(
        "datalist",
        { id: `${controlId}-choices` },
        input.options.map((option) =>
          h("option", { value: String(option.value) }, [t(option.label)]),
        ),
      ),
    ]);
  });
  const selected = data.views.find((view) => view.id === data.defaultView)!;
  return [
    h(
      "section",
      {
        className: ["exploration"],
        dataPlotleafExplore: id,
        ariaLabel: block.props.title,
      },
      [
        h("h2", { id: `${id}-title` }, [t(block.props.title)]),
        h("div", { className: ["explore-controls"] }, [
          ...controls,
          h(
            "button",
            { type: "button", disabled: true, dataPlotleafReset: true },
            [t("Reset")],
          ),
        ]),
        ...data.inputs
          .filter((input) => input.type === "date-range")
          .map((input) =>
            h(
              "p",
              {
                id: `${id}-${input.id}-ranges`,
                className: ["explore-supported"],
              },
              [
                t(
                  `${input.label} — prepared ranges: ${input.options.map((option) => option.label).join(" · ")}`,
                ),
              ],
            ),
          ),
        h(
          "p",
          {
            className: ["explore-status"],
            dataPlotleafStatus: true,
            role: "status",
            ariaLive: "polite",
          },
          [t(`Showing ${selected.label} · Prepared view`)],
        ),
        h("noscript", {}, [
          t(
            "JavaScript is disabled. The default prepared view is shown; controls are unavailable.",
          ),
        ]),
        ...data.views.map((view) =>
          h(
            "section",
            {
              dataPlotleafView: view.id,
              ariaLabel: view.label,
              hidden: view.id !== data.defaultView,
            },
            render(view.blocks, `${id}-${view.id}-`),
          ),
        ),
      ],
    ),
  ];
}

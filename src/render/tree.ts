import type { Element, Text, Properties } from "hast";
export type Child = Element | Text;
export const t = (value: unknown): Text => ({
  type: "text",
  value: String(value),
});
export const h = (
  tagName: string,
  properties: Properties = {},
  children: Child[] = [],
): Element => ({ type: "element", tagName, properties, children });

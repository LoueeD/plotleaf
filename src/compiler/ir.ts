import type { Root as MarkdownRoot } from "mdast";
import type { Position } from "unist";
import type { ComponentName, PropsByName, ColumnProps } from "./registry.js";
import type { Row } from "../shared/payload.js";

export interface MarkdownBlock {
  type: "markdown";
  tree: MarkdownRoot;
}
export type ComponentBlock = {
  [K in ComponentName]: {
    type: "component";
    name: K;
    props: PropsByName[K];
    children: Block[];
    position?: Position;
    rows?: Row[];
    columns?: ColumnProps[];
  };
}[ComponentName];
export type Block = MarkdownBlock | ComponentBlock;
export interface Report {
  metadata: { title: string; description?: string };
  blocks: Block[];
}

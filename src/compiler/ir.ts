import type { ExplorationInput, InputValue } from "./exploration-schema.js";
import type { Root as MarkdownRoot } from "mdast";
import type { Position } from "unist";
import type { ComponentName, PropsByName, ColumnProps } from "./registry.js";
import type { Cell, Row } from "../shared/payload.js";

export interface EmbeddedImage {
  id: string;
  mime: "image/png" | "image/jpeg";
  base64: string;
}
export type RichCell =
  | { kind: "image"; imageId: string | null; alt: string; sort?: Cell }
  | { kind: "sparkline"; values: (number | null)[]; sort?: Cell };
export type TableRow = Record<string, Cell | RichCell>;

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
    /** Internal expansion accounting; never emitted into output. */
    compositionOrigin?: boolean;
    rows?: K extends "table" ? TableRow[] : Row[];
    columns?: ColumnProps[];
    tableGroups?: {
      scope: string;
      groups: { id: string; label: string; size: number }[];
    };
    exploration?: {
      inputs: ExplorationInput[];
      defaultView: string;
      views: {
        id: string;
        label: string;
        when: Record<string, InputValue>;
        blocks: Block[];
      }[];
    };
  };
}[ComponentName];
export type Block = MarkdownBlock | ComponentBlock;
export interface Report {
  metadata: { title: string; description?: string };
  blocks: Block[];
  images?: EmbeddedImage[];
}

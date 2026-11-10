import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import { parseDocument, visit } from "yaml";
import type { Root, RootContent } from "mdast";
import type { Node, Position } from "unist";
import * as z from "zod";
import { registry, decodeProps, type ComponentName } from "./registry.js";
import type { Block, ComponentBlock, Report } from "./ir.js";
import { Diagnostics } from "./diagnostic-core.js";

const parser = unified()
  .use(remarkParse)
  .use(remarkFrontmatter)
  .use(remarkDirective);
const metadataSchema = z.strictObject({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});
type SyntaxNode = Node & {
  name?: string;
  value?: string;
  url?: string;
  attributes?: Record<string, string>;
  children?: SyntaxNode[];
};

function textOf(node: SyntaxNode): string {
  return node.value ?? node.children?.map(textOf).join("") ?? "";
}

export function parseReport(
  source: string,
  fallbackTitle: string,
  diagnostics: Diagnostics,
): Report {
  const tree = parser.parse(source) as Root;
  const lines = source.split(/\r?\n/);
  const recognized = new Set<number>();
  const inert = new Set<number>();
  const definitions = new Map<string, string>();
  let metadata: Report["metadata"] = { title: fallbackTitle };
  const firstHeading = tree.children.find(
    (node) => node.type === "heading" && node.depth === 1,
  );
  if (firstHeading) metadata.title = textOf(firstHeading as SyntaxNode);

  function inspect(node: SyntaxNode, depth = 0): void {
    if (depth > 64) {
      diagnostics.add(
        "E_REPORT_DEPTH",
        "Markdown nesting exceeds 64 levels.",
        node.position,
      );
      return;
    }
    if (node.type === "code" || node.type === "yaml") {
      for (
        let line = node.position?.start.line ?? 0;
        line <= (node.position?.end.line ?? 0);
        line++
      )
        inert.add(line);
      return;
    }
    if (node.type === "html")
      diagnostics.add(
        "E_RAW_HTML",
        "Raw HTML is not supported in reports.",
        node.position,
        "Use Markdown or a registered directive. Put HTML examples inside code fences.",
      );
    if (node.type === "image" || node.type === "imageReference")
      diagnostics.add(
        "E_IMAGE_UNSUPPORTED",
        "Markdown images are not supported; use an explicit image column in a table.",
        node.position,
        'Use ::column{field="image" kind="image" alt="description"} inside a table for local PNG/JPEG images, or use a text link.',
      );
    if (node.type === "link" || node.type === "definition") {
      const url = node.url ?? "";
      let allowed = url.startsWith("#");
      try {
        allowed ||= ["https:", "http:", "mailto:"].includes(
          new URL(url).protocol,
        );
      } catch {
        /* Relative file links are deliberately unsupported. */
      }
      if (!allowed)
        diagnostics.add(
          "E_LINK_URL",
          `Unsupported link destination ${JSON.stringify(url)}.`,
          node.position,
          "Use an https:, http:, mailto: link or a same-document #anchor.",
        );
      if (node.type === "definition")
        definitions.set(
          String((node as SyntaxNode & { identifier: string }).identifier),
          url,
        );
    }
    node.children?.forEach((child) => inspect(child, depth + 1));
  }
  inspect(tree as SyntaxNode);

  function blocks(nodes: SyntaxNode[], parent = "root", depth = 0): Block[] {
    if (depth > 32) {
      diagnostics.add("E_REPORT_DEPTH", "Component nesting exceeds 32 levels.");
      return [];
    }
    const output: Block[] = [];
    for (const node of nodes) {
      if (node.type === "yaml") {
        try {
          const document = parseDocument(node.value ?? "", {
            uniqueKeys: true,
            strict: true,
          });
          if (document.errors.length || document.warnings.length)
            throw new Error(
              [...document.errors, ...document.warnings]
                .map((error) => error.message)
                .join("; "),
            );
          visit(document, {
            Alias() {
              throw new Error("YAML aliases are not supported.");
            },
          });
          const result = metadataSchema.safeParse(
            document.toJS({ maxAliasCount: 0 }) ?? {},
          );
          if (!result.success)
            throw new Error(
              result.error.issues
                .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                .join("; "),
            );
          metadata = { ...metadata, ...result.data };
        } catch (error) {
          diagnostics.add(
            "E_FRONTMATTER",
            error instanceof Error ? error.message : "Invalid frontmatter.",
            node.position,
          );
        }
        continue;
      }
      if (
        ["containerDirective", "leafDirective", "textDirective"].includes(
          node.type,
        )
      ) {
        const name = node.name ?? "";
        recognized.add(node.position?.start.line ?? 0);
        if (node.type === "containerDirective") {
          const closingLine = node.position?.end.line ?? 0;
          const closing = lines[closingLine - 1]?.trim() ?? "";
          if (!/^:{3,}$/.test(closing))
            diagnostics.add(
              "E_DIRECTIVE_CLOSE",
              `:::${name} needs an explicit closing colon fence.`,
              node.position,
              "Close the component with ::: on its own line. Use a longer outer fence when nesting containers.",
            );
          else recognized.add(closingLine);
        }
        if (!Object.hasOwn(registry, name)) {
          diagnostics.add(
            "E_COMPONENT_UNKNOWN",
            `Unknown component ${JSON.stringify(name)}.`,
            node.position,
            `Supported components: ${Object.keys(registry).join(", ")}. Run plotleaf schema for their properties.`,
          );
          continue;
        }
        const componentName = name as ComponentName;
        const entry = registry[componentName];
        const form =
          node.type === "containerDirective"
            ? "container"
            : node.type === "leafDirective"
              ? "leaf"
              : "text";
        if (!(entry.forms as readonly string[]).includes(form))
          diagnostics.add(
            "E_COMPONENT_FORM",
            `${name} does not support the ${form} directive form.`,
            node.position,
            `Use ${(entry.forms as readonly string[]).includes("container") ? `:::${name} … :::` : `::${name}{…}`}.`,
          );
        const allowed =
          parent === "root"
            ? name !== "column"
            : (
                registry[parent as ComponentName]?.children as
                  readonly string[] | undefined
              )?.includes(name);
        if (!allowed)
          diagnostics.add(
            "E_COMPONENT_CONTEXT",
            `${name} is not allowed inside ${parent}.`,
            node.position,
            name === "column"
              ? "Place column directives inside a table container."
              : "Place standalone components at the report root or inside a grid.",
          );
        // This lint inspects attribute names on an already parsed directive; remark owns the grammar.
        const opening = lines[(node.position?.start.line ?? 1) - 1] ?? "";
        const names = new Set<string>();
        for (const match of opening.matchAll(
          /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|([A-Za-z][\w-]*)\s*=/g,
        )) {
          if (!match[1]) continue;
          if (names.has(match[1]))
            diagnostics.add(
              "E_PROP_DUPLICATE",
              `Duplicate property ${JSON.stringify(match[1])} on ${name}.`,
              node.position,
              "Specify each property once.",
            );
          names.add(match[1]);
        }
        if (node.type === "leafDirective" && node.children?.length)
          diagnostics.add(
            "E_COMPONENT_LABEL",
            `${name} does not accept a directive [label].`,
            node.position,
            "Use the label or title property instead.",
          );
        const decoded = decodeProps(componentName, node.attributes ?? {});
        for (const message of decoded.errors)
          diagnostics.add(
            "E_PROP_VALUE",
            message,
            node.position,
            `Run plotleaf schema for the ${name} contract.`,
          );
        const children = blocks(node.children ?? [], name, depth + 1);
        if (decoded.props)
          output.push({
            type: "component",
            name: componentName,
            props: decoded.props,
            children,
            position: node.position,
          } as ComponentBlock);
        continue;
      }
      if (
        parent !== "root" &&
        !(
          registry[parent as ComponentName]?.children as
            readonly string[] | undefined
        )?.includes("markdown")
      )
        diagnostics.add(
          "E_COMPONENT_CHILD",
          `${parent} only accepts its declared component children.`,
          node.position,
        );
      const nestedDirectives = (candidate: SyntaxNode, nesting = 0): void => {
        if (nesting > 64) return;
        if (candidate.type.endsWith("Directive"))
          diagnostics.add(
            "E_COMPONENT_CONTEXT",
            "Components must be standalone blocks, not inline/list/blockquote content.",
            candidate.position,
          );
        candidate.children?.forEach((child) =>
          nestedDirectives(child, nesting + 1),
        );
      };
      nestedDirectives(node);
      const last = output.at(-1);
      if (last?.type === "markdown")
        last.tree.children.push(node as RootContent);
      else
        output.push({
          type: "markdown",
          tree: { type: "root", children: [node as RootContent] },
        });
    }
    return output;
  }
  const reportBlocks = blocks(tree.children as SyntaxNode[]);
  // Add reference definitions to each prose fragment without rendering them twice.
  function attachDefinitions(items: Block[]): void {
    for (const block of items) {
      if (block.type === "markdown") {
        for (const [identifier, url] of definitions)
          if (
            !block.tree.children.some(
              (node) =>
                node.type === "definition" && node.identifier === identifier,
            )
          )
            block.tree.children.push({ type: "definition", identifier, url });
      } else attachDefinitions(block.children);
    }
  }
  attachDefinitions(reportBlocks);
  // Reserved-line recovery lint catches malformed directives that Markdown correctly treats as prose.
  for (let index = 0; index < lines.length; index++) {
    if (
      /^\s*::/.test(lines[index] ?? "") &&
      !recognized.has(index + 1) &&
      !inert.has(index + 1)
    ) {
      const position: Position = {
        start: { line: index + 1, column: 1 },
        end: { line: index + 1, column: 1 },
      };
      diagnostics.add(
        "E_DIRECTIVE_SYNTAX",
        "Malformed or misplaced component directive.",
        position,
        'Use ::name{key="literal"} on one line, or a balanced :::name container. JavaScript expressions are not supported.',
      );
    }
  }
  return { metadata, blocks: reportBlocks };
}

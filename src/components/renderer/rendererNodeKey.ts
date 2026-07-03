interface RendererKeyNode {
  id?: string;
  lineStart?: number;
  line?: number;
  type?: string;
}

/**
 * Stable sibling key: prefer parser id; otherwise combine source line, node
 * type, and sibling index. The index is intentionally retained as a tiebreaker
 * because several AST nodes can share the same source line and type.
 */
export const getRendererNodeKey = (node: RendererKeyNode | null | undefined, index: number): string => {
  if (node?.id) return `id-${node.id}`;
  const line = node?.lineStart ?? node?.line;
  const type = node?.type || "node";
  return typeof line === "number" ? `L${line}-${type}-${index}` : `i-${index}`;
};

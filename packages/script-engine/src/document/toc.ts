import type { AstNode, TocEntry } from "./astTypes";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "scene"
  );
}

export function extractToc(root: AstNode): TocEntry[] {
  const entries: TocEntry[] = [];
  const visit = (nodes: AstNode[] = []) => {
    for (const n of nodes) {
      if (n.type === "scene_heading" && n.text) {
        const label = String(n.text);
        entries.push({
          id: (n.id as string | undefined) ?? slugify(label),
          label,
          lineStart: n.lineStart ?? 0,
        });
      }
      if (n.children) visit(n.children);
    }
  };
  visit(root.children);
  return entries;
}

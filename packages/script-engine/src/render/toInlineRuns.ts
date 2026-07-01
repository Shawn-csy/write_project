import type { InlineToken, MarkerConfig } from "../document/astTypes";
import type { InlineRun } from "./renderTypes";

function resolveDisplayText(content: string, cfg?: MarkerConfig): string {
  const renderer = cfg?.renderer;
  const template = renderer && typeof renderer === "object"
    ? String((renderer as { template?: unknown }).template ?? "")
    : "";
  if (template) return template.replace(/\{\{content\}\}/g, content);
  if (cfg?.showDelimiters && cfg.start && cfg.end) {
    return `${cfg.start}${content}${cfg.end}`;
  }
  return content;
}

/**
 * Convert pre-parsed InlineToken[] (from engine DirectASTBuilder or parseInline)
 * into InlineRun[], applying marker renderer rules and merging styles.
 */
export function toInlineRuns(
  tokens: InlineToken[],
  markerConfigs: MarkerConfig[] = []
): InlineRun[] {
  const runs: InlineRun[] = [];
  for (const tok of tokens) {
    if (!tok.content) continue;
    if (tok.type === "text") {
      runs.push({ text: tok.content });
      continue;
    }
    // highlight or other typed token
    const cfg = tok.id ? markerConfigs.find((c) => c.id === tok.id) : undefined;
    const content = tok.content;
    const style: Record<string, string> = {};
    if (cfg?.style) Object.assign(style, cfg.style);
    if (tok.style) Object.assign(style, tok.style);
    runs.push({
      text: resolveDisplayText(content, cfg),
      content,
      style: Object.keys(style).length > 0 ? style : undefined,
      markerId: tok.id,
    });
  }
  return runs;
}

/**
 * Split a raw text string on newlines, parse each line with `parseFn`,
 * and return one InlineRun[] per line.
 */
export function toLineRuns(
  text: string,
  parseFn: (line: string) => InlineToken[],
  markerConfigs: MarkerConfig[] = []
): InlineRun[][] {
  return text.split("\n").map((line) => toInlineRuns(parseFn(line), markerConfigs));
}

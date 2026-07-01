import type { PublicScript } from "./types";

// Marker-prefix patterns: lines that are pure syntax (scene headers, sfx, direction, etc.)
// and should be skipped when deriving a plain-text description from script content.
const MARKER_PREFIX_RE =
  /^(<t>|\/sfx|\/d|\/p\d*|<s>|<cs>|<\^|@|#SE|#|>>|<<<|>>>|\|)/i;

export function getScriptDescription(script: PublicScript): string {
  if (script.synopsis) return script.synopsis.slice(0, 300);
  if (script.content) {
    // Collect dialogue lines until ≥50 chars — a single short line produces
    // a description too thin for search engines to surface useful snippets.
    const lines = script.content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !MARKER_PREFIX_RE.test(l));
    let result = "";
    for (const line of lines) {
      result = result ? `${result}　${line}` : line;
      if (result.length >= 50) break;
    }
    if (result) return result.slice(0, 200);
  }
  return "公開劇本閱讀頁";
}

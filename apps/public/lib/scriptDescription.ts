import type { PublicScript } from "./types";

// Marker-prefix patterns: lines that are pure syntax (scene headers, sfx, direction, etc.)
// and should be skipped when deriving a plain-text description from script content.
const MARKER_PREFIX_RE =
  /^(<t>|\/sfx|\/d|\/p\d*|<s>|<cs>|<\^|@|#SE|#|>>|<<<|>>>|\|)/i;

export function getScriptDescription(script: PublicScript): string {
  if (script.synopsis) return script.synopsis.slice(0, 300);
  if (script.content) {
    const firstLine = script.content
      .split("\n")
      .find((l) => l.trim() && !MARKER_PREFIX_RE.test(l.trim()));
    if (firstLine) return firstLine.trim().slice(0, 200);
  }
  return "公開劇本閱讀頁";
}

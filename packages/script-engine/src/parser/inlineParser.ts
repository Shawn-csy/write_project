/**
 * Inline parser — pure regex left-to-right scan.
 * Semantically equivalent to src/lib/parsers/inlineParser.ts + parserGenerators.ts
 * but without Parsimmon. Works in any JS environment (Node, browser, edge).
 *
 * Output token format matches Vite: { type: "text"|"highlight", content, id?, style? }
 */

import type { MarkerConfig, InlineToken } from "../document/astTypes";
import { isInlineLike } from "../marker-theme/markerRules";

// ─── fullwidth helpers (mirrors parserGenerators.ts) ─────────────────────────

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toFullWidthPunct = (str: string): string =>
  str
    .replace(/[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) + 0xfee0)
    )
    .replace(/ /g, "\u3000");

const toFullWidthAlphaNum = (char: string): string => {
  const code = char.charCodeAt(0);
  if (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  ) {
    return String.fromCharCode(code + 0xfee0);
  }
  return char;
};

/**
 * Build a regex pattern matching both halfwidth and fullwidth variants of each
 * character in `token`. Mirrors buildFlexibleTokenPattern from parserGenerators.ts.
 */
export const buildFlexiblePattern = (token: string): string =>
  Array.from(String(token))
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
        const lower = ch.toLowerCase();
        const upper = ch.toUpperCase();
        const fLower = toFullWidthAlphaNum(lower);
        const fUpper = toFullWidthAlphaNum(upper);
        return `[${escapeRegExp(lower)}${escapeRegExp(upper)}${escapeRegExp(fLower)}${escapeRegExp(fUpper)}]`;
      }
      if (code >= 0x30 && code <= 0x39) {
        const fd = toFullWidthAlphaNum(ch);
        return `[${escapeRegExp(ch)}${escapeRegExp(fd)}]`;
      }
      if (code >= 0x21 && code <= 0x7e) {
        const fw = toFullWidthPunct(ch);
        if (fw !== ch) return `[${escapeRegExp(ch)}${escapeRegExp(fw)}]`;
      }
      return escapeRegExp(ch);
    })
    .join("");

// ─── compiled pattern ─────────────────────────────────────────────────────────

interface CompiledPattern {
  regex: RegExp;
  id: string;
  style?: Record<string, string>;
  captureGroup: number; // 0 = full match, 1+ = capture group index
}

function buildCompiledPatterns(configs: MarkerConfig[]): CompiledPattern[] {
  const safeConfigs = Array.isArray(configs) ? configs : [];
  const inlines = safeConfigs
    .filter((c) => isInlineLike(c))
    .sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pa !== pb) return pb - pa;
      // regex before enclosure as tiebreak (mirrors Vite sortedConfigs)
      if (a.matchMode === "regex" && b.matchMode !== "regex") return -1;
      if (a.matchMode !== "regex" && b.matchMode === "regex") return 1;
      return 0;
    });

  // All prefix starts for content cutoff (mirrors nextPrefixPattern)
  const prefixStarts = inlines
    .filter((c) => (c.matchMode === "prefix" || (!c.end && c.start)) && c.start)
    .map((c) => buildFlexiblePattern(c.start!))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const nextPrefixPattern =
    prefixStarts.length > 0 ? `(?:${prefixStarts.join("|")})` : null;

  const patterns: CompiledPattern[] = [];

  for (const c of inlines) {
    const id = c.id || `custom-${Math.random().toString(36).slice(2, 11)}`;
    const style = c.style as Record<string, string> | undefined;

    try {
      if (c.matchMode === "regex" && c.regex) {
        const raw = String(c.regex).trim();
        const lit = raw.match(/^\/([\s\S]*)\/([a-z]*)$/i);
        const re = lit ? new RegExp(lit[1], lit[2]) : new RegExp(raw);
        const hasGroup = /\([^?]/.test(String(c.regex));
        patterns.push({ regex: re, id, style, captureGroup: hasGroup ? 1 : 0 });
      } else if (c.matchMode === "prefix" || (!c.end && c.start)) {
        if (!c.start) continue;
        const startPat = buildFlexiblePattern(c.start);
        const contentPat = nextPrefixPattern
          ? `[\\s\\S]*?(?=${nextPrefixPattern}|$)`
          : `[\\s\\S]*`;
        const re = new RegExp(`(?:${startPat})(${contentPat})`, "i");
        patterns.push({ regex: re, id, style, captureGroup: 1 });
      } else if (c.start) {
        // enclosure
        const startPat = buildFlexiblePattern(c.start);
        const endStr = c.end ?? c.start;
        const endPat = buildFlexiblePattern(endStr);
        const re = new RegExp(
          `(?:${startPat})((?:(?!${endPat})[\\s\\S])*)(?:${endPat})`,
          "i"
        );
        patterns.push({ regex: re, id, style, captureGroup: 1 });
      }
    } catch {
      // skip invalid regex
    }
  }

  return patterns;
}

// ─── scanner ──────────────────────────────────────────────────────────────────

/**
 * Left-to-right scan: equivalent to Parsimmon P.alt(...).many() + mergeTextNodes.
 */
function scan(text: string, patterns: CompiledPattern[]): InlineToken[] {
  const tokens: InlineToken[] = [];
  let pos = 0;

  outer: while (pos < text.length) {
    for (const p of patterns) {
      p.regex.lastIndex = 0;
      const sub = text.slice(pos);
      const m = p.regex.exec(sub);
      if (m && m.index === 0) {
        const content =
          p.captureGroup > 0 && m[p.captureGroup] !== undefined
            ? m[p.captureGroup].trim()
            : m[0].trim();
        tokens.push({ type: "highlight", id: p.id, content, style: p.style });
        pos += m[0].length;
        continue outer;
      }
    }
    // No match at pos: accumulate as text (mergeTextNodes equivalent)
    const last = tokens[tokens.length - 1];
    if (last?.type === "text") {
      last.content += text[pos];
    } else {
      tokens.push({ type: "text", content: text[pos] });
    }
    pos++;
  }

  return tokens;
}

// ─── public API ───────────────────────────────────────────────────────────────

const configCache = new WeakMap<MarkerConfig[], CompiledPattern[]>();

export function parseInline(
  text: string,
  configs: MarkerConfig[] = []
): InlineToken[] {
  if (!text) return [];
  let patterns = configCache.get(configs);
  if (!patterns) {
    patterns = buildCompiledPatterns(configs);
    configCache.set(configs, patterns);
  }
  return scan(text, patterns);
}

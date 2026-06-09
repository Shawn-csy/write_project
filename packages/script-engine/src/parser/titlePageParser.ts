/** Ported from src/lib/parsers/titlePageParser.ts */

import type { TitleEntry } from "../document/astTypes";

export const splitTitleAndBody = (
  preprocessedText = ""
): { titleLines: string[]; bodyText: string; bodyStartLine: number } => {
  if (!preprocessedText)
    return { titleLines: [], bodyText: "", bodyStartLine: 1 };
  const lines = preprocessedText.split("\n");

  const firstLineIsTitle = /^\s*([^:]+):/.test(lines[0] || "");
  if (!firstLineIsTitle) {
    return { titleLines: [], bodyText: preprocessedText, bodyStartLine: 1 };
  }

  const blankIdx = lines.findIndex((line) => !line.trim());
  if (blankIdx === -1) {
    return { titleLines: lines, bodyText: "", bodyStartLine: lines.length + 1 };
  }

  return {
    titleLines: lines.slice(0, blankIdx),
    bodyText: lines.slice(blankIdx + 1).join("\n"),
    bodyStartLine: blankIdx + 2,
  };
};

export const extractTitleEntries = (titleLines: string[] = []): TitleEntry[] => {
  if (!titleLines.length) return [];
  const entries: TitleEntry[] = [];
  let current: TitleEntry | null = null;
  for (const raw of titleLines) {
    const match = raw.match(/^(\s*)([^:]+):(.*)$/);
    if (match) {
      const [, indent, key, rest] = match;
      const val = rest.trim();
      current = { key: key.trim(), indent: indent.length, values: val ? [val] : [] };
      entries.push(current);
    } else if (current) {
      const continuation = raw.trim();
      if (continuation) current.values.push(continuation);
    }
  }
  return entries;
};

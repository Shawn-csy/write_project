import {
  matchWhitespaceCommand,
  DIR_TOKEN,
  SFX_TOKEN,
  BLANK_LONG,
  BLANK_MID,
  BLANK_SHORT,
  BLANK_PURE,
} from "./screenplayTokens.js";

const slugifyScene = (text = "", idx = 0) => {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || `scene-${idx + 1}`;
};

export const preprocessRawScript = (text = "") => {
  const lines = text.split("\n");
  const output = [];
  lines.forEach((line) => {
    const bracket = line.match(/^\s*\[(.+?)\]\s*$/);
    if (bracket) {
      const content = bracket[1].trim();
      const sfxMatch = content.match(/^sfx[:：]\s*(.+)$/i);
      if (sfxMatch) {
        output.push(`!${SFX_TOKEN}${sfxMatch[1].trim()}`);
      } else {
        output.push(`!${DIR_TOKEN}${content}`);
      }
      return;
    }
    const kind = matchWhitespaceCommand(line);
    if (kind) {
      output.push({
        long: BLANK_LONG,
        mid: BLANK_MID,
        short: BLANK_SHORT,
        pure: BLANK_PURE,
      }[kind]);
      return;
    }
    output.push(line);
  });
  return output.join("\n");
};

export const splitTitleAndBody = (preprocessedText = "") => {
  if (!preprocessedText) return { titleLines: [], bodyText: "" };
  const lines = preprocessedText.split("\n");
  const blankIdx = lines.findIndex((line) => !line.trim());
  if (blankIdx === -1) {
    return { titleLines: lines, bodyText: "" };
  }
  return {
    titleLines: lines.slice(0, blankIdx),
    bodyText: lines.slice(blankIdx + 1).join("\n"),
  };
};

export const extractTitleEntries = (titleLines = []) => {
  if (!titleLines.length) return [];
  const entries = [];
  let current = null;

  for (const raw of titleLines) {
    const match = raw.match(/^(\s*)([^:]+):(.*)$/);
    if (match) {
      const [, indent, key, rest] = match;
      const val = rest.trim();
      current = {
        key: key.trim(),
        indent: indent.length,
        values: val ? [val] : [],
      };
      entries.push(current);
    } else if (current) {
      const continuation = raw.trim();
      if (continuation) current.values.push(continuation);
    }
  }
  return entries;
};

export const buildSceneListFromTokens = (tokens = []) => {
  const scenes = [];
  const dup = new Map();
  tokens
    .filter((t) => t.type === "scene_heading" && t.text)
    .forEach((t, idx) => {
      const label = t.text.trim();
      const base = slugifyScene(label, idx);
      const count = dup.get(base) || 0;
      const id = count > 0 ? `${base}-${count + 1}` : base;
      dup.set(base, count + 1);
      scenes.push({ id, label });
    });
  return scenes;
};

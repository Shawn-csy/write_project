import {
  matchWhitespaceCommand,
  DIR_TOKEN,
  SFX_TOKEN,
  MARKER_TOKEN,
  SECTION_TOKEN,
  POST_TOKEN,
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
    // 偵測 {{...}} 雙大括號作為通用標記 (Continuous Sound Marker)
    const doubleBrace = line.match(/^\s*\{\{(.+?)\}\}\s*$/);
    if (doubleBrace) {
      const content = doubleBrace[1].trim();
      output.push(`!${MARKER_TOKEN}${content}`);
      return;
    }

    // 偵測 ((...)) 雙圓括號作為段落標記 (Section/Paragraph Marker)
    const doubleParen = line.match(/^\s*\(\((.+?)\)\)\s*$/);
    if (doubleParen) {
      const content = doubleParen[1].trim();
      output.push(`!${SECTION_TOKEN}${content}`);
      return;
    }

    // 偵測 <<...>> 雙尖括號作為後製標記 (Post-production Marker)
    const doubleAngle = line.match(/^\s*<<(.+?)>>\s*$/);
    if (doubleAngle) {
      const content = doubleAngle[1].trim();
      output.push(`!${POST_TOKEN}${content}`);
      return;
    }

    // 優先處理雙括號 Note 格式 [[...]] -> 保留原樣或忽略
    const doubleBracket = line.match(/^\s*\[\[(.+?)\]\]\s*$/);
    if (doubleBracket) {
      // Fountain 標準 Note，保留原樣讓 parser 處理，或我們不處理
      output.push(line);
      return;
    }


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
  
  // Fountain Spec: First line MUST be key:value to be a title page
  const firstLineIsTitle = /^\s*([^:]+):/.test(lines[0] || "");
  
  if (!firstLineIsTitle) {
      return { titleLines: [], bodyText: preprocessedText };
  }

  const blankIdx = lines.findIndex((line) => !line.trim());
  if (blankIdx === -1) {
    // If entire text looks like title properties (very rare script), treat as title
    // But usually scripts without blank lines are short snippets/drafts -> Treat as body
    // Let's decide based on whether *most* lines look like keys.
    // Simpler: If no blank line, but started with Key:, assume it's just a title page??
    // Safer: If no blank line, treat as Body unless it's strictly keys.
    // For now, let's assume if it started with Key:, it's a title block.
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

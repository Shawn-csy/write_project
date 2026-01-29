
/**
 * REFACTORED: AST Logic moved to src/lib/statistics/index.js
 * This file retains the Regex-based Text Parser logic for backward compatibility.
 */

import { splitTitleAndBody } from "./parsers/titlePageParser.js";

const getPrefixContent = (line, prefix) => {
  if (!line.startsWith(prefix)) return null;
  const rest = line.slice(prefix.length);
  if (!rest.length) return "";
  const next = rest[0];
  const isWordPrefix = /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(prefix);
  if (!isWordPrefix) {
    return rest.trim();
  }
  if (next === " " || next === "\t" || /\d/.test(next)) {
    return rest.trim();
  }
  if (next === ":" || next === "：" || next === "-" || next === "–" || next === "—") {
    return rest.slice(1).trim();
  }
  return null;
};

const escapeRegExp = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function calculateScriptStatsFromText(rawScript = "", markerConfigs = [], options = {}) {
  const defaults = {
    durationMinutes: 0,
    counts: {
      dialogueLines: 0,
      dialogueChars: 0,
      cues: 0,
    },
    dialogueLines: [],
    markers: {},
    pauseSeconds: 0,
    pauseItems: [],
  };

  if (!rawScript) return defaults;

  const { bodyText } = splitTitleAndBody(rawScript || "");

  const result = JSON.parse(JSON.stringify(defaults));

  const blockConfigs = (markerConfigs || []).filter((c) => c.isBlock);
  const inlineConfigs = (markerConfigs || []).filter((c) => !c.isBlock);
  const sortedInline = [...inlineConfigs].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const sortedBlocks = [...blockConfigs].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const ensureMarker = (config) => {
    const id = config.id || "unknown";
    if (!result.markers[id]) {
      result.markers[id] = {
        id,
        label: config.label || id,
        items: [],
        count: 0,
        isBlock: !!config.isBlock,
        type: config.type,
        start: config.start,
      };
    }
    return result.markers[id];
  };

  const addMarkerItem = (config, content, meta = {}) => {
    const entry = ensureMarker(config);
    entry.items.push({
      text: content,
      raw: meta.raw || content,
      line: meta.line || null,
    });
    entry.count += 1;
    result.counts.cues += 1;
  };

  const lines = (bodyText || "").split("\n");
  let activeBlock = null;
  let blockBuffer = [];
  let activeBlockLine = null;

  const handleInlineMarkers = (trimmed, lineNumber) => {
    for (const config of sortedInline) {
      if (config.matchMode === "regex" && config.regex) {
        try {
          const re = new RegExp(config.regex);
          const match = trimmed.match(re);
          if (match) {
            const content = match[1] || match[0] || "";
            addMarkerItem(config, content.trim(), { raw: trimmed, line: lineNumber });
            return true;
          }
        } catch (e) {
          console.warn("Invalid regex for marker", config.id, e);
        }
        continue;
      }

      if (config.matchMode === "enclosure" && config.start && config.end) {
        const start = escapeRegExp(config.start);
        const end = escapeRegExp(config.end);
        const re = new RegExp(`${start}(.*?)${end}`, "g");
        let match = null;
        let found = false;
        while ((match = re.exec(trimmed)) !== null) {
          const content = (match[1] || "").trim();
          if (content) {
            addMarkerItem(config, content, { raw: trimmed, line: lineNumber });
            found = true;
          }
        }
        if (found) return true;
      }

      if (config.matchMode === "prefix" || config.start) {
        const prefix = config.start || "";
        if (!prefix) continue;
        const content = getPrefixContent(trimmed, prefix);
        if (content !== null) {
          addMarkerItem(config, content, { raw: trimmed, line: lineNumber });
          if (prefix.startsWith("/p")) {
            const seconds = parseFloat(content);
            if (!Number.isNaN(seconds)) {
              result.pauseSeconds += seconds;
              result.pauseItems.push({ seconds, raw: trimmed, line: lineNumber });
            }
          }
          return true;
        }
      }
    }
    return false;
  };

  const handleSingleLineBlocks = (trimmed, lineNumber, excludeId) => {
    for (const config of sortedBlocks) {
      if (excludeId && config.id === excludeId) continue;
      const startTag = config.start || "";
      const endTag = config.end || "";
      if (!startTag || !endTag) continue;
      if (trimmed.startsWith(startTag) && trimmed.endsWith(endTag) && trimmed.length > startTag.length + endTag.length) {
        const content = trimmed.slice(startTag.length, trimmed.length - endTag.length).trim();
        if (content) addMarkerItem(config, content, { raw: trimmed, line: lineNumber });
        return true;
      }
    }
    return false;
  };

  const flushBlock = () => {
    if (!activeBlock) return;
    const content = blockBuffer.join("\n").trim();
    if (content) {
      addMarkerItem(activeBlock, content, { raw: content, line: activeBlockLine });
    }
    activeBlock = null;
    blockBuffer = [];
    activeBlockLine = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (activeBlock) {
      const endTag = activeBlock.end || "";
      if (endTag && trimmed.startsWith(endTag)) {
        flushBlock();
      } else {
        const lineNumber = i + 1;
        const handled = handleSingleLineBlocks(trimmed, lineNumber, activeBlock.id) || handleInlineMarkers(trimmed, lineNumber);
        if (!handled) {
          blockBuffer.push(trimmed);
        }
      }
      continue;
    }

    let handled = false;

    for (const config of sortedBlocks) {
      const startTag = config.start || "";
      const endTag = config.end || "";
      if (!startTag) continue;

      if (endTag && trimmed.startsWith(startTag) && trimmed.endsWith(endTag) && trimmed.length > startTag.length + endTag.length) {
        const content = trimmed.slice(startTag.length, trimmed.length - endTag.length).trim();
        if (content) addMarkerItem(config, content, { raw: trimmed, line: i + 1 });
        handled = true;
        break;
      }

      if (trimmed.startsWith(startTag)) {
        const label = trimmed.slice(startTag.length).trim();
        activeBlock = config;
        blockBuffer = [];
        activeBlockLine = i + 1;
        if (label) blockBuffer.push(label);
        handled = true;
        break;
      }
    }

    if (handled) continue;

    if (!handled) {
      handled = handleInlineMarkers(trimmed, i + 1);
    }

    if (handled) continue;

    result.dialogueLines.push({ text: trimmed, line: i + 1 });
    result.counts.dialogueLines += 1;
    result.counts.dialogueChars += trimmed.replace(/\s/g, "").length;
  }

  if (activeBlock) flushBlock();

  result.durationMinutes = result.counts.dialogueChars / 200;

  return result;
}

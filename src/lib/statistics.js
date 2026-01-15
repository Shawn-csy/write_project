
/**
 * Core statistics logic for analyzing Screenplay AST.
 */
import { splitTitleAndBody } from "./parsers/titlePageParser.js";

/**
 * Calculates script statistics based on the AST.
 * @param {Array} nodes - The root nodes of the parsed AST.
 * @param {Array} markerConfigs - Optional configs to map layer IDs to names, if needed.
 * @param {Object} options - { wordCountMode: 'pure' | 'all' }
 * @returns {Object} The calculated statistics.
 */
export function calculateScriptStats(nodes, markerConfigs = [], options = {}) {
  // Initialize Defaults
  const defaults = {
    durationMinutes: 0,
    locations: [],
    sentences: {
      dialogue: {}, // { CharacterName: [sentences...] }
      action: [],
      sceneHeadings: [],
      sfx: [],
    },
    counts: {
      scenes: 0,
      nodes: 0,
      dialogueChars: 0,
      actionChars: 0,
      totalChars: 0
    },
    // Advanced Stats
    characterStats: [],
    timeframeDistribution: { INT: 0, EXT: 0, OTHER: 0 },
    customLayers: {}, // { LayerID: [content...] }
    dialogueRatio: 0,
    actionRatio: 0, 
    totalBlocks: 0
  };

  let nodeList = [];
  if (Array.isArray(nodes)) {
      nodeList = nodes;
  } else if (nodes && typeof nodes === 'object' && Array.isArray(nodes.children)) {
      // Handle Root Node input
      nodeList = nodes.children;
  } else {
      return defaults;
  }

  const result = JSON.parse(JSON.stringify(defaults)); // Deep clone safe for simple obj
  
  // Custom Layer Name Mapping
  const layerNames = {};
  if (markerConfigs) {
      markerConfigs.forEach(c => {
          layerNames[c.id] = c.name || c.id;
      });
  }

  const getText = (node) => node.text || node.content || "";

  // Helper to get ALL text recursively from a node
  const getRecursiveText = (node) => {
      let text = getText(node).trim();
      if (node.children && node.children.length) {
          text += "\n" + node.children.map(getRecursiveText).join("\n");
      }
      return text.trim();
  };

  function traverse(list) {
    for (const node of list) {
      result.counts.nodes++;
      result.totalBlocks++;

      switch (node.type) {
        case 'scene_heading':
          result.counts.scenes++;
          const loc = getText(node).trim();
          result.locations.push(loc);
          result.sentences.sceneHeadings.push(loc);
          
          // Timeframe Dist
          const upper = loc.toUpperCase();
          if (upper.startsWith('INT') || upper.includes('INT.')) result.timeframeDistribution.INT++;
          else if (upper.startsWith('EXT') || upper.includes('EXT.')) result.timeframeDistribution.EXT++;
          else result.timeframeDistribution.OTHER++;
          
          result.counts.totalChars += loc.length;
          break;

        case 'action':
          const actionText = getText(node).trim();
          if (actionText) {
            result.sentences.action.push(actionText);
            result.counts.actionChars += actionText.replace(/\s/g, '').length;
            result.counts.totalChars += actionText.length;
          }
          break;

        case 'speech': 
          const charName = (node.character || "UNKNOWN").trim();
          let speechText = getText(node).trim();
          
          // Use children text if available
          if ((!speechText && node.children) || (node.children && node.children.length > 0)) {
              speechText = node.children
                .filter(c => c.type !== 'parenthetical' && c.type !== 'character') // Filter out metadata
                .map(c => getText(c))
                .join(' ')
                .trim();
          }

          if (speechText) {
              if (!result.sentences.dialogue[charName]) {
                result.sentences.dialogue[charName] = [];
              }
              result.sentences.dialogue[charName].push(speechText);
              
              const len = speechText.replace(/\s/g, '').length;
              result.counts.dialogueChars += len;
              result.counts.totalChars += len;
          }
          break;

        case 'dual_dialogue':
            if (node.children && node.children.length) {
                traverse(node.children);
            } else {
                if (node.left) traverse([node.left]);
                if (node.right) traverse([node.right]);
            }
            return; // Children handled above

        case 'layer':
            // Custom Layer
            const layerId = node.layerType; 
            const layerName = layerNames[layerId] || layerId;
            const content = getRecursiveText(node);
            
            if (!result.customLayers[layerName]) {
                result.customLayers[layerName] = [];
            }
            if (content) result.customLayers[layerName].push(content);
            
            // Standard traverse to also count inner standard elements
            break;
            
        case 'sfx': 
            result.sentences.sfx.push(getText(node).trim());
            break;
      }

      if (node.children && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  }

  traverse(nodeList);

  // Post Calculations
  
  // 1. Character Stats
  result.characterStats = Object.entries(result.sentences.dialogue).map(([name, lines]) => ({
      name,
      count: lines.length,
      percentage: 0 // Calc below
  })).sort((a, b) => b.count - a.count);
  
  const totalLines = result.characterStats.reduce((sum, c) => sum + c.count, 0);
  if (totalLines > 0) {
      result.characterStats.forEach(c => c.percentage = Math.round((c.count / totalLines) * 100));
  }
  
  // 2. Ratios
  const totalContentChars = result.counts.dialogueChars + result.counts.actionChars;
  if (totalContentChars > 0) {
      result.dialogueRatio = Math.round((result.counts.dialogueChars / totalContentChars) * 100);
      result.actionRatio = Math.round((result.counts.actionChars / totalContentChars) * 100);
  }

  // 3. Duration
  // Mode: 'pure' (Dialogue / 200) vs 'all' (Total / 300?? Standard is ~200 words/min? )
  // User spec: "Pure Dialogue / 200".
  // Let's provide BOTH estimates or switch based on option.
  if (options.wordCountMode === 'all') {
      // Rough generic estimate: Content Chars / 300 (faster reading for action?) or sticking to 200?
      // 1 Page ~ 1000 chars? ~ 1 min.
      // Let's use 220 as a blended speed.
     result.durationMinutes = (result.counts.dialogueChars + result.counts.actionChars) / 250;
  } else {
      // Default Pure
      result.durationMinutes = result.counts.dialogueChars / 200;
  }
  
  // Also store dual stats for UI to toggle without re-calc
  result.estimates = {
      pure: result.counts.dialogueChars / 200,
      all: (result.counts.dialogueChars + result.counts.actionChars) / 300 // More conservative for action
  };

  return result;
}

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

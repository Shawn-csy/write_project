import Parsimmon from 'parsimmon';
import { Fountain } from 'fountain-js';

const P = Parsimmon;

// --- Dynamic Parser Generator ---

// Helper: Escape Regex special characters
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const createDynamicParsers = (configs = []) => {
    const parsers = {};

    configs.forEach(config => {
        // Only generate parsers for inline markers or block markers that have inline representation
        if (config.isBlock && config.type !== 'inline') return;

        const type = config.type || 'inline';
        const id = config.id || `custom-${Math.random().toString(36).substr(2, 9)}`;
        
        let parser;

        if (config.matchMode === 'regex' && config.regex) {
             try {
                 const re = new RegExp(config.regex);
                 parser = P.regex(re, 1).map(content => ({ type: 'highlight', id, content }));
             } catch (e) {
                 console.warn(`Invalid regex for marker ${config.label}:`, e);
             }
        } else if (config.matchMode === 'prefix' || (!config.end && config.start)) {
             // Prefix Mode: e.g. | Text
             const start = P.string(config.start);
             // Use regex to consume the rest of the node content
             parser = start.then(P.regex(/.*/)).map(content => ({ 
                 type: 'highlight', 
                 id, 
                 content: content.trim() 
             }));
        } else {
             // Enclosure Mode: e.g. { content }
             const startStr = config.start || '{';
             const endStr = config.end || '}';
             
             const start = P.string(startStr);
             const end = P.string(endStr);
             
             // Robust content parser using Regex lookahead
             // Matches any sequence of characters that does not start with endStr
             const escapedEnd = escapeRegExp(endStr);
             const contentRegex = new RegExp(`^(?:(?!${escapedEnd}).)*`);
             
             const safeContent = P.regex(contentRegex);

             parser = start.then(safeContent).skip(end).map(content => ({
                 type: 'highlight',
                 id,
                 content: content.trim()
             }));
        }

        if (parser) {
            parsers[id] = parser;
        }
    });
    
    return parsers;
};


// Legacy hardcoded parsers for backward compatibility if not in configs,
// OR we map standard markers to configs and inject them.
// Let's keep standard definitions as fallback or base.

// [Direction] or [sfx: ...]
const DirectionParser = P.string('[')
  .then(P.noneOf(']').atLeast(1).map(x => x.join('')))
  .skip(P.string(']'))
  .map(content => {
      if (content.match(/^sfx[:：]/i)) {
          return { type: 'sfx', content: content.replace(/^sfx[:：]\s*/i, '').trim() };
      }
      return { type: 'direction', content: content.trim() };
  });

// Note: Text parser must be dynamic to avoid consuming custom delimiters.
// We remove the static "Text" definition and move it inside parseInline.
// Or we create a dynamicText parser generator.

const createTextParser = (configs = []) => {
    // Collect all start characters from configs to exclude them from Text
    // Only exclude '[' by default because DirectionParser is hardcoded to use it.
    const startChars = new Set(['[']); 
    configs.forEach(c => {
        // Only exclude start char if this config generates an INLINE parser.
        const generatesParser = !(c.isBlock && c.type !== 'inline'); 
        
        if (generatesParser && c.start && c.start.length > 0) {
            startChars.add(c.start.charAt(0));
        }
    });
    
    const excluded = Array.from(startChars).join('');
    // Use noneOf to efficiently consume chunks of text that definitely aren't markers
    return P.noneOf(excluded).atLeast(1).map(x => ({ type: 'text', content: x.join('') }));
};

const mergeTextNodes = (nodes) => {
    if (!nodes || nodes.length === 0) return [];
    
    const merged = [];
    let currentText = null;

    nodes.forEach(node => {
        if (node.type === 'text') {
            if (currentText) {
                currentText.content += node.content;
            } else {
                currentText = { ...node }; // Clone
            }
        } else {
            if (currentText) {
                merged.push(currentText);
                currentText = null;
            }
            merged.push(node);
        }
    });

    if (currentText) {
        merged.push(currentText);
    }

    return merged;
};

export const parseInline = (text, configs = []) => {
    if (!text) return [];

    // 1. Build Dynamic Parsers
    // Prioritize by explicit 'priority' field (descending), then by functionality (Regex > others)
    const sortedConfigs = [...configs].sort((a, b) => {
        // Priority check: Higher number = higher priority
        const pA = a.priority || 0;
        const pB = b.priority || 0;
        if (pA !== pB) return pB - pA; // Descending

        // Tie-breaker: Regex is usually more specific than Enclosure
        if (a.matchMode === 'regex' && b.matchMode !== 'regex') return -1;
        if (a.matchMode !== 'regex' && b.matchMode === 'regex') return 1;
        
        return 0;
    });

    const dynamicParsers = [];
    const customParsers = createDynamicParsers(sortedConfigs);
    Object.values(customParsers).forEach(p => dynamicParsers.push(p));
    
    // 2. Build Dynamic Text Parser
    // It must exclude start chars of all markers to give them a chance to parse
    const DynamicText = createTextParser(configs);

    // 3. Assemble All Parsers
    const AllParsers = [
        ...dynamicParsers, // Custom configs should take precedence over standard DirectionParser
        DirectionParser, // Keep Direction as fallback if no custom rule matches
        DynamicText,
        // Fallback: If a char is excluded from Text (e.g. '[') but fails to match its specific parser 
        // (e.g. malformed direction), we must consume it as plain text to avoid infinite loops or empty results.
        P.any.map(c => ({ type: 'text', content: c }))
    ];

    const Parser = P.alt(...AllParsers).many();

    try {
        const result = Parser.parse(text).value;
        return mergeTextNodes(result);
    } catch (e) {
        console.error("Parse Error", e);
        return [{ type: 'text', content: text }];
    }
};

// Internal Helper for Whitespace detection
const matchWhitespace = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^[(（]\s*/, "").replace(/\s*[)）]$/, "");
  
  if (stripped === "長留白") return "long";
  if (stripped === "中留白") return "mid";
  if (stripped === "短留白") return "short";
  if (stripped === "留白") return "pure";
  return null;
};

const slugifyScene = (text = "", idx = 0) => {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return base || `scene-${idx + 1}`;
};

export const buildScriptAST = (tokens, markerConfigs = []) => {
    const root = { type: 'root', children: [] };
    const stack = [root];
    
    // Use provided configs strictly. No hidden defaults.
    const activeConfigs = markerConfigs || [];
    
    // Pre-compile Regex for Block Markers
    const blockMarkers = activeConfigs.filter(c => c.isBlock).map(config => {
        if (config.matchMode === 'regex' && config.regex) {
            try {
                // Determine Start/End from regex? 
                // Creating a block from a Single Regex line is tricky. 
                // Usually Regex Mode blocks are single-line actions anyway?
                // Or does the user provide Start Regular Expression and End Regular Expression?
                // Implementation Plan: If matchMode is regex, we assume the Regex defines a Single Line Enclosure Block.
                return {
                    ...config,
                    enclosureRegex: new RegExp(config.regex),
                    startRegex: null, // Regex mode doesn't support multiline start/end separation yet unless we add fields
                    endRegex: null
                };
            } catch (e) {
               console.warn("Invalid Regex for block", config.regex);
               return config;
            }
        }

        const escapedStart = escapeRegExp(config.start);
        const escapedEnd = escapeRegExp(config.end);

        // Smart Boundary: 
        // If delimiter ends with a Word char (e.g. "INT"), require space boundary to avoid partial match (INT vs INTERIOR)
        // If delimiter ends with Symbol (e.g. ">", "!", "."), allow immediate content (e.g. "<b>text" or "INT.Room")
        const startLastChar = config.start.slice(-1);
        const endLastChar = config.end.slice(-1);
        const startBoundary = /[a-zA-Z0-9_]/.test(startLastChar) ? '(?:\\s.*)?' : '(?:.*)?';
        const endBoundary = /[a-zA-Z0-9_]/.test(endLastChar) ? '(?:\\s.*)?' : '(?:.*)?';
        
        return {
            ...config,
            enclosureRegex: new RegExp(`^${escapedStart}\\s*(.+?)\\s*${escapedEnd}$`),
            startRegex: new RegExp(`^${escapedStart}${startBoundary}$`),
            endRegex: new RegExp(`^${escapedEnd}${endBoundary}$`)
        };
    });

    // Scene ID generation state
    const dup = new Map();
    let sceneIdx = 0;
    
    // Helper to get current container
    const current = () => stack[stack.length - 1];
    
    // Helper used for inline parsing within the loop
    const doParseInline = (txt) => parseInline(txt, activeConfigs);

    tokens.forEach(token => {
        // 1. Check if we need to close an active Speech block
        if (current().type === 'speech') {
            const isDialoguePart = token.type === 'parenthetical' || token.type === 'dialogue';
            if (!isDialoguePart) {
                stack.pop(); // Close speech
            }
        }
        
        // 2. Handle Action Tokens (Multi-line support for Markers)
        if (token.type === 'action') {
             const lines = token.text.split('\n');
             let contentBuffer = [];

             const flushBuffer = () => {
                 if (contentBuffer.length === 0) return;
                 const text = contentBuffer.join('\n');
                 const node = { 
                     type: 'action', 
                     text: text, 
                     inline: doParseInline(text)
                 };
                 current().children.push(node);
                 contentBuffer = [];
             };

             lines.forEach(rawLine => {
                 const text = rawLine.trim();
                 if (!text && contentBuffer.length > 0) {
                     // Empty line handling (preserve ?)
                 }

                 // A. Whitespace Detection
                 const wsKind = matchWhitespace(text);
                 if (wsKind) {
                     flushBuffer(); 
                     current().children.push({ type: 'whitespace', kind: wsKind });
                     return; 
                 }

                 // B. Marker Detection
                 let isMarker = false;
                 
                 for (const config of blockMarkers) {
                    // 1. Enclosure Match (Single Line or Smart Toggle)
                    const enclosureMatch = text.match(config.enclosureRegex);

                    if (enclosureMatch) {
                        flushBuffer();
                        isMarker = true;

                        // Smart Toggle: Treat Enclosure as a Switch (Open/Close)
                        if (config.smartToggle) {
                            // Check nesting
                            if (current().type === 'speech') stack.pop();

                            const parent = current();
                            const isSameLayer = parent.type === 'layer' && parent.layerType === config.id;

                            if (isSameLayer) {
                                stack.pop(); // Close
                            } else {
                                // Open
                                const content = enclosureMatch[1].trim();
                                const layer = { 
                                    type: 'layer', 
                                    layerType: config.id, 
                                    children: [], 
                                    label: content // Use content as label
                                };
                                current().children.push(layer);
                                stack.push(layer);
                            }
                        } else {
                            // Standard: Treat as Single Line Wrapped Content
                            const content = enclosureMatch[1].trim();
                            const layer = { 
                                type: 'layer', 
                                layerType: config.id, 
                                children: [
                                    { 
                                        type: 'action', 
                                        text: content, 
                                        inline: doParseInline(content) 
                                    }
                                ] 
                            };
                            current().children.push(layer);
                        }
                        break; 
                    }

                    const startMatch = text.match(config.startRegex);
                    const endMatch = text.match(config.endRegex);

                    // Toggle / Start / End
                    // startMatch and endMatch were already computed above
                    
                    const isStart = !!startMatch;
                    const isEnd = !!endMatch;

                    if (isStart || isEnd) {
                        console.log("Marker Detected:", text, isStart ? "START" : "", isEnd ? "END" : "");
                        flushBuffer(); // content before marker
                        isMarker = true;
                        
                        // Check if inside a speech buffer that needs flushing? 
                        // Actually existing logic handles speech pop below.
                        
                        let label = null;
                        if (isStart) {
                           // Use startRegex capture group if possible, else slice
                           // Our startRegex is ^...(\s.*)?$ -> group 1 matches args.
                           // Actually current startRegex is non-capturing group for args: (?:\\s.*)?
                           // So we rely on slicing. 
                           label = text.slice(config.start.length).trim();
                        }
                        
                        let endLabel = null;
                        if (isEnd) {
                           endLabel = text.slice(config.end.length).trim();
                        }

                        if (config.start === config.end) {
                           // Equal start/end: Toggle Logic (checked first usually via enclosure, but this handles pure toggle markers)
                           // ... (omitted for brevity, assume Enclosure/SmartToggle handles most cases now)
                           // However if we fall through here:
                           // If isStart && isEnd (e.g. "**") -> Toggle.
                            const parent = current();
                            const isSameLayer = parent.type === 'layer' && parent.layerType === config.id;
                            if (isSameLayer) {
                                // Close
                                if (endLabel) parent.endLabel = endLabel;
                                stack.pop();
                            } else {
                                // Open
                                const layer = { type: 'layer', layerType: config.id, children: [], label };
                                current().children.push(layer);
                                stack.push(layer);
                            }
                        } else {
                            if (isStart) {
                                // If inside a speech, we should probably close it to start a layer? 
                                // Or layer can be inside speech? Usually layers are top-level or wrap scenes.
                                // If layer starts, we push it.
                                const layer = { type: 'layer', layerType: config.id, children: [], label };
                                current().children.push(layer);
                                stack.push(layer);
                            } else if (isEnd) {
                                // If we are in a speech, pop it first to see if parent is the layer
                                if (current().type === 'speech') {
                                    stack.pop();
                                }
                                
                                const parent = current();
                                if (parent.type === 'layer' && parent.layerType === config.id) {
                                    if (endLabel) parent.endLabel = endLabel;
                                    stack.pop();
                                }
                            }
                        }
                        break;
                    }
                 }

                 if (isMarker) return;

                 // C. Regular Action Line (Buffer it)
                 contentBuffer.push(rawLine);
             });
             
             // Flush remaining
             flushBuffer();
             return; 
        }

        // 3. Handle Character -> Start Speech
        if (token.type === 'character') {
            // Start new speech
            const speech = {
                type: 'speech',
                character: token.text.trim(), 
                children: []
            };
            
            // Parse inline for character (e.g. "JANE (V.O.)")
            const node = { ...token, inline: doParseInline(token.text) };
            
            speech.children.push(node);
            current().children.push(speech);
            stack.push(speech);
            return;
        }

        // 4. Regular Tokens
        let node = { ...token };
        if (token.text) {
             if (['dialogue', 'parenthetical', 'scene_heading'].includes(token.type)) {
                 node.inline = doParseInline(token.text);

                 // Scene ID Logic
                 if (token.type === 'scene_heading') {
                     const label = token.text.trim();
                     const base = slugifyScene(label, sceneIdx);
                     const count = dup.get(base) || 0;
                     const id = count > 0 ? `${base}-${count + 1}` : base;
                     dup.set(base, count + 1);
                     node.id = id;
                     sceneIdx++;
                 }

             } else if (token.type === 'transition') {
                 node.inline = [{ type: 'text', content: token.text }];
             }
        }
        
        current().children.push(node);
    });

    return root;
};

export const splitTitleAndBody = (preprocessedText = "") => {
  if (!preprocessedText) return { titleLines: [], bodyText: "" };
  const lines = preprocessedText.split("\n");
  const firstLineIsTitle = /^\s*([^:]+):/.test(lines[0] || "");
  if (!firstLineIsTitle) {
      return { titleLines: [], bodyText: preprocessedText };
  }
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

export const parseScreenplay = (text = "", markerConfigs = []) => {
  const { titleLines, bodyText } = splitTitleAndBody(text);
  
  const fountain = new Fountain();
  const result = fountain.parse(bodyText || '', true);
  const tokens = result?.tokens || [];
  
  const ast = buildScriptAST(tokens, markerConfigs);
  
  const scenes = ast.children
    .filter(n => n.type === 'scene_heading')
    .map(n => ({ id: n.id, label: n.text }));

  return {
    titleLines,
    titleEntries: extractTitleEntries(titleLines),
    ast,
    scenes
  };
};

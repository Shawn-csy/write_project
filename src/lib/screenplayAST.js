
import { escapeRegExp } from './parsers/parserGenerators.js';
import { parseInline } from './parsers/inlineParser.js';
import { processDualLayers } from './optimizers/dualDialogueOptimizer.js';
import { splitTitleAndBody, extractTitleEntries } from './parsers/titlePageParser.js';
import { Fountain } from 'fountain-js';
import { 
    processAction, 
    processCharacter, 
    processDialogue, 
    processSceneHeading,
    slugifyScene
} from './ast/tokenProcessors.js';

export const buildScriptAST = (tokens, markerConfigs = []) => {
    if (!tokens || tokens.length === 0) return { type: 'root', children: [] };
    
    const root = { type: 'root', children: [] };
    const activeConfigs = markerConfigs || [];
    
    // Pre-compile Regex for Block Markers
    const blockMarkers = activeConfigs.filter(c => c.isBlock).map(config => {
        if (config.matchMode === 'regex' && config.regex) {
            try {
                return {
                    ...config,
                    enclosureRegex: new RegExp(config.regex),
                    startRegex: null,
                    endRegex: null
                };
            } catch (e) {
               console.warn("Invalid Regex for block", config.regex);
               return config;
            }
        }

        const escapedStart = escapeRegExp(config.start);
        const escapedEnd = escapeRegExp(config.end);

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

    const state = {
        stack: [root],
        dup: new Map(),
        sceneIdx: 0
    };
    state.current = () => state.stack[state.stack.length - 1];
    state.children = () => state.current().children;
    state.pushNode = (node) => state.children().push(node);

    // Patch: Fix forced characters (e.g. @123)
    const patchedTokens = [];
    let forcingDialogue = false;

    tokens.forEach(token => {
        let newToken = { ...token };
        const text = newToken.text ? newToken.text.trim() : "";

        // 0. Pre-check: Force Markers to Action
        // Any token that matches a start/end marker for a block should be action
        // This prevents Fountain from interpreting UPPERCASE MARKERS as Characters
        let isMarker = false;
        for (const config of blockMarkers) {
             if (config.startRegex && config.startRegex.test(text)) isMarker = true;
             else if (config.endRegex && config.endRegex.test(text)) isMarker = true;
             else if (config.enclosureRegex && config.enclosureRegex.test(text)) isMarker = true;
             
             if (isMarker) break;
        }

        if (isMarker) {
            newToken.type = 'action';
        }

        // Heuristic Helpers
        const isAction = newToken.type === 'action';
        const isForced = text.startsWith('@');
        
        // CJK Detection: Common CJK ranges
        const hasCJK = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
        // Short Name: usually 2-4 chars, rarely > 5 without title
        const isShort = text.length > 0 && text.length <= 6;
        // No Punctuation at end (names usually don't have periods/commas)
        // Check for common Chinese & English punctuation
        const hasPunctuation = /[。，、；：？！.!?,;:]$/.test(text);

        // Special Case: "Voice" / "音聲" usually implies a character even if formatting is weird
        const isVoice = text.includes('音聲');

        if (isVoice) {
             newToken.type = 'character';
             forcingDialogue = true;
        } else if (isAction && isForced) {
            newToken.type = 'character';
            newToken.text = text.replace(/^@/, '');
            forcingDialogue = true;
        } else if (isAction && hasCJK && isShort && !hasPunctuation && !text.includes('\n')) {
             // Implicit CJK Character Detection
             // If it's short, CJK, and no punctuation, treat as Character
             newToken.type = 'character';
             forcingDialogue = true;
        } else if (forcingDialogue && isAction && text && !isMarker) {
            newToken.type = 'dialogue';
        } else if (['character', 'scene_heading', 'transition'].includes(newToken.type) || (isAction && !text)) {
             if (newToken.type !== 'parenthetical') {
                 forcingDialogue = false;
             }
        }
        patchedTokens.push(newToken);
    });

    patchedTokens.forEach(token => {
        // 1. Check if we need to close an active Speech block
        if (state.current().type === 'speech') {
            const isDialoguePart = token.type === 'parenthetical' || token.type === 'dialogue';
            if (!isDialoguePart) {
                state.stack.pop(); 
            }
        }
        
        // 2. Dispatch
        const processors = {
            action: () => processAction(token, state, blockMarkers, activeConfigs),
            character: () => processCharacter(token, state, activeConfigs),
            dialogue: () => processDialogue(token, state, blockMarkers, activeConfigs),
            scene_heading: () => processSceneHeading(token, state, activeConfigs),
            parenthetical: () => state.pushNode({ 
                ...token, 
                inline: parseInline(token.text, activeConfigs),
                lineStart: token.lineStart,
                lineEnd: token.lineEnd
            }),
            transition: () => state.pushNode({ 
                ...token, 
                inline: [{ type: 'text', content: token.text }],
                lineStart: token.lineStart,
                lineEnd: token.lineEnd
            }),
            centered: () => state.pushNode({ 
                ...token, 
                inline: parseInline(token.text, activeConfigs),
                lineStart: token.lineStart,
                lineEnd: token.lineEnd
            })
        };

        const processor = processors[token.type];
        if (processor) {
            processor();
        } else {
            state.pushNode(token);
        }
    });

    // Post-Process
    processDualLayers(root);

    return root;
};

const attachLineInfo = (tokens = [], bodyText = "") => {
  const lines = (bodyText || "").split("\n");
  let searchStart = 0;

  return tokens.map((token) => {
    if (!token?.text) return token;
    const tokenLines = token.text.split("\n");
    let found = -1;

    for (let i = searchStart; i <= lines.length - tokenLines.length; i++) {
      let match = true;
      for (let j = 0; j < tokenLines.length; j++) {
        if (lines[i + j].trim() !== tokenLines[j].trim()) {
          match = false;
          break;
        }
      }
      if (match) {
        found = i;
        break;
      }
    }

    if (found === -1) return token;

    const lineStart = found + 1;
    const lineEnd = lineStart + tokenLines.length - 1;
    searchStart = found + tokenLines.length;
    return { ...token, lineStart, lineEnd };
  });
};

export const parseScreenplay = (text = "", markerConfigs = []) => {
  const { titleLines, bodyText } = splitTitleAndBody(text);
  
  const fountain = new Fountain();
  const result = fountain.parse(bodyText || '', true);
  const tokens = attachLineInfo(result?.tokens || [], bodyText || "");
  
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


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
        if (newToken.type === 'action' && newToken.text && newToken.text.trim().startsWith('@')) {
            newToken.type = 'character';
            newToken.text = newToken.text.trim().replace(/^@/, '');
            forcingDialogue = true;
        } else if (forcingDialogue && newToken.type === 'action' && newToken.text && newToken.text.trim()) {
            newToken.type = 'dialogue';
        } else if (['character', 'scene_heading', 'transition'].includes(newToken.type) || (newToken.type === 'action' && !newToken.text.trim())) {
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
                inline: parseInline(token.text, activeConfigs) 
            }),
            transition: () => state.pushNode({ 
                ...token, 
                inline: [{ type: 'text', content: token.text }] 
            }),
            centered: () => state.pushNode({ 
                ...token, 
                inline: parseInline(token.text, activeConfigs) 
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

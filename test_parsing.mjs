
import { parseScreenplay } from './src/lib/screenplayAST.js';

// Mock Configs
const markerConfigs = [
  {
    id: 'emotion',
    label: 'Emotion',
    start: '/e',
    end: '',
    type: 'marker',
    isBlock: true, // Prefix act as block/layer
    matchMode: 'enclosure', 
    // Usually prefix rules are implemented as start/end empty or specific logic?
    // Let's assume user set it up as Block rule with Start: /e, End: (empty or newline)
    // Actually, in `tokenProcessors.js`:
    // const startBoundary = /[a-zA-Z0-9_]/.test(startLastChar) ? '(?:\\s.*)?' : '(?:.*)?';
    // It creates startRegex: ^\/e(?:.*)?$ 
    // And endRegex: ^(?:.*)?$ (if end is empty?) -> No, empty end string logic?
    
    // User said "/e" is the rule.
    // If it's a prefix rule, usually it's `isBlock: true`, `start: '/e'`, `end: ''` (or it's just a one-line block?)
    // Let's check how blockMarkers are built in `screenplayAST.js`.
    // If config.end is empty string, regex might be weird.
    // But usually for "Prefix", the user might use "Start: /e", "End: /e" (generic toggle)?
    // OR "Start: /e", "End: " (empty)?
    
    // Wait, the user said "Using /e effect is AFTER it rules".
    // This implies it consumes the line.
    
    // Let's mimic a likely setup:
    // start: '/e', end: '/e' (Toggle) OR
    // start: '/e', isLine: true? (We don't see isLine logic in processAction, just start/end match).
    
    // Actually, `processAction` checks:
    // const isStart = !!startMatch;
    // const isEnd = !!endMatch;
    
    // If I use start='/e', end='', `escapeRegExp` of '' is ''.
    // `endRegex` becomes `^(?:.*)?$`. Matches EVERYTHING.
    // That would mean every line is an end marker? That seems wrong.
    
    // Let's assume the user set: Start='/e', End='/e' (Toggle Mode for line?)
    // Or maybe the system handles single-line prefix differently?
    // Let's look at `screenplayAST.js` logic again.
    
    // "startBoundary" logic: `(?:.*)?` means it matches the rest of the line.
    
    // Force isStart path (Prefix)
    enclosureRegex: null, // Disable enclosure match
    startRegex: new RegExp('^/e'), // Match prefix
    endRegex: new RegExp('^$'), // Match nothing?
  },
  {
      id: 'italic_custom',
      label: 'Italic',
      start: '//',
      end: '//',
      type: 'style',
      isBlock: false, // INLINE
      matchMode: 'enclosure',
      style: { fontStyle: 'italic' }
  }
];

const text = `/e笑 //身體湊近//`; // No newline to be safe? Or simple string.

console.log("--- Testing Parse (Forced Prefix) ---");
const { ast } = parseScreenplay(text, markerConfigs);

// Dig into AST
const layer = ast.children.find(n => n.type === 'layer');
if (layer) {
    console.log("Layer Found:", layer.layerType);
    console.log("Label Raw:", layer.label);
    console.log("Inline Label Nodes:", JSON.stringify(layer.inlineLabel, null, 2));
} else {
    console.log("No Layer Found. AST Children:", JSON.stringify(ast.children, null, 2));
}


import { parseInline } from './src/lib/screenplayAST.js';

// Mock Configs reflecting SettingsContext defaults
const mockConfigs = [
    { 
        id: 'sound', label: '效果音', start: '{{', end: '}}', isBlock: true, type: 'block', style: { fontWeight: 'bold', color: '#eab308' } 
    },
    { 
        id: 'paren', 
        label: '括號與距離', 
        start: '(', 
        end: ')', 
        type: 'inline', 
        matchMode: 'enclosure', 
        keywords: ['V.O.', 'O.S.'], 
        style: { color: '#f97316' }, 
        dimIfNotKeyword: true,       
        showDelimiters: true
    },
    { 
        id: 'brace', 
        label: '花括號', 
        start: '{', 
        end: '}', 
        type: 'inline', 
        matchMode: 'enclosure', 
        style: { color: '#f97316' }, 
        showDelimiters: true
    },
    { 
        id: 'pipe', 
        label: '紅字備註', 
        start: '|', 
        end: '', 
        type: 'inline', 
        matchMode: 'prefix', 
        style: { color: '#ef4444' } 
    },
];

console.log('--- Testing (asd) ---');
const resParen = parseInline('(asd)', mockConfigs);
console.log(JSON.stringify(resParen, null, 2));

console.log('\n--- Testing {asd} ---');
const resBrace = parseInline('{asd}', mockConfigs);
console.log(JSON.stringify(resBrace, null, 2));

console.log('\n--- Testing [asd] (Direction) ---');
const resDir = parseInline('[asd]', mockConfigs);
console.log(JSON.stringify(resDir, null, 2));

console.log('\n--- Testing | asd (Pipe) ---');
const resPipe = parseInline('| asd', mockConfigs);
console.log(JSON.stringify(resPipe, null, 2));


import { parseScreenplay } from './src/lib/screenplayAST.js';

const script = `
//z test

asd
{asd}
(asd)
[asd]

//z test
`;

const configs = [
    { id: 'custom_z', start: '//z', end: '//z', isBlock: true, type: 'block' }
];

console.log('--- Parsing Script with custom block //z ---');
const result = parseScreenplay(script, configs);

// Helper to print AST hierarchy
function printAST(node, depth = 0) {
    const indent = '  '.repeat(depth);
    if (node.type === 'layer') {
        console.log(`${indent}Layer [${node.layerType}]`);
    } else if (node.type === 'speech') {
        console.log(`${indent}Speech ${node.character}`);
    } else if (node.type === 'action') {
        console.log(`${indent}Action: ${node.text.substring(0, 20)}...`);
    } else {
        console.log(`${indent}${node.type}`);
    }
    
    if (node.children) {
        node.children.forEach(c => printAST(c, depth + 1));
    }
}

printAST(result.ast);

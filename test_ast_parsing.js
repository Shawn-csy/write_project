
import { buildScriptAST } from './src/lib/screenplayAST.js';
// Mock Fountain tokens since we can't easily import fountain-js in this environment without ESM setup issues potentially
// The user's input:
// %%blue%%
// {asd}
// [SFX:asd]
// zxdasds
// %%blue%%

// Fountain-js likely produces:
// Action token with text: "%%blue%%\n{asd}\n[SFX:asd]\nzxdasds\n%%blue%%"

const mockTokens = [
  {
    type: 'action',
    text: "%%blue%%\n{asd}\n[SFX:asd]\nzxdasds\n%%blue%%"
  }
];

const markerConfigs = [
  { 
      id: 'blueblock', 
      label: 'BlueBlock', 
      start: '%%blue%%', 
      end: '%%blue%%', 
      isBlock: true, 
      style: { color: 'blue', fontWeight: 'bold' } 
  }
];

console.log("--- Testing Parser Logic ---");
const ast = buildScriptAST(mockTokens, markerConfigs);

function printAST(node, depth = 0) {
    const indent = "  ".repeat(depth);
    let output = `${indent}${node.type}`;
    if (node.layerType) output += ` (Layer: ${node.layerType})`;
    if (node.text) output += ` Text: "${node.text}"`;
    if (node.content) output += ` Content: "${node.content}"`;
    console.log(output);
    if (node.children) {
        node.children.forEach(c => printAST(c, depth + 1));
    }
}

printAST(ast);

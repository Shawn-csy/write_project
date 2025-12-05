const fs = require('fs');
const text = fs.readFileSync('src/scripts/活俠傳/27_留學首日.fountain','utf8');
const lines = (text || '').split('\n');
const entries = [];
let current = null;
for (const raw of lines) {
  if (!raw.trim()) break;
  const match = raw.match(/^(\s*)([^:]+):(.*)$/);
  if (match) {
    const [, indent, key, rest] = match;
    const val = rest.trim();
    current = { key: key.trim(), indent: indent.length, values: val ? [val] : [] };
    entries.push(current);
  } else if (current) {
    const continuation = raw.trim();
    if (continuation) current.values.push(continuation);
  }
}
console.log(entries);

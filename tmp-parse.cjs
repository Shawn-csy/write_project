const fs = require('fs');
const { Fountain } = require('./node_modules/fountain-js/dist/index.js');
const text = fs.readFileSync('src/scripts/活俠傳/27_留學首日.fountain','utf8');
const f = new Fountain();
const r = f.parse(text, true);
console.log({title:r.title, titlePage:!!r.html.title_page, titlePageHtml: r.html.title_page, tokens: r.tokens.filter(t=>t.is_title).map(t=>({type:t.type,text:t.text}))});

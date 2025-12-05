const fs = require('fs');
const { Fountain } = require('./node_modules/fountain-js/dist/index.js');
const text = fs.readFileSync('src/scripts/活俠傳/27_留學首日.fountain','utf8');
const f = new Fountain();
const result = f.parse(text, true);

const parsed = {
  titlePage: result?.html?.title_page || '',
  titleName: result?.title || '',
  tokens: result?.tokens || [],
};

const rawTitleEntries = (() => {
  if (!text) return [];
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
  return entries;
})();

const tokenTitleEntries = (() => {
  const entries = [];
  const titleTokens = (parsed.tokens || []).filter((t) => t.is_title);
  titleTokens.forEach((token) => {
    const lines = (token.text || '').split('\n');
    if (!lines.length) return;
    const first = lines.shift();
    entries.push({
      key: token.type.replace(/_/g, ' '),
      indent: 0,
      values: [first?.trim() || ''].filter(Boolean),
    });
    let current = null;
    lines.forEach((raw) => {
      if (!raw.trim()) return;
      const match = raw.match(/^(\s*)([^:]+):(.*)$/);
      if (match) {
        const [, indent, key, rest] = match;
        const val = rest.trim();
        current = { key: key.trim(), indent: indent.length, values: val ? [val] : [] };
        entries.push(current);
      } else if (current) {
        current.values.push(raw.trim());
      }
    });
  });
  return entries;
})();

const titleEntries = (() => {
  const knownKeys = new Set(['title','credit','author','authors','contact','copyright','date','draft_date','draft date','notes','revision','source','cc']);
  const existingKeys = new Set(tokenTitleEntries.map((e) => e.key.toLowerCase()));
  const customFromRaw = rawTitleEntries.filter((e) => {
    const key = e.key.toLowerCase();
    return !knownKeys.has(key) && !existingKeys.has(key);
  });
  return [...tokenTitleEntries, ...customFromRaw];
})();

const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const titlePage = (() => {
  const baseHtml = parsed.titlePage?.trim() || '';
  if (!titleEntries.length && !baseHtml) return { html: '', title: '', has: false };
  const knownKeys = new Set(['title','credit','author','authors','contact','copyright','date','draft_date','draft date','notes','revision','source']);
  const renderEntries = (entries) => entries.map((e)=>{
    const margin = e.indent>0 ? ` style="margin-left:${Math.min(e.indent/2,8)}rem"` : '';
    const values = e.values && e.values.length>0 ? e.values.map((v)=>escapeHtml(v)) : [];
    const isTitle = e.key.toLowerCase() === 'title';
    const value = values.length>0 ? values.join(isTitle ? ' ' : '<br />') : '';
    if (isTitle) return `<h1>${value}</h1>`;
    return `<p class="title-field"${margin}><strong>${escapeHtml(e.key)}:</strong> ${value}</p>`;
  }).join('');
  const customEntries = titleEntries.filter((e) => !knownKeys.has(e.key.toLowerCase()));
  const wrapperStart = `<div class="title-page">`;
  const wrapperEnd = `</div>`;
  let html = '';
  if (baseHtml) {
    html = `${wrapperStart}${baseHtml}${renderEntries(customEntries)}${wrapperEnd}`;
  } else {
    html = `${wrapperStart}${renderEntries(titleEntries)}${wrapperEnd}`;
  }
  const titleEntry = titleEntries.find((e) => e.key.toLowerCase() === 'title');
  const titleText = parsed.titleName?.trim() || (titleEntry?.values || []).join(' ');
  return { html, title: titleText, has: Boolean(html.trim()) };
})();

console.log('\n---- HTML ----\n', titlePage.html);

import { useEffect, useMemo } from 'react';
import { Fountain } from 'fountain-js';

function ScriptViewer({
  text,
  filterCharacter,
  focusMode,
  focusEffect = 'hide',
  onCharacters,
  onTitle,
  onTitleName,
  onHasTitle,
  onRawHtml,
  theme,
  fontSize = 14,
}) {
  // 解析 Fountain 文字
  const parsed = useMemo(() => {
    const fountain = new Fountain();
    const result = fountain.parse(text || '', true);
    return {
      script: result?.html?.script || '',
      titlePage: result?.html?.title_page || '',
      titleName: result?.title || '',
      tokens: result?.tokens || [],
    };
  }, [text]);

  // 抽取標題區塊為 entry 陣列，保留縮排，所有 key 都獨立
  const titleEntries = useMemo(() => {
    if (!text) return [];
    const lines = (text || '').split('\n');
    const entries = [];
    let current = null;

    for (const raw of lines) {
      if (!raw.trim()) break; // 標題頁到第一個空行結束

      const match = raw.match(/^(\s*)([^:]+):(.*)$/);
      if (match) {
        const [, indent, key, rest] = match;
        const value = rest.trim();
        current = {
          key: key.trim(),
          indent: indent.length,
          values: value ? [value] : [],
        };
        entries.push(current);
      } else if (current) {
        const continuation = raw.trim();
        if (continuation) current.values.push(continuation);
      }
    }

    return entries;
  }, [text]);

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // 以 fountain 標準欄位為主，再附加自訂欄位（不覆蓋）
  const titlePage = useMemo(() => {
    const baseHtml = parsed.titlePage?.trim() || '';
    if (!titleEntries.length && !baseHtml) return { html: '', title: '', has: false };

    const knownKeys = new Set([
      'title',
      'credit',
      'author',
      'authors',
      'contact',
      'copyright',
      'date',
      'draft_date',
      'draft date',
      'notes',
      'revision',
      'source',
    ]);

    const renderEntries = (entries) =>
      entries
        .map((e) => {
          const margin =
            e.indent > 0 ? ` style="margin-left:${Math.min(e.indent / 2, 8)}rem"` : '';
          const values = e.values && e.values.length > 0 ? e.values.map((v) => escapeHtml(v)) : [];
          const isTitle = e.key.toLowerCase() === 'title';
          const value = values.length > 0 ? values.join(isTitle ? ' ' : '<br />') : '';
          if (isTitle) {
            return `<h1>${value}</h1>`;
          }
          return `<p class="title-field"${margin}><strong>${escapeHtml(e.key)}:</strong> ${value}</p>`;
        })
        .join('');

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

    return {
      html,
      title: titleText,
      has: Boolean(html.trim()),
    };
  }, [parsed.titlePage, parsed.titleName, titleEntries]);

  // 取得角色列表（HTML 解析 + 原始文字雙保險）
  useEffect(() => {
    if (!parsed.script && !text) return;
    const characters = new Set();

    // 從 HTML 抓 .character
    if (parsed.script) {
      const doc = new DOMParser().parseFromString(parsed.script, 'text/html');
      doc.querySelectorAll('.character').forEach((node) => {
        const name = node.textContent?.trim();
        if (name) characters.add(name.toUpperCase());
      });
      doc.querySelectorAll('.dialogue h4').forEach((node) => {
        const name = node.textContent?.trim();
        if (name) characters.add(name.toUpperCase());
      });
    }

    // 解析標題欄位：Chart/Character/Characters: A,B,C
    (text || '')
      .split('\n')
      .forEach((line) => {
        const m = line.match(/^\s*(chart|character|characters)\s*:\s*(.+)$/i);
        if (m) {
          m[2]
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
            .forEach((c) => characters.add(c.toUpperCase()));
        }
      });

    // 從原始 Fountain 文字嘗試抓角色名（簡易判斷：全大寫且長度適中，排除場景/轉場）
    (text || '')
      .split('\n')
      .map((l) => l.trim())
      .forEach((line) => {
        const isCandidate =
          line &&
          line === line.toUpperCase() &&
          line.length <= 32 &&
          /[A-Z]/.test(line) &&
          !/^INT\.|^EXT\.|^EST\./.test(line) &&
          !/^FADE/.test(line) &&
          !/TO:$/.test(line) &&
          !line.includes('--');
        if (isCandidate) {
          characters.add(line.toUpperCase());
        }
      });

    onCharacters?.(Array.from(characters).sort());
  }, [parsed.script, text, onCharacters]);

  // 回傳標題頁 HTML 給父層顯示
  useEffect(() => {
    const html = titlePage.has ? titlePage.html : '';
    const hasTitle = titlePage.has;
    onHasTitle?.(hasTitle);
    onTitle?.(html);
    if (hasTitle) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const h1 = doc.querySelector('h1');
      const h2 = doc.querySelector('h2');
      const titleText = titlePage.title?.trim() || h1?.textContent?.trim() || h2?.textContent?.trim() || '';
      onTitleName?.(titleText);
    } else {
      onTitleName?.('');
    }
  }, [titlePage, onTitle, onTitleName, onHasTitle]);

  useEffect(() => {
    onRawHtml?.(parsed.script || '');
  }, [parsed.script, onRawHtml]);

  // 依角色過濾內容
  const filteredHtml = useMemo(() => {
    // 不選角色或未開啟「順讀模式」時，直接顯示原文
    if (!filterCharacter || filterCharacter === '__ALL__' || !focusMode) return parsed.script;
    const doc = new DOMParser().parseFromString(parsed.script, 'text/html');
    const target = filterCharacter.toUpperCase();

    // 工具：處理一組角色節點與其後對白
    const handleBundle = (isTarget, nodes) => {
      if (focusEffect === 'hide') {
        if (!isTarget) nodes.forEach((n) => n.remove());
      } else {
        nodes.forEach((n) => {
          if (isTarget) {
            n.classList.add('highlight');
          } else {
            n.classList.add('muted');
          }
        });
      }
    };

    // 結構 1：.character + dialogue/parenthetical
    const characters = Array.from(doc.querySelectorAll('.character'));
    characters.forEach((charNode) => {
      const name = charNode.textContent?.trim().toUpperCase();
      const isTarget = name && name === target;
      const bundle = [charNode];
      let sibling = charNode.nextElementSibling;
      while (
        sibling &&
        (sibling.classList.contains('dialogue') || sibling.classList.contains('parenthetical'))
      ) {
        bundle.push(sibling);
        sibling = sibling.nextElementSibling;
      }
      handleBundle(isTarget, bundle);
    });

    // 結構 2：div.dialogue > h4 + p
    doc.querySelectorAll('.dialogue').forEach((dlg) => {
      const h4 = dlg.querySelector('h4');
      const name = h4?.textContent?.trim().toUpperCase();
      const isTarget = name && name === target;
      handleBundle(isTarget, [dlg]);
    });

    return doc.body.innerHTML;
  }, [parsed.script, filterCharacter, focusMode, focusEffect]);

  return (
    <article
      className={`screenplay ${theme === 'dark' ? 'screenplay-dark' : 'screenplay-light'}`}
      dangerouslySetInnerHTML={{ __html: filteredHtml }}
    />
  );
}

export default ScriptViewer;

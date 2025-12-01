import { useEffect, useMemo, useRef } from 'react';
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
  const colorCache = useRef(new Map());
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

  // 解析標題行（原文字，直到第一個空行）
  const rawTitleEntries = useMemo(() => {
    if (!text) return [];
    const lines = (text || '').split('\n');
    const entries = [];
    let current = null;

    for (const raw of lines) {
      if (!raw.trim()) break; // 標題頁到第一個空行結束
      const match = raw.match(/^(\s*)([^:]+):(.*)$/);
      if (match) {
        const [, indent, key, rest] = match;
        const val = rest.trim();
        current = {
          key: key.trim(),
          indent: indent.length,
          values: val ? [val] : [],
        };
        entries.push(current);
      } else if (current) {
        const continuation = raw.trim();
        if (continuation) current.values.push(continuation);
      }
    }
    return entries;
  }, [text]);

  // 從 fountain tokens 取得官方欄位並拆出額外行
  const tokenTitleEntries = useMemo(() => {
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
          current = {
            key: key.trim(),
            indent: indent.length,
            values: val ? [val] : [],
          };
          entries.push(current);
        } else if (current) {
          current.values.push(raw.trim());
        }
      });
    });

    return entries;
  }, [parsed.tokens]);

  // 合併官方欄位與自訂欄位（避免自訂覆蓋官方）
  const titleEntries = useMemo(() => {
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
      'cc', // fountain-js 會把 CC 欄位標成 cc
    ]);

    const existingKeys = new Set(tokenTitleEntries.map((e) => e.key.toLowerCase()));
    const customFromRaw = rawTitleEntries.filter((e) => {
      const key = e.key.toLowerCase();
      return !knownKeys.has(key) && !existingKeys.has(key);
    });
    return [...tokenTitleEntries, ...customFromRaw];
  }, [tokenTitleEntries, rawTitleEntries]);

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

  // 取得角色列表（僅依 @角色 定義）
  useEffect(() => {
    if (!text) {
      onCharacters?.([]);
      return;
    }
    const characters = new Set();
    (text || '')
      .split('\n')
      .forEach((line) => {
        const m = line.match(/^\s*@\s*([^\s].*?)\s*$/);
        if (m) {
          const name = m[1].trim();
          if (name) characters.add(name.toUpperCase());
        }
      });
    onCharacters?.(Array.from(characters).sort());
  }, [text, onCharacters]);

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
    const doc = new DOMParser().parseFromString(parsed.script, 'text/html');

    const getGray = (name) => {
      if (!name) return 'hsl(0 0% 50%)';
      const key = name.toUpperCase();
      if (colorCache.current.has(key)) return colorCache.current.get(key);
      const palette = [
        'hsl(0 0% 24%)',
        'hsl(0 0% 32%)',
        'hsl(0 0% 40%)',
        'hsl(0 0% 48%)',
        'hsl(0 0% 56%)',
        'hsl(0 0% 64%)',
        'hsl(0 0% 72%)',
        'hsl(0 0% 80%)',
      ];
      const idx = colorCache.current.size % palette.length;
      const color = palette[idx];
      colorCache.current.set(key, color);
      return color;
    };

    if (!focusMode || !filterCharacter || filterCharacter === '__ALL__') {
      // 一般模式：僅加上淡線提示，不改變內容
      const markBundle = (nodes) => {
        const name = nodes?.[0]?.textContent?.trim();
        const color = getGray(name);
        nodes.forEach((n) => {
          n.classList.add('character-block');
          n.style.setProperty('--char-color', color);
          n.style.setProperty('--char-color-tint', color);
        });
      };

      const characters = Array.from(doc.querySelectorAll('.character'));
      characters.forEach((charNode) => {
        const bundle = [charNode];
        let sibling = charNode.nextElementSibling;
        while (
          sibling &&
          (sibling.classList.contains('dialogue') || sibling.classList.contains('parenthetical'))
        ) {
          bundle.push(sibling);
          sibling = sibling.nextElementSibling;
        }
        markBundle(bundle);
      });

      doc.querySelectorAll('.dialogue').forEach((dlg) => {
        const h4 = dlg.querySelector('h4');
        if (!h4) return;
        markBundle([dlg]);
      });

      return doc.body.innerHTML;
    }

    // 順讀模式：維持原本高亮/淡化邏輯
    const target = filterCharacter.toUpperCase();

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

    doc.querySelectorAll('.dialogue').forEach((dlg) => {
      const h4 = dlg.querySelector('h4');
      const name = h4?.textContent?.trim().toUpperCase();
      const isTarget = name && name === target;
      handleBundle(isTarget, [dlg]);
    });

    return doc.body.innerHTML;
  }, [parsed.script, filterCharacter, focusMode, focusEffect]);

  useEffect(() => {
    colorCache.current = new Map();
  }, [text]);

  return (
    <article
      className={`screenplay ${theme === 'dark' ? 'screenplay-dark' : 'screenplay-light'}`}
      dangerouslySetInnerHTML={{ __html: filteredHtml }}
    />
  );
}

export default ScriptViewer;

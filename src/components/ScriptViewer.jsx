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
  onTitleNote,
  onHasTitle,
  onRawHtml,
  onScenes,
  scrollToScene,
  theme,
  fontSize = 14,
}) {
  const colorCache = useRef(new Map());
  const BLANK_LONG = '__SCREENPLAY_BLANK_LONG__';
  const BLANK_SHORT = '__SCREENPLAY_BLANK_SHORT__';
  const matchWhitespaceCommand = (line) => {
    const trimmed = (line || '').trim();
    if (!trimmed) return null;
    const stripped = trimmed
      .replace(/^[(（]\s*/, '')
      .replace(/\s*[)）]$/, '');
    if (stripped === '長留白') return 'long';
    if (stripped === '短留白') return 'short';
    return null;
  };

  const preprocessText = useMemo(() => {
    const raw = text || '';
    const lines = raw.split('\n');
    const output = [];
    lines.forEach((line) => {
      const kind = matchWhitespaceCommand(line);
      if (kind === 'long') {
        output.push(BLANK_LONG, BLANK_LONG); // 使用占位符避免破壞對話解析
      } else if (kind === 'short') {
        output.push(BLANK_SHORT);
      } else {
        output.push(line);
      }
    });
    return output.join('\n');
  }, [text]);

  const slugifyScene = (text = '', idx = 0) => {
    const base = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return base || `scene-${idx + 1}`;
  };

  // 分離標題區與正文：第一個空行之後視為正文
  const { titleLines, bodyText } = useMemo(() => {
    if (!preprocessText) return { titleLines: [], bodyText: '' };
    const lines = (preprocessText || '').split('\n');
    const blankIdx = lines.findIndex((line) => !line.trim());
    if (blankIdx === -1) {
      return { titleLines: lines, bodyText: '' };
    }
    return {
      titleLines: lines.slice(0, blankIdx),
      bodyText: lines.slice(blankIdx + 1).join('\n'),
    };
  }, [preprocessText]);

  // 僅解析正文，避免自訂標題欄位被渲染到劇本文字
  const parsedBody = useMemo(() => {
    const fountain = new Fountain();
    const result = fountain.parse(bodyText || '', true);
    return {
      script: result?.html?.script || '',
      tokens: result?.tokens || [],
    };
  }, [bodyText]);

  const sceneList = useMemo(() => {
    const scenes = [];
    const dup = new Map();
    (parsedBody.tokens || [])
      .filter((t) => t.type === 'scene_heading' && t.text)
      .forEach((t, idx) => {
        const label = t.text.trim();
        const base = slugifyScene(label, idx);
        const count = dup.get(base) || 0;
        const id = count > 0 ? `${base}-${count + 1}` : base;
        dup.set(base, count + 1);
        scenes.push({ id, label });
      });
    return scenes;
  }, [parsedBody.tokens]);

  // 解析標題行（原文字，直到第一個空行）
  const rawTitleEntries = useMemo(() => {
    if (!titleLines.length) return [];
    const entries = [];
    let current = null;

    for (const raw of titleLines) {
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
  }, [titleLines]);

  const titleEntries = rawTitleEntries;

  const escapeHtml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // 簡易 inline 樣式處理（粗體/斜體/底線）
  const formatInline = (str = '') => {
    let html = escapeHtml(str);
    html = html.replace(/\*\*(.+?)\*\*/g, '<span class="bold">$1</span>');
    html = html.replace(/\*(.+?)\*/g, '<span class="italic">$1</span>');
    html = html.replace(/_(.+?)_/g, '<span class="underline">$1</span>');
    return html;
  };

  // 以 fountain 標準欄位為主，再附加自訂欄位（不覆蓋）
  const titlePage = useMemo(() => {
    if (!titleEntries.length) return { html: '', title: '', has: false };

    const renderEntries = (entries) =>
      entries
        .map((e) => {
          const margin =
            e.indent > 0 ? ` style="margin-left:${Math.min(e.indent / 2, 8)}rem"` : '';
          const values =
            e.values && e.values.length > 0 ? e.values.map((v) => formatInline(v)) : [];
          const isTitle = e.key.toLowerCase() === 'title';
          const value = values.length > 0 ? values.join(isTitle ? ' ' : '<br />') : '';
          if (isTitle) {
            return `<h1>${value}</h1>`;
          }
          return `<p class="title-field"${margin}><strong>${escapeHtml(e.key)}:</strong> ${value}</p>`;
        })
        .join('');

    const wrapperStart = `<div class="title-page">`;
    const wrapperEnd = `</div>`;

    const html = `${wrapperStart}${renderEntries(titleEntries)}${wrapperEnd}`;

    const titleEntry = titleEntries.find((e) => e.key.toLowerCase() === 'title');
    const titleText = (titleEntry?.values || []).join(' ');
    const noteEntry = titleEntries.find((e) => e.key.toLowerCase() === 'note');
    const noteText = (noteEntry?.values || []).join(' ');

    return {
      html,
      title: titleText,
      note: noteText,
      has: Boolean(html.trim()),
    };
  }, [titleEntries]);

  // 取得角色列表（從解析後 tokens）
  useEffect(() => {
    if (!parsedBody.tokens.length) {
      onCharacters?.([]);
      return;
    }
    const characters = new Set(
      (parsedBody.tokens || [])
        .filter((t) => t.type === 'character' && t.text)
        .map((t) => t.text.trim().toUpperCase())
        .filter(Boolean)
    );
    onCharacters?.(Array.from(characters).sort());
  }, [parsedBody.tokens, onCharacters]);

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
      onTitleNote?.(titlePage.note || '');
    } else {
      onTitleName?.('');
      onTitleNote?.('');
    }
  }, [titlePage, onTitle, onTitleName, onHasTitle, onTitleNote]);

  useEffect(() => {
    onRawHtml?.(parsedBody.script || '');
  }, [parsedBody.script, onRawHtml]);

  useEffect(() => {
    if (!onScenes) return;
    onScenes(sceneList);
  }, [sceneList, onScenes]);

  // 依角色過濾內容
  const filteredHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(parsedBody.script, 'text/html');

    const replacePlaceholders = (html) =>
      html
        .replaceAll(
          BLANK_LONG,
          '<span class="whitespace-gap whitespace-gap-long" aria-hidden="true"></span>'
        )
        .replaceAll(
          BLANK_SHORT,
          '<span class="whitespace-gap whitespace-gap-short" aria-hidden="true"></span>'
        );

    doc.body.innerHTML = replacePlaceholders(doc.body.innerHTML);

    const sceneHeadings = Array.from(doc.querySelectorAll('.scene-heading, h3'));
    sceneHeadings.forEach((node, idx) => {
      const scene = sceneList[idx];
      if (scene) node.id = scene.id;
    });

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
        if (isTarget) {
          nodes.forEach((n) => n.classList.add('highlight'));
        } else {
          nodes.forEach((n) => n.remove());
        }
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
  }, [parsedBody.script, filterCharacter, focusMode, focusEffect, sceneList]);

  useEffect(() => {
    colorCache.current = new Map();
  }, [bodyText]);

  useEffect(() => {
    if (!scrollToScene) return;
    const el = document.getElementById(scrollToScene);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToScene, filteredHtml]);

  return (
    <article
      className={`screenplay ${theme === 'dark' ? 'screenplay-dark' : 'screenplay-light'}`}
      dangerouslySetInnerHTML={{ __html: filteredHtml }}
    />
  );
}

export default ScriptViewer;

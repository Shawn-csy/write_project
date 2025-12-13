import { useEffect, useMemo, useRef } from 'react';
import { Fountain } from 'fountain-js';
import { buildAccentPalette } from '../constants/accent';

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
  focusContentMode = "all",
  highlightCharacters = true,
  highlightSfx = true,
  accentColor,
}) {
  const colorCache = useRef(new Map());
  // 使用不會被 Fountain 斜體/底線解析的占位字串
  const BLANK_LONG = 'SCREENPLAY-PLACEHOLDER-BLANK-LONG';
  const BLANK_MID = 'SCREENPLAY-PLACEHOLDER-BLANK-MID';
  const BLANK_SHORT = 'SCREENPLAY-PLACEHOLDER-BLANK-SHORT';
  const BLANK_PURE = 'SCREENPLAY-PLACEHOLDER-BLANK-PURE';
  const matchWhitespaceCommand = (line) => {
    const trimmed = (line || '').trim();
    if (!trimmed) return null;
    const stripped = trimmed
      .replace(/^[(（]\s*/, '')
      .replace(/\s*[)）]$/, '');
    if (stripped === '長留白') return 'long';
    if (stripped === '中留白') return 'mid';
    if (stripped === '短留白') return 'short';
    if (stripped === '留白') return 'pure';
    return null;
  };

  const preprocessText = useMemo(() => {
    const raw = text || '';
    const lines = raw.split('\n');
    const output = [];
    lines.forEach((line) => {
      const kind = matchWhitespaceCommand(line);
      if (kind === 'long') {
        output.push(BLANK_LONG);
      } else if (kind === 'mid') {
        output.push(BLANK_MID);
      } else if (kind === 'short') {
        output.push(BLANK_SHORT);
      } else if (kind === 'pure') {
        output.push(BLANK_PURE);
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

  // 預先計算好該主題色對應的調色盤
  const themePalette = useMemo(() => {
    // 預設傳入 accentColor (字串 "H S L")，若無則用 emrald 預設值
    return buildAccentPalette(accentColor || '160 84% 39%');
  }, [accentColor]);

  // 依角色過濾內容
  const filteredHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(parsedBody.script, 'text/html');

    const replacePlaceholders = () => {
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const targets = [];
      while (walker.nextNode()) {
        targets.push(walker.currentNode);
      }
      const buildGap = (kind) => {
        const wrap = doc.createElement('div');
        wrap.className = `whitespace-block whitespace-${kind}`;
        const top = doc.createElement('div');
        top.className = 'whitespace-line';
        const mid = doc.createElement('div');
        mid.className = 'whitespace-line whitespace-label';
        const bottom = doc.createElement('div');
        bottom.className = 'whitespace-line';
        const labelMap = {
          short: '停頓一秒',
          mid: '停頓三秒',
          long: '停頓五秒',
          pure: '',
        };
        mid.textContent = labelMap[kind] || '';
        if (!mid.textContent) mid.classList.add('whitespace-label-empty');
        wrap.appendChild(top);
        wrap.appendChild(mid);
        wrap.appendChild(bottom);
        return wrap;
      };

      const consumeTextNode = (textNode) => {
        const raw = textNode.textContent || '';
        if (
          !raw.includes(BLANK_SHORT) &&
          !raw.includes(BLANK_LONG) &&
          !raw.includes(BLANK_MID) &&
          !raw.includes(BLANK_PURE)
        )
          return;
        const frag = doc.createDocumentFragment();
        let rest = raw;
        const findNext = () => {
          const indices = [
            { idx: rest.indexOf(BLANK_SHORT), kind: 'short', token: BLANK_SHORT },
            { idx: rest.indexOf(BLANK_MID), kind: 'mid', token: BLANK_MID },
            { idx: rest.indexOf(BLANK_LONG), kind: 'long', token: BLANK_LONG },
            { idx: rest.indexOf(BLANK_PURE), kind: 'pure', token: BLANK_PURE },
          ].filter((e) => e.idx !== -1);
          if (!indices.length) return null;
          return indices.sort((a, b) => a.idx - b.idx)[0];
        };
        while (rest.length) {
          const next = findNext();
          if (!next) {
            frag.appendChild(doc.createTextNode(rest));
            break;
          }
          if (next.idx > 0) {
            frag.appendChild(doc.createTextNode(rest.slice(0, next.idx)));
          }
          frag.appendChild(buildGap(next.kind));
          rest = rest.slice(next.idx + next.token.length);
        }
        textNode.replaceWith(frag);
      };

      targets.forEach(consumeTextNode);
    };

    replacePlaceholders();

    // 標記 SFX 行（(SFX: ... )）
    const markSfx = () => {
      if (!highlightSfx) return;
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
      const targets = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const raw = node.textContent || '';
        const match = raw.match(/^\s*\(sfx[:：]\s*(.+?)\)\s*$/i);
        if (match) {
          targets.push({ node, content: match[1] });
        }
      }
      targets.forEach(({ node, content }) => {
        const wrap = doc.createElement('div');
        wrap.className = 'sfx-cue';
        const badge = doc.createElement('span');
        badge.className = 'sfx-label';
        badge.textContent = 'SFX';
        const text = doc.createElement('span');
        text.className = 'sfx-text';
        text.textContent = content.trim();
        wrap.appendChild(badge);
        wrap.appendChild(text);
        node.parentNode.replaceChild(wrap, node);
      });
    };

    markSfx();

    const serializeWithGaps = () => {
      const blockHtml = (kind) => {
        const labelMap = {
          short: '停頓一秒',
          mid: '停頓三秒',
          long: '停頓五秒',
          pure: '',
        };
        const label = labelMap[kind] || '';
        return `
          <div class="whitespace-block whitespace-${kind}">
            <div class="whitespace-line"></div>
            <div class="whitespace-line whitespace-label${label ? '' : ' whitespace-label-empty'}">${label}</div>
            <div class="whitespace-line"></div>
          </div>
        `;
      };
      const raw = doc.body.innerHTML;
      return raw
        .replaceAll(BLANK_LONG, blockHtml('long'))
        .replaceAll(BLANK_MID, blockHtml('mid'))
        .replaceAll(BLANK_SHORT, blockHtml('short'))
        .replaceAll(BLANK_PURE, blockHtml('pure'))
        // 舊版占位符兼容（避免舊資料仍殘留）
        .replaceAll('__SCREENPLAY_BLANK_LONG__', blockHtml('long'))
        .replaceAll('__SCREENPLAY_BLANK_SHORT__', blockHtml('short'))
        .replaceAll('_SCREENPLAY_BLANK_LONG_', blockHtml('long'))
        .replaceAll('_SCREENPLAY_BLANK_SHORT_', blockHtml('short'));
    };

    const sceneHeadings = Array.from(doc.querySelectorAll('.scene-heading, h3'));
    sceneHeadings.forEach((node, idx) => {
      const scene = sceneList[idx];
      if (scene) node.id = scene.id;
    });

    const getCharacterColor = (name) => {
      if (!name) return 'hsl(0 0% 50%)';
      const key = name.toUpperCase();
      if (colorCache.current.has(key)) return colorCache.current.get(key);

      // 基於名稱雜湊選擇 Palette 中的顏色
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      // themePalette 長度固定為 10
      const colorIndex = Math.abs(hash) % themePalette.length;
      const color = themePalette[colorIndex];
      
      colorCache.current.set(key, color);
      return color;
    };

    const applyBlockClass = (nodes) => {
      nodes.forEach((n) => {
        n.classList.add('character-block');
        if (highlightCharacters) {
          n.classList.remove('no-highlight');
        } else {
          n.classList.add('no-highlight');
        }
      });
    };

    const pruneBundle = (nodes) => {
      if (focusContentMode !== 'dialogue') return nodes;
      const allowed = nodes.filter(
        (n) =>
          n.classList.contains('dialogue') ||
          n.classList.contains('character')
      );
      nodes.forEach((n) => {
        if (!allowed.includes(n)) n.remove();
      });
      return allowed;
    };

    if (!focusMode || !filterCharacter || filterCharacter === '__ALL__') {
      // 一般模式：顯示色塊高亮
      const markBundle = (nodes) => {
        // 從 bundle 找出角色名稱
        let charNode = nodes.find((n) => n.classList.contains('character'));
        if (!charNode) {
          // Fountain 產生的對話標題通常是 h4
          const heading = nodes.find((n) => n.tagName === 'H4');
          if (heading) {
            heading.classList.add('character');
            charNode = heading;
          }
        }
        const name = charNode?.textContent?.trim();
        const color = getCharacterColor(name);
        
        applyBlockClass(nodes);
        nodes.forEach((n) => {
          n.style.setProperty('--char-color', color);
        });
      };

      const characters = Array.from(doc.querySelectorAll('.character, .dialogue > h4'));
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
      
      // 處理孤立對話（極少見，防禦性編碼）
      doc.querySelectorAll('.dialogue').forEach((dlg) => {
         if (dlg.classList.contains('character-block')) return; // 已處理
         const h4 = dlg.querySelector('h4'); // 部分格式可能將角色名包在 h4
         if (h4) {
             const name = h4.textContent.trim();
             const color = getCharacterColor(name);
             dlg.classList.add('character-block');
             dlg.style.setProperty('--char-color', color);
         }
      });

      return serializeWithGaps();
    }

    // 順讀模式：維持原本高亮/淡化邏輯
    const target = filterCharacter.toUpperCase();

    const handleBundle = (isTarget, nodes) => {
      applyBlockClass(nodes);
      const pruned = pruneBundle(nodes);
      if (!pruned.length) return;
      if (focusEffect === 'hide') {
        if (isTarget) {
          pruned.forEach((n) => n.classList.add('highlight'));
        } else {
          pruned.forEach((n) => n.remove());
        }
      } else {
        pruned.forEach((n) => {
          if (isTarget) {
            n.classList.add('highlight');
          } else {
            n.classList.add('muted');
          }
        });
      }
    };

    const characters = Array.from(doc.querySelectorAll('.character, .dialogue > h4'));
    characters.forEach((charNode) => {
      if (!charNode.classList.contains('character')) {
        charNode.classList.add('character');
      }
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

    return serializeWithGaps();
  }, [parsedBody.script, filterCharacter, focusMode, focusEffect, focusContentMode, sceneList, themePalette, highlightCharacters]);

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

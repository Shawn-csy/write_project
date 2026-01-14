import React, { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildAccentPalette } from '../constants/accent';
import { parseScreenplay } from '../lib/screenplayAST';
import { ScriptRenderer } from './renderer/ScriptRenderer';

// 1. Add prop
function ScriptViewer({
  text,
  filterCharacter,
  focusMode,
  focusEffect = 'hide',
  onCharacters,
  onTitle,
  onTitleName,
  onTitleNote,
  onSummary,
  onHasTitle,

  onProcessedHtml,
  onScenes,
  scrollToScene,
  theme,
  fontSize = 14,
  bodyFontSize = 14,
  dialogueFontSize = 14,
  focusContentMode = "all",
  highlightCharacters = true,
  highlightSfx = true,
  accentColor,
  type = 'script',
  markerConfigs = [], // Added default empty array
}) {
  const colorCache = useRef(new Map());

  // Mode check
  const isScript = type === 'script';

  // Unified Parsing Pipeline
  const { ast, scenes: sceneList, titleEntries } = useMemo(
    () => parseScreenplay(text || '', markerConfigs), // Pass configs here
    [text, markerConfigs] // Add dependency
  );

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

  const renderTitlePageHtml = (entries) => {
    if (!entries.length) return '';
    return entries.map((e) => {
        const margin = e.indent > 0 ? ` style="margin-left:${Math.min(e.indent / 2, 8)}rem"` : '';
        const values = e.values && e.values.length > 0 ? e.values.map(formatInline) : [];
        const isTitle = e.key.toLowerCase() === 'title';
        const value = values.length > 0 ? values.join(isTitle ? ' ' : '<br />') : '';
        if (isTitle) return `<h1>${value}</h1>`;
        return `<p class="title-field"${margin}><strong>${escapeHtml(e.key)}:</strong> ${value}</p>`;
    }).join('');
  };

  // 以 fountain 標準欄位為主，再附加自訂欄位（不覆蓋）
  const titlePage = useMemo(() => {
    if (!titleEntries || !titleEntries.length) return { html: '', title: '', has: false };

    const wrapperStart = `<div class="title-page">`;
    const wrapperEnd = `</div>`;
    const html = `${wrapperStart}${renderTitlePageHtml(titleEntries)}${wrapperEnd}`;

    const getValue = (keyName) => {
        const entry = titleEntries.find((e) => e.key.toLowerCase() === keyName);
        return (entry?.values || []).join(' ');
    };

    return {
      html,
      title: getValue('title'),
      note: getValue('note'),
      has: Boolean(html.trim()),
    };
  }, [titleEntries]);

  const titleSummary = useMemo(() => {
    if (!titleEntries || !titleEntries.length) return '';
    const summaryKeys = [
      'summary',
      'synopsis',
      'logline',
      'description',
      '摘要',
      '簡介',
      '簡述',
      '說明',
    ];
    const match = titleEntries.find((e) => {
      const key = e.key.toLowerCase();
      return summaryKeys.some((k) => key === k || key.includes(k));
    });
    if (match?.values?.length) {
      return match.values.join(' ');
    }
    return '';
  }, [titleEntries]);

  // Extract Characters from AST
  useEffect(() => {
    if (!ast) {
      onCharacters?.([]);
      return;
    }
    const chars = new Set();
    ast.children.forEach(node => {
        if (node.type === 'speech' && node.character) {
            chars.add(node.character.trim().toUpperCase());
        }
    });
    onCharacters?.(Array.from(chars).sort());
  }, [ast, onCharacters]);

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
    const summaryText = titleSummary || titlePage.note || '';
    onSummary?.(summaryText);
  }, [titleSummary, titlePage.note, onSummary]);

  useEffect(() => {
    if (!onScenes) return;
    onScenes(sceneList);
  }, [sceneList, onScenes]);

  // 預先計算好該主題色對應的調色盤
  const themePalette = useMemo(() => {
    // 預設傳入 accentColor (字串 "H S L")，若無則用 emrald 預設值
    return buildAccentPalette(accentColor || '160 84% 39%');
  }, [accentColor]);

  // 依角色過濾內容 (Used for onProcessedHtml for Print/PDF)
  const filteredHtml = useMemo(() => {
    if (!onProcessedHtml || !ast) return '';
    return renderToStaticMarkup(
       <ScriptRenderer 
         ast={ast} 
         fontSize={bodyFontSize || fontSize}
         filterCharacter={filterCharacter}
         focusMode={focusMode}
         focusEffect={focusEffect}
         focusContentMode={focusContentMode}
         themePalette={themePalette}
         colorCache={colorCache}
         markerConfigs={markerConfigs} // Pass to renderer
       />
     );
  }, [ast, filterCharacter, focusMode, focusEffect, themePalette, bodyFontSize, fontSize, colorCache, markerConfigs, onProcessedHtml]);

  useEffect(() => {
    onProcessedHtml?.(filteredHtml || '');
  }, [filteredHtml, onProcessedHtml]);

  useEffect(() => {
    // Reset Color Cache when text substantially changes? 
    // Usually only needed if user reloads script completely.
    // If text changes slightly, retaining colors is better.
    // Let's keep it safe: reset if new text is unrelated?
    // Using `text` dep might be too aggressive if typing.
    // But `bodyText` change logic was used before.
    // Let's rely on simple mount or text change.
    // Actually, preserving colors while typing is GOOD.
    // Removing the reset effect is safer for UX unless it leaks memory (Map grows).
    // 50 chars limit?
    // Let's keep it but maybe debounced? 
    // Old code reset on `bodyText`.
    // I will remove the reset effect to persist colors during edit.
  }, []);

  useEffect(() => {
    if (!scrollToScene) return;
    const el = document.getElementById(scrollToScene);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [scrollToScene, filteredHtml]);

  // Non-script rendering (Simple Text)
  if (!isScript) {
      return (
        <article
            className={`screenplay ${theme === 'dark' ? 'screenplay-dark' : 'screenplay-light'} p-8 max-w-3xl mx-auto`}
            style={{
                '--body-font-size': `${bodyFontSize}px`,
                fontSize: `${bodyFontSize}px`,
                lineHeight: '1.8',
            }}
        >
            <div className="whitespace-pre-wrap font-serif text-foreground/90">
                {text}
            </div>
        </article>
      );
  }

  return (
    <article
      className={`screenplay ${theme === 'dark' ? 'screenplay-dark' : 'screenplay-light'}`}
      style={{
        '--body-font-size': `${bodyFontSize}px`,
        '--dialogue-font-size': `${dialogueFontSize}px`,
        '--script-font-size': `${fontSize}px`,
      }}
    >
      <ScriptRenderer 
        ast={ast}
        fontSize={bodyFontSize || fontSize}
        filterCharacter={filterCharacter}
        focusMode={focusMode}
        focusEffect={focusEffect}
        focusContentMode={focusContentMode} // Pass this
        themePalette={themePalette}
        colorCache={colorCache}
        markerConfigs={markerConfigs} // Pass here too
      />
    </article>
  );
}

export default React.memo(ScriptViewer);

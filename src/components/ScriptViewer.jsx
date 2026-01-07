import React, { useEffect, useMemo, useRef } from 'react';
import { Fountain } from 'fountain-js';
import { buildAccentPalette } from '../constants/accent';
import {
  whitespaceLabels,
} from '../lib/screenplayTokens';
import {
  preprocessRawScript,
  splitTitleAndBody,
  extractTitleEntries,
  buildSceneListFromTokens,
} from '../lib/screenplayParser';
import {
  replaceWhitespacePlaceholders,
  markSfxAndDirections,
  injectWhitespaceBlocks,
  highlightParentheses,
} from '../lib/screenplayDom';
import { applyCharacterBlocks } from '../lib/screenplayCharacters';

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
  onRawHtml,
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
}) {
  const colorCache = useRef(new Map());
  const preprocessText = useMemo(
    () => preprocessRawScript(text || ''),
    [text]
  );

  // 分離標題區與正文：第一個空行之後視為正文
  const { titleLines, bodyText } = useMemo(
    () => splitTitleAndBody(preprocessText),
    [preprocessText]
  );

  // 僅解析正文，避免自訂標題欄位被渲染到劇本文字
  const parsedBody = useMemo(() => {
    const fountain = new Fountain();
    const result = fountain.parse(bodyText || '', true);
    return {
      script: result?.html?.script || '',
      tokens: result?.tokens || [],
    };
  }, [bodyText]);

  const sceneList = useMemo(
    () => buildSceneListFromTokens(parsedBody.tokens || []),
    [parsedBody.tokens]
  );

  // 解析標題行（原文字，直到第一個空行）
  const titleEntries = useMemo(
    () => extractTitleEntries(titleLines),
    [titleLines]
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

  const titleSummary = useMemo(() => {
    if (!titleEntries.length) return '';
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

  // 依角色過濾內容
  const filteredHtml = useMemo(() => {
    const doc = new DOMParser().parseFromString(parsedBody.script, 'text/html');
    doc.body.style.setProperty('--body-font-size', `${bodyFontSize}px`);
    doc.body.style.setProperty('--dialogue-font-size', `${dialogueFontSize}px`);

    replaceWhitespacePlaceholders(doc);
    markSfxAndDirections(doc, { highlightSfx });

    const serializeWithGaps = () => {
      const blockHtml = (kind) => {
        const label = whitespaceLabels[kind] || '';
        return `
          <div class="whitespace-block whitespace-${kind}">
            <div class="whitespace-line"></div>
            <div class="whitespace-line whitespace-label${label ? '' : ' whitespace-label-empty'}">${label}</div>
            <div class="whitespace-line"></div>
          </div>
        `;
      };
      const raw = doc.body.innerHTML;
      return injectWhitespaceBlocks(raw);
    };

    const sceneHeadings = Array.from(doc.querySelectorAll('.scene-heading, h3'));
    sceneHeadings.forEach((node, idx) => {
      const scene = sceneList[idx];
      if (scene) node.id = scene.id;
    });

    applyCharacterBlocks(doc, {
      highlightCharacters,
      themePalette,
      colorCache,
      focusMode,
      filterCharacter,
      focusEffect,
      focusContentMode,
    });

    highlightParentheses(doc);

    return serializeWithGaps();
  }, [parsedBody.script, filterCharacter, focusMode, focusEffect, focusContentMode, sceneList, themePalette, highlightCharacters]);

  useEffect(() => {
    onRawHtml?.(parsedBody.script || '');
    onProcessedHtml?.(filteredHtml || '');
  }, [parsedBody.script, filteredHtml, onRawHtml, onProcessedHtml]);

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
      style={{
        '--body-font-size': `${bodyFontSize}px`,
        '--dialogue-font-size': `${dialogueFontSize}px`,
        '--script-font-size': `${fontSize}px`,
      }}
      dangerouslySetInnerHTML={{ __html: filteredHtml }}
    />
  );
}

export default React.memo(ScriptViewer);

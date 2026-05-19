import React, { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseScreenplay } from '../../lib/screenplayAST';
import { ScriptRenderer } from './ScriptRenderer';
import { ScriptRendererV2 } from './v2/ScriptRendererV2';
import { useI18n } from '../../contexts/I18nContext';
import { resolveReadingFontStack } from '../../constants/readingFonts';
import { cloneDefaultLayoutConfig, type LayoutConfig } from '../../lib/v2';

interface TitleEntry {
  key: string;
  values?: string[];
  indent?: number;
}

interface SceneItem {
  id?: string;
  [key: string]: unknown;
}

interface AstNode {
  type: string;
  text?: string;
  lineStart?: number;
  lineEnd?: number;
  layerType?: string;
  character?: string;
  id?: string;
  scene_number?: string;
  children?: AstNode[];
  left?: AstNode[];
  right?: AstNode[];
  [key: string]: unknown;
}

interface ScriptViewerProps {
  text: string;
  externalAst?: { children?: AstNode[] } | null;
  externalScenes?: SceneItem[] | null;
  externalTitleEntries?: TitleEntry[] | null;
  filterCharacter?: string | null;
  focusMode?: boolean;
  focusEffect?: string;
  onCharacters?: (chars: string[]) => void;
  onTitle?: (html: string) => void;
  onTitleName?: (name: string) => void;
  onTitleNote?: (note: string) => void;
  onSummary?: (summary: string) => void;
  onHasTitle?: (has: boolean) => void;
  onRawHtml?: (html: string) => void;
  onProcessedHtml?: (html: string) => void;
  onScenes?: (scenes: SceneItem[]) => void;
  scrollToScene?: string | null;
  theme?: string;
  fontSize?: number;
  bodyFontSize?: number;
  dialogueFontSize?: number;
  readingFontFamily?: string;
  focusContentMode?: string;
  accentColor?: string;
  type?: string;
  markerConfigs?: Array<{ id?: string; [key: string]: unknown }>;
  hiddenMarkerIds?: string[];
  lineHeight?: number;
  showLineUnderline?: boolean;
  useV2Renderer?: boolean;
  v2LayoutConfig?: LayoutConfig;
}

function ScriptViewer({
  text,
  // When provided by a parent that already parsed the same text, the internal
  // parseScreenplay call is skipped (avoids redundant O(n) work).
  externalAst = null,
  externalScenes = null,
  externalTitleEntries = null,
  filterCharacter,
  focusMode,
  focusEffect = 'hide',
  onCharacters,
  onTitle,
  onTitleName,
  onTitleNote,
  onSummary,
  onHasTitle,
  onRawHtml, // Add this line

  onProcessedHtml,
  onScenes,
  scrollToScene,
  theme,
  fontSize = 14,
  bodyFontSize = 14,
  dialogueFontSize = 14,
  readingFontFamily = "serif",
  focusContentMode = "all",

  accentColor,
  type = 'script',
  markerConfigs = [],
  hiddenMarkerIds = [],
  lineHeight = 1.4,
  showLineUnderline = false,
  useV2Renderer = false,
  v2LayoutConfig,
}: ScriptViewerProps) {
  const { t } = useI18n();
  const readingFontStack = resolveReadingFontStack(readingFontFamily);
  const colorCache = useRef<Map<string, string>>(new Map());

  // Mode check
  const isScript = type === 'script';

  // Unified Parsing Pipeline
  // Skip parsing when the caller already has a parsed result for the same text.
  const internalParse = useMemo<{ ast?: { children?: AstNode[] }; scenes?: SceneItem[]; titleEntries?: TitleEntry[] } | null>(
    () => externalAst ? null : parseScreenplay(text || '', markerConfigs),
    [externalAst, text, markerConfigs]
  );
  const ast = externalAst ?? internalParse?.ast ?? null;
  const sceneList = externalScenes ?? internalParse?.scenes ?? [];
  const titleEntries = externalTitleEntries ?? internalParse?.titleEntries ?? [];

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Basic inline formatting (bold/italic/underline)
  const formatInline = (str = '') => {
    let html = escapeHtml(str);
    html = html.replace(/\*\*(.+?)\*\*/g, '<span class="bold">$1</span>');
    html = html.replace(/\*(.+?)\*/g, '<span class="italic">$1</span>');
    html = html.replace(/_(.+?)_/g, '<span class="underline">$1</span>');
    return html;
  };

  const renderTitlePageHtml = (entries: TitleEntry[]) => {
    if (!entries.length) return '';
    return entries.map((e) => {
        const indentValue = Number(e.indent || 0);
        const margin = indentValue > 0 ? ` style="margin-left:${Math.min(indentValue / 2, 8)}rem"` : '';
        const values = e.values && e.values.length > 0 ? e.values.map(formatInline) : [];
        const isTitle = e.key.toLowerCase() === 'title';
        const value = values.length > 0 ? values.join(isTitle ? ' ' : '<br />') : '';
        if (isTitle) return `<h1>${value}</h1>`;
        return `<p class="title-field"${margin}><strong>${escapeHtml(e.key)}:</strong> ${value}</p>`;
    }).join('');
  };

  // Title page parsing
  const titlePage = useMemo(() => {
    if (!titleEntries || !titleEntries.length) return { html: '', title: '', has: false };

    const wrapperStart = `<div class="title-page">`;
    const wrapperEnd = `</div>`;
    const html = `${wrapperStart}${renderTitlePageHtml(titleEntries)}${wrapperEnd}`;

    const getValue = (keyName: string) => {
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
      t("scriptViewer.summaryZh1"),
      t("scriptViewer.summaryZh2"),
      t("scriptViewer.summaryZh3"),
      t("scriptViewer.summaryZh4"),
    ];
    const match = titleEntries.find((e) => {
      const key = e.key.toLowerCase();
      return summaryKeys.some((k) => key === k || key.includes(k));
    });
    if (match?.values?.length) {
      return match.values.join(' ');
    }
    return '';
  }, [titleEntries, t]);

  const bodySummary = useMemo(() => {
    if (!ast?.children?.length) return "";
    const allowedTypes = new Set(["action", "dialogue", "centered", "parenthetical", "transition"]);
    const chunks: string[] = [];

    const walk = (node: AstNode) => {
      if (!node || chunks.join(" ").length >= 320) return;
      if (allowedTypes.has(node.type) && typeof node.text === "string") {
        const text = node.text.replace(/\s+/g, " ").trim();
        if (text) chunks.push(text);
      }
      if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
      if (Array.isArray(node.left)) node.left.forEach(walk);
      if (Array.isArray(node.right)) node.right.forEach(walk);
    };

    ast.children.forEach(walk);
    return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 180);
  }, [ast]);

  // Extract characters from speech/character nodes
  useEffect(() => {
    if (!ast) {
      onCharacters?.([]);
      return;
    }
    const chars = new Set<string>();
    (ast.children || []).forEach((node) => {
        // Support legacy speech format and marker-based character layer
        if (node.type === 'speech' && node.character) {
            chars.add(node.character.trim().toUpperCase());
        } else if (node.type === 'character' && node.text) {
            chars.add(node.text.trim().toUpperCase());
        } else if (node.type === 'layer' && node.layerType === 'character' && node.text) {
            chars.add(node.text.trim().toUpperCase());
        }
    });
    onCharacters?.(Array.from(chars).sort());
  }, [ast, onCharacters]);

  // Return title page HTML to parent
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
    const summaryText = titleSummary || bodySummary || "";
    onSummary?.(summaryText);
  }, [titleSummary, bodySummary, onSummary]);

  useEffect(() => {
    if (!onScenes) return;
    onScenes(sceneList);
  }, [sceneList, onScenes]);

  const effectiveBodyFontSize = Number.isFinite(Number(bodyFontSize))
    ? Number(bodyFontSize)
    : Number(fontSize) || 14;
  const effectiveDialogueFontSize = Number.isFinite(Number(dialogueFontSize))
    ? Number(dialogueFontSize)
    : effectiveBodyFontSize;

  const renderScriptNode = (
    currentAst: { children?: AstNode[] } | null,
    options?: { filterCharacterValue?: string | null; focusModeValue?: boolean }
  ) => {
    if (!currentAst) return null;
    if (useV2Renderer) {
      return (
        <ScriptRendererV2
          ast={currentAst}
          layoutConfig={v2LayoutConfig || cloneDefaultLayoutConfig()}
          markerConfigs={markerConfigs as any}
          fontSize={effectiveBodyFontSize}
          lineHeight={lineHeight}
          readingFontFamily={readingFontFamily}
          hiddenMarkerIds={hiddenMarkerIds}
          markerTooltipPrefix={t("scriptRenderer.markerTooltipPrefix", "標記")}
          mode="auto"
        />
      );
    }
    return (
      <ScriptRenderer
        ast={currentAst}
        fontSize={effectiveBodyFontSize}
        dialogueFontSize={effectiveDialogueFontSize}
        lineHeight={lineHeight}
        readingFontFamily={readingFontFamily}
        filterCharacter={options?.filterCharacterValue ?? filterCharacter}
        focusMode={options?.focusModeValue ?? focusMode}
        focusEffect={focusEffect}
        focusContentMode={focusContentMode}
        theme={theme}
        colorCache={colorCache}
        markerConfigs={markerConfigs}
        hiddenMarkerIds={hiddenMarkerIds}
        showLineUnderline={showLineUnderline}
      />
    );
  };

  // Render filtered HTML for processed output / print
  const filteredHtml = useMemo(() => {
    if (!onProcessedHtml || !ast) return '';
    const rendered = renderScriptNode(ast);
    return rendered ? renderToStaticMarkup(rendered) : '';
  }, [ast, onProcessedHtml, useV2Renderer, v2LayoutConfig, effectiveBodyFontSize, effectiveDialogueFontSize, lineHeight, readingFontFamily, filterCharacter, focusMode, focusEffect, focusContentMode, theme, colorCache, markerConfigs, hiddenMarkerIds, showLineUnderline]);

  // Generate RAW HTML (No Filters) for fallback
  const rawHtml = useMemo(() => {
      // If we don't need raw html output, skip calculation to save performance.
      if (!onRawHtml) return '';
      if (!ast) return '';
      // If no filters are active, rawHtml === filteredHtml
      if (!filterCharacter && !focusMode && filterCharacter !== "__ALL__") return filteredHtml;

      const rendered = renderScriptNode(ast, { filterCharacterValue: null, focusModeValue: false });
      return rendered ? renderToStaticMarkup(rendered) : '';
  }, [ast, onRawHtml, filterCharacter, focusMode, filteredHtml, useV2Renderer, v2LayoutConfig, effectiveBodyFontSize, effectiveDialogueFontSize, lineHeight, readingFontFamily, focusEffect, focusContentMode, theme, colorCache, markerConfigs, hiddenMarkerIds, showLineUnderline]);


  useEffect(() => {
    onProcessedHtml?.(filteredHtml || '');
  }, [filteredHtml, onProcessedHtml]);

  useEffect(() => {
      onRawHtml?.(rawHtml || ''); // Fix: Actually emit rawHtml
  }, [rawHtml, onRawHtml]);

  useEffect(() => {
    // Rebuild character-color mapping when source text / theme changes,
    // so newly imported character lists won't inherit stale same-color cache.
    colorCache.current.clear();
  }, [text, accentColor]);

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
            className="script-view-root p-8 max-w-3xl mx-auto"
            style={{ fontFamily: readingFontStack }}
        >
            <div className="whitespace-pre-wrap text-foreground/90">
                {text}
            </div>
        </article>
      );
  }

  return (
    <article
      className="script-view-root"
    >
      {renderScriptNode(ast)}
    </article>
  );
}

export default React.memo(ScriptViewer);

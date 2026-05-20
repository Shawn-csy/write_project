import { useState, useCallback, useMemo, useRef, useEffect, useDeferredValue } from "react";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { parseScreenplay } from "../../lib/screenplayAST";
import type { AstNode } from "../../lib/statistics/ScriptAnalyzer";
import {
  buildScriptDocumentV2FromAst,
  applyMarkerSemanticRoutes,
  cloneDefaultLayoutConfig,
  normalizeLayoutConfig,
  orchestrateDocument,
} from "../../lib/v2";
import { useSettings } from "../../contexts/SettingsContext";
import { useScriptView } from "../../contexts/ScriptViewContext";
import { useEditorSync } from "../useEditorSync";
import { useEditorResize } from "./useEditorResize";
import { useEditorGuide } from "./useEditorGuide";
import { useLiveEditorPersistence } from "./useLiveEditorPersistence";
import { usePreviewLineNavigation } from "../usePreviewLineNavigation";
import { useLiveEditorDownloadOptions } from "./useLiveEditorDownloadOptions";
import type { RefObject } from "react";

interface LiveEditorScriptData {
  id: string;
  type?: string;
  title?: string;
  content?: string;
  lastModified?: string | number | Date;
}

interface Props {
  scriptId: string;
  initialData?: LiveEditorScriptData | null;
  onClose: () => void;
  initialSceneId?: string | null;
  defaultShowPreview?: boolean;
  readOnly?: boolean;
  onRequestEdit?: () => void;
  contentScrollRef?: RefObject<HTMLElement | null>;
  isSidebarOpen?: boolean;
  onSetSidebarOpen?: (open: boolean) => void;
  onTitleHtml?: (html: string) => void;
  onHasTitle?: (has: boolean) => void;
  onTitleNote?: (note: string) => void;
  onTitleSummary?: (summary: string) => void;
  onTitleName?: (name: string) => void;
  crossModeGuideActive?: boolean;
  crossModeGuideStep?: string;
  onCrossGuideNext?: () => void;
  onCrossGuidePrev?: () => void;
  onCrossGuideExit?: () => void;
  onPersistMarkerTheme?: (themeId: string) => Promise<boolean | void>;
  t: (key: string) => string;
}

export function useLiveEditorState({
  scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false,
  readOnly = false, contentScrollRef,
  onTitleName, crossModeGuideActive = false, crossModeGuideStep = "",
  onPersistMarkerTheme, t,
}: Props) {
  const {
    theme = "system", fontSize, bodyFontSize, dialogueFontSize, lineHeight,
    accentConfig, markerConfigs, markerThemes = [], currentThemeId = "default", v2LayoutConfig,
    switchTheme = () => {}, hiddenMarkerIds, toggleMarkerVisibility,
  } = useSettings();
  const scriptView = useScriptView();
  const activeMarkerConfigs = (scriptView?.markerConfigs && scriptView.markerConfigs.length > 0)
    ? scriptView.markerConfigs
    : markerConfigs;

  const [content, setContent] = useState(initialData?.content || "");
  const deferredContent = useDeferredValue(content);
  const [title, setTitle] = useState(initialData?.title || t("liveEditor.untitled"));
  const [loading, setLoading] = useState(!initialData);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error" | "local-saved">("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastSavedContent = useRef(initialData?.content || "");
  const lastSavedTitle = useRef(initialData?.title || "Untitled");

  const [showPreview, setShowPreview] = useState(defaultShowPreview || readOnly);
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const moreActionsButtonRef = useRef<HTMLButtonElement | null>(null);

  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    setSystemPrefersDark(media.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const isDarkMode = theme === "dark" || (theme === "system" && systemPrefersDark);
  const editorTheme = isDarkMode ? oneDark : "light";

  const [rawRenderedHtml, setRawRenderedHtml] = useState<string>("");
  const [processedRenderedHtml, setProcessedRenderedHtml] = useState<string>("");
  const [captureRenderedHtml, setCaptureRenderedHtml] = useState<boolean>(false);
  const renderedHtmlRef = useRef({ raw: "", processed: "" });
  const htmlResolverRef = useRef<((html: string) => void) | null>(null);
  const htmlTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    renderedHtmlRef.current = { raw: rawRenderedHtml, processed: processedRenderedHtml };
    const html = processedRenderedHtml || rawRenderedHtml;
    if (html && htmlResolverRef.current) {
      const resolve = htmlResolverRef.current;
      htmlResolverRef.current = null;
      if (htmlTimeoutRef.current) { window.clearTimeout(htmlTimeoutRef.current); htmlTimeoutRef.current = null; }
      setCaptureRenderedHtml(false);
      resolve(html);
    }
  }, [rawRenderedHtml, processedRenderedHtml]);

  useEffect(() => {
    renderedHtmlRef.current = { raw: "", processed: "" };
    setRawRenderedHtml("");
    setProcessedRenderedHtml("");
  }, [content, activeMarkerConfigs, hiddenMarkerIds]);

  const ensureRenderedHtml = useCallback((): Promise<string> => {
    const existing = renderedHtmlRef.current.processed || renderedHtmlRef.current.raw;
    if (existing) return Promise.resolve(existing);
    if (!showPreview && !readOnly) setShowPreview(true);
    setCaptureRenderedHtml(true);
    const timeout = Math.min(800 + Math.floor((content?.length || 0) / 5000) * 200, 5000);
    return new Promise<string>((resolve) => {
      htmlResolverRef.current = resolve;
      htmlTimeoutRef.current = window.setTimeout(() => {
        htmlTimeoutRef.current = null;
        if (htmlResolverRef.current === resolve) {
          htmlResolverRef.current = null;
          setCaptureRenderedHtml(false);
          resolve("");
        }
      }, timeout);
    });
  }, [readOnly, showPreview, content]);

  const { ast } = useMemo<{ ast: AstNode | null }>(() => {
    if (!showStats) return { ast: null };
    return parseScreenplay(deferredContent || "", activeMarkerConfigs) as { ast: AstNode | null };
  }, [deferredContent, activeMarkerConfigs, showStats]);

  const {
    previewRef, editorViewRef, scrollSyncExtension, highlightExtension,
    handleViewUpdate, handleEditorScroll, setEditorReady,
    scrollEditorToLine, highlightEditorLine, clearHighlightLine,
  } = useEditorSync({ readOnly, showPreview });

  const {
    editorPreviewContainerRef, editorPaneWidth: _editorPaneWidth, isResizing,
    handleResizerPointerDown, handleResizerPointerMove, handleResizerPointerUp, handleResizerDoubleClick,
  } = useEditorResize({ readOnly, showPreview });

  const {
    showGuide, guideSpotlightRect, currentGuide, guideSteps, guideIndex,
    crossGuideSpotlightRect, showCrossModeEditGuide, crossGuideTitle, crossGuideDesc,
    startGuide, finishGuide, handleGuidePrev, handleGuideNext,
  } = useEditorGuide({
    readOnly, isMobile, t, crossModeGuideActive, crossModeGuideStep,
    refs: { headerRef, editorPaneRef, previewRef, moreActionsButtonRef },
  });

  const [scenes, setScenes] = useState<Array<{ id?: string; [key: string]: unknown }>>([]);

  const { handleChange, handleTitleUpdate, handleBack, handleManualSave } = useLiveEditorPersistence({
    scriptId, initialData, readOnly, content, title, onClose, onTitleName, t,
    setContent, setTitle, setLoading, setSaveStatus, setLastSaved,
    lastSavedContentRef: lastSavedContent, lastSavedTitleRef: lastSavedTitle,
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (content !== lastSavedContent.current || title !== lastSavedTitle.current) {
        e.preventDefault();
        e.returnValue = t("liveEditor.leaveWarning");
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [content, title, t]);

  const orchestratedDoc = useMemo(() => {
    const layoutConfig = applyMarkerSemanticRoutes(
      normalizeLayoutConfig(v2LayoutConfig || cloneDefaultLayoutConfig()),
      activeMarkerConfigs as any
    );
    const parsed = parseScreenplay(deferredContent || "", activeMarkerConfigs) as { ast?: { children?: Array<Record<string, unknown>> } };
    const v2doc = buildScriptDocumentV2FromAst(parsed.ast, { layoutConfig, markerConfigs: activeMarkerConfigs as any });
    return orchestrateDocument(v2doc);
  }, [deferredContent, activeMarkerConfigs, v2LayoutConfig]);

  const normalizedDownloadOptions = useLiveEditorDownloadOptions({
    t, title, content, renderedHtmlRef, ensureRenderedHtml, markerConfigs: activeMarkerConfigs as any,
    orchestratedDoc,
  });

  const { handleLocateText, handlePreviewLineClick } = usePreviewLineNavigation({
    content, readOnly, previewRef, scrollEditorToLine, highlightEditorLine, clearHighlightLine,
  });

  const setPreviewContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      previewRef.current = node;
      if (contentScrollRef) contentScrollRef.current = node;
    },
    [previewRef, contentScrollRef]
  );

  useEffect(() => {
    if (readOnly) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;
      if (String(event.key || "").toLowerCase() !== "s") return;
      event.preventDefault();
      handleManualSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleManualSave, readOnly]);

  const extensions = useMemo(() => [
    EditorView.lineWrapping,
    scrollSyncExtension,
    highlightExtension,
    EditorView.theme({
      ".cm-gutters": {
        backgroundColor: "hsl(var(--muted) / 0.3)",
        color: "hsl(var(--muted-foreground) / 0.6)",
        borderRight: "1px solid hsl(var(--border) / 0.6)",
        userSelect: "none",
        minWidth: "30px",
      },
      ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "4px", cursor: "default", userSelect: "none" },
      ".cm-scroller": { scrollbarWidth: "none", msOverflowStyle: "none" },
      ".cm-scroller::-webkit-scrollbar": { display: "none" },
    }),
  ], [scrollSyncExtension, highlightExtension]);

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    setEditorReady(true);
    handleEditorScroll();
  }, [setEditorReady, handleEditorScroll]);

  const handleSwitchMarkerTheme = useCallback(async (themeId: string) => {
    const nextId = String(themeId || "default");
    const prevId = String(currentThemeId || "default");
    if (nextId === prevId) return;
    switchTheme(nextId);
    if (!onPersistMarkerTheme) return;
    const ok = await onPersistMarkerTheme(nextId);
    if (ok === false) switchTheme(prevId);
  }, [currentThemeId, onPersistMarkerTheme, switchTheme]);

  return {
    // settings
    theme, fontSize, bodyFontSize, dialogueFontSize, lineHeight, accentConfig,
    markerConfigs: activeMarkerConfigs, markerThemes, currentThemeId, hiddenMarkerIds, toggleMarkerVisibility,
    // state
    content, title, loading, saveStatus, lastSaved,
    showPreview, setShowPreview, showStats, setShowStats, showRules, setShowRules,
    isMobile, isDarkMode, editorTheme, deferredContent,
    captureRenderedHtml, setRawRenderedHtml, setProcessedRenderedHtml,
    ast, scenes, setScenes,
    // refs
    headerRef, editorPaneRef, moreActionsButtonRef,
    editorPreviewContainerRef, previewRef,
    initialSceneId,
    // resize
    isResizing, handleResizerPointerDown, handleResizerPointerMove,
    handleResizerPointerUp, handleResizerDoubleClick,
    // guide
    showGuide, guideSpotlightRect, currentGuide, guideSteps, guideIndex,
    crossGuideSpotlightRect, showCrossModeEditGuide, crossGuideTitle, crossGuideDesc,
    startGuide, finishGuide, handleGuidePrev, handleGuideNext,
    // handlers
    handleChange, handleTitleUpdate, handleBack, handleManualSave,
    handleEditorCreate, handleViewUpdate, handleSwitchMarkerTheme,
    handleLocateText, handlePreviewLineClick, setPreviewContainerRef,
    normalizedDownloadOptions, extensions,
  };
}

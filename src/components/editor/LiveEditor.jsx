import React, { useEffect, useState, useCallback, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { updateScript, getScript } from "../../lib/db";
import { Loader2 } from "lucide-react";
import { fountainLanguage } from "./fountain-mode";
import { debounce } from "lodash";
import { StatisticsPanel } from "../statistics/StatisticsPanel";

import { parseScreenplay } from "../../lib/screenplayAST";
import { useSettings } from "../../contexts/SettingsContext";
import { useEditorSync } from "../../hooks/useEditorSync";

import { EditorHeader } from "./EditorHeader";
import { PreviewPanel } from "./PreviewPanel";
import { MarkerRulesPanel } from "./MarkerRulesPanel";

export default function LiveEditor({ scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false, readOnly = false, onRequestEdit, onOpenMarkerSettings, contentScrollRef, isSidebarOpen, onSetSidebarOpen, onTitleHtml, onHasTitle, onTitleNote, onTitleSummary, onTitleName }) {
  const {
    theme = "system",
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    accentConfig,
    markerConfigs,
  } = useSettings();

  const [content, setContent] = useState(initialData?.content || "");
  const [title, setTitle] = useState(initialData?.title || "Untitled");
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showPreview, setShowPreview] = useState(defaultShowPreview || readOnly);
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Parse AST for Statistics & Sync
  const { ast } = useMemo(() => {
    return parseScreenplay(content || "", markerConfigs);
  }, [content, markerConfigs]);

  // Sync Hook
  const {
    previewRef,
    editorViewRef,
    scrollSyncExtension,
    highlightExtension,
    handleViewUpdate,
    handleEditorScroll,
    setEditorReady,
    scrollEditorToLine,
    highlightEditorLine,
    clearHighlightLine
    // scenes (if needed later)
  } = useEditorSync({ readOnly, showPreview });

  // Track scenes for stats? (No, logic was moved to useEditorSync but useEditorSync doesn't export setScenes/scenes except active).
  // Originally LiveEditor passed setScenes to ScriptViewer.
  const [scenes, setScenes] = useState([]); // Kept for ScriptViewer prop compatibility if needed

  // Load initial script
  useEffect(() => {
    if (initialData && initialData.id === scriptId && initialData.content !== undefined) {
      setContent(initialData.content);
      setTitle(initialData.title || "Untitled");
      setLoading(false);
      return;
    }

    async function load() {
      if (!scriptId) return;
      try {
        setLoading(true);
        const data = await getScript(scriptId);
        setContent(data.content || "");
        setTitle(data.title || "Untitled");
      } catch (error) {
        console.error("Failed to load script", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scriptId, initialData]);

  // Debounced save
  const debouncedSave = useCallback(
    debounce(async (id, newContent, newTitle) => {
      setSaving(true);
      try {
        await updateScript(id, { content: newContent, title: newTitle });
        setLastSaved(new Date());
      } catch (err) {
        console.error("Auto-save failed", err);
      } finally {
        setSaving(false);
      }
    }, 2000),
    []
  );

  const handleChange = (val) => {
    setContent(val);
    if (!readOnly) {
        debouncedSave(scriptId, val, title);
    }
  };

  const handleTitleUpdate = (newTitle) => {
    if (newTitle && newTitle !== title) {
        setTitle(newTitle);
        onTitleName?.(newTitle);
        if (!readOnly) {
            debouncedSave(scriptId, content, newTitle);
        }
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || "script"}.fountain`;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
  };

  const findLineIndex = useCallback((text) => {
    if (!text) return -1;
    const lines = (content || "").split("\n");
    let idx = lines.findIndex((line) => line.includes(text));
    if (idx !== -1) return idx;
    const trimmed = text.trim();
    if (!trimmed) return -1;
    idx = lines.findIndex((line) => line.trim() === trimmed);
    return idx;
  }, [content]);

  const handleLocateText = useCallback((text, lineNumber) => {
    if (!text && !lineNumber) return;
    if (readOnly) {
      const container = previewRef.current;
      if (!container) return;
      const lines = (content || "").split("\n");
      let idx = typeof lineNumber === "number" ? lineNumber - 1 : findLineIndex(text);
      if (idx < 0) return;
      const max = container.scrollHeight - container.clientHeight;
      if (max <= 0) return;
      const ratio = idx / Math.max(1, lines.length - 1);
      container.scrollTo({ top: max * ratio, behavior: "smooth" });
      return;
    }

    const idx = typeof lineNumber === "number" ? lineNumber : findLineIndex(text) + 1;
    if (!idx || idx < 1) return;
    scrollEditorToLine(idx, "smooth");
    highlightEditorLine(idx);
    setTimeout(() => {
      clearHighlightLine();
    }, 1200);
  }, [content, findLineIndex, previewRef, readOnly, scrollEditorToLine, highlightEditorLine, clearHighlightLine]);

  const setPreviewContainerRef = useCallback(
    (node) => {
      previewRef.current = node;
      if (contentScrollRef) {
        contentScrollRef.current = node;
      }
    },
    [previewRef, contentScrollRef]
  );

  const handleBack = async () => {
      debouncedSave.cancel();
      try {
          await updateScript(scriptId, { content, title });
      } catch (e) {
          console.error("Save on exit failed", e);
      }
      onClose();
  };

  const handleManualSave = () => {
        if (!saving) {
            debouncedSave.cancel();
            setSaving(true);
            updateScript(scriptId, { content, title })
                .then(() => {
                    setLastSaved(new Date());
                })
                .catch(err => console.error("Manual save failed", err))
                .finally(() => setSaving(false));
        }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative z-0">
      <EditorHeader 
        readOnly={readOnly}
        title={title}
        onBack={handleBack}
        onManualSave={handleManualSave}
        saving={saving}
        lastSaved={lastSaved}
        showRules={showRules}
        onToggleRules={() => setShowRules(prev => !prev)}
        onDownload={handleDownload}
        onToggleStats={() => setShowStats(true)}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        isSidebarOpen={isSidebarOpen}
        onSetSidebarOpen={onSetSidebarOpen}
        onTitleChange={handleTitleUpdate}
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Code Editor Pane */}
        {!readOnly && (
            <div className={`h-full ${showPreview ? "w-1/2 border-r border-border" : "w-full"} transition-all duration-300 flex flex-col`}>
                <CodeMirror
                value={content}
                height="100%"
                theme={oneDark} 
                onCreateEditor={(view) => {
                    editorViewRef.current = view;
                    setEditorReady(true);
                    handleEditorScroll();
                }}
                extensions={
                    (initialData?.type === 'script' || !initialData?.type) 
                    ? [
                        fountainLanguage, 
                        EditorView.lineWrapping,
                        scrollSyncExtension,
                        highlightExtension,
                        EditorView.theme({
                            ".cm-gutters": {
                                backgroundColor: "hsl(var(--muted) / 0.3)",
                                color: "hsl(var(--muted-foreground) / 0.6)",
                                borderRight: "1px solid hsl(var(--border) / 0.6)",
                                userSelect: "none",
                                minWidth: "30px"
                            },
                            ".cm-lineNumbers .cm-gutterElement": {
                                paddingLeft: "4px",
                                cursor: "default",
                                userSelect: "none"
                            }
                        })
                      ] 
                    : [
                        EditorView.lineWrapping, 
                        scrollSyncExtension,
                        highlightExtension,
                        EditorView.theme({
                            ".cm-gutters": {
                                backgroundColor: "hsl(var(--muted) / 0.3)",
                                color: "hsl(var(--muted-foreground) / 0.6)",
                                borderRight: "1px solid hsl(var(--border) / 0.6)",
                                userSelect: "none"
                            }
                        })
                      ] 
                }
                onChange={handleChange}
                onUpdate={handleViewUpdate}
                className="h-full text-base font-mono flex-1 overflow-hidden"
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    highlightActiveLine: false,
                }}
                />
            </div>
        )}

        {/* Preview Pane */}
        <PreviewPanel 
            ref={setPreviewContainerRef}
            show={showPreview}
            readOnly={readOnly}
            content={content}
            type={initialData?.type || "script"}
            theme={theme === 'dark' ? 'dark' : 'light'}
            fontSize={fontSize}
            bodyFontSize={bodyFontSize}
            dialogueFontSize={dialogueFontSize}
            accentColor={accentConfig?.accent}
            markerConfigs={markerConfigs}
            onTitleName={handleTitleUpdate}
            onTitleHtml={onTitleHtml}
            onHasTitle={onHasTitle}
            onTitleNote={onTitleNote}
            onTitleSummary={onTitleSummary}
            initialSceneId={initialSceneId}
            onScenes={setScenes}
            onRequestEdit={readOnly ? onRequestEdit : undefined}
        />

        {/* Stats Side Panel (Non-modal) */}
        {showStats && (
            <div className="w-[400px] border-l border-border bg-background shrink-0 flex flex-col h-full shadow-xl z-20 transition-all duration-300">
                <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
                    <button 
                        onClick={() => setShowStats(false)} 
                        className="text-muted-foreground hover:text-foreground text-sm"
                    >
                        ✕
                    </button>
                    <h3 className="font-semibold text-sm">統計分析面板</h3>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                    <StatisticsPanel rawScript={content} scriptAst={ast} onLocateText={handleLocateText} />
                </div>
            </div>
        )}

        <MarkerRulesPanel 
            show={showRules} 
            onClose={() => setShowRules(false)}
            markerConfigs={markerConfigs}
            readOnly={readOnly}
            onOpenMarkerSettings={onOpenMarkerSettings}
        />

      </div>
    </div>
  );
}

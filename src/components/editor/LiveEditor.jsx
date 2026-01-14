import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  // Save State Machine: 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState("saved");
  const [lastSaved, setLastSaved] = useState(null);
  
  // Track if we have unsaved changes related to content ref
  const lastSavedContent = useRef(initialData?.content || "");
  const lastSavedTitle = useRef(initialData?.title || "Untitled");

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

  const [scenes, setScenes] = useState([]); 

  // Local Storage Key Helper
  const getDraftKey = (id) => `draft_script_${id}`;

  // Load initial script w/ Local Draft Check
  useEffect(() => {
    if (initialData && initialData.id === scriptId && initialData.content !== undefined) {
      // Check for local draft
      const draftKey = getDraftKey(scriptId);
      const draftJson = localStorage.getItem(draftKey);
      let loadedContent = initialData.content;
      let loadedTitle = initialData.title || "Untitled";
      let isRestored = false;

      if (draftJson) {
          try {
              const draft = JSON.parse(draftJson);
              const serverMtime = new Date(initialData.lastModified || Date.now()).getTime();
              if (draft.mtime > serverMtime) {
                  // Draft is newer, use draft
                  loadedContent = draft.content;
                  loadedTitle = draft.title;
                  isRestored = true;
                  setSaveStatus("local-saved");
                  console.log("Restored from local draft");
              }
          } catch(e) { console.error("Bad draft", e); }
      }

      setContent(loadedContent);
      setTitle(loadedTitle);
      lastSavedContent.current = loadedContent;
      lastSavedTitle.current = loadedTitle;
      setLoading(false);
      return;
    }

    async function load() {
      if (!scriptId) return;
      try {
        setLoading(true);
        const data = await getScript(scriptId);
        
        let loadedContent = data.content || "";
        let loadedTitle = data.title || "Untitled";
        
        // Draft Check Logic duplicated (cleaner to extract but inline is fine)
        const draftKey = getDraftKey(scriptId);
        const draftJson = localStorage.getItem(draftKey);
        if (draftJson) {
             try {
                 const draft = JSON.parse(draftJson);
                 const serverMtime = new Date(data.lastModified || Date.now()).getTime();
                 if (draft.mtime > serverMtime) {
                     loadedContent = draft.content;
                     loadedTitle = draft.title;
                     setSaveStatus("local-saved"); 
                 }
             } catch(e) {}
        }

        setContent(loadedContent);
        setTitle(loadedTitle);
        lastSavedContent.current = loadedContent;
        lastSavedTitle.current = loadedTitle;
        setLastSaved(new Date(data.lastModified || Date.now()));
      } catch (error) {
        console.error("Failed to load script", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [scriptId, initialData]);

  // Persistence Logic
  const performSave = async (id, newContent, newTitle) => {
      try {
        setSaveStatus("saving");
        await updateScript(id, { content: newContent, title: newTitle });
        setLastSaved(new Date());
        setSaveStatus("saved");
        lastSavedContent.current = newContent;
        lastSavedTitle.current = newTitle;
        
        // Clear local draft after successful synced save? 
        // No, keep it as backup until newer data comes. 
        // Or update its timestamp? 
        // Actually, if we saved to server, server mtime is now new.
        // We can remove draft or update it.
        // Let's keep writing draft in handleChange.
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("error");
      }
  };

  // Debounced save
  const debouncedSave = useCallback(
    debounce((id, newContent, newTitle) => {
      performSave(id, newContent, newTitle);
    }, 5000), // Increased to 5s
    []
  );

  // BeforeUnload Warning
  useEffect(() => {
      const handleBeforeUnload = (e) => {
          if (saveStatus === 'unsaved' || saveStatus === 'saving' || saveStatus === 'error' || saveStatus === 'local-saved') {
             // local-saved is technically safe locally, but maybe user wants to ensure cloud?
             // Prompt anyway to be safe? 
             // "已儲存至本機" means browser close is SAFE.
             // So if status is 'local-saved', we DO NOT need to warn about data loss,
             // BUT we might want to warn about "upload pending".
             // However, user specifically asked for "Local Draft" to be safe against crash/close.
             // So we can SKIP warning if saved to local.
             
             // Let's check diff against CLOUD lastSavedContent
             if (content !== lastSavedContent.current || title !== lastSavedTitle.current) {
                 // It IS dirty relative to cloud.
                 // But is it dirty relative to local? 
                 // We write local on every change. So local is sync.
                 
                 // If status is 'local-saved', we can probably let them go, 
                 // but maybe just warn "Changes saved to THIS BROWSER only".
                 // For now, let's KEEP warning but maybe change text?
                 // Or just keep standard warning. Safest.
                 e.preventDefault();
                 e.returnValue = "尚未上傳至雲端，若現在離開，變更將只保留在此瀏覽器中。";
                 return e.returnValue;
             }
          }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus, content, title]);


  const handleChange = (val) => {
    setContent(val);
    if (!readOnly) {
        // 1. Save to LocalStorage immediately
        try {
            const draftKey = getDraftKey(scriptId);
            localStorage.setItem(draftKey, JSON.stringify({
                content: val,
                title: title,
                mtime: Date.now()
            }));
            // Update status only if not currently 'saving' or 'error' (priority)
            // Actually 'saving' should override 'local-saved' in UI, but logically we are local-saved.
            // If we are 'saving', we stay 'saving'.
            setSaveStatus(prev => (prev === 'saving' ? 'saving' : 'local-saved'));
        } catch(e) { console.error("Local save failed", e); }

        // 2. Queue Cloud Save
        debouncedSave(scriptId, val, title);
    }
  };

  const handleTitleUpdate = (newTitle) => {
    if (newTitle && newTitle !== title) {
        setTitle(newTitle);
        onTitleName?.(newTitle);
        if (!readOnly) {
            // Local Save
            try {
                const draftKey = getDraftKey(scriptId);
                localStorage.setItem(draftKey, JSON.stringify({
                    content: content,
                    title: newTitle,
                    mtime: Date.now()
                }));
                setSaveStatus(prev => (prev === 'saving' ? 'saving' : 'local-saved'));
            } catch(e) {}

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
      // If unsaved, save immediately before leaving
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
          await performSave(scriptId, content, title);
      }
      onClose();
  };

  const handleManualSave = () => {
        if (saveStatus !== 'saving') {
            debouncedSave.cancel();
            performSave(scriptId, content, title);
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
        saveStatus={saveStatus}
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

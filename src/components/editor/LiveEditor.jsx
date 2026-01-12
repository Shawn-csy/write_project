import React, { useEffect, useState, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { updateScript, getScript } from "../../lib/db";
import { Loader2, ArrowLeft, Save, Eye, EyeOff, Columns, BarChart2, Download } from "lucide-react";
import { fountainLanguage } from "./fountain-mode";
import { debounce } from "lodash";
import UserMenu from "../auth/UserMenu";
import ScriptViewer from "../ScriptViewer";
import StatsDialog from "./StatsDialog";
import { useSettings } from "../../contexts/SettingsContext";

// Basic Fountain highlighting (can be improved later)
// For now treating it as Markdown which is close enough for Phase 1

export default function LiveEditor({ scriptId, initialData, onClose, initialSceneId, defaultShowPreview = false, readOnly = false, onRequestEdit }) {
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

  // Load initial script if not provided or if switching IDs
  useEffect(() => {
    // If we have initialData matching this ID AND it has content defined, use it
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

  // Debounced save function
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
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  // For now, Print relies on the Preview pane being open or user browser print
  // Ideally we use the iframe method from App.jsx, but for Phase 3 iteration 1, 
  // we can just simple print window (LiveEditor hides other UI elements via CSS @media print if needed)
  // But a better UX is the "Export PDF" button triggering the system print dialog.

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Track active scene based on cursor
  const [scenes, setScenes] = useState([]);
  const [activeSceneId, setActiveSceneId] = useState(initialSceneId);

  const handleCursorUpdate = useCallback((update) => {
      if (update.selectionSet) {
          const line = update.state.doc.lineAt(update.state.selection.main.head).number;
          // Find the scene corresponding to this line
          // Scenes are sorted by line? usually.
          // Find the last scene with scene.line <= currentLine
          if (!scenes.length) return;
          
          // Simple search
          let current = null;
          for (let s of scenes) {
              if (s.line <= line) {
                  current = s;
              } else {
                  break; 
              }
          }
          if (current) setActiveSceneId(current.id);
      }
  }, [scenes]);

  return (
    <div className="flex flex-col h-full bg-background relative z-50">
      {/* Header */}
      {!readOnly && (
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onClose(activeSceneId)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h2 className="font-semibold text-sm sm:text-base">{title}</h2>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
               {saving ? (
                 <span className="flex items-center gap-1">
                   <Loader2 className="w-3 h-3 animate-spin" /> 儲存中...
                 </span>
               ) : lastSaved ? (
                 <span className="flex items-center gap-1">
                   <Save className="w-3 h-3" /> 已儲存 {lastSaved.toLocaleTimeString()}
                 </span>
               ) : (
                 <span>準備就緒</span>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={handleDownload}
                className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Download .fountain"
            >
                <Download className="w-4 h-4" />
            </button>
            <button
                onClick={() => setShowStats(true)}
                className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Statistics"
            >
                <BarChart2 className="w-4 h-4" />
            </button>
            <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm ${showPreview ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
                title="Toggle Live Preview"
            >
                {showPreview ? <Columns className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden sm:inline">{showPreview ? "編輯+預覽" : "預覽模式"}</span>
            </button>
        </div>
      </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Code Editor Pane */}
        {!readOnly && (
            <div className={`h-full ${showPreview ? "w-1/2 border-r border-border" : "w-full"} transition-all duration-300`}>
                <CodeMirror
                value={content}
                height="100%"
                theme={oneDark} 
                extensions={
                    (initialData?.type === 'script' || !initialData?.type) 
                    ? [fountainLanguage, EditorView.lineWrapping] 
                    : [EditorView.lineWrapping] 
                }
                onChange={handleChange}
                onUpdate={handleCursorUpdate}
                className="h-full text-base font-mono"
                basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    highlightActiveLine: false,
                }}
                />
            </div>
        )}

        {/* Preview Pane */}
        {(showPreview || readOnly) && (
             <div className={`${readOnly ? "w-full" : "w-1/2"} h-full overflow-hidden bg-background`}>
                 <div 
                    className="h-full overflow-y-auto px-4 py-8"
                    onDoubleClick={() => {
                        if (readOnly && onRequestEdit) onRequestEdit();
                    }}
                 >
                    <ScriptViewer 
                        text={content}
                        type={initialData?.type || "script"}
                        theme={theme === 'dark' ? 'dark' : 'light'}
                        fontSize={fontSize}
                        bodyFontSize={bodyFontSize}
                        dialogueFontSize={dialogueFontSize}
                        accentColor={accentConfig?.accent}
                        markerConfigs={markerConfigs}
                        onTitleName={handleTitleUpdate}
                        scrollToScene={initialSceneId}
                        onScenes={setScenes} // Capture scenes
                    />
                 </div>
             </div>
        )}
      </div>

      <StatsDialog 
        open={showStats} 
        onOpenChange={setShowStats} 
        content={content} 
      />
    </div>
  );
}

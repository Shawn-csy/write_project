import React, { useEffect, useState, useCallback, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { updateScript, getScript } from "../../lib/db";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { debounce } from "lodash";
import UserMenu from "../auth/UserMenu";

// Basic Fountain highlighting (can be improved later)
// For now treating it as Markdown which is close enough for Phase 1

export default function LiveEditor({ scriptId, initialData, onClose }) {
  const [content, setContent] = useState(initialData?.content || "");
  const [title, setTitle] = useState(initialData?.title || "Untitled");
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Load initial script if not provided or if switching IDs
  useEffect(() => {
    // If we have initialData matching this ID, use it and don't fetch
    if (initialData && initialData.id === scriptId) {
      setContent(initialData.content || "");
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
    debounce(async (id, newContent) => {
      setSaving(true);
      try {
        await updateScript(id, { content: newContent });
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
    debouncedSave(scriptId, val);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
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
        <UserMenu />
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          value={content}
          height="100%"
          theme={oneDark} // TODO: Make this responsive to app theme
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages })
            // TODO: Add custom Fountain extension here later
          ]}
          onChange={handleChange}
          className="h-full text-base font-mono"
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLine: false,
          }}
        />
      </div>
    </div>
  );
}

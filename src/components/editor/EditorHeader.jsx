import React from "react";
import { Loader2, ArrowLeft, Save, Eye, Columns, BarChart2, Download, HelpCircle, PanelLeftOpen } from "lucide-react";

export function EditorHeader({
  readOnly,
  title,
  onBack,
  onManualSave,
  saveStatus = 'saved', // saving | saved | unsaved | error
  lastSaved,
  showRules,
  onToggleRules,
  onDownload,
  onToggleStats,
  showPreview,
  onTogglePreview,
  isSidebarOpen,
  onSetSidebarOpen,
  onTitleChange
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(title);

  React.useEffect(() => {
     setEditTitle(title);
  }, [title]);

  const handleTitleSubmit = () => {
     if (editTitle.trim() && editTitle !== title) {
        onTitleChange(editTitle);
     } else {
        setEditTitle(title);
     }
     setIsEditing(false);
  };

  if (readOnly) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <button
            type="button"
            onClick={(e) => {
                console.log("Sidebar toggle clicked", { isSidebarOpen });
                e.stopPropagation();
                e.currentTarget.blur();
                if (onSetSidebarOpen) onSetSidebarOpen(true);
                else console.error("onSetSidebarOpen is undefined");
            }}
            className={`p-2 hover:bg-muted rounded-full transition-colors ${isSidebarOpen ? "lg:hidden" : ""}`}
            title="展開列表"
        >
            <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            {isEditing ? (
                <input 
                    className="font-semibold text-sm sm:text-base border border-primary/50 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                    autoFocus
                />
            ) : (
                <h2 
                    className="font-semibold text-sm sm:text-base cursor-text hover:bg-muted/50 rounded px-1 -ml-1 transition-colors"
                    onDoubleClick={() => setIsEditing(true)}
                    title="雙擊即可重新命名"
                >
                    {title}
                </h2>
            )}
            <button
              onClick={onManualSave}
              className={`p-1 px-2 rounded flex items-center gap-1 text-[10px] sm:text-xs border transition-colors ${
                  saveStatus === 'error' ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200' :
                  saveStatus === 'local-saved' ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100' :
                  saveStatus === 'unsaved' ? 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' :
                  saveStatus === 'saving' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                  'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' // saved
              }`}
              title={saveStatus === 'error' ? "儲存失敗，點擊重試" : saveStatus === 'local-saved' ? "已儲存至本機，等待上傳" : "點擊手動儲存"}
            >
              {saveStatus === 'saving' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {saveStatus === 'saving' ? "儲存中..." :
               saveStatus === 'unsaved' ? "未儲存" :
               saveStatus === 'local-saved' ? "已暫存" :
               saveStatus === 'error' ? "儲存失敗" :
               lastSaved ? `已儲存 ${lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : "已儲存"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRules}
          className={`p-2 hover:bg-muted rounded-md transition-colors ${
            showRules
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="語法規則 (Cheat Sheet)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <button
          onClick={onDownload}
          className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Download .fountain"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleStats}
          className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Statistics"
        >
          <BarChart2 className="w-4 h-4" />
        </button>
        <button
          onClick={onTogglePreview}
          className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm ${
            showPreview
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground"
          }`}
          title="Toggle Live Preview"
        >
          {showPreview ? (
            <Columns className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {showPreview ? "編輯+預覽" : "預覽模式"}
          </span>
        </button>
      </div>
    </div>
  );
}

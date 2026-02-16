import React, { useState } from "react";
import { Loader2, Save, Eye, Columns, BarChart2, HelpCircle, Globe, Lock } from "lucide-react";
import { useEditableTitle } from "../../hooks/useEditableTitle";
import EditableTitle from "../header/EditableTitle";
import { MarkerVisibilitySelect } from "../ui/MarkerVisibilitySelect";
import HeaderTitleBlock from "../header/HeaderTitleBlock";
import { Badge } from "../ui/badge";
import { ScriptMetadataDialog } from "../dashboard/ScriptMetadataDialog";
import { DownloadMenu } from "../common/DownloadMenu";
import { Button } from "../ui/button";

export function EditorHeader({
  readOnly,
  title,
  onBack,
  onManualSave,
  saveStatus = 'saved', // saving | saved | unsaved | error
  lastSaved,
  showRules,
  onToggleRules,
  downloadOptions = [],
  onToggleStats,
  showPreview,
  onTogglePreview,
  isSidebarOpen,
  onSetSidebarOpen,
  onTitleChange,
  markerConfigs = [],
  hiddenMarkerIds = [],
  onToggleMarker,
  script, // Full script object for metadata
  onScriptUpdate // Callback when metadata changes
}) {
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const saveStatusTitle =
    saveStatus === "error"
      ? "雲端儲存失敗，點擊重試"
      : saveStatus === "local-saved"
        ? "本機已暫存，等待雲端同步"
        : saveStatus === "unsaved"
          ? "尚未儲存到雲端"
          : "點擊手動儲存";
  const saveStatusLabel =
    saveStatus === "saving"
      ? "同步中..."
      : saveStatus === "unsaved"
        ? "未儲存"
        : saveStatus === "local-saved"
          ? "本機已暫存"
          : saveStatus === "error"
            ? "同步失敗"
            : lastSaved
              ? `已同步 ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "已同步";
  const {
    isEditing,
    editTitle,
    setEditTitle,
    startEditing,
    submitTitle
  } = useEditableTitle(title, onTitleChange);

  if (readOnly) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
      <HeaderTitleBlock
        onBack={onBack}
        backButtonClassName="p-2 hover:bg-muted rounded-full transition-colors"
        backIconClassName="w-5 h-5 text-muted-foreground"
        backTitle="Back to Dashboard"
        backAriaLabel="Back to Dashboard"
        onOpenSidebar={() => onSetSidebarOpen?.(true)}
        sidebarButtonClassName={`p-2 hover:bg-muted rounded-full transition-colors ${isSidebarOpen ? "lg:hidden" : ""}`}
        sidebarIconClassName="w-5 h-5 text-muted-foreground"
        containerClassName="flex items-center gap-2"
        titleWrapperClassName=""
        titleNode={
          <div>
            <div className="flex items-center gap-2">
              <EditableTitle
                isEditing={isEditing}
                editTitle={editTitle}
                setEditTitle={(val) => setEditTitle(val)}
                onSubmit={submitTitle}
                inputClassName="font-semibold text-sm sm:text-base border border-primary/50 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px] sm:min-w-[200px] w-[45vw] sm:w-auto max-w-[60vw]"
                renderDisplay={() => (
                  <div className="flex items-center gap-2">
                    <h2
                        className="font-semibold text-sm sm:text-base cursor-text hover:bg-muted/50 rounded px-1 -ml-1 transition-colors"
                        onDoubleClick={startEditing}
                        title="雙擊即可重新命名"
                    >
                        {title}
                    </h2>
                    {/* Status Badge */}
                    <Badge 
                        variant={script?.status === 'Public' ? "default" : "outline"} 
                        className="h-5 px-1.5 text-[10px] cursor-pointer hover:opacity-80 flex items-center gap-1"
                        onClick={() => setShowMetadataDialog(true)}
                    >
                        {script?.status === 'Public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {script?.status === 'Public' ? "Public" : "Private"}
                    </Badge>
                  </div>
                )}
              />
              <ScriptMetadataDialog 
                open={showMetadataDialog} 
                onOpenChange={setShowMetadataDialog} 
                script={script}
                onSave={(updated) => {
                    if (onScriptUpdate) onScriptUpdate(updated);
                    setShowMetadataDialog(false);
                }}
              />
              <button
                onClick={onManualSave}
                className={`p-1 px-2 rounded flex items-center gap-1 text-[10px] sm:text-xs border transition-colors ${
                    saveStatus === "error" ? "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20" :
                    saveStatus === "local-saved" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20" :
                    saveStatus === "unsaved" ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30 hover:bg-orange-500/20" :
                    saveStatus === "saving" ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                }`}
                title={saveStatusTitle}
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                {saveStatusLabel}
              </button>
            </div>
          </div>
        }
      />
      <div className="flex items-center gap-2 flex-wrap">
         {/* Marker Visibility Toggle */}
         <div className="hidden sm:block w-[140px]">
          <MarkerVisibilitySelect
            markerConfigs={markerConfigs}
            hiddenMarkerIds={hiddenMarkerIds}
            onToggleMarker={onToggleMarker}
            triggerClassName="h-8 px-2 text-xs w-full bg-background border hover:bg-muted/50 transition-all"
            contentAlign="end"
            titlePrefix="標記"
          />
         </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleRules}
          className={`h-8 w-8 rounded-md transition-colors ${
            showRules
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="語法規則 (Cheat Sheet)"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
        <DownloadMenu
          options={downloadOptions}
          title="下載"
          triggerClassName="h-8 w-8 rounded-md transition-colors text-muted-foreground hover:text-foreground"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleStats}
          className="h-8 w-8 rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Statistics"
        >
          <BarChart2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePreview}
          className={`h-8 rounded-md transition-colors flex items-center gap-2 text-sm ${
            showPreview
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground"
          }`}
          title={showPreview ? "切換為純編輯" : "切換為編輯 + 預覽"}
        >
          {showPreview ? (
            <Columns className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {showPreview ? "編輯 + 預覽" : "純編輯"}
          </span>
        </Button>
      </div>
    </div>
  );
}

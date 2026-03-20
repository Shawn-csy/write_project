import React, { useState } from "react";
import { Loader2, Save, Eye, Columns, BarChart2, HelpCircle, Globe, Lock, MoreHorizontal } from "lucide-react";
import { useEditableTitle } from "../../hooks/useEditableTitle";
import EditableTitle from "../header/EditableTitle";
import HeaderTitleBlock from "../header/HeaderTitleBlock";
import { Badge } from "../ui/badge";
import { ScriptMetadataDialog } from "../dashboard/ScriptMetadataDialog";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MarkerThemeVisibilityControl } from "../ui/MarkerThemeVisibilityControl";
import { useI18n } from "../../contexts/I18nContext";

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
  onOpenGuide,
  isSidebarOpen,
  onSetSidebarOpen,
  guideButtonRef,
  moreActionsRef,
  onTitleChange,
  markerConfigs = [],
  markerThemes = [],
  currentThemeId = "default",
  onSwitchMarkerTheme = () => {},
  hiddenMarkerIds = [],
  onToggleMarker,
  script, // Full script object for metadata
  onScriptUpdate // Callback when metadata changes
}) {
  const { t } = useI18n();
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const saveStatusTitle =
    saveStatus === "error"
      ? t("editorHeader.saveTitleError")
      : saveStatus === "local-saved"
        ? t("editorHeader.saveTitleLocalSaved")
        : saveStatus === "unsaved"
          ? t("editorHeader.saveTitleUnsaved")
          : t("editorHeader.saveTitleManual");
  const saveStatusLabel =
    saveStatus === "saving"
      ? t("editorHeader.saveLabelSaving")
      : saveStatus === "unsaved"
        ? t("editorHeader.saveLabelUnsaved")
        : saveStatus === "local-saved"
          ? t("editorHeader.saveLabelLocalSaved")
          : saveStatus === "error"
            ? t("editorHeader.saveLabelError")
            : lastSaved
              ? `${t("editorHeader.saveLabelSyncedAt")} ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : t("editorHeader.saveLabelSynced");
  const {
    isEditing,
    editTitle,
    setEditTitle,
    startEditing,
    submitTitle
  } = useEditableTitle(title, onTitleChange);

  if (readOnly) return null;
  const enabledDownloadOptions = (downloadOptions || []).filter((opt) => !opt?.hidden);

  return (
    <div className="flex flex-row items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card shrink-0 min-w-0">
      <HeaderTitleBlock
        onBack={onBack}
        backButtonClassName="p-2 hover:bg-muted rounded-full transition-colors"
        backIconClassName="w-5 h-5 text-muted-foreground"
        backTitle={t("editorHeader.backToDashboard")}
        backAriaLabel={t("editorHeader.backToDashboard")}
        onOpenSidebar={() => onSetSidebarOpen?.(true)}
        sidebarButtonClassName="p-2 hover:bg-muted rounded-full transition-colors lg:hidden"
        sidebarIconClassName="w-5 h-5 text-muted-foreground"
        containerClassName="flex items-center gap-2 min-w-0 flex-1"
        titleWrapperClassName="min-w-0"
        titleNode={
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <EditableTitle
                isEditing={isEditing}
                editTitle={editTitle}
                setEditTitle={(val) => setEditTitle(val)}
                onSubmit={submitTitle}
                inputClassName="font-semibold text-sm border border-primary/50 rounded px-1 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-[80px] w-[30vw] max-w-[200px]"
                renderDisplay={() => (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2
                        className="font-semibold text-sm cursor-text hover:bg-muted/50 rounded px-1 -ml-1 transition-colors truncate max-w-[20vw] sm:max-w-[180px] md:max-w-[240px]"
                        onDoubleClick={startEditing}
                        title={t("editorHeader.doubleClickRename")}
                    >
                        {title}
                    </h2>
                    {/* Status Badge */}
                    <Badge
                        variant={script?.status === 'Public' ? "default" : "outline"}
                        className="h-5 px-1.5 text-[10px] cursor-pointer hover:opacity-80 flex items-center gap-1 shrink-0"
                        onClick={() => setShowMetadataDialog(true)}
                    >
                        {script?.status === 'Public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span className="hidden md:inline">{script?.status === 'Public' ? t("editorHeader.public") : t("editorHeader.private")}</span>
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
              <div
                className={`p-1 px-1.5 rounded flex items-center gap-1 text-[10px] border shrink-0 ${
                    saveStatus === "error" ? "bg-destructive/10 text-destructive border-destructive/30" :
                    saveStatus === "local-saved" ? "bg-[color:var(--license-term-bg)] text-[color:var(--license-term-fg)] border-[color:var(--license-term-border)]" :
                    saveStatus === "unsaved" ? "bg-muted text-muted-foreground border-border" :
                    saveStatus === "saving" ? "bg-primary/10 text-primary border-primary/30" :
                    "bg-primary/10 text-primary border-primary/30"
                }`}
                title={saveStatusTitle}
                aria-label={saveStatusTitle}
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                <span className="hidden lg:inline">{saveStatusLabel}</span>
              </div>
            </div>
          </div>
        }
      />
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 存檔：小螢幕隱藏 */}
        <Button
          variant="default"
          size="sm"
          onClick={onManualSave}
          disabled={saveStatus === "saving"}
          className="hidden sm:flex h-8 rounded-md items-center gap-1.5 text-sm shrink-0"
          title={t("editorHeader.manualSave")}
        >
          {saveStatus === "saving" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden lg:inline">{t("editorHeader.manualSave")}</span>
        </Button>

        {/* 預覽切換：所有尺寸都顯示 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePreview}
          className={`h-8 rounded-md transition-colors flex items-center gap-2 text-sm ${
            showPreview
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground"
          }`}
          title={showPreview ? t("editorHeader.switchToEditOnly") : t("editorHeader.switchToSplit")}
        >
          {showPreview ? (
            <Columns className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span className="hidden lg:inline">
            {showPreview ? t("editorHeader.editAndPreview") : t("editorHeader.editOnly")}
          </span>
        </Button>

        {/* 語法規則：小螢幕隱藏 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRules}
          className={`hidden sm:flex h-8 rounded-md transition-colors items-center gap-2 text-sm ${
            showRules
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-muted-foreground"
          }`}
          title={t("editorHeader.syntaxRules")}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden lg:inline">{t("editorHeader.syntaxRules")}</span>
        </Button>

        {/* Marker 控制：小螢幕隱藏 */}
        <MarkerThemeVisibilityControl
          markerConfigs={markerConfigs}
          hiddenMarkerIds={hiddenMarkerIds}
          onToggleMarker={onToggleMarker}
          markerThemes={markerThemes}
          currentThemeId={currentThemeId}
          onSwitchMarkerTheme={onSwitchMarkerTheme}
          compact
          iconOnlyOnMobile
          className="hidden sm:flex shrink-0"
          visibilityTriggerClassName="h-8 px-2 text-xs rounded-r-none bg-background border border-r-0 hover:bg-muted/50 transition-all"
          themeTriggerClassName="h-8 px-2 rounded-l-none rounded-r-md bg-background border text-muted-foreground hover:bg-muted/50 transition-all"
          contentAlign="end"
          titlePrefix={t("editorHeader.markerPrefix")}
        />

        {/* ⋯ 更多 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={moreActionsRef}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
              title={t("editorHeader.moreActions")}
              aria-label={t("editorHeader.moreActions")}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{t("editorHeader.moreActions")}</DropdownMenuLabel>

            {/* 小螢幕才顯示的快捷項目 */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onManualSave} disabled={saveStatus === "saving"}>
                {saveStatus === "saving" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {t("editorHeader.manualSave")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleRules}>
                <HelpCircle className="w-4 h-4 mr-2" />
                {t("editorHeader.syntaxRules")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>

            <div className="px-2 py-1.5">
              <div className="text-[11px] text-muted-foreground mb-1">{t("settings.language")}</div>
              <LanguageSwitcher className="w-full" selectClassName="w-full" />
            </div>
            <DropdownMenuSeparator />
            {onOpenGuide && (
              <DropdownMenuItem ref={guideButtonRef} onClick={onOpenGuide}>
                <HelpCircle className="w-4 h-4 mr-2" />
                {t("editorHeader.guide")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onToggleStats}>
              <BarChart2 className="w-4 h-4 mr-2" />
              {t("editorHeader.stats")}
            </DropdownMenuItem>
            {enabledDownloadOptions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("editorHeader.download")}</DropdownMenuLabel>
                {enabledDownloadOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    disabled={Boolean(opt.disabled)}
                    onClick={(e) => {
                      e.stopPropagation();
                      opt.onClick?.(e);
                    }}
                  >
                    {opt.icon ? <opt.icon className="w-4 h-4 mr-2" /> : null}
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

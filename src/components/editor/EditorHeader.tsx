import React, { useState } from "react";
import { Loader2, Save, Eye, ListFilter, ChartNoAxesColumn, CircleHelp, Ellipsis, Check, AlertCircle, Settings2 } from "lucide-react";
import { useEditableTitle } from "../../hooks/useEditableTitle";
import EditableTitle from "../header/EditableTitle";
import HeaderTitleBlock from "../header/HeaderTitleBlock";
import { StatusPill } from "../studio/StatusPill";
import { ScriptMetadataDialog } from "../dashboard/ScriptMetadataDialog";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MarkerThemeVisibilityControl } from "../ui/MarkerThemeVisibilityControl";
import { useI18n } from "../../contexts/I18nContext";
import type { MarkerConfig } from "../../types/script";

interface DownloadOption {
  id: string;
  label: string;
  hidden?: boolean;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: (event?: React.MouseEvent) => void;
  renderDialog?: () => React.ReactNode;
}

interface EditorScript {
  status?: "Public" | "Private" | string;
  [key: string]: unknown;
}

interface MarkerThemeLike {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface EditorHeaderProps {
  readOnly: boolean;
  title: string;
  onBack: () => void;
  onManualSave: () => void;
  saveStatus?: "saving" | "saved" | "unsaved" | "error" | "local-saved";
  lastSaved: Date | null;
  showRules: boolean;
  onToggleRules: () => void;
  downloadOptions?: DownloadOption[];
  onToggleStats: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  isSidebarOpen?: boolean;
  onSetSidebarOpen?: (open: boolean) => void;
  onTitleChange: (title: string) => void;
  markerConfigs?: MarkerConfig[];
  markerThemes?: MarkerThemeLike[];
  currentThemeId?: string;
  onSwitchMarkerTheme?: (themeId: string) => void;
  hiddenMarkerIds?: string[];
  onToggleMarker: (id: string) => void;
  script?: EditorScript;
  onScriptUpdate?: (updated: EditorScript) => void;
}

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
  markerThemes = [],
  currentThemeId = "default",
  onSwitchMarkerTheme = () => {},
  hiddenMarkerIds = [],
  onToggleMarker,
  script, // Full script object for metadata
  onScriptUpdate // Callback when metadata changes
}: EditorHeaderProps) {
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
    <div className="flex min-w-0 shrink-0 flex-row items-center justify-between gap-2 border-b border-border bg-background px-2 py-2 sm:px-3">
      <HeaderTitleBlock
        onBack={onBack}
        backButtonClassName="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors"
        backIconClassName="w-5 h-5 text-muted-foreground"
        backTitle={t("editorHeader.backToDashboard")}
        backAriaLabel={t("editorHeader.backToDashboard")}
        onOpenSidebar={() => onSetSidebarOpen?.(true)}
        sidebarButtonClassName="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors lg:hidden"
        sidebarIconClassName="w-5 h-5 text-muted-foreground"
        sidebarTitle={t("editorHeader.backToDashboard")}
        sidebarAriaLabel={t("editorHeader.backToDashboard")}
        containerClassName="flex items-center gap-2 min-w-0 flex-1"
        titleWrapperClassName="min-w-0"
        metaNode={null}
        titleNode={
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <EditableTitle
                isEditing={isEditing}
                editTitle={editTitle}
                setEditTitle={(val: string) => setEditTitle(val)}
                onSubmit={submitTitle}
                inputClassName="font-semibold text-[15px] border border-primary/50 rounded-md px-1.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary min-w-[80px] w-[30vw] max-w-[240px]"
                inputProps={{}}
                renderDisplay={() => (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2
                        className="font-semibold text-[15px] cursor-text hover:bg-muted/60 rounded-md px-1.5 py-1 -ml-1 transition-colors truncate max-w-[34vw] sm:max-w-[200px] md:max-w-[280px]"
                        onDoubleClick={startEditing}
                        title={t("editorHeader.doubleClickRename")}
                    >
                        {title}
                    </h2>
                    <button
                        type="button"
                        className="hidden shrink-0 rounded-full sm:inline-flex"
                        onClick={() => setShowMetadataDialog(true)}
                        title={t("editorHeader.publishSettings", "發布設定")}
                    >
                        <StatusPill status={script?.status === "Public" ? "live" : "draft"}>
                            {script?.status === "Public" ? t("editorHeader.public") : t("editorHeader.private")}
                        </StatusPill>
                    </button>
                  </div>
                )}
              />
              <ScriptMetadataDialog 
                open={showMetadataDialog} 
                onOpenChange={setShowMetadataDialog} 
                script={script}
                scriptId={String((script as { id?: string } | undefined)?.id || "")}
                onSeriesCreated={() => {}}
                onSave={(updated) => {
                    if (onScriptUpdate) onScriptUpdate(updated);
                    setShowMetadataDialog(false);
                }}
              />
              <div
                className={`flex shrink-0 items-center gap-1.5 text-xs ${
                    saveStatus === "error" ? "text-destructive" :
                    saveStatus === "local-saved" ? "text-[hsl(var(--status-ready-fg))]" :
                    "text-muted-foreground"
                }`}
                title={saveStatusTitle}
                aria-label={saveStatusTitle}
                role="status"
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saveStatus === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : saveStatus === "saved" ? (
                  <Check className="h-3.5 w-3.5 text-[hsl(var(--status-live-fg))]" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span className="hidden lg:inline">{saveStatusLabel}</span>
              </div>
            </div>
          </div>
        }
      />
      <div className="flex items-center gap-1 shrink-0">

        <Button
          variant="ghost"
          size="icon"
          onClick={onManualSave}
          disabled={saveStatus === "saving"}
          className="hidden h-9 w-9 shrink-0 rounded-md text-muted-foreground hover:text-foreground sm:inline-flex"
          title={t("editorHeader.manualSave")}
          aria-label={t("editorHeader.manualSave")}
        >
          {saveStatus === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        </Button>

        {/* 預覽切換：icon only，tooltip */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onTogglePreview}
          className={`h-9 w-9 rounded-md transition-colors ${
            showPreview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title={showPreview ? t("editorHeader.switchToEditOnly") : t("editorHeader.switchToSplit")}
          aria-label={showPreview ? t("editorHeader.switchToEditOnly") : t("editorHeader.switchToSplit")}
        >
          <Eye className="w-4 h-4" />
        </Button>

        {/* Marker 控制 */}
        <MarkerThemeVisibilityControl
          markerConfigs={markerConfigs}
          hiddenMarkerIds={hiddenMarkerIds}
          onToggleMarker={onToggleMarker}
          markerThemes={markerThemes}
          currentThemeId={currentThemeId}
          onSwitchMarkerTheme={onSwitchMarkerTheme}
          className="shrink-0"
          visibilityTriggerClassName="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          contentAlign="end"
          titlePrefix={t("editorHeader.markerPrefix")}
          triggerIcon={ListFilter}
        />

        {/* ⋯ 更多 */}
        {/* Non-modal: items here open Dialogs. A modal menu plus a modal Dialog trap focus against each other, recurse until the stack overflows and freeze the page. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground"
              title={t("editorHeader.moreActions")}
              aria-label={t("editorHeader.moreActions")}
            >
              <Ellipsis className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onManualSave} disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t("editorHeader.manualSave")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleRules} className={showRules ? "text-primary" : ""}>
              <CircleHelp className="w-4 h-4 mr-2" />
              {t("editorHeader.syntaxRules")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleStats}>
              <ChartNoAxesColumn className="w-4 h-4 mr-2" />
              {t("editorHeader.stats")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="text-[11px] text-muted-foreground mb-1">{t("settings.language")}</div>
              <LanguageSwitcher className="w-full" selectClassName="w-full" ariaLabel={t("settings.language")} buttonClassName="" />
            </div>
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
        <Button
          type="button"
          size="sm"
          className="ml-1 h-9 shrink-0"
          onClick={() => setShowMetadataDialog(true)}
          aria-label={t("editorHeader.publishSettings", "發布設定")}
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden md:inline">{t("editorHeader.publishSettings", "發布設定")}</span>
        </Button>
        {enabledDownloadOptions.map((opt) => (
          <React.Fragment key={`${opt.id}-dialog`}>{opt.renderDialog?.()}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

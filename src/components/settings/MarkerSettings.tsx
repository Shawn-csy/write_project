import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { useSettings } from "../../contexts/SettingsContext";
import { useMarkerSettingsState } from "../../hooks/settings/useMarkerSettingsState";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerSettingsHeader } from "./marker/layout/MarkerSettingsHeader";
import { MarkerSettingsModeContent } from "./marker/layout/MarkerSettingsModeContent";
import { V2LayoutPreviewEditor } from "./marker/V2LayoutPreviewEditor";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
import type { MarkerConfig } from "../../types/script";
import type { LayoutConfig } from "../../lib/v2";

interface FormatSaveStatusArgs {
  isSaving: boolean;
  parseError: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
  t: (key: string) => string;
}

function formatSaveStatus({ isSaving, parseError, isDirty, lastSavedAt, t }: FormatSaveStatusArgs): string {
  if (isSaving) return t("markerSettings.saving");
  if (parseError) return t("markerSettings.jsonError");
  if (isDirty) return t("markerSettings.unsaved");
  if (lastSavedAt) {
    return t("markerSettings.savedAt").replace(
      "{time}",
      lastSavedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
  return t("markerSettings.synced");
}

interface MarkerSettingsProps {
  sectionRef?: React.Ref<HTMLDivElement>;
}

export function MarkerSettings({ sectionRef }: MarkerSettingsProps): React.JSX.Element {
  const { t } = useI18n();
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const {
    markerConfigs,
    setMarkerConfigs,
    currentUser,
    markerThemes,
    currentThemeId,
    switchTheme,
    addTheme,
    addThemeFromCurrent,
    deleteTheme,
    renameTheme,
    updateThemeDescription,
    updateThemePublicity,
    useV2Renderer,
    v2LayoutConfig,
    setV2LayoutConfig,
  } = useSettings();
  const readOnly = !isAdmin && currentThemeId === "default";

  const [viewMode, setViewMode] = useState<"ui" | "json" | "guide">("ui");
  const markerState = useMarkerSettingsState({
    markerConfigs,
    setMarkerConfigs,
    viewMode,
    readOnly,
  });

  const {
    localConfigs,
    setLocalConfigs,
    expandedId,
    setExpandedId,
    jsonText,
    setJsonText,
    parseError,
    isDirty,
    isSaving,
    lastSavedAt,
    existingIds,
    updateMarker,
    addMarker,
    removeMarker,
    applyJson,
    isAdvancedMode,
    setIsAdvancedMode,
    save: saveMarkerConfigs,
  } = markerState;

  // Pending layout config — only pushed to API on save
  const [pendingLayoutConfig, setPendingLayoutConfig] = useState<LayoutConfig>(v2LayoutConfig);
  const [layoutDirty, setLayoutDirty] = useState(false);

  // Sync pending when theme switches (v2LayoutConfig changes from outside)
  useEffect(() => {
    setPendingLayoutConfig(v2LayoutConfig);
    setLayoutDirty(false);
  }, [v2LayoutConfig]);

  const handleLayoutChange = useCallback((config: LayoutConfig) => {
    setPendingLayoutConfig(config);
    setLayoutDirty(true);
  }, []);

  const anyDirty = isDirty || layoutDirty;
  const canSave = anyDirty && !isSaving && !readOnly && !parseError;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    if (layoutDirty) {
      setV2LayoutConfig(pendingLayoutConfig);
      setLayoutDirty(false);
    }
    if (isDirty) {
      await saveMarkerConfigs();
    }
  }, [canSave, layoutDirty, isDirty, pendingLayoutConfig, setV2LayoutConfig, saveMarkerConfigs]);

  const selectedConfig = useMemo<MarkerConfig | null>(
    () => localConfigs.find((c) => (c.id || c._tempId) === expandedId) || null,
    [localConfigs, expandedId]
  );
  const selectedIndex = useMemo(
    () => localConfigs.findIndex((c) => (c.id || c._tempId) === expandedId),
    [localConfigs, expandedId]
  );
  const statusText = formatSaveStatus({ isSaving, parseError, isDirty: anyDirty, lastSavedAt, t });
  const readonlyStatusText = readOnly ? "預設主題為唯讀，請先建立或切換到自訂主題再編輯" : statusText;

  // Dialog open states lifted here so V2LayoutPreviewEditor header buttons can trigger them
  const [themeCreateOpen, setThemeCreateOpen] = useState(false);
  const [themeDeleteOpen, setThemeDeleteOpen] = useState(false);
  const [themePublicityOpen, setThemePublicityOpen] = useState(false);
  const [themeMoreOpen, setThemeMoreOpen] = useState(false);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);

  return (
    <div ref={sectionRef} className="h-full flex flex-col">
      <Card className="flex-1 min-h-0 border border-border/60 bg-card/50 shadow-sm overflow-hidden flex flex-col">
        <MarkerSettingsHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusText={readonlyStatusText}
          isDirty={canSave}
          onSave={handleSave}
          isSaving={isSaving}
        />

        <div className="px-5 py-2 border-b bg-background/50 shrink-0">
          <MarkerThemeHeader
            markerThemes={markerThemes}
            currentThemeId={currentThemeId}
            switchTheme={switchTheme}
            addTheme={addTheme}
            addThemeFromCurrent={addThemeFromCurrent}
            deleteTheme={deleteTheme}
            renameTheme={renameTheme}
            updateThemeDescription={updateThemeDescription}
            updateThemePublicity={updateThemePublicity}
            currentUser={currentUser}
            readOnly={false}
            createOpen={themeCreateOpen}
            setCreateOpen={setThemeCreateOpen}
            deleteOpen={themeDeleteOpen}
            setDeleteOpen={setThemeDeleteOpen}
            publicityOpen={themePublicityOpen}
            setPublicityOpen={setThemePublicityOpen}
            moreOpen={themeMoreOpen}
            setMoreOpen={setThemeMoreOpen}
          />
        </div>

        <div className="flex-1 min-h-0 bg-background/40">
          <MarkerSettingsModeContent
            viewMode={viewMode}
            localConfigs={localConfigs}
            setLocalConfigs={setLocalConfigs}
            updateMarker={updateMarker}
            removeMarker={removeMarker}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            selectedConfig={selectedConfig}
            selectedIndex={selectedIndex}
            existingIds={existingIds}
            onAddMarker={addMarker}
            jsonText={jsonText}
            setJsonText={setJsonText}
            parseError={parseError}
            applyJson={applyJson}
            isDirty={isDirty}
            isSaving={isSaving}
            isAdvancedMode={isAdvancedMode}
            setIsAdvancedMode={setIsAdvancedMode}
            readOnly={readOnly}
            tracks={pendingLayoutConfig.tracks}
            showLayoutContext={useV2Renderer && viewMode === "ui"}
            onOpenFullLayoutEditor={() => setLayoutEditorOpen(true)}
          />
        </div>
      </Card>

      <Sheet open={layoutEditorOpen} onOpenChange={setLayoutEditorOpen}>
        <SheetContent side="right" className="flex w-[min(96vw,1040px)] flex-col p-0 sm:max-w-none">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{t("markerSettingsHeader.viewLayout")}</SheetTitle>
            <SheetDescription>{t("markerLayoutContext.fullEditorDescription")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <V2LayoutPreviewEditor
              layoutConfig={pendingLayoutConfig}
              onChange={handleLayoutChange}
              markerConfigs={localConfigs}
              selectedConfig={selectedConfig}
              t={t}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

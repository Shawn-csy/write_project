import React, { useMemo, useState } from "react";
import { Card } from "../ui/card";
import { useSettings } from "../../contexts/SettingsContext";
import { useMarkerSettingsState } from "../../hooks/settings/useMarkerSettingsState";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerSettingsHeader } from "./marker/layout/MarkerSettingsHeader";
import { MarkerSettingsModeContent } from "./marker/layout/MarkerSettingsModeContent";
import { V2LayoutPreviewEditor } from "./marker/V2LayoutPreviewEditor";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
import type { MarkerConfig } from "../../types/script";

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
  } = markerState;

  const selectedConfig = useMemo<MarkerConfig | null>(
    () => localConfigs.find((c) => (c.id || c._tempId) === expandedId) || null,
    [localConfigs, expandedId]
  );
  const selectedIndex = useMemo(
    () => localConfigs.findIndex((c) => (c.id || c._tempId) === expandedId),
    [localConfigs, expandedId]
  );
  const statusText = formatSaveStatus({ isSaving, parseError, isDirty, lastSavedAt, t });
  const readonlyStatusText = readOnly ? "預設主題為唯讀，請先建立或切換到自訂主題再編輯" : statusText;

  // Dialog open states lifted here so V2LayoutPreviewEditor header buttons can trigger them
  const [themeCreateOpen, setThemeCreateOpen] = useState(false);
  const [themeDeleteOpen, setThemeDeleteOpen] = useState(false);
  const [themePublicityOpen, setThemePublicityOpen] = useState(false);
  const [themeMoreOpen, setThemeMoreOpen] = useState(false);

  const currentTheme = markerThemes.find((theme) => theme.id === currentThemeId);
  const canDelete = markerThemes.length > 1 && currentTheme?.id !== "default";

  const themeBar = useV2Renderer ? {
    markerThemes,
    currentThemeId,
    switchTheme,
    onNew: () => setThemeCreateOpen(true),
    onDelete: () => setThemeDeleteOpen(true),
    onShare: () => setThemePublicityOpen(true),
    onMore: () => setThemeMoreOpen(true),
    canDelete,
    isPublic: currentTheme?.isPublic,
    currentUser,
  } : undefined;

  return (
    <div ref={sectionRef} className="h-full flex flex-col">
      <Card className="flex-1 min-h-0 border border-border/60 bg-card/50 shadow-sm overflow-hidden flex flex-col">
        <MarkerSettingsHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusText={readonlyStatusText}
        />

        {/* MarkerThemeHeader: dialogs-only when v2 (theme bar is in V2LayoutPreviewEditor header) */}
        {useV2Renderer ? (
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
            dialogsOnly
            createOpen={themeCreateOpen}
            setCreateOpen={setThemeCreateOpen}
            deleteOpen={themeDeleteOpen}
            setDeleteOpen={setThemeDeleteOpen}
            publicityOpen={themePublicityOpen}
            setPublicityOpen={setThemePublicityOpen}
            moreOpen={themeMoreOpen}
            setMoreOpen={setThemeMoreOpen}
          />
        ) : (
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
            />
          </div>
        )}

        {useV2Renderer ? (
          <V2LayoutPreviewEditor
            layoutConfig={v2LayoutConfig}
            onChange={setV2LayoutConfig}
            markerConfigs={localConfigs}
            selectedConfig={selectedConfig}
            t={t}
            themeBar={themeBar}
          />
        ) : null}

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
            tracks={v2LayoutConfig.tracks}
          />
        </div>
      </Card>
    </div>
  );
}

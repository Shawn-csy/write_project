import React, { useMemo, useState } from "react";
import { Card } from "../ui/card";
import { useSettings } from "../../contexts/SettingsContext";
import { useMarkerSettingsState } from "../../hooks/settings/useMarkerSettingsState";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerWizard } from "./marker/MarkerWizard";
import { MarkerSettingsHeader } from "./marker/layout/MarkerSettingsHeader";
import { MarkerSettingsModeContent } from "./marker/layout/MarkerSettingsModeContent";
import { useI18n } from "../../contexts/I18nContext";

function formatSaveStatus({ isSaving, parseError, isDirty, lastSavedAt, t }) {
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

export function MarkerSettings({ sectionRef }) {
  const { t } = useI18n();
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
  } = useSettings();

  const [viewMode, setViewMode] = useState("ui");
  const markerState = useMarkerSettingsState({
    markerConfigs,
    setMarkerConfigs,
    viewMode,
  });

  const {
    localConfigs,
    setLocalConfigs,
    expandedId,
    setExpandedId,
    wizardOpen,
    setWizardOpen,
    jsonText,
    setJsonText,
    parseError,
    isDirty,
    isSaving,
    lastSavedAt,
    existingIds,
    updateMarker,
    addMarkerFromWizard,
    removeMarker,
    applyJson,
    isAdvancedMode,
    setIsAdvancedMode,
  } = markerState;

  const selectedConfig = useMemo(
    () => localConfigs.find((c) => (c.id || c._tempId) === expandedId),
    [localConfigs, expandedId]
  );
  const selectedIndex = useMemo(
    () => localConfigs.findIndex((c) => (c.id || c._tempId) === expandedId),
    [localConfigs, expandedId]
  );
  const statusText = formatSaveStatus({ isSaving, parseError, isDirty, lastSavedAt, t });

  return (
    <Card
      className="border border-border/60 bg-card/50 shadow-sm overflow-hidden flex flex-col h-auto md:h-[760px]"
      ref={sectionRef}
    >
      <MarkerSettingsHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        statusText={statusText}
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
          onOpenWizard={() => setWizardOpen(true)}
          jsonText={jsonText}
          setJsonText={setJsonText}
          parseError={parseError}
          applyJson={applyJson}
          isDirty={isDirty}
          isSaving={isSaving}
          isAdvancedMode={isAdvancedMode}
          setIsAdvancedMode={setIsAdvancedMode}
        />
      </div>

      <MarkerWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={addMarkerFromWizard}
      />
    </Card>
  );
}

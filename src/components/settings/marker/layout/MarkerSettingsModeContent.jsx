import React from "react";
import { MarkerJsonEditor } from "../MarkerJsonEditor";
import { MarkerUsageGuide } from "../MarkerUsageGuide";
import { MarkerVisualEditorPane } from "./MarkerVisualEditorPane";

export function MarkerSettingsModeContent({
  viewMode,
  localConfigs,
  setLocalConfigs,
  updateMarker,
  removeMarker,
  expandedId,
  setExpandedId,
  selectedConfig,
  selectedIndex,
  existingIds,
  onOpenWizard,
  jsonText,
  setJsonText,
  parseError,
  applyJson,
  isDirty,
  isSaving,
  isAdvancedMode,
  setIsAdvancedMode,
}) {
  if (viewMode === "guide") {
    return (
      <div className="h-full overflow-hidden p-6 text-sm">
        <MarkerUsageGuide markerConfigs={localConfigs} />
      </div>
    );
  }

  if (viewMode === "json") {
    return (
      <div className="h-full p-4">
        <MarkerJsonEditor
          jsonText={jsonText}
          setJsonText={setJsonText}
          parseError={parseError}
          onApplyJson={applyJson}
          isDirty={isDirty}
          isSaving={isSaving}
        />
      </div>
    );
  }

  return (
    <MarkerVisualEditorPane
      localConfigs={localConfigs}
      setLocalConfigs={setLocalConfigs}
      updateMarker={updateMarker}
      removeMarker={removeMarker}
      expandedId={expandedId}
      setExpandedId={setExpandedId}
      selectedConfig={selectedConfig}
      selectedIndex={selectedIndex}
      existingIds={existingIds}
      onOpenWizard={onOpenWizard}
      isAdvancedMode={isAdvancedMode}
      setIsAdvancedMode={setIsAdvancedMode}
    />
  );
}

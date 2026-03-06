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
  onAddMarker,
  jsonText,
  setJsonText,
  parseError,
  applyJson,
  isDirty,
  isSaving,
  isAdvancedMode,
  setIsAdvancedMode,
  readOnly = false,
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
      <fieldset disabled={readOnly} className="h-full min-h-0 p-4">
        <MarkerJsonEditor
          jsonText={jsonText}
          setJsonText={setJsonText}
          parseError={parseError}
          onApplyJson={applyJson}
          isDirty={isDirty}
          isSaving={isSaving}
          readOnly={readOnly}
        />
      </fieldset>
    );
  }

  return (
    <fieldset disabled={readOnly} className="h-full min-h-0">
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
        onAddMarker={onAddMarker}
        isAdvancedMode={isAdvancedMode}
        setIsAdvancedMode={setIsAdvancedMode}
        readOnly={readOnly}
      />
    </fieldset>
  );
}

import React from "react";
import { MarkerJsonEditor } from "../MarkerJsonEditor";
import { MarkerUsageGuide } from "../MarkerUsageGuide";
import { MarkerVisualEditorPane } from "./MarkerVisualEditorPane";
import type { MarkerConfig } from "../../../../types/script";
import type { TrackConfig } from "../../../../lib/v2";
import type { EditableMarkerConfig, UpdateMarkerFn } from "../types";

interface MarkerSettingsModeContentProps {
  viewMode: "ui" | "json" | "guide";
  localConfigs: MarkerConfig[];
  setLocalConfigs: React.Dispatch<React.SetStateAction<MarkerConfig[]>>;
  updateMarker: UpdateMarkerFn;
  removeMarker: (idx: number) => void;
  expandedId: string | null;
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedConfig: EditableMarkerConfig | null;
  selectedIndex: number;
  existingIds: string[];
  onAddMarker: () => void;
  jsonText: string;
  setJsonText: (value: string) => void;
  parseError: string | null;
  applyJson: () => void;
  isDirty: boolean;
  isSaving: boolean;
  isAdvancedMode: boolean;
  setIsAdvancedMode: (value: boolean) => void;
  readOnly?: boolean;
  tracks?: TrackConfig[];
  showLayoutContext?: boolean;
  onOpenFullLayoutEditor?: () => void;
}

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
  tracks = [],
  showLayoutContext = false,
  onOpenFullLayoutEditor,
}: MarkerSettingsModeContentProps): React.JSX.Element {
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
        setExpandedId={(id) => setExpandedId(String(id))}
        selectedConfig={selectedConfig}
        selectedIndex={selectedIndex}
        existingIds={existingIds}
        onAddMarker={onAddMarker}
        isAdvancedMode={isAdvancedMode}
        setIsAdvancedMode={setIsAdvancedMode}
        readOnly={readOnly}
        tracks={tracks}
        showLayoutContext={showLayoutContext}
        onOpenFullLayoutEditor={onOpenFullLayoutEditor}
      />
    </fieldset>
  );
}

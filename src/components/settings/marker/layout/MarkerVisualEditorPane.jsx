import React from "react";
import { PlusCircle, Sparkles } from "lucide-react";
import { Button } from "../../../ui/button";
import { MarkerList } from "../MarkerList";
import { MarkerDetailEditor } from "../MarkerDetailEditor";

export function MarkerVisualEditorPane({
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
  isAdvancedMode,
  setIsAdvancedMode,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] h-full divide-x divide-border/40">
      <div className="h-full min-h-0 flex flex-col bg-muted/10">
        <div className="p-3 border-b bg-background/30 shrink-0">
          <Button onClick={onOpenWizard} className="w-full gap-1.5 h-8 text-xs font-medium shadow-sm">
            <PlusCircle className="w-3.5 h-3.5" />
            新增標記
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <MarkerList
            localConfigs={localConfigs}
            setLocalConfigs={setLocalConfigs}
            updateMarker={updateMarker}
            removeMarker={removeMarker}
            selectedId={expandedId}
            onSelect={setExpandedId}
          />
        </div>
      </div>

      <div className="h-full min-h-0 bg-background/20 relative">
        {selectedConfig ? (
          <MarkerDetailEditor
            config={selectedConfig}
            idx={selectedIndex}
            updateMarker={updateMarker}
            existingIds={existingIds}
            setExpandedId={setExpandedId}
            isAdvancedMode={isAdvancedMode}
            setIsAdvancedMode={setIsAdvancedMode}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 space-y-3">
            <Sparkles className="w-12 h-12 stroke-1" />
            <p className="text-sm">從左側選擇標記，或建立新標記</p>
          </div>
        )}
      </div>
    </div>
  );
}

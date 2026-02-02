import React from "react";
import MarkerVisibilitySelect from "../MarkerVisibilitySelect";
import SceneSelect from "./SceneSelect";
import CharacterSelect from "./CharacterSelect";
import ControlsRow from "./ControlsRow";


export function ReaderControls({
    sceneList = [],
    currentSceneId,
    onSelectScene,
    characterList = [],
    filterCharacter,
    setFilterCharacter,

    setFocusMode,
    markerConfigs,
    visibleMarkerIds,
    onToggleMarker
}) {
    return (
        <ControlsRow>
            {sceneList.length > 0 && (
              <div className="w-full sm:min-w-[150px] sm:w-auto">
                <SceneSelect
                  sceneList={sceneList}
                  currentSceneId={currentSceneId}
                  onSelectScene={onSelectScene}
                  triggerClassName="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium"
                  contentAlign="start"
                  label="場景"
                  placeholder="選擇場景"
                />
              </div>
            )}
            {characterList.length > 0 && (
              <div className="w-full sm:min-w-[150px] sm:w-auto">
                <CharacterSelect
                  characterList={characterList}
                  filterCharacter={filterCharacter}
                  onChange={(val) => {
                    setFilterCharacter(val);
                    if (val && val !== "__ALL__") {
                      setFocusMode(true);
                    } else {
                      setFocusMode(false);
                    }
                  }}
                  triggerClassName="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium"
                  contentAlign="start"
                  label="角色"
                  placeholder="角色篩選"
                />
              </div>
            )}
            
            {/* Marker Visibility Toggle */}
            {markerConfigs && markerConfigs.length > 0 && onToggleMarker && (
              <div className="w-full sm:min-w-[150px] sm:w-auto">
                <MarkerVisibilitySelect
                  markerConfigs={markerConfigs}
                  visibleMarkerIds={visibleMarkerIds}
                  onToggleMarker={onToggleMarker}
                  triggerClassName="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium"
                  contentAlign="start"
                  titlePrefix="標記顯示"
                />
              </div>
            )}
        </ControlsRow>
    );
}

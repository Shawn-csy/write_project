import React from "react";
import { MarkerThemeVisibilityControl } from "../ui/MarkerThemeVisibilityControl";
import SceneSelect from "./SceneSelect";
import CharacterSelect from "./CharacterSelect";
import ControlsRow from "./ControlsRow";
import { useI18n } from "../../contexts/I18nContext";

interface SceneItem {
  id: string;
  label?: string;
  header?: string;
  index?: number | string;
}

interface MarkerConfigItem {
  id: string;
  label?: string;
  [key: string]: unknown;
}

interface MarkerThemeItem {
  id: string;
  name?: string;
  [key: string]: unknown;
}

interface ReaderControlsProps {
  sceneList?: SceneItem[];
  currentSceneId?: string;
  onSelectScene: (sceneId: string) => void;
  characterList?: string[];
  filterCharacter?: string;
  setFilterCharacter: (value: string) => void;
  setFocusMode: (focused: boolean) => void;
  markerConfigs?: MarkerConfigItem[];
  markerThemes?: MarkerThemeItem[];
  currentThemeId?: string;
  onSwitchMarkerTheme?: (themeId: string) => void;
  visibleMarkerIds?: string[];
  hiddenMarkerIds?: string[];
  onToggleMarker?: (markerId: string) => void;
}

export function ReaderControls({
    sceneList = [],
    currentSceneId,
    onSelectScene,
    characterList = [],
    filterCharacter,
    setFilterCharacter,

    setFocusMode,
    markerConfigs,
    markerThemes = [],
    currentThemeId = "default",
    onSwitchMarkerTheme = () => {},
    visibleMarkerIds,
    hiddenMarkerIds,
    onToggleMarker
}: ReaderControlsProps) {
    const { t } = useI18n();
    return (
        <ControlsRow className="">
            {sceneList.length > 0 && (
              <div className="w-full sm:min-w-[150px] sm:w-auto">
                <SceneSelect
                  sceneList={sceneList}
                  currentSceneId={currentSceneId}
                  onSelectScene={onSelectScene}
                  triggerClassName="h-10 px-3 text-sm w-full bg-muted/40 hover:bg-muted/60 border-transparent hover:border-border transition-all font-medium"
                  contentAlign="start"
                  label={t("readerControls.scene")}
                  placeholder={t("readerControls.scenePlaceholder")}
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
                  label={t("readerControls.character")}
                  placeholder={t("readerControls.characterPlaceholder")}
                />
              </div>
            )}
            
            {/* Marker Visibility Toggle */}
            {markerConfigs && markerConfigs.length > 0 && onToggleMarker && (
              <div className="w-full sm:min-w-[150px] sm:w-auto">
                <MarkerThemeVisibilityControl
                  markerConfigs={markerConfigs}
                  markerThemes={markerThemes}
                  currentThemeId={currentThemeId}
                  onSwitchMarkerTheme={onSwitchMarkerTheme}
                  visibleMarkerIds={visibleMarkerIds}
                  hiddenMarkerIds={hiddenMarkerIds}
                  onToggleMarker={onToggleMarker}
                  className="w-full"
                  visibilityTriggerClassName="h-10 px-3 text-sm w-full rounded-md bg-muted/40 hover:bg-muted/60 border border-transparent hover:border-border transition-all font-medium justify-start gap-2"
                  contentAlign="start"
                  titlePrefix={t("readerControls.markerVisibility")}
                />
              </div>
            )}
        </ControlsRow>
    );
}

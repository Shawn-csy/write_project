import { useState, useEffect, useMemo } from "react";
import generatedFileMeta from "../constants/fileMeta.generated.json";
import { resolveEffectiveMarkerConfigs } from "../lib/markerConfigResolver.js";
import { parseScreenplay } from "../lib/screenplayAST";

/** @returns {import("./useScriptManager.types").ScriptManager} */
export function useScriptManager(initialParamsRef, initialMarkerConfigs = []) {
  const [rawScript, setRawScript] = useState("");

  // Metadata & Indexing
  const [fileMeta, setFileMeta] = useState({});

  // Scoped configs for route-specific parsing (e.g. public reader script theme)
  const [scopedMarkerConfigs, setScopedMarkerConfigs] = useState(null);
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState([]);

  const toggleMarkerVisibility = (id) => {
    setHiddenMarkerIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };
  
  // Effective Configs
  const { configs: effectiveMarkerConfigs } = useMemo(() => {
    return resolveEffectiveMarkerConfigs({
      baseConfigs: initialMarkerConfigs,
      scopedConfigs: scopedMarkerConfigs,
    });
  }, [initialMarkerConfigs, scopedMarkerConfigs]);
  
  // AST Parsing (Centralized)
  const { ast, scenes: parsedScenes, titleEntries: parsedTitleEntries } = useMemo(() => {
    return parseScreenplay(rawScript || "", effectiveMarkerConfigs);
  }, [rawScript, effectiveMarkerConfigs]);

  // Script Content State
  const [sceneList, setSceneList] = useState([]);
  const [characterList, setCharacterList] = useState([]);
  const [rawScriptHtml, setRawScriptHtml] = useState("");
  const [processedScriptHtml, setProcessedScriptHtml] = useState("");
  
  // Title Page Info
  const [titleHtml, setTitleHtml] = useState("");
  const [titleName, setTitleName] = useState("");
  const [titleNote, setTitleNote] = useState("");
  const [titleSummary, setTitleSummary] = useState("");
  const [hasTitle, setHasTitle] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  // Focus & Filter State (often reset on load)
  const [filterCharacter, setFilterCharacter] = useState("__ALL__");
  const [focusMode, setFocusMode] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState("");
  const [scrollSceneId, setScrollSceneId] = useState("");

  // App Flow State (Moved from App.jsx)
  const [activeCloudScript, setActiveCloudScript] = useState(null);
  const [cloudScriptMode, setCloudScriptMode] = useState("read"); // read | edit
  const [activePublicScriptId, setActivePublicScriptId] = useState(null);

  // File Meta (Dates)
  useEffect(() => {
    if (generatedFileMeta && Object.keys(generatedFileMeta).length) {
      const normalized = {};
      Object.entries(generatedFileMeta).forEach(([key, val]) => {
        const dateStr = typeof val === "object" ? val.mtime : val;
        normalized[key] = new Date(dateStr);
      });
      setFileMeta((prev) => ({ ...normalized, ...prev }));
    }
  }, []);

  const manager = {
    rawScript,
    setRawScript,
    fileMeta,
    sceneList, setSceneList,
    characterList, setCharacterList,
    rawScriptHtml, setRawScriptHtml,
    processedScriptHtml, setProcessedScriptHtml,
    titleHtml, setTitleHtml,
    titleName, setTitleName,
    titleNote, setTitleNote,
    titleSummary, setTitleSummary,
    hasTitle, setHasTitle,
    showTitle, setShowTitle,
    // Focus/Filter
    filterCharacter, setFilterCharacter,
    focusMode, setFocusMode,
    currentSceneId, setCurrentSceneId,
    scrollSceneId, setScrollSceneId,
    // Cloud/Public State
    activeCloudScript, setActiveCloudScript,
    cloudScriptMode, setCloudScriptMode,
    activePublicScriptId, setActivePublicScriptId,
    ast,
    parsedScenes,
    parsedTitleEntries,
    // Config Override
    setOverrideMarkerConfigs: setScopedMarkerConfigs, // backward compatibility
    setScopedMarkerConfigs,
    effectiveMarkerConfigs,
    
    // Visibility
    hiddenMarkerIds,
    toggleMarkerVisibility
  };

  if (import.meta.env.DEV) {
    return new Proxy(manager, {
      get(target, prop) {
        if (typeof prop === "string" && !(prop in target) && !prop.startsWith("__") && prop !== "then") {
          console.error(
            `[useScriptManager] 存取不存在的欄位 "${prop}"。` +
            `請檢查 useScriptManager 的 return 是否已移除此欄位。`
          );
        }
        return target[prop];
      },
    });
  }

  return manager;
}

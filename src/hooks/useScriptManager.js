import { useState, useEffect, useMemo } from "react";
import generatedFileMeta from "../constants/fileMeta.generated.json";
import { resolveEffectiveMarkerConfigs } from "../lib/markerConfigResolver.js";

// Import scripts directly here
// const scriptModules = import.meta.glob("../scripts_file/**/*.fountain", {
//   query: "?raw",
//   import: "default",
// });

import { parseScreenplay } from "../lib/screenplayAST";

export function useScriptManager(initialParamsRef, initialMarkerConfigs = []) {
  // const [files, setFiles] = useState([]);
  // const [activeFile, setActiveFile] = useState(null);
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
  // 1. Initialize Files (Removed)
  // useEffect(() => {
  //   const entries = Object.entries(scriptModules).map(([path, loader]) => ({
  //     name: path.split("/").pop(),
  //     path,
  //     loader,
  //     display: path.replace("../scripts_file/", ""),
  //   }));
  //   setFiles(entries);
  // }, []);

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

  // 5. Load Script Function (Removed)
  // const loadScript = async (file) => { ... }

  return {
    // files,
    // setFiles,
    // activeFile,
    // setActiveFile, // Needed for URL sync or manual overrides
    rawScript,
    setRawScript,
    fileMeta,
    // loadScript,
    // Content States
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
}

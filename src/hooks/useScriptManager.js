import { useState, useEffect, useRef, useMemo } from "react";
import generatedFileMeta from "../constants/fileMeta.generated.json";

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
  const [isLoading, setIsLoading] = useState(false);
  
  // Metadata & Indexing
  const [fileMeta, setFileMeta] = useState({});
  const [fileTitleMap, setFileTitleMap] = useState({});
  const [fileTagsMap, setFileTagsMap] = useState({});

  // Allow dynamic override (e.g. for Public Scripts using Author's settings)
  const [overrideMarkerConfigs, setOverrideMarkerConfigs] = useState(null);
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState([]);

  const toggleMarkerVisibility = (id) => {
    setHiddenMarkerIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };
  
  // Effective Configs
  const rawConfigs = overrideMarkerConfigs || initialMarkerConfigs;
  const effectiveMarkerConfigs = useMemo(() => {
      if (Array.isArray(rawConfigs)) return rawConfigs;
      if (rawConfigs && typeof rawConfigs === 'object') return Object.values(rawConfigs);
      return [];
  }, [rawConfigs]);
  
  // AST Parsing (Centralized)
  const { ast } = useMemo(() => {
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

  // 2. Extract Title/Tags Helper
  const extractTitleMeta = (text) => {
    const entries = [];
    const lines = (text || "").split("\n");
    let current = null;
    for (const raw of lines) {
      if (!raw.trim()) break;
      const match = raw.match(/^(\s*)([^:]+):(.*)$/);
      if (match) {
        const [, , key, rest] = match;
        const val = rest.trim();
        current = { key: key.trim(), values: val ? [val] : [] };
        entries.push(current);
      } else if (current) {
        const cont = raw.trim();
        if (cont) current.values.push(cont);
      }
    }
    const titleEntry = entries.find((e) => e.key.toLowerCase() === "title");
    const title = titleEntry?.values?.[0] || "";
    const tags = [];
    entries.forEach((e) => {
      const key = e.key.toLowerCase();
      if (!key.includes("tag")) return;
      e.values
        ?.flatMap((v) =>
          v
            .split(/[，,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        )
        .forEach((t) => tags.push(t));
    });
    return { title, tags };
  };

  // 4. File Meta (Dates)
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

  const fetchLastModified = async (file) => {
    try {
      const url = file.path.startsWith("./") 
        ? new URL(file.path.replace("./", "/src/"), window.location.origin)
        : new URL(file.path, window.location.origin);
        
      const res = await fetch(new URL(file.path, import.meta.url).href, { method: "HEAD" });
      const header = res.headers.get("last-modified");
      if (header) {
        setFileMeta((prev) => ({ ...prev, [file.name]: new Date(header) }));
      }
    } catch (err) {
      // console.warn("取得檔案時間失敗", err);
    }
  };


  // 5. Load Script Function (Removed)
  // const loadScript = async (file) => { ... }

  return {
    // files,
    // setFiles,
    // activeFile,
    // setActiveFile, // Needed for URL sync or manual overrides
    rawScript,
    setRawScript,
    isLoading,
    setIsLoading,
    fileMeta,
    fileTitleMap,
    fileTagsMap,
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
    ast, // Expose AST,
    // Config Override
    setOverrideMarkerConfigs,
    effectiveMarkerConfigs,
    
    // Visibility
    hiddenMarkerIds,
    toggleMarkerVisibility
  };
}

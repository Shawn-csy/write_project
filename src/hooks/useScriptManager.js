import { useState, useEffect, useRef, useMemo } from "react";
import generatedFileMeta from "../constants/fileMeta.generated.json";

// Import scripts directly here
const scriptModules = import.meta.glob("../scripts_file/**/*.fountain", {
  query: "?raw",
  import: "default",
});

import { parseScreenplay } from "../lib/screenplayAST";

export function useScriptManager(initialParamsRef, initialMarkerConfigs = []) {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [rawScript, setRawScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Metadata & Indexing
  const [fileMeta, setFileMeta] = useState({});
  const [fileTitleMap, setFileTitleMap] = useState({});
  const [fileTagsMap, setFileTagsMap] = useState({});

  // Allow dynamic override (e.g. for Public Scripts using Author's settings)
  const [overrideMarkerConfigs, setOverrideMarkerConfigs] = useState(null);
  
  // Effective Configs
  const effectiveMarkerConfigs = overrideMarkerConfigs || initialMarkerConfigs;
  
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

  // Reset override when closing/changing active script context if needed?
  // Ideally, invoker manages this. PublicReaderPage should set it.

  // 1. Initialize Files
  useEffect(() => {
    const entries = Object.entries(scriptModules).map(([path, loader]) => ({
      name: path.split("/").pop(),
      path,
      loader,
      display: path.replace("../scripts_file/", ""),
    }));
    setFiles(entries);
  }, []);

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


  // 5. Load Script Function
  const loadScript = async (file) => {
    setIsLoading(true);
    try {
      const content = await file.loader();
      setActiveFile(file.name);
      setRawScript(content);

      // Handle Initial Params (Char focus)
      const initChar = initialParamsRef?.current?.char;
      if (initChar) {
        setFilterCharacter(initChar);
        if (initChar !== "__ALL__") {
          setFocusMode(true);
        } else {
          setFocusMode(false);
        }
        if (initialParamsRef.current) initialParamsRef.current.char = null;
      } else {
        setFilterCharacter("__ALL__");
        setFocusMode(false);
      }

      // Reset Content States
      setSceneList([]);
      setCurrentSceneId("");
      setScrollSceneId("");
      setTitleHtml("");
      setTitleName("");
      setTitleSummary("");
      setHasTitle(false);
      setShowTitle(false);
      setRawScriptHtml("");
      
      // Update Meta
      const metaKey = file.display || file.name;
      if (generatedFileMeta?.[metaKey]) {
        const val = generatedFileMeta[metaKey];
        const dateStr = typeof val === "object" ? val.mtime : val;
        setFileMeta((prev) => ({ ...prev, [file.name]: new Date(dateStr) }));
      } else {
        fetchLastModified(file);
      }
      
      return true; // Signal success
    } catch (err) {
      console.error("載入劇本失敗:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    files,
    setFiles,
    activeFile,
    setActiveFile, // Needed for URL sync or manual overrides
    rawScript,
    setRawScript,
    isLoading,
    setIsLoading,
    fileMeta,
    fileTitleMap,
    fileTagsMap,
    loadScript,
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
    currentSceneId, setCurrentSceneId,
    scrollSceneId, setScrollSceneId,
    // Cloud/Public State
    activeCloudScript, setActiveCloudScript,
    cloudScriptMode, setCloudScriptMode,
    activePublicScriptId, setActivePublicScriptId,
    ast, // Expose AST,
    // Config Override
    setOverrideMarkerConfigs,
    effectiveMarkerConfigs
  };
}

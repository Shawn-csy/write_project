import { useState, useEffect, useMemo } from "react";
import generatedFileMeta from "../constants/fileMeta.generated.json";
import { resolveEffectiveMarkerConfigs } from "../lib/markerConfigResolver";
import { parseScreenplay } from "../lib/screenplayAST";
import type {
  ScriptManager,
  MarkerConfig,
  FileMeta,
  ParsedScene,
  ParsedTitleEntry,
  ScriptAst,
  CloudScript,
  CloudScriptMode,
} from "./useScriptManager.types";

// fileMeta.generated.json shape: { [path]: { mtime: string } | string }
type RawFileMeta = Record<string, { mtime: string } | string>;

export function useScriptManager(
  _initialParamsRef: unknown,
  initialMarkerConfigs: MarkerConfig[] = []
): ScriptManager {
  const [rawScript, setRawScript] = useState("");

  // Metadata & Indexing
  const [fileMeta, setFileMeta] = useState<FileMeta>({});

  // Scoped configs for route-specific parsing (e.g. public reader script theme)
  const [scopedMarkerConfigs, setScopedMarkerConfigs] = useState<MarkerConfig[] | null>(null);
  const [hiddenMarkerIds, setHiddenMarkerIds] = useState<string[]>([]);

  const toggleMarkerVisibility = (id: string) => {
    setHiddenMarkerIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Effective Configs
  const { configs: effectiveMarkerConfigs } = useMemo(() => {
    return (resolveEffectiveMarkerConfigs as any)({
      baseConfigs: initialMarkerConfigs,
      scopedConfigs: scopedMarkerConfigs,
    });
  }, [initialMarkerConfigs, scopedMarkerConfigs]);

  // AST Parsing (Centralized)
  const { ast, scenes: parsedScenes, titleEntries: parsedTitleEntries } = useMemo(() => {
    return parseScreenplay(rawScript || "", effectiveMarkerConfigs);
  }, [rawScript, effectiveMarkerConfigs]);

  // Script Content State
  const [sceneList, setSceneList] = useState<ParsedScene[]>([]);
  const [characterList, setCharacterList] = useState<string[]>([]);
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

  // App Flow State
  const [activeCloudScript, setActiveCloudScript] = useState<CloudScript | null>(null);
  const [cloudScriptMode, setCloudScriptMode] = useState<CloudScriptMode>("read");
  const [activePublicScriptId, setActivePublicScriptId] = useState<string | null>(null);

  // File Meta (Dates)
  useEffect(() => {
    const meta = generatedFileMeta as RawFileMeta;
    if (meta && Object.keys(meta).length) {
      const normalized: FileMeta = {};
      Object.entries(meta).forEach(([key, val]) => {
        const dateStr = typeof val === "object" ? val.mtime : val;
        normalized[key] = new Date(dateStr);
      });
      setFileMeta((prev) => ({ ...normalized, ...prev }));
    }
  }, []);

  const manager: ScriptManager = {
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
    ast: ast as ScriptAst | null,
    parsedScenes: parsedScenes as ParsedScene[],
    parsedTitleEntries: parsedTitleEntries as ParsedTitleEntry[],
    // Config Override
    setOverrideMarkerConfigs: setScopedMarkerConfigs, // backward compatibility
    setScopedMarkerConfigs,
    effectiveMarkerConfigs,
    // Visibility
    hiddenMarkerIds,
    toggleMarkerVisibility,
  };

  if (import.meta.env.DEV) {
    return new Proxy(manager, {
      get(target, prop) {
        if (
          typeof prop === "string" &&
          !(prop in target) &&
          !prop.startsWith("__") &&
          prop !== "then"
        ) {
          console.error(
            `[useScriptManager] 存取不存在的欄位 "${prop}"。` +
            `請檢查 useScriptManager 的 return 是否已移除此欄位。`
          );
        }
        return target[prop as keyof ScriptManager];
      },
    }) as ScriptManager;
  }

  return manager;
}

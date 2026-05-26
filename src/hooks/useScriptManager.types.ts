import type { Dispatch, SetStateAction, RefObject } from "react";
import type { MarkerConfig, ParsedScene, ParsedTitleEntry, ScriptAst, AstNode, CustomMetadataEntry, BaseScript } from "../types/script";

export type { MarkerConfig, ParsedScene, ParsedTitleEntry, ScriptAst, AstNode, CustomMetadataEntry };

export interface FileMeta {
  [path: string]: Date;
}

export interface CloudScript extends BaseScript {
  title?: string;
  content?: string;
  markerThemeId?: string;
  markerTheme?: { configs?: MarkerConfig[] };
  updatedAt?: number | string;
  draftDate?: string;
  licenseCommercial?: string;
  licenseDerivative?: string;
  licenseNotify?: string;
  coverUrl?: string | null;
  tags?: { name: string }[];
  customMetadata?: unknown[];
  series?: { name?: string };
  seriesOrder?: number | null;
  organization?: { id: string; name?: string; displayName?: string; logoUrl?: string; avatar?: string; avatarUrl?: string };
  persona?: { id?: string; displayName?: string; name?: string; avatar?: string; avatarUrl?: string; defaultLicenseCommercial?: string; defaultLicenseDerivative?: string; defaultLicenseNotify?: string };
  owner?: { id?: string; displayName?: string; name?: string; avatar?: string; avatarUrl?: string };
}

export type CloudScriptMode = "read" | "edit";

/**
 * useScriptManager 的完整合約。
 * 所有消費端應該只存取這裡列出的欄位。
 */
export interface ScriptManager {
  // 原始內容
  rawScript: string;
  setRawScript: Dispatch<SetStateAction<string>>;

  // 檔案元資料
  fileMeta: FileMeta;

  // 解析後的清單（由 ScriptViewer 回傳）
  sceneList: ParsedScene[];
  setSceneList: Dispatch<SetStateAction<ParsedScene[]>>;
  characterList: string[];
  setCharacterList: Dispatch<SetStateAction<string[]>>;

  // 渲染後的 HTML（由 ScriptViewer 回傳）
  rawScriptHtml: string;
  setRawScriptHtml: Dispatch<SetStateAction<string>>;
  processedScriptHtml: string;
  setProcessedScriptHtml: Dispatch<SetStateAction<string>>;

  // 標題頁資訊（由 ScriptViewer 回傳）
  titleHtml: string;
  setTitleHtml: Dispatch<SetStateAction<string>>;
  titleName: string;
  setTitleName: Dispatch<SetStateAction<string>>;
  titleNote: string;
  setTitleNote: Dispatch<SetStateAction<string>>;
  titleSummary: string;
  setTitleSummary: Dispatch<SetStateAction<string>>;
  hasTitle: boolean;
  setHasTitle: Dispatch<SetStateAction<boolean>>;
  showTitle: boolean;
  setShowTitle: Dispatch<SetStateAction<boolean>>;

  // 閱讀器 UI 狀態
  filterCharacter: string;
  setFilterCharacter: Dispatch<SetStateAction<string>>;
  focusMode: boolean;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  currentSceneId: string;
  setCurrentSceneId: Dispatch<SetStateAction<string>>;
  scrollSceneId: string;
  setScrollSceneId: Dispatch<SetStateAction<string>>;

  // 雲端 / 公開劇本狀態
  activeCloudScript: CloudScript | null;
  setActiveCloudScript: Dispatch<SetStateAction<CloudScript | null>>;
  cloudScriptMode: CloudScriptMode;
  setCloudScriptMode: Dispatch<SetStateAction<CloudScriptMode>>;
  activePublicScriptId: string | null;
  setActivePublicScriptId: Dispatch<SetStateAction<string | null>>;

  // AST 解析（集中在 useScriptManager，避免各頁面重複解析）
  ast: ScriptAst | null;
  parsedScenes: ParsedScene[];
  parsedTitleEntries: ParsedTitleEntry[];

  // Marker 設定
  effectiveMarkerConfigs: MarkerConfig[];
  setScopedMarkerConfigs: Dispatch<SetStateAction<MarkerConfig[] | null>>;
  /** @deprecated 請改用 setScopedMarkerConfigs */
  setOverrideMarkerConfigs: Dispatch<SetStateAction<MarkerConfig[] | null>>;

  // Marker 可見性
  hiddenMarkerIds: string[];
  toggleMarkerVisibility: (id: string) => void;
}

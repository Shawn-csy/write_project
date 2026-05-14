import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useScriptStats } from "./useScriptStats";
import { parseInline } from "../lib/parsers/inlineParser";
import type { AstNode } from "../lib/statistics/ScriptAnalyzer";

interface StatsLineItem {
  text?: string;
  raw?: string;
  line?: number | null;
  type?: string;
}

interface CharacterStatItem {
  name?: string;
  lineCount?: number;
  count?: number;
  wordCount?: number;
  speakingScenesCount?: number;
}

interface MarkerEntry {
  id: string;
  label: string;
  count: number;
  items: StatsLineItem[];
}

interface ScriptStatsData {
  durationMinutes?: number;
  counts?: { dialogueLines?: number; dialogueChars?: number; actionChars?: number; cues?: number };
  sentences?: { dialogue?: string[] | Record<string, string[]>; action?: string[] };
  customLayers?: Record<string, StatsLineItem[]>;
  rangeStats?: Record<string, unknown>;
  pauseSeconds?: number;
  pauseItems?: unknown[];
  characterStats?: CharacterStatItem[];
  dialogueRatio?: number;
  actionRatio?: number;
  customDurationSeconds?: number;
  estimates?: { pure?: number; all?: number };
}

const CHARACTER_COLOR_SEQUENCE = [
  "var(--marker-color-russet)",
  "var(--marker-color-slate-blue)",
  "var(--marker-color-pastel-rose)",
  "var(--marker-color-steel)",
  "var(--marker-color-sage)",
  "var(--marker-color-olive)",
  "var(--marker-color-verdigris)",
  "var(--marker-color-cadet)",
  "var(--marker-color-periwinkle)",
  "var(--marker-color-orchid)",
  "var(--marker-color-warm-gray)",
  "var(--marker-color-charcoal)",
];

interface Props {
  rawScript?: string | null;
  scriptAst?: AstNode | null;
  scriptId?: string;
  t: (key: string) => string;
}

export function useStatisticsPanelState({ rawScript, scriptAst, scriptId, t }: Props) {
  const { markerConfigs, statsConfig, setStatsConfig } = useSettings();

  const stats = useScriptStats({
    scriptId,
    rawScript,
    scriptAst,
    markerConfigs,
    options: { wordCountMode: "pure", statsConfig },
  });
  const typedStats = stats as ScriptStatsData | null;
  const statsAvailable = Boolean(typedStats);

  const [collapsedMarkerIds, setCollapsedMarkerIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"dialogue" | "characters" | "cues">("dialogue");
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const {
    durationMinutes = 0,
    counts = { dialogueLines: 0, dialogueChars: 0, cues: 0 },
    sentences = {},
    customLayers = {},
    pauseSeconds = 0,
    pauseItems = [],
    characterStats = [],
  } = typedStats || {};

  const dialogueByCharacter = (sentences && typeof sentences.dialogue === "object" && !Array.isArray(sentences.dialogue))
    ? (sentences.dialogue as Record<string, string[]>)
    : {};

  const rawDialogue = (sentences.dialogue || []) as Array<string | StatsLineItem>;
  const rawAction = (sentences.action || []) as Array<string | StatsLineItem>;
  const dialogueLines: Array<string | StatsLineItem> = (Array.isArray(rawDialogue) && rawDialogue.length > 0)
    ? rawDialogue
    : (Array.isArray(rawAction) ? rawAction : []);

  const formattedDuration = useMemo(() => {
    const dialogueChars = Number(counts?.dialogueChars || 0);
    const actionChars = Number(counts?.actionChars || 0);
    const customSeconds = Number(typedStats?.customDurationSeconds || 0);
    const divisor = Number(statsConfig?.wordCountDivisor || 200);

    if (dialogueChars > 0 || actionChars > 0 || customSeconds > 0) {
      const readingMinutes = (dialogueChars + actionChars) / (Number.isFinite(divisor) && divisor > 0 ? divisor : 200);
      const totalMinutes = readingMinutes + (customSeconds / 60);
      const mins = Math.floor(totalMinutes);
      const secs = Math.round((totalMinutes - mins) * 60);
      return t("statisticsPanel.timeMinutesSeconds").replace("{mins}", String(mins)).replace("{secs}", String(secs));
    }

    let safeMinutes = Number(durationMinutes);
    if (!Number.isFinite(safeMinutes) || safeMinutes === 0) {
      const preferAll = actionChars > 0 ? Number(typedStats?.estimates?.all) : Number(typedStats?.estimates?.pure);
      if (Number.isFinite(preferAll)) {
        safeMinutes = preferAll;
      } else {
        const fallback = Number(typedStats?.estimates?.pure);
        safeMinutes = Number.isFinite(fallback) ? fallback : 0;
      }
    }
    if (!Number.isFinite(safeMinutes)) return "--";
    const mins = Math.floor(safeMinutes);
    const secs = Math.round((safeMinutes - mins) * 60);
    return t("statisticsPanel.timeMinutesSeconds").replace("{mins}", String(mins)).replace("{secs}", String(secs));
  }, [counts?.dialogueChars, counts?.actionChars, typedStats?.customDurationSeconds, statsConfig?.wordCountDivisor, durationMinutes, typedStats?.estimates?.pure, typedStats?.estimates?.all, t]);

  const markerEntries = useMemo<MarkerEntry[]>(() => {
    const rawEntries = Object.entries(customLayers || {});
    return rawEntries
      .map(([layerId, items]) => {
        const config = (markerConfigs as Array<{ id?: string; label?: string; name?: string }>).find((item) => item.id === layerId);
        const label = config ? (config.label || config.name || layerId) : layerId;
        return {
          id: layerId,
          label,
          count: Array.isArray(items) ? items.length : 0,
          items: Array.isArray(items) ? (items as StatsLineItem[]) : [],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [customLayers]);

  const characterColorByName = useMemo(() => {
    const map = new Map<string, string>();
    (characterStats || []).forEach((char) => {
      const key = String(char?.name || "").trim().toLowerCase();
      if (!key || map.has(key)) return;
      map.set(key, CHARACTER_COLOR_SEQUENCE[map.size % CHARACTER_COLOR_SEQUENCE.length]);
    });
    return map;
  }, [characterStats]);

  const dialogueByCharacterNormalized = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(dialogueByCharacter || {}).forEach(([name, lines]) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key) return;
      map.set(key, Array.isArray(lines) ? lines : []);
    });
    return map;
  }, [dialogueByCharacter]);

  useEffect(() => {
    setCollapsedMarkerIds(new Set(markerEntries.map((entry) => entry.id)));
  }, [markerEntries]);

  const handleLocate = (payload: string | StatsLineItem) => {
    // returned so component can use it; requires onLocateText passed in
    return payload;
  };

  const toggleMarkerSection = (id: string) => {
    setCollapsedMarkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCharacterExpand = (name: string) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return;
    setExpandedCharacters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getCleanText = (text: string) => {
    if (!text) return "";
    if (typeof text !== "string") return String(text);
    try {
      const nodes = parseInline(text, markerConfigs) as Array<{ type?: string; content?: string }>;
      return nodes.filter((node) => node.type === "text").map((node) => node.content).join("");
    } catch {
      return text;
    }
  };

  return {
    statsAvailable,
    markerConfigs, statsConfig, setStatsConfig,
    viewMode, setViewMode,
    collapsedMarkerIds, toggleMarkerSection,
    expandedCharacters, toggleCharacterExpand,
    showReportDialog, setShowReportDialog,
    showSettingsDialog, setShowSettingsDialog,
    counts, durationMinutes, pauseSeconds, pauseItems, characterStats,
    formattedDuration,
    markerEntries,
    characterColorByName,
    dialogueByCharacterNormalized,
    dialogueLines,
    getCleanText,
    handleLocate,
  };
}

export type { StatsLineItem, CharacterStatItem, MarkerEntry };

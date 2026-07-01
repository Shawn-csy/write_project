import { useMemo } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useScriptStats } from "./useScriptStats";
import { parseInline } from "@write/script-engine";
import type { AstNode } from "../lib/statistics/ScriptAnalyzer";

export interface StatsLineItem {
  text?: string;
  raw?: string;
  line?: number | null;
  type?: string;
}

export interface CharacterStatItem {
  name?: string;
  lineCount?: number;
  count?: number;
  wordCount?: number;
  speakingScenesCount?: number;
}

export interface MarkerEntry {
  id: string;
  label: string;
  count: number;
  items: StatsLineItem[];
}

interface ScriptStatsData {
  durationMinutes?: number;
  counts?: { dialogueLines?: number; dialogueChars?: number; actionChars?: number; cues?: number };
  sentences?: { dialogue?: { text: string; line: number | null }[]; action?: string[] };
  customLayers?: Record<string, StatsLineItem[]>;
  rangeStats?: Record<string, unknown>;
  pauseSeconds?: number;
  pauseItems?: unknown[];
  characterStats?: CharacterStatItem[];
  dialogueRatio?: number;
  actionRatio?: number;
  customDurationSeconds?: number;
  estimates?: { pure?: number; all?: number };
  dialogueByCharacter?: Record<string, string[]>;
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

export function useStatsPanelData({ rawScript, scriptAst, scriptId, t }: Props) {
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

  const {
    durationMinutes = 0,
    counts = { dialogueLines: 0, dialogueChars: 0, cues: 0 },
    sentences = {},
    customLayers = {},
    pauseSeconds = 0,
    pauseItems = [],
    characterStats = [],
  } = typedStats || {};

  const rawAction = (sentences.action || []) as Array<string | StatsLineItem>;

  // sentences.dialogue is { text, line }[] in document order from CharacterAndDurationMetric.
  // Fall back to action lines only when there is genuinely no dialogue (pure-marker scripts).
  const orderedDialogue = Array.isArray(sentences.dialogue) ? sentences.dialogue : [];
  const dialogueLines: Array<string | StatsLineItem> = orderedDialogue.length > 0
    ? orderedDialogue
    : (Array.isArray(rawAction) ? rawAction : []);

  const dialogueByCharacter = typedStats?.dialogueByCharacter || {};

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
    return Object.entries(customLayers || {})
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
  }, [customLayers, markerConfigs]);

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

  const getCleanText = useMemo(() => (text: string): string => {
    if (!text) return "";
    if (typeof text !== "string") return String(text);
    try {
      const nodes = parseInline(text, markerConfigs) as Array<{ type?: string; content?: string }>;
      return nodes.filter((node) => node.type === "text").map((node) => node.content).join("");
    } catch {
      return text;
    }
  }, [markerConfigs]);

  return {
    statsAvailable,
    markerConfigs,
    statsConfig,
    setStatsConfig,
    counts,
    durationMinutes,
    pauseSeconds,
    pauseItems,
    characterStats,
    formattedDuration,
    markerEntries,
    characterColorByName,
    dialogueByCharacterNormalized,
    dialogueLines,
    getCleanText,
  };
}

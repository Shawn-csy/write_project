import { useEffect, useState } from "react";
import type { AstNode } from "../lib/statistics/ScriptAnalyzer";
import { useStatsPanelData } from "./useStatsPanelData";

export type { StatsLineItem, CharacterStatItem, MarkerEntry } from "./useStatsPanelData";

interface Props {
  rawScript?: string | null;
  scriptAst?: AstNode | null;
  scriptId?: string;
  t: (key: string) => string;
}

export function useStatisticsPanelState({ rawScript, scriptAst, scriptId, t }: Props) {
  const data = useStatsPanelData({ rawScript, scriptAst, scriptId, t });

  const [collapsedMarkerIds, setCollapsedMarkerIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"dialogue" | "characters" | "cues">("dialogue");
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set());
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  useEffect(() => {
    setCollapsedMarkerIds(new Set(data.markerEntries.map((entry) => entry.id)));
  }, [data.markerEntries]);

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

  return {
    ...data,
    viewMode, setViewMode,
    collapsedMarkerIds, toggleMarkerSection,
    expandedCharacters, toggleCharacterExpand,
    showReportDialog, setShowReportDialog,
    showSettingsDialog, setShowSettingsDialog,
  };
}

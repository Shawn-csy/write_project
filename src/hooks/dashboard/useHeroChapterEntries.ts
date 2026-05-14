import React from "react";

export interface HeroEntry {
  id: string;
  name: string;
  role: string;
  performance: string;
}

export interface ChapterEntry {
  id: string;
  chapter: string;
  environment: string;
  situation: string;
}

interface HeroMultiItem { id: string; name: string; text: string; }
interface ChapterMultiItem { id: string; chapter: string; environment: string; situation: string; }

interface Props {
  roleSetting?: string;
  performanceInstruction?: string;
  chapterSettings?: string;
  setRoleSetting?: (value: string) => void;
  setPerformanceInstruction?: (value: string) => void;
  setChapterSettings?: (value: string) => void;
}

export function useHeroChapterEntries({
  roleSetting, performanceInstruction, chapterSettings,
  setRoleSetting, setPerformanceInstruction, setChapterSettings,
}: Props) {
  const parseMulti = React.useCallback((raw: string): HeroMultiItem[] | null => {
    try {
      const parsed = JSON.parse(String(raw || ""));
      if (parsed?.mode !== "multi" || !Array.isArray(parsed.items)) return null;
      return parsed.items.map((item: { name?: unknown; text?: unknown }, idx: number) => ({
        id: `hero-${idx + 1}`,
        name: String(item?.name || ""),
        text: String(item?.text || ""),
      }));
    } catch { return null; }
  }, []);

  const parseChapterMulti = React.useCallback((raw: string): ChapterMultiItem[] | null => {
    try {
      const parsed = JSON.parse(String(raw || ""));
      if (parsed?.mode !== "chapter_multi" || !Array.isArray(parsed.items)) return null;
      return parsed.items.map((item: { chapter?: unknown; environment?: unknown; situation?: unknown }, idx: number) => ({
        id: `chapter-${idx + 1}`,
        chapter: String(item?.chapter || ""),
        environment: String(item?.environment || ""),
        situation: String(item?.situation || ""),
      }));
    } catch { return null; }
  }, []);

  const heroEntries = React.useMemo<HeroEntry[]>(() => {
    const roleItems = parseMulti(roleSetting ?? "");
    const performanceItems = parseMulti(performanceInstruction ?? "");
    return roleItems || performanceItems
      ? Array.from({ length: Math.max(1, roleItems?.length || 0, performanceItems?.length || 0) }).map((_: unknown, idx: number) => ({
          id: `hero-${idx + 1}`,
          name: roleItems?.[idx]?.name || performanceItems?.[idx]?.name || "",
          role: roleItems?.[idx]?.text || "",
          performance: performanceItems?.[idx]?.text || "",
        }))
      : [{ id: "hero-1", name: "", role: String(roleSetting || ""), performance: String(performanceInstruction || "") }];
  }, [roleSetting, performanceInstruction, parseMulti]);

  const commitHeroEntries = React.useCallback((nextEntries: HeroEntry[]) => {
    const normalized = Array.isArray(nextEntries) && nextEntries.length > 0
      ? nextEntries : [{ id: "hero-1", name: "", role: "", performance: "" }];
    if (normalized.length <= 1 && !String(normalized[0]?.name || "").trim()) {
      const nextRole = String(normalized[0]?.role || "");
      const nextPerformance = String(normalized[0]?.performance || "");
      if (nextRole !== String(roleSetting || "")) setRoleSetting?.(nextRole);
      if (nextPerformance !== String(performanceInstruction || "")) setPerformanceInstruction?.(nextPerformance);
      return;
    }
    const nextRole = JSON.stringify({ mode: "multi", items: normalized.map(i => ({ name: i.name.trim(), text: i.role })) });
    const nextPerf = JSON.stringify({ mode: "multi", items: normalized.map(i => ({ name: i.name.trim(), text: i.performance })) });
    if (nextRole !== String(roleSetting || "")) setRoleSetting?.(nextRole);
    if (nextPerf !== String(performanceInstruction || "")) setPerformanceInstruction?.(nextPerf);
  }, [setRoleSetting, setPerformanceInstruction, roleSetting, performanceInstruction]);

  const addHeroEntry = () => commitHeroEntries([...heroEntries, { id: `hero-${Date.now()}-${heroEntries.length + 1}`, name: "", role: "", performance: "" }]);
  const updateHeroEntry = (idx: number, field: "name" | "role" | "performance", value: string) =>
    commitHeroEntries(heroEntries.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  const removeHeroEntry = (idx: number) => {
    if (heroEntries.length <= 1) return;
    commitHeroEntries(heroEntries.filter((_, i) => i !== idx));
  };

  const chapterEntries = React.useMemo<ChapterEntry[]>(() => {
    const parsed = parseChapterMulti(chapterSettings ?? "");
    if (parsed && parsed.length > 0) return parsed;
    return [{ id: "chapter-1", chapter: "", environment: "", situation: "" }];
  }, [chapterSettings, parseChapterMulti]);

  const commitChapterEntries = React.useCallback((nextEntries: ChapterEntry[]) => {
    const normalized = Array.isArray(nextEntries) && nextEntries.length > 0
      ? nextEntries : [{ id: "chapter-1", chapter: "", environment: "", situation: "" }];
    const next = JSON.stringify({ mode: "chapter_multi", items: normalized.map(i => ({ chapter: String(i.chapter || ""), environment: String(i.environment || ""), situation: String(i.situation || "") })) });
    if (next !== String(chapterSettings || "")) setChapterSettings?.(next);
  }, [chapterSettings, setChapterSettings]);

  const addChapterEntry = () => commitChapterEntries([...chapterEntries, { id: `chapter-${Date.now()}-${chapterEntries.length + 1}`, chapter: "", environment: "", situation: "" }]);
  const updateChapterEntry = (idx: number, field: "chapter" | "environment" | "situation", value: string) =>
    commitChapterEntries(chapterEntries.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  const removeChapterEntry = (idx: number) => {
    if (chapterEntries.length <= 1) return;
    commitChapterEntries(chapterEntries.filter((_, i) => i !== idx));
  };

  return {
    heroEntries, addHeroEntry, updateHeroEntry, removeHeroEntry,
    chapterEntries, addChapterEntry, updateChapterEntry, removeChapterEntry,
  };
}

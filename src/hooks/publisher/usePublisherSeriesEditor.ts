/**
 * usePublisherSeriesEditor — owns all publisher series authoring state.
 *
 * Collects: seriesList, selectedSeriesId, seriesDraft, isSaving, and all
 * series + chapter mutation handlers. Dashboard only needs to pass in the
 * shared scripts state and toast.
 *
 * Phase 3 of publisher-series-editor-architecture.md
 */

import { useState, useCallback, useMemo } from "react";
import { createSeries, updateSeries, deleteSeries, reorderSeriesScripts } from "../../lib/api/series";
import { updateScript } from "../../lib/api/scripts";
import {
  buildAttachScriptUpdate,
  buildDetachScriptUpdate,
  buildReorderScriptUpdate,
  buildSeriesMutationPlan,
  deriveChapterRows,
  detectOrderConflicts,
  getSeriesReadiness,
} from "../../lib/publisher/seriesEditorModel";
import type { SeriesChapterRow } from "../../lib/publisher/seriesEditorModel";
import type { BaseScriptApi } from "../../types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeriesEditorData {
  id: string;
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  scriptCount?: number;
  /** ms epoch from server. */
  updatedAt?: number;
  /** Model-derived readiness level for list indicator. */
  readinessLevel?: "ready" | "partial" | "empty";
}

interface SeriesDraft {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}

interface ToastLike {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface UsePublisherSeriesEditorInput {
  scripts: BaseScriptApi[];
  setScripts: React.Dispatch<React.SetStateAction<BaseScriptApi[]>>;
  toast: (options: ToastLike) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeReadinessLevel(
  s: SeriesEditorData,
  seriesScripts: BaseScriptApi[]
): "ready" | "partial" | "empty" {
  const chapterRows = deriveChapterRows(seriesScripts);
  const conflicts = detectOrderConflicts(chapterRows);
  const r = getSeriesReadiness({
    name: s.name ?? "",
    summary: s.summary ?? "",
    coverUrl: s.coverUrl ?? "",
    chapterRows,
    conflicts,
  });
  if (r.isReady) return "ready";
  const anyProgress =
    Boolean(s.name?.trim()) ||
    Boolean(s.summary?.trim()) ||
    Boolean(s.coverUrl?.trim()) ||
    chapterRows.length > 0;
  return anyProgress ? "partial" : "empty";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePublisherSeriesEditor({
  scripts,
  setScripts,
  toast,
}: UsePublisherSeriesEditorInput) {
  const [seriesList, setSeriesList] = useState<SeriesEditorData[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [seriesDraft, setSeriesDraft] = useState<SeriesDraft>({
    name: "",
    summary: "",
    coverUrl: "",
    coverCrop: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // ─── Series CRUD ───────────────────────────────────────────────────────────

  const handleCreateSeries = useCallback(async () => {
    if (!seriesDraft.name.trim()) return;
    setIsSaving(true);
    try {
      const created = await createSeries({
        name: seriesDraft.name.trim(),
        summary: seriesDraft.summary || "",
        coverUrl: seriesDraft.coverUrl || "",
        coverCrop: seriesDraft.coverCrop || null,
      });
      setSeriesList((prev) => [created as SeriesEditorData, ...prev]);
      setSelectedSeriesId(created.id);
      toast({ title: "已建立系列" });
    } catch (error) {
      console.error("Failed to create series", error);
      toast({ title: "建立系列失敗", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [seriesDraft, toast]);

  const handleUpdateSeries = useCallback(async () => {
    if (!selectedSeriesId || !seriesDraft.name.trim()) return;
    setIsSaving(true);
    try {
      const updated = await updateSeries(selectedSeriesId, {
        name: seriesDraft.name.trim(),
        summary: seriesDraft.summary || "",
        coverUrl: seriesDraft.coverUrl || "",
        coverCrop: seriesDraft.coverCrop || null,
      });
      setSeriesList((prev) =>
        prev.map((s) => (s.id === updated.id ? (updated as SeriesEditorData) : s))
      );
      toast({ title: "已更新系列" });
    } catch (error) {
      console.error("Failed to update series", error);
      toast({ title: "更新系列失敗", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [selectedSeriesId, seriesDraft, toast]);

  const handleDeleteSeries = useCallback(async () => {
    if (!selectedSeriesId) return;
    setIsSaving(true);
    try {
      await deleteSeries(selectedSeriesId);
      setSeriesList((prev) => prev.filter((s) => s.id !== selectedSeriesId));
      setSelectedSeriesId("");
      setSeriesDraft({ name: "", summary: "", coverUrl: "", coverCrop: null });
      setScripts((prev) =>
        prev.map((script) =>
          script.seriesId === selectedSeriesId
            ? { ...script, seriesId: undefined, seriesOrder: undefined, series: undefined }
            : script
        )
      );
      toast({ title: "已刪除系列" });
    } catch (error) {
      console.error("Failed to delete series", error);
      toast({ title: "刪除系列失敗", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [selectedSeriesId, setScripts, toast]);

  // ─── Chapter mutations ─────────────────────────────────────────────────────

  const handleDetachScriptFromSeries = useCallback(async (
    scriptId: string,
    seriesId: string,
  ) => {
    if (!scriptId || !seriesId) return;
    try {
      await updateScript(scriptId, { ...buildDetachScriptUpdate() });
      setScripts((prev) =>
        prev.map((script) =>
          script.id === scriptId
            ? { ...script, seriesId: undefined, seriesOrder: undefined, series: undefined }
            : script
        )
      );
      setSeriesList((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? { ...s, scriptCount: Math.max(0, Number(s.scriptCount || 0) - 1) }
            : s
        )
      );
      toast({ title: "已從系列移除作品" });
    } catch (error) {
      console.error("Failed to detach script from series", error);
      toast({ title: "移除失敗", variant: "destructive" });
    }
  }, [setScripts, toast]);

  const handleAttachScriptToSeries = useCallback(async (
    scriptId: string,
    seriesId: string,
    order: number | null,
  ) => {
    if (!scriptId || !seriesId) return;
    try {
      await updateScript(scriptId, { ...buildAttachScriptUpdate(seriesId, order) });
      setScripts((prev) =>
        prev.map((script) =>
          script.id === scriptId
            ? { ...script, seriesId, seriesOrder: order }
            : script
        )
      );
      setSeriesList((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? { ...s, scriptCount: Number(s.scriptCount || 0) + 1 }
            : s
        )
      );
      toast({ title: "已加入系列" });
    } catch (error) {
      console.error("Failed to attach script to series", error);
      toast({ title: "加入系列失敗", variant: "destructive" });
    }
  }, [setScripts, toast]);

  const handleReorderScriptInSeries = useCallback(async (
    scriptId: string,
    order: number | null,
  ) => {
    if (!scriptId) return;
    try {
      await updateScript(scriptId, { ...buildReorderScriptUpdate(order) });
      setScripts((prev) =>
        prev.map((script) =>
          script.id === scriptId ? { ...script, seriesOrder: order } : script
        )
      );
    } catch (error) {
      console.error("Failed to reorder script in series", error);
      toast({ title: "更新順序失敗", variant: "destructive" });
    }
  }, [setScripts, toast]);

  /**
   * Batch-reorders all chapters in the selected series via the dedicated
   * PUT /series/:seriesId/scripts/reorder endpoint.
   *
   * Only sends items whose seriesOrder actually changed (diff via
   * buildSeriesMutationPlan). No-ops when plan is empty.
   */
  const handleBatchReorderSeriesScripts = useCallback(async (
    seriesId: string,
    currentRows: SeriesChapterRow[],
    targetOrders: Map<string, number | null>,
  ) => {
    if (!seriesId) return;
    const plan = buildSeriesMutationPlan(currentRows, targetOrders);
    if (plan.length === 0) return;
    const planMap = new Map(plan.map((item) => [item.scriptId, item.seriesOrder]));
    try {
      await reorderSeriesScripts(seriesId, plan);
      setScripts((prev) =>
        prev.map((script) =>
          planMap.has(script.id)
            ? { ...script, seriesOrder: planMap.get(script.id)! }
            : script
        )
      );
    } catch (error) {
      console.error("Failed to batch reorder series scripts", error);
      toast({ title: "批次更新順序失敗", variant: "destructive" });
    }
  }, [setScripts, toast]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  /** Scripts belonging to the currently selected series, for passing to SeriesChapterManager. */
  const selectedSeriesScripts = scripts.filter(
    (s) => s.seriesId === selectedSeriesId
  );

  /** Scripts with no series assigned, eligible for attach. */
  const attachableScripts = scripts.filter((s) => !s.seriesId);

  /** seriesList enriched with model-derived readinessLevel per series. */
  const seriesListWithReadiness = useMemo(
    () =>
      seriesList.map((s) => ({
        ...s,
        readinessLevel: computeReadinessLevel(s, scripts.filter((sc) => sc.seriesId === s.id)),
      })),
    [seriesList, scripts]
  );

  return {
    // State
    seriesList: seriesListWithReadiness,
    setSeriesList,
    selectedSeriesId,
    setSelectedSeriesId,
    seriesDraft,
    setSeriesDraft,
    isSavingSeries: isSaving,
    // Derived
    selectedSeriesScripts,
    attachableScripts,
    // Handlers
    handleCreateSeries,
    handleUpdateSeries,
    handleDeleteSeries,
    handleDetachScriptFromSeries,
    handleAttachScriptToSeries,
    handleReorderScriptInSeries,
    handleBatchReorderSeriesScripts,
  };
}

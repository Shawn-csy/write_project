import { useCallback } from "react";
import { createSeries, updateSeries, deleteSeries } from "../../lib/api/series";
import { updateScript } from "../../lib/api/scripts";

export function usePublisherSeriesActions({
  selectedSeriesId,
  seriesDraft,
  setIsSavingSeries,
  setSeriesList,
  setSelectedSeriesId,
  setSeriesDraft,
  setScripts,
  toast,
}) {
  const handleCreateSeries = useCallback(async () => {
    if (!seriesDraft.name.trim()) return;
    setIsSavingSeries(true);
    try {
      const created = await createSeries({
        name: seriesDraft.name.trim(),
        summary: seriesDraft.summary || "",
        coverUrl: seriesDraft.coverUrl || "",
      });
      setSeriesList((prev) => [created, ...prev]);
      setSelectedSeriesId(created.id);
      toast({ title: "已建立系列" });
    } catch (error) {
      console.error("Failed to create series", error);
      toast({ title: "建立系列失敗", variant: "destructive" });
    } finally {
      setIsSavingSeries(false);
    }
  }, [seriesDraft, setIsSavingSeries, setSeriesList, setSelectedSeriesId, toast]);

  const handleUpdateSeries = useCallback(async () => {
    if (!selectedSeriesId || !seriesDraft.name.trim()) return;
    setIsSavingSeries(true);
    try {
      const updated = await updateSeries(selectedSeriesId, {
        name: seriesDraft.name.trim(),
        summary: seriesDraft.summary || "",
        coverUrl: seriesDraft.coverUrl || "",
      });
      setSeriesList((prev) => prev.map((series) => (series.id === updated.id ? updated : series)));
      toast({ title: "已更新系列" });
    } catch (error) {
      console.error("Failed to update series", error);
      toast({ title: "更新系列失敗", variant: "destructive" });
    } finally {
      setIsSavingSeries(false);
    }
  }, [selectedSeriesId, seriesDraft, setIsSavingSeries, setSeriesList, toast]);

  const handleDeleteSeries = useCallback(async () => {
    if (!selectedSeriesId) return;
    setIsSavingSeries(true);
    try {
      await deleteSeries(selectedSeriesId);
      setSeriesList((prev) => prev.filter((series) => series.id !== selectedSeriesId));
      setSelectedSeriesId("");
      setSeriesDraft({ name: "", summary: "", coverUrl: "" });
      setScripts((prev) =>
        prev.map((script) =>
          script.seriesId === selectedSeriesId
            ? { ...script, seriesId: null, seriesOrder: null, series: null }
            : script
        )
      );
      toast({ title: "已刪除系列" });
    } catch (error) {
      console.error("Failed to delete series", error);
      toast({ title: "刪除系列失敗", variant: "destructive" });
    } finally {
      setIsSavingSeries(false);
    }
  }, [selectedSeriesId, setIsSavingSeries, setScripts, setSelectedSeriesId, setSeriesDraft, setSeriesList, toast]);

  const handleDetachScriptFromSeries = useCallback(async (scriptId, seriesId) => {
    if (!scriptId || !seriesId) return;
    try {
      await updateScript(scriptId, { seriesId: null, seriesOrder: null });
      setScripts((prev) =>
        prev.map((script) =>
          script.id === scriptId
            ? { ...script, seriesId: null, seriesOrder: null, series: null }
            : script
        )
      );
      setSeriesList((prev) =>
        prev.map((series) =>
          series.id === seriesId
            ? { ...series, scriptCount: Math.max(0, Number(series.scriptCount || 0) - 1) }
            : series
        )
      );
      toast({ title: "已從系列移除作品" });
    } catch (error) {
      console.error("Failed to detach script from series", error);
      toast({ title: "移除失敗", variant: "destructive" });
    }
  }, [setScripts, setSeriesList, toast]);

  return {
    handleCreateSeries,
    handleUpdateSeries,
    handleDeleteSeries,
    handleDetachScriptFromSeries,
  };
}

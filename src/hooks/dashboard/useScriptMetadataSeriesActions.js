import { useCallback } from "react";
import { createSeries } from "../../lib/api/series";

export function useScriptMetadataSeriesActions({
  quickSeriesName,
  isCreatingSeries,
  seriesOptions,
  onSeriesCreated,
  setIsCreatingSeries,
  setSeriesId,
  setSeriesName,
  setQuickSeriesName,
  toast,
}) {
  const handleQuickCreateSeries = useCallback(async () => {
    const name = quickSeriesName.trim();
    if (!name || isCreatingSeries) return;
    const existing = (seriesOptions || []).find(
      (item) => String(item?.name || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      setSeriesId(existing.id);
      setSeriesName(existing.name || name);
      setQuickSeriesName("");
      toast({ title: "已選取既有系列" });
      return;
    }
    setIsCreatingSeries(true);
    try {
      const created = await createSeries({ name, summary: "", coverUrl: "" });
      setSeriesId(created.id);
      setSeriesName(created.name || name);
      setQuickSeriesName("");
      if (onSeriesCreated) onSeriesCreated(created);
      toast({ title: "已建立系列" });
    } catch (error) {
      console.error("Failed to create series from metadata dialog", error);
      toast({ title: "建立系列失敗", variant: "destructive" });
    } finally {
      setIsCreatingSeries(false);
    }
  }, [
    isCreatingSeries,
    onSeriesCreated,
    quickSeriesName,
    seriesOptions,
    setIsCreatingSeries,
    setQuickSeriesName,
    setSeriesId,
    setSeriesName,
    toast,
  ]);

  const focusSeriesSelect = useCallback(() => {
    window.setTimeout(() => {
      const el = document.getElementById("metadata-series-name");
      if (el && typeof el.focus === "function") el.focus();
    }, 60);
  }, []);

  return {
    handleQuickCreateSeries,
    focusSeriesSelect,
  };
}

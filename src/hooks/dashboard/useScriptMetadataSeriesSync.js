import { useEffect } from "react";

export function useScriptMetadataSeriesSync({
  seriesId,
  seriesName,
  seriesOrder,
  seriesOptions,
  setSeriesName,
  setSeriesExpanded,
}) {
  useEffect(() => {
    if (!seriesId) return;
    const selected = (seriesOptions || []).find((item) => item.id === seriesId);
    if (selected?.name) {
      setSeriesName(selected.name);
    }
  }, [seriesId, seriesOptions, setSeriesName]);

  useEffect(() => {
    if (seriesId || String(seriesName || "").trim() || String(seriesOrder || "").trim()) {
      setSeriesExpanded(true);
    }
  }, [seriesId, seriesName, seriesOrder, setSeriesExpanded]);
}

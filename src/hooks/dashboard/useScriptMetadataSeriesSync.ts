import { useEffect } from "react";
import type { SeriesOption } from "./types";

export function useScriptMetadataSeriesSync({
  seriesId,
  seriesName,
  seriesOrder,
  seriesOptions,
  setSeriesName,
  setSeriesExpanded,
}: {
  seriesId: string | null;
  seriesName: string;
  seriesOrder: string | number;
  seriesOptions: SeriesOption[];
  setSeriesName: (v: string) => void;
  setSeriesExpanded: (v: boolean) => void;
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

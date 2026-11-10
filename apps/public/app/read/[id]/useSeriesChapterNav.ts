"use client";

import { useEffect, useState } from "react";
import type { PublicScript } from "@/lib/types";
import { toGalleryInput } from "@/lib/galleryProjection";
import { enrichScript } from "@write/public-ui";
import {
  groupScriptsIntoGalleryEntries,
  findSeriesGroupByName,
  toChapterNavModel,
} from "@write/public-ui";
import type { ChapterNavModel } from "@write/public-ui";
import { readPublicBundle } from "@/lib/readPublicBundle";

// Re-export so SeriesChapterNavigation can import from one place
export type { ChapterNavItem, ChapterNavModel } from "@write/public-ui";
export type SeriesChapterNav = ChapterNavModel;

export function useSeriesChapterNav(
  script: PublicScript
): ChapterNavModel | null {
  const [nav, setNav] = useState<ChapterNavModel | null>(null);

  const seriesName =
    typeof script.series === "object" && script.series !== null
      ? (script.series as { name?: string }).name ?? ""
      : "";

  useEffect(() => {
    // Clear stale nav whenever script or series changes
    setNav(null);
    if (!seriesName) return;

    readPublicBundle<{ scripts?: PublicScript[] }>(["scripts"])
      .then(({ data }) => {
        const rawScripts = (data?.scripts ?? []) as PublicScript[];
        const enriched = rawScripts.map((s) => enrichScript(toGalleryInput(s)));
        const entries = groupScriptsIntoGalleryEntries(enriched);
        const group = findSeriesGroupByName(entries, seriesName);
        if (!group) return;
        setNav(toChapterNavModel(group, script.id));
      })
      .catch(() => {});
  }, [script.id, seriesName]);

  return nav;
}

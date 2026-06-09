"use client";

import React from "react";
import type { TocEntry, MarkerConfig } from "@write/script-engine";
import {
  ReaderToolbar as SharedReaderToolbar,
  useTocState,
} from "@write/script-reader-ui";
import type { ReaderMarkerVisibility } from "@write/script-reader-ui";

interface Props {
  markerConfigs: MarkerConfig[];
  markerVisibility: ReaderMarkerVisibility;
  toc: TocEntry[];
}

export function ReaderToolbar({ markerConfigs, markerVisibility, toc }: Props) {
  const tocState = useTocState();

  return (
    <SharedReaderToolbar
      markerConfigs={markerConfigs}
      markerVisibility={markerVisibility}
      toc={toc}
      tocState={tocState}
      contentClassName="max-w-4xl mx-auto"
      startSlot={
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 台本列表
        </a>
      }
    />
  );
}

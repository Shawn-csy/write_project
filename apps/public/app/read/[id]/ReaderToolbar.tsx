"use client";

import React from "react";
import { ReaderToolbar as SharedReaderToolbar } from "@write/script-reader-ui";
import type { ReaderState } from "@write/script-reader-ui";

interface Props {
  readerState: ReaderState;
}

export function ReaderToolbar({ readerState }: Props) {
  return (
    <SharedReaderToolbar
      readerState={readerState}
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

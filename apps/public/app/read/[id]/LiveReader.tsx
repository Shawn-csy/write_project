"use client";

import React, { useEffect, useState } from "react";
import { liveApi, LiveApiError } from "@/lib/liveApi";
import type { PublicScript } from "@/lib/types";
import { decodeCrawlSafePayload } from "@/lib/crawl-safe-payload";
import { buildReadPageTitle } from "@/lib/readPageSeo";
import { NotFoundContent } from "@/components/NotFoundContent";
import { ConsentGate } from "./ConsentGate";
import { ScriptReaderClient } from "./ScriptReaderClient";
import { buildReaderPayload, scriptContentSignature, type ReaderPayload } from "./liveReaderPayload";

interface Props {
  scriptId: string;
  /**
   * Reader data baked into the static page at build time. It is shown at once
   * and replaced if the live copy has been edited since. Absent for works that
   * were published after the last build; those render only once loaded.
   */
  initialPayload?: ReaderPayload;
  /** Server-rendered summary shown behind the consent gate (what crawlers read). */
  summary?: React.ReactNode;
}

type LoadState = "loading" | "ready" | "missing" | "error";

/**
 * The reader for one script, kept fresh without a redeploy: a static page
 * hydrates with its build-time snapshot and then swaps in the live script when
 * it differs; a work with no snapshot is fetched and parsed in the browser.
 */
export function LiveReader({ scriptId, initialPayload, summary }: Props) {
  const [payload, setPayload] = useState<ReaderPayload | undefined>(initialPayload);
  const [state, setState] = useState<LoadState>(initialPayload ? "ready" : "loading");

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { data: script } = await liveApi.readJson<PublicScript>(
          `/api/public-scripts/${encodeURIComponent(scriptId)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const baked = initialPayload
          ? decodeCrawlSafePayload(initialPayload.initialScript)
          : null;
        if (baked && scriptContentSignature(baked) === scriptContentSignature(script)) return;
        const next = await buildReaderPayload(script);
        if (controller.signal.aborted) return;
        setPayload(next);
        setState("ready");
        document.title = buildReadPageTitle(script);
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof LiveApiError && error.status === 404) {
          // Unpublished since the last build: the snapshot is no longer valid.
          setPayload(undefined);
          setState("missing");
        } else if (!initialPayload) {
          setState("error");
        }
        // With a snapshot already on screen, a failed refresh keeps it.
      }
    })();
    return () => controller.abort();
  }, [scriptId, initialPayload]);

  if (state === "missing") return <NotFoundContent />;

  if (state === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-lg text-muted-foreground">暫時無法載入這部台本，請稍後再試。</p>
      </main>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">載入中…</span>
      </div>
    );
  }

  return (
    <ConsentGate scriptId={scriptId} summary={summary}>
      <ScriptReaderClient scriptId={scriptId} {...payload} />
    </ConsentGate>
  );
}

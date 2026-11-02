"use client";

import { useEffect } from "react";
import { mediaOriginsFromEnv, toFallbackMediaUrl } from "@/lib/mediaSources";

/**
 * Swaps any image that fails on the local media origin to its R2 copy.
 *
 * Shared UI packages render plain <img> tags, so this listens at the document
 * instead of patching each one. Image errors do not bubble, hence the capture
 * phase. Each image is retried on R2 once, so a file missing from both places
 * cannot loop.
 */
export function MediaFallbackBridge() {
  useEffect(() => {
    const origins = mediaOriginsFromEnv();
    if (!origins.primary || !origins.fallback) {
      const onPlainError = (event: Event) => {
        if (event.target instanceof HTMLImageElement) event.target.dataset.mediaFailed = "1";
      };
      window.addEventListener("error", onPlainError, true);
      return () => window.removeEventListener("error", onPlainError, true);
    }

    // An image that cannot load from either origin is hidden (see globals.css) so
    // the browser's broken-image glyph and clipped alt text never reach the layout.
    const markFailed = (img: HTMLImageElement) => {
      img.dataset.mediaFailed = "1";
    };

    const swap = (img: HTMLImageElement) => {
      if (img.dataset.mediaFallback) {
        markFailed(img);
        return;
      }
      const fallback = toFallbackMediaUrl(img.currentSrc || img.src, origins);
      if (!fallback) {
        markFailed(img);
        return;
      }
      img.dataset.mediaFallback = "1";
      img.removeAttribute("srcset");
      img.src = fallback;
    };

    const onError = (event: Event) => {
      if (event.target instanceof HTMLImageElement) swap(event.target);
    };
    window.addEventListener("error", onError, true);

    // Images that failed before hydration attached the listener never fire again.
    document.querySelectorAll("img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) swap(img);
    });

    return () => window.removeEventListener("error", onError, true);
  }, []);

  return null;
}

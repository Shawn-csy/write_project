import React from "react";

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return "";
};

export const lazyWithRefreshRetry = (importer, key) =>
  React.lazy(async () => {
    const retryKey = `lazy-retry:${key}`;
    try {
      const loaded = await importer();
      sessionStorage.removeItem(retryKey);
      return loaded;
    } catch (error) {
      const message = extractErrorMessage(error);
      const isChunkLoadError =
        /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(message);
      const alreadyRetried = sessionStorage.getItem(retryKey) === "1";
      if (isChunkLoadError && !alreadyRetried) {
        sessionStorage.setItem(retryKey, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(retryKey);
      throw error;
    }
  });

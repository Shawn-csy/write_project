import React from "react";
import { extractErrorMessage } from './utils';

export const lazyWithRefreshRetry = <P = object>(
  importer: () => Promise<{ default: React.ComponentType<P> }>,
  key: string
): React.LazyExoticComponent<React.ComponentType<P>> =>
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

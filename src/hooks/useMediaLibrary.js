import React from "react";
import { deleteMediaObject, getMediaObjects, uploadMediaObject } from "../lib/api/media";
import { optimizeImageForUpload } from "../lib/mediaLibrary";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;

export function useMediaLibrary({ t, maxBytes = DEFAULT_MAX_BYTES, autoLoad = false } = {}) {
  const [items, setItems] = React.useState([]);
  const [stats, setStats] = React.useState({ count: 0, usedBytes: 0, maxBytes, ratio: 0 });
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingUrl, setDeletingUrl] = React.useState("");

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await getMediaObjects();
      const nextItems = Array.isArray(res?.items) ? res.items : [];
      const usedBytes = nextItems.reduce((sum, it) => sum + Number(it?.sizeBytes || 0), 0);
      setItems(nextItems);
      setStats({
        count: nextItems.length,
        usedBytes,
        maxBytes,
        ratio: maxBytes > 0 ? Math.min(1, usedBytes / maxBytes) : 0,
      });
    } catch (e) {
      setError(String(e?.message || t?.("mediaLibrary.uploadFailed", "載入失敗")));
    } finally {
      setIsLoading(false);
    }
  }, [maxBytes, t]);

  React.useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [autoLoad, refresh]);

  const uploadFiles = React.useCallback(
    async (files, purpose = "library") => {
      const list = Array.from(files || []);
      if (!list.length) return;
      setError("");
      setIsUploading(true);
      try {
        for (const file of list) {
          const optimized = await optimizeImageForUpload(file);
          if (!optimized.ok) {
            throw new Error(optimized.error || t?.("mediaLibrary.uploadFailed", "上傳失敗"));
          }
          await uploadMediaObject(optimized.file, purpose);
        }
        await refresh();
      } catch (e) {
        setError(String(e?.message || t?.("mediaLibrary.uploadFailed", "上傳失敗")));
      } finally {
        setIsUploading(false);
      }
    },
    [refresh, t]
  );

  const uploadFromInput = React.useCallback(
    async (event, purpose = "library") => {
      await uploadFiles(event?.target?.files || [], purpose);
      if (event?.target) {
        event.target.value = "";
      }
    },
    [uploadFiles]
  );

  const deleteByUrl = React.useCallback(
    async (url) => {
      if (!url) return;
      setError("");
      setDeletingUrl(url);
      try {
        await deleteMediaObject(url);
        await refresh();
      } catch (e) {
        setError(String(e?.message || t?.("mediaLibrary.uploadFailed", "刪除失敗")));
      } finally {
        setDeletingUrl("");
      }
    },
    [refresh, t]
  );

  const clearAll = React.useCallback(async () => {
    if (!items.length) return;
    setError("");
    setIsLoading(true);
    try {
      await Promise.all(items.map((item) => deleteMediaObject(item.url)));
      await refresh();
    } catch (e) {
      setError(String(e?.message || t?.("mediaLibrary.uploadFailed", "刪除失敗")));
    } finally {
      setIsLoading(false);
    }
  }, [items, refresh, t]);

  return {
    items,
    stats,
    error,
    isLoading,
    isUploading,
    deletingUrl,
    setError,
    refresh,
    uploadFiles,
    uploadFromInput,
    deleteByUrl,
    clearAll,
  };
}

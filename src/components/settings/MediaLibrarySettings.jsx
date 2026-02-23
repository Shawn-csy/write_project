import React from "react";
import { Button } from "../ui/button";
import { MEDIA_FILE_ACCEPT, formatBytes, optimizeImageForUpload } from "../../lib/mediaLibrary";
import { deleteMediaObject, getMediaObjects, uploadMediaObject } from "../../lib/db";
import { useI18n } from "../../contexts/I18nContext";

export function MediaLibrarySettings() {
  const { t } = useI18n();
  const [items, setItems] = React.useState([]);
  const [stats, setStats] = React.useState({ count: 0, usedBytes: 0, maxBytes: 0, ratio: 0 });
  const [error, setError] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const MAX_BYTES = 25 * 1024 * 1024;

  const refresh = React.useCallback(() => {
    setIsRefreshing(true);
    getMediaObjects()
      .then((res) => {
        const nextItems = Array.isArray(res?.items) ? res.items : [];
        const usedBytes = nextItems.reduce((sum, it) => sum + Number(it?.sizeBytes || 0), 0);
        setItems(nextItems);
        setStats({
          count: nextItems.length,
          usedBytes,
          maxBytes: MAX_BYTES,
          ratio: MAX_BYTES > 0 ? Math.min(1, usedBytes / MAX_BYTES) : 0,
        });
      })
      .catch((e) => {
        setError(String(e?.message || t("mediaLibrary.uploadFailed")));
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [t]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setError("");
    setIsUploading(true);
    try {
      for (const file of files) {
        const optimized = await optimizeImageForUpload(file);
        if (!optimized.ok) {
          throw new Error(optimized.error || t("mediaLibrary.uploadFailed"));
        }
        await uploadMediaObject(optimized.file, "library");
      }
      refresh();
    } catch (e) {
      setError(String(e?.message || t("mediaLibrary.uploadFailed")));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleClear = () => {
    Promise.all(items.map((item) => deleteMediaObject(item.url)))
      .then(() => refresh())
      .catch((e) => setError(String(e?.message || t("mediaLibrary.uploadFailed"))));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{t("mediaLibrary.usage")}</span>
          <span className="text-muted-foreground">{formatBytes(stats.usedBytes)} / {formatBytes(stats.maxBytes)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((stats.ratio || 0) * 100)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{t("mediaLibrary.itemCountDesc").replace("{count}", String(stats.count))}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
          {isUploading ? t("mediaLibrary.uploading") : t("mediaLibrary.addToLibrary")}
          <input type="file" accept={MEDIA_FILE_ACCEPT} multiple className="hidden" onChange={handleUpload} disabled={isUploading || isRefreshing} />
        </label>
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={!items.length || isRefreshing}>
          {t("mediaLibrary.clearLibrary")}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {t("mediaLibrary.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-md border bg-background">
              <div className="aspect-square bg-muted/30">
                <img src={item.url} alt={item.name || "media"} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs font-medium">{item.name || t("mediaLibrary.unnamed")}</p>
                <p className="text-[11px] text-muted-foreground">{formatBytes(item.sizeBytes || 0)}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-full text-xs text-destructive hover:text-destructive"
                  onClick={async () => {
                    try {
                      await deleteMediaObject(item.url);
                      refresh();
                    } catch (e) {
                      setError(String(e?.message || t("mediaLibrary.uploadFailed")));
                    }
                  }}
                >
                  {t("common.remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

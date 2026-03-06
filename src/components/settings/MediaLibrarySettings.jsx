import React from "react";
import { Button } from "../ui/button";
import { MEDIA_FILE_ACCEPT, formatBytes } from "../../lib/mediaLibrary";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
import { PublisherFormRow } from "../dashboard/publisher/PublisherFormRow";
import { useMediaLibrary } from "../../hooks/useMediaLibrary";

export function MediaLibrarySettings() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const {
    items,
    stats,
    error,
    isLoading,
    isUploading,
    refresh,
    uploadFromInput,
    clearAll,
    deleteByUrl,
  } = useMediaLibrary({ t, maxBytes: isAdmin ? Number.POSITIVE_INFINITY : undefined });

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <PublisherFormRow
        label={t("mediaLibrary.usage")}
        className="rounded-lg border bg-muted/20 p-4 md:grid-cols-[180px_minmax(0,1fr)]"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t("mediaLibrary.usage")}</span>
            <span className="text-muted-foreground">{formatBytes(stats.usedBytes)} / {Number.isFinite(stats.maxBytes) ? formatBytes(stats.maxBytes) : "無上限"}</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((stats.ratio || 0) * 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{t("mediaLibrary.itemCountDesc").replace("{count}", String(stats.count))}</p>
        </div>
      </PublisherFormRow>

      <PublisherFormRow
        label={t("common.actions")}
        className="rounded-lg border bg-background/50 p-4 md:grid-cols-[180px_minmax(0,1fr)]"
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
            {isUploading ? t("mediaLibrary.uploading") : t("mediaLibrary.addToLibrary")}
            <input type="file" accept={MEDIA_FILE_ACCEPT} multiple className="hidden" onChange={uploadFromInput} disabled={isUploading || isLoading} />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={!items.length || isLoading}>
            {t("mediaLibrary.clearLibrary")}
          </Button>
        </div>
      </PublisherFormRow>

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
                  onClick={() => deleteByUrl(item.url)}
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

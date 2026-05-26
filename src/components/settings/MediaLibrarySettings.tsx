import React from "react";
import { Image } from "lucide-react";
import { Button } from "../ui/button";
import { MEDIA_FILE_ACCEPT, formatBytes } from "../../lib/mediaLibrary";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
import { PublisherFormRow } from "../dashboard/publisher/PublisherFormRow";
import { useMediaLibrary } from "../../hooks/useMediaLibrary";
import { SettingsSectionCard } from "./SettingsSectionCard";
import { MediaLibraryBrowser } from "../media/MediaLibraryBrowser";

export function MediaLibrarySettings() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"newest" | "name" | "size">("newest");
  const [selectedId, setSelectedId] = React.useState<string>("");
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
    <SettingsSectionCard
      icon={<Image className="w-4 h-4" />}
      title={t("settings.media")}
      description={t("mediaLibrary.itemCountDesc").replace("{count}", String(stats.count))}
      contentClassName="space-y-4"
    >
      <PublisherFormRow
        label={t("mediaLibrary.usage")}
        className="md:grid-cols-[180px_minmax(0,1fr)]"
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
        className="md:grid-cols-[180px_minmax(0,1fr)]"
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

      <MediaLibraryBrowser
        items={items}
        stats={stats}
        isLoading={isLoading}
        isUploading={isUploading}
        error={error}
        query={query}
        setQuery={setQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onUploadChange={uploadFromInput}
        onDelete={deleteByUrl}
      />
    </SettingsSectionCard>
  );
}

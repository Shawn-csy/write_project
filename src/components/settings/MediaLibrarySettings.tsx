import React from "react";
import { Image } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
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
    organization,
    stats,
    error,
    isLoading,
    isUploading,
    deletingUrl,
    refresh,
    uploadFromInput,
    clearAll,
    deleteByUrl,
    updateOrganization,
  } = useMediaLibrary({ t, maxBytes: isAdmin ? Number.POSITIVE_INFINITY : undefined });

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsSectionCard
      icon={<Image className="w-4 h-4" />}
      title={t("settings.media")}
      description={t("mediaLibrary.subtitle", "管理封面、頭像與 Logo 圖片，點擊縮圖可預覽。")}
      contentClassName="space-y-3"
    >
      <MediaLibraryBrowser
        items={items}
        organization={organization}
        onOrganizationChange={(nextOrganization) => { void updateOrganization(nextOrganization); }}
        stats={stats}
        isLoading={isLoading}
        isUploading={isUploading}
        deletingUrl={deletingUrl}
        error={error}
        query={query}
        setQuery={setQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onUploadChange={uploadFromInput}
        onDelete={deleteByUrl}
        onClearAll={clearAll}
      />
    </SettingsSectionCard>
  );
}

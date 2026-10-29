import React, { Suspense, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";
import { StudioEmptyStateCard } from "../components/common/StudioEmptyStateCard";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { getStudioPublishContext } from "../lib/api/studio";
import type { BaseScriptApi } from "../types/api";

const ScriptMetadataPageLazy = React.lazy(async () => {
  const mod = await import("../components/dashboard/ScriptMetadataDialog");
  return { default: mod.ScriptMetadataPage };
});

const isPublicScript = (script: Partial<BaseScriptApi> | null): boolean =>
  script?.status === "Public" || Boolean((script as { isPublic?: boolean } | null)?.isPublic);

const loadingView = (
  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />載入作品資料中…
  </div>
);

export default function WorkManagePage(): React.JSX.Element {
  const { id = "" } = useParams<{ id: string }>();
  const s = usePublisherDashboardState({ mode: "studio" });
  const [script, setScript] = useState<Partial<BaseScriptApi> | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setScript(null);
    setLoadError("");
    getStudioPublishContext(id)
      .then((target) => {
        if (cancelled) return;
        if (!target?.id) setLoadError("找不到這部作品，可能已被刪除或你沒有編輯權限。");
        else setScript(target);
      })
      .catch(() => {
        if (!cancelled) setLoadError("讀取作品資料失敗，請稍後再試。");
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (script?.title) document.title = `${script.title}｜作品管理`;
  }, [script?.title]);

  if (loadError) {
    return (
      <StudioPage width="narrow">
        <StudioPageHeader back={{ to: "/works", label: "作品" }} title="作品管理" />
        <StudioEmptyStateCard title="無法開啟作品" description={loadError} />
      </StudioPage>
    );
  }

  if (!script || s.isMetaLoading) return loadingView;

  const isFolder = script.type === "folder";

  return (
    <Suspense fallback={loadingView}>
      <ScriptMetadataPageLazy
        key={String(script.id)}
        script={script}
        scriptId={String(script.id)}
        isPublished={isPublicScript(script)}
        backTo="/works"
        editHref={isFolder ? null : `/edit/${encodeURIComponent(String(script.id))}?mode=edit`}
        seriesOptions={s.seriesList.map((item) => ({ id: item.id, name: item.name || "" }))}
        preloadedData={{ personas: s.personas, orgs: s.orgsForPersona }}
        onSeriesCreated={(createdSeries) => {
          if (!createdSeries?.id) return;
          s.setSeriesList((prev) => (prev.some((item) => item.id === createdSeries.id) ? prev : [createdSeries, ...prev]));
        }}
        onSave={(updated) => setScript((prev) => ({ ...(prev || {}), ...updated }))}
      />
    </Suspense>
  );
}

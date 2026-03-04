import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { Button } from "../components/ui/button";
import { getPublicBundle } from "../lib/api/public";
import { getSeriesInfoFromContent, normalizeSeriesName } from "../lib/series";
import { useI18n } from "../contexts/I18nContext";

export default function PublicSeriesPage() {
  const { t } = useI18n();
  const { seriesName: seriesNameParam } = useParams();
  const navigate = useNavigate();
  const seriesName = normalizeSeriesName(decodeURIComponent(seriesNameParam || ""));
  const [scripts, setScripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seriesMeta, setSeriesMeta] = useState({ summary: "", coverUrl: "" });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const bundle = await getPublicBundle();
        const normalized = (bundle?.scripts || [])
          .filter((item) => item?.id)
          .map((item) => {
            const series = getSeriesInfoFromContent(item.content || "");
            return {
              ...item,
              author: item.persona || item.owner || item.author,
              seriesName: series.seriesName,
              seriesOrder: series.seriesOrder,
            };
          })
          .filter((item) => item.seriesName.toLowerCase() === seriesName.toLowerCase())
          .sort((a, b) => {
            const aOrder = a.seriesOrder ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.seriesOrder ?? Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0);
          });
        setScripts(normalized);
        const withMeta = normalized.find((item) => item?.series);
        setSeriesMeta({
          summary: withMeta?.series?.summary || "",
          coverUrl: withMeta?.series?.coverUrl || "",
        });
      } catch (error) {
        console.error("Failed to load series page", error);
        setScripts([]);
        setSeriesMeta({ summary: "", coverUrl: "" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [seriesName]);

  const pageTitle = useMemo(() => {
    if (!seriesName) return t("publicSeries.titleFallback", "系列");
    return `${seriesName}｜${t("publicSeries.pageTitle", "系列作品")}`;
  }, [seriesName, t]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <PublicTopBar
        showBack
        onBack={() => navigate(-1)}
        tabs={[
          { key: "scripts", label: t("publicTopbar.scripts") },
          { key: "authors", label: t("publicTopbar.authors") },
          { key: "orgs", label: t("publicTopbar.orgs") },
        ]}
        activeTab="scripts"
        onTabChange={(key) => {
          if (key === "scripts") navigate("/?view=scripts");
          if (key === "authors") navigate("/?view=authors");
          if (key === "orgs") navigate("/?view=orgs");
        }}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <div className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">{t("publicSeries.series", "系列")}</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">{seriesName || t("publicSeries.unknown", "未命名系列")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {scripts.length} {t("publicReader.worksUnit", "部")}
          </p>
          {seriesMeta.summary && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{seriesMeta.summary}</p>
          )}
        </div>

        {isLoading ? (
          <div
            className="grid gap-4 sm:gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : scripts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>{t("publicSeries.empty", "這個系列目前沒有公開作品。")}</p>
            <Button variant="link" onClick={() => navigate("/")}>
              {t("publicSeries.backHome", "返回首頁")}
            </Button>
          </div>
        ) : (
          <div
            className="grid gap-4 sm:gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
          >
            {scripts.map((script) => (
              <ScriptGalleryCard
                key={script.id}
                script={{ ...script, coverUrl: script.coverUrl || seriesMeta.coverUrl || "" }}
                onClick={() => navigate(`/read/${script.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

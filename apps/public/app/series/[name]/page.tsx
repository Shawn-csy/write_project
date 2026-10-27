import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { buildSeriesData, type PublicBundleLike, type SeriesData } from "@/lib/entityModels";
import { SeriesPageClient } from "./SeriesPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, pickPreviewImage, absoluteUrl } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";
import { getStaticSeriesParams } from "@/lib/staticParams";
import { LiveSeriesPage } from "@/components/LiveEntityPages";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const revalidate = process.env.CF_STATIC_EXPORT === "1" ? false : 3600;
export const dynamicParams = process.env.CF_STATIC_EXPORT !== "1";

export async function generateStaticParams() {
  return getStaticSeriesParams();
}

const fetchSeriesData = cache(async (seriesName: string): Promise<SeriesData> => {
  try {
    return buildSeriesData(await apiFetch<PublicBundleLike>("/public-bundle"), seriesName);
  } catch {
    return { scripts: [], externalItems: [] };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const seriesName = decodeURIComponent(name);
  const { scripts, externalItems, summary, coverUrl } = await fetchSeriesData(seriesName);

  if (scripts.length === 0 && externalItems.length === 0) return { title: `找不到系列｜${TITLE_SUFFIX}` };

  const title = `${seriesName}｜${TITLE_SUFFIX}`;
  const description = summary
    ? summary.slice(0, 200)
    : `${seriesName} 系列共 ${scripts.length + externalItems.length} 部台本，免費線上查看。`;
  const canonicalUrl = `${BASE_URL}/series/${name}`;

  const previewImage = pickPreviewImage(coverUrl);
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "zh_TW",
      images: [{ url: previewImage, alt: seriesName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const seriesName = decodeURIComponent(name);
  const { scripts, externalItems, summary, coverUrl, latestScriptId } = await fetchSeriesData(seriesName);

  if (scripts.length === 0 && externalItems.length === 0) notFound();

  const canonicalUrl = `${BASE_URL}/series/${name}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: seriesName,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    ...(summary && { description: summary }),
    ...(coverUrl && { image: absoluteUrl(coverUrl) }),
    hasPart: [
      ...scripts.map((s) => ({
        "@type": "CreativeWork",
        name: s.title,
        url: `${BASE_URL}/read/${s.id}`,
        ...(s.seriesOrder != null && { position: s.seriesOrder }),
      })),
      ...externalItems.map((item) => ({
        "@type": "CreativeWork",
        name: item.title,
        url: item.sourceUrl,
        ...(item.seriesOrder != null && { position: item.seriesOrder }),
      })),
    ],
  };

  const seriesMeta = {
    summary,
    coverUrl,
    coverCrop: null,
    latestScriptId,
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <PublicTopBar activeTab="scripts" showBack backHref="/" backLabel="返回" trailing={<PublicShellActions />} />
      <noscript>
        <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>{seriesName}</h1>
          {summary && <p>{summary}</p>}
          <ul>
            {scripts.map((s) => (
              <li key={s.id}>
                <a href={`/read/${s.id}`}>{s.title}</a>
              </li>
            ))}
            {externalItems.map((item) => (
              <li key={item.id}><a href={item.sourceUrl}>{item.title}</a></li>
            ))}
          </ul>
        </article>
      </noscript>
      {STATIC_EXPORT ? (
        <LiveSeriesPage
          seriesName={seriesName}
          initial={{ scripts, externalItems, summary, coverUrl, latestScriptId }}
        />
      ) : (
        <SeriesPageClient seriesName={seriesName} scripts={scripts} externalItems={externalItems} seriesMeta={seriesMeta} />
      )}
    </>
  );
}

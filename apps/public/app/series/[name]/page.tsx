import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicScript } from "@/lib/types";
import { toGalleryInput } from "@/lib/galleryProjection";
import { enrichScript } from "@write/public-ui/server";
import {
  groupScriptsIntoGalleryEntries,
  findSeriesGroupByName,
} from "@write/public-ui/server";
import { SeriesPageClient } from "./SeriesPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, pickPreviewImage, absoluteUrl } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";

export const revalidate = 3600;
export const dynamicParams = true;

interface BundleResponse {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
}

interface SeriesData {
  scripts: PublicScript[];
  externalItems: ExternalPublicScript[];
  summary?: string;
  coverUrl?: string;
  latestScriptId?: string;
}

const fetchSeriesData = cache(async (seriesName: string): Promise<SeriesData> => {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    const rawScripts = bundle.scripts ?? [];
    const allEnriched = rawScripts.map((s) => enrichScript(toGalleryInput(s)));
    const entries = groupScriptsIntoGalleryEntries(allEnriched);
    const group = findSeriesGroupByName(entries, seriesName);
    const externalItems = (bundle.externalPublicScripts ?? [])
      .filter((item) => item.status === "published" && item.seriesName?.trim().toLocaleLowerCase() === seriesName.trim().toLocaleLowerCase())
      .sort((a, b) => {
        const aOrder = a.seriesOrder == null ? Number.POSITIVE_INFINITY : a.seriesOrder;
        const bOrder = b.seriesOrder == null ? Number.POSITIVE_INFINITY : b.seriesOrder;
        return aOrder - bOrder || (a.mountedAt ?? a.createdAt ?? 0) - (b.mountedAt ?? b.createdAt ?? 0);
      });
    if (!group && externalItems.length === 0) return { scripts: [], externalItems: [] };
    // Map sorted chapters back to PublicScript by id (preserving model order)
    const byId = new Map(rawScripts.map((s) => [s.id, s]));
    const scripts = (group?.scripts ?? [])
      .map((s) => byId.get(s.id))
      .filter((s): s is PublicScript => s != null);
    const externalCoverItem = externalItems.find((item) => item.coverUrl);
    return {
      scripts,
      externalItems,
      summary: group?.summary || externalItems.find((item) => item.summary)?.summary,
      coverUrl: group?.coverUrl || (externalCoverItem ? `/api/public-media/external/${externalCoverItem.id}` : undefined),
      latestScriptId: group?.latestScript.id || externalItems.at(-1)?.id,
    };
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
      <SeriesPageClient seriesName={seriesName} scripts={scripts} externalItems={externalItems} seriesMeta={seriesMeta} />
    </>
  );
}

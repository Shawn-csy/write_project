import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { toGalleryInput } from "@/lib/galleryProjection";
import { enrichScript } from "@write/public-ui/server";
import {
  groupScriptsIntoGalleryEntries,
  findSeriesGroupByName,
} from "@write/public-ui/server";
import { SeriesPageClient } from "./SeriesPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";
import { BASE_URL, SITE_NAME, pickPreviewImage, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

interface BundleResponse {
  scripts?: PublicScript[];
}

interface SeriesData {
  scripts: PublicScript[];
  summary?: string;
  coverUrl?: string;
  latestScriptId?: string;
}

async function fetchSeriesData(seriesName: string): Promise<SeriesData> {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    const rawScripts = bundle.scripts ?? [];
    const allEnriched = rawScripts.map((s) => enrichScript(toGalleryInput(s)));
    const entries = groupScriptsIntoGalleryEntries(allEnriched);
    const group = findSeriesGroupByName(entries, seriesName);
    if (!group) return { scripts: [] };
    // Map sorted chapters back to PublicScript by id (preserving model order)
    const byId = new Map(rawScripts.map((s) => [s.id, s]));
    const scripts = group.scripts
      .map((s) => byId.get(s.id))
      .filter((s): s is PublicScript => s != null);
    return { scripts, summary: group.summary, coverUrl: group.coverUrl, latestScriptId: group.latestScript.id };
  } catch {
    return { scripts: [] };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const seriesName = decodeURIComponent(name);
  const { scripts, summary, coverUrl } = await fetchSeriesData(seriesName);

  if (scripts.length === 0) return { title: "找不到系列｜Screenplay Reader" };

  const title = `${seriesName}｜Screenplay Reader`;
  const description = summary
    ? summary.slice(0, 200)
    : `${seriesName} 系列共 ${scripts.length} 部台本，免費線上閱讀。`;
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
  const { scripts, summary, coverUrl, latestScriptId } = await fetchSeriesData(seriesName);

  if (scripts.length === 0) notFound();

  const canonicalUrl = `${BASE_URL}/series/${name}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: seriesName,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    ...(summary && { description: summary }),
    ...(coverUrl && { image: absoluteUrl(coverUrl) }),
    hasPart: scripts.map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: `${BASE_URL}/read/${s.id}`,
      ...(s.seriesOrder != null && { position: s.seriesOrder }),
    })),
  };

  const seriesMeta = {
    summary,
    coverUrl,
    coverCrop: null,
    latestScriptId,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />
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
          </ul>
        </article>
      </noscript>
      <SeriesPageClient seriesName={seriesName} scripts={scripts} seriesMeta={seriesMeta} />
    </>
  );
}

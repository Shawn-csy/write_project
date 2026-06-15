import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { SeriesPageClient } from "./SeriesPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

interface BundleResponse {
  scripts?: PublicScript[];
}

async function fetchSeriesScripts(seriesName: string): Promise<PublicScript[]> {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    const normalized = seriesName.toLowerCase();
    return (bundle.scripts ?? [])
      .filter((s) => {
        const sn = (s.series as { name?: string } | null)?.name ?? "";
        return sn.toLowerCase() === normalized;
      })
      .sort((a, b) => {
        const aOrder = Number(a.seriesOrder ?? Number.MAX_SAFE_INTEGER);
        const bOrder = Number(b.seriesOrder ?? Number.MAX_SAFE_INTEGER);
        if (aOrder !== bOrder) return aOrder - bOrder;
        return Number(b.lastModified ?? b.updatedAt ?? 0) - Number(a.lastModified ?? a.updatedAt ?? 0);
      });
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const seriesName = decodeURIComponent(name);
  const scripts = await fetchSeriesScripts(seriesName);

  if (scripts.length === 0) return { title: "找不到系列｜Screenplay Reader" };

  const seriesMeta = scripts.find((s) => s.series)?.series as
    | { name?: string; summary?: string; coverUrl?: string }
    | null
    | undefined;

  const title = `${seriesName}｜Screenplay Reader`;
  const description = seriesMeta?.summary
    ? seriesMeta.summary.slice(0, 200)
    : `${seriesName} 系列共 ${scripts.length} 部台本，免費線上閱讀。`;
  const canonicalUrl = `${BASE_URL}/series/${name}`;
  const image = seriesMeta?.coverUrl;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      siteName: "Screenplay Reader",
      locale: "zh_TW",
      ...(image && { images: [{ url: image, alt: seriesName }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
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
  const scripts = await fetchSeriesScripts(seriesName);

  if (scripts.length === 0) notFound();

  const seriesMeta = scripts.find((s) => s.series)?.series as
    | { name?: string; summary?: string; coverUrl?: string }
    | null
    | undefined;

  const canonicalUrl = `${BASE_URL}/series/${name}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    name: seriesName,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    ...(seriesMeta?.summary && { description: seriesMeta.summary }),
    ...(seriesMeta?.coverUrl && { image: seriesMeta.coverUrl }),
    hasPart: scripts.map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: `${BASE_URL}/read/${s.id}`,
      ...(s.seriesOrder != null && { position: s.seriesOrder }),
    })),
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
          {seriesMeta?.summary && <p>{seriesMeta.summary}</p>}
          <ul>
            {scripts.map((s) => (
              <li key={s.id}>
                <a href={`/read/${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </article>
      </noscript>
      <SeriesPageClient seriesName={seriesName} scripts={scripts} seriesMeta={seriesMeta ?? null} />
    </>
  );
}

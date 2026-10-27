import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { ScriptReaderClient } from "./ScriptReaderClient";
import { ConsentGate } from "./ConsentGate";
import { parseScreenplay } from "@write/script-engine";
import { resolveMarkerConfigs } from "@/lib/markerThemeResolver";
import { encodeCrawlSafePayload } from "@/lib/crawl-safe-payload";
import type { AstNode, TocEntry } from "@write/script-engine";
import {
  buildReadPageTitle,
  buildReadPageDescription,
  buildReadPageCanonicalUrl,
  buildReadPageStructuredData,
  buildReadPageBreadcrumbData,
  buildReadPageOpenGraph,
  buildReadPageTwitterCard,
  buildReadPageExcerpt,
  buildReadPageRatingMeta,
  isAdultScript,
} from "@/lib/readPageSeo";
import { TITLE_SUFFIX } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";

// ISR: hourly fallback; on-demand revalidation handles real-time updates.
//
// 原本是 86400（一天）。Next 送出的 Cache-Control 是
//   s-maxage=<revalidate>, stale-while-revalidate=<expireTime - revalidate>
// 搭配預設 expireTime（一年）等於告訴 Cloudflare「過期後仍可供應舊版最多一年」。
// 2026-08-20 資料庫事故期間，三篇台本的 404 就是這樣被 CDN 鎖住的。
// 改為 1 小時，並在 next.config.ts 收斂 expireTime。
export const revalidate = 3600;

// Keep unknown script IDs generated on first request, but make the generated
// reader page cacheable by Next.js instead of treating every request as SSR.
export const dynamic = "force-static";

// Unknown script IDs are generated on first request, not blocked
export const dynamicParams = true;

const fetchScript = cache(async (id: string): Promise<PublicScript | null> => {
  try {
    return await apiFetch<PublicScript>(`/public-scripts/${id}`, {
      next: { revalidate },
    });
  } catch {
    return null;
  }
});


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const script = await fetchScript(id);

  if (!script) {
    return { title: `找不到台本｜${TITLE_SUFFIX}` };
  }

  const title = buildReadPageTitle(script);
  const description = buildReadPageDescription(script);
  const canonicalUrl = buildReadPageCanonicalUrl(id);

  const rating = buildReadPageRatingMeta(script);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: buildReadPageOpenGraph(script, id),
    twitter: buildReadPageTwitterCard(script),
    ...(rating && { other: { rating } }),
  };
}

export default async function ScriptReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const script = await fetchScript(id);

  if (!script) {
    notFound();
  }

  const description = buildReadPageDescription(script);
  const authorName = script.persona?.displayName ?? script.owner?.displayName ?? "";
  const tags = (script.tags ?? []).map((t) => t.name).filter(Boolean);
  const excerpt = buildReadPageExcerpt(script);

  // JSON-LD injected as a real <script> tag for crawlers (same model as generateMetadata)
  const structuredData = buildReadPageStructuredData(script, id);
  const breadcrumbData = buildReadPageBreadcrumbData(script, id);

  // Parse content server-side with marker theme (engine is canonical)
  const markerConfigs = await resolveMarkerConfigs(script);
  const scriptDocument = script.content
    ? parseScreenplay(script.content, markerConfigs)
    : null;
  const scriptAst: AstNode = scriptDocument?.ast ?? { type: "root", children: [] };
  const toc: TocEntry[] = scriptDocument?.toc ?? [];
  const readerPayload = encodeCrawlSafePayload({
    initialScript: script,
    scriptAst,
    markerConfigs,
    toc,
  });
  // TOC labels come from the script body, which sits behind the consent gate.
  // For age-gated (adult) works they must not leak into the public HTML.
  const showToc = toc.length > 0 && !isAdultScript(script);

  return (
    <>
      <JsonLdScript data={[structuredData, breadcrumbData]} />
      {/*
        ScriptReaderClient renders the full reader UI.
        It receives renderBlocks so it can render the same content both on the
        server (SSR) and after hydration — no duplicate, no flash.
        The client component itself handles the sticky nav + header + content.

        The summary prop renders above the loading spinner and consent form,
        then disappears once the reader is shown. Googlebot sees it in SSR HTML
        (ConsentGate SSR = loading state = summary is rendered). It is genuine
        visible content — not hidden text — consistent with the public API response.
      */}
      <ConsentGate
        scriptId={id}
        summary={
          <div data-seo-excerpt className="px-4 py-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">{script.title}</h1>
            {(excerpt.synopsis || description) && (
              <p className="text-muted-foreground mb-3 whitespace-pre-line">{excerpt.synopsis || description}</p>
            )}
            {excerpt.outline && (
              <section className="mb-3">
                <h2 className="text-base font-semibold mb-1">大綱</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{excerpt.outline}</p>
              </section>
            )}
            {showToc && (
              <nav aria-label="目錄" className="mb-3">
                <h2 className="text-base font-semibold mb-1">目錄</h2>
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-0.5">
                  {toc.slice(0, 40).map((entry, index) => (
                    <li key={`${entry.id}:${index}`}>{entry.label}</li>
                  ))}
                </ol>
              </nav>
            )}
            <dl className="text-sm text-muted-foreground space-y-1">
              {authorName && <div><dt className="inline font-medium">作者：</dt><dd className="inline">{authorName}</dd></div>}
              {script.organization?.name && <div><dt className="inline font-medium">組織：</dt><dd className="inline">{script.organization.name}</dd></div>}
              {tags.length > 0 && <div><dt className="inline font-medium">標籤：</dt><dd className="inline">{tags.join("、")}</dd></div>}
            </dl>
          </div>
        }
      >
        <ScriptReaderClient
          scriptId={id}
          {...readerPayload}
        />
      </ConsentGate>
    </>
  );
}

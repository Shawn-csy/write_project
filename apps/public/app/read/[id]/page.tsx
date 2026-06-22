import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { ScriptReaderClient } from "./ScriptReaderClient";
import { ConsentGate } from "./ConsentGate";
import { parseScreenplay } from "@write/script-engine";
import { resolveMarkerConfigs } from "@/lib/markerThemeResolver";
import type { AstNode, TocEntry } from "@write/script-engine";
import {
  buildReadPageTitle,
  buildReadPageDescription,
  buildReadPageCanonicalUrl,
  buildReadPageStructuredData,
  buildReadPageBreadcrumbData,
  buildReadPageOpenGraph,
  buildReadPageTwitterCard,
} from "@/lib/readPageSeo";
import { TITLE_SUFFIX, jsonLdSafe } from "@/lib/seo";

// ISR: revalidate daily as fallback; on-demand revalidation handles real-time updates
export const revalidate = 86400;

// Unknown script IDs are generated on first request, not blocked
export const dynamicParams = true;

async function fetchScript(id: string): Promise<PublicScript | null> {
  try {
    return await apiFetch<PublicScript>(`/public-scripts/${id}`);
  } catch {
    return null;
  }
}


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

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: buildReadPageOpenGraph(script, id),
    twitter: buildReadPageTwitterCard(script),
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSafe([structuredData, breadcrumbData]) }}
      />
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
            {description && <p className="text-muted-foreground mb-3">{description}</p>}
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
          initialScript={script}
          scriptAst={scriptAst}
          markerConfigs={markerConfigs}
          toc={toc}
        />
      </ConsentGate>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { ScriptReaderClient } from "./ScriptReaderClient";
import { ConsentGate } from "./ConsentGate";
import { parseScreenplay, toRenderBlocks } from "@write/script-engine";
import { resolveMarkerConfigs } from "@/lib/markerThemeResolver";
import { getScriptDescription } from "@/lib/scriptDescription";
import type { RenderBlock, TocEntry, MarkerConfig } from "@write/script-engine";
import { BASE_URL, SITE_NAME, pickPreviewImage, absoluteUrl } from "@/lib/seo";

// ISR: revalidate daily as fallback; on-demand revalidation handles real-time updates
export const revalidate = 86400;

// Unknown script IDs are generated on first request, not blocked
export const dynamicParams = true;

function getAuthorName(script: PublicScript): string {
  if (script.persona?.displayName) return script.persona.displayName;
  if (script.owner?.displayName) return script.owner.displayName;
  return "";
}

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
    return { title: "找不到台本｜Screenplay Reader" };
  }

  const title = `${script.title}｜Screenplay Reader`;
  const description = getScriptDescription(script);
  const canonicalUrl = `${BASE_URL}/read/${id}`;
  const authorName = getAuthorName(script);
  const orgName = script.organization?.name ?? "";
  const tags = (script.tags ?? []).map((t) => t.name).filter(Boolean);

  const dateRaw = script.updatedAt ?? script.lastModified;
  let dateModified: string | undefined;
  if (typeof dateRaw === "number" && Number.isFinite(dateRaw)) {
    try { dateModified = new Date(dateRaw).toISOString(); } catch { /* noop */ }
  } else if (typeof dateRaw === "string" && dateRaw.trim()) {
    const parsed = Date.parse(dateRaw);
    if (!Number.isNaN(parsed)) dateModified = new Date(parsed).toISOString();
  }

  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: script.title,
    headline: script.title,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    description,
    isAccessibleForFree: true,
    ...(tags.length > 0 && { genre: tags }),
    ...(dateModified && { dateModified }),
    ...(authorName && { author: { "@type": "Person", name: authorName } }),
    ...(orgName && { publisher: { "@type": "Organization", name: orgName } }),
    ...(script.coverUrl && { image: absoluteUrl(script.coverUrl) }),
  };

  const previewImage = pickPreviewImage(script.coverUrl);
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: "zh_TW",
      images: [{ url: previewImage, alt: script.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
    other: {
      "application/ld+json": JSON.stringify(structuredData)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026"),
    },
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

  const description = getScriptDescription(script);
  const authorName = getAuthorName(script);
  const tags = (script.tags ?? []).map((t) => t.name).filter(Boolean);
  const canonicalUrl = `${BASE_URL}/read/${id}`;

  // JSON-LD injected as a real <script> tag for crawlers
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: script.title,
    headline: script.title,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    description,
    isAccessibleForFree: true,
    ...(tags.length > 0 && { genre: tags }),
    ...(authorName && { author: { "@type": "Person", name: authorName } }),
    ...(script.organization?.name && {
      publisher: { "@type": "Organization", name: script.organization.name },
    }),
    ...(script.coverUrl && { image: absoluteUrl(script.coverUrl) }),
  };

  // Parse content server-side with marker theme (engine is canonical)
  const markerConfigs = await resolveMarkerConfigs(script);
  const scriptDocument = script.content
    ? parseScreenplay(script.content, markerConfigs)
    : null;
  const renderBlocks: RenderBlock[] = scriptDocument
    ? toRenderBlocks(scriptDocument.ast, markerConfigs)
    : [];
  const toc: TocEntry[] = scriptDocument?.toc ?? [];

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
          renderBlocks={renderBlocks}
          markerConfigs={markerConfigs}
          toc={toc}
        />
      </ConsentGate>
    </>
  );
}

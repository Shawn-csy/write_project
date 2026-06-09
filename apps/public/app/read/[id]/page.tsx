import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { ScriptReaderClient } from "./ScriptReaderClient";

// ISR: revalidate daily as fallback; on-demand revalidation handles real-time updates
export const revalidate = 86400;

// Unknown script IDs are generated on first request, not blocked
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

function getScriptDescription(script: PublicScript): string {
  if (script.synopsis) return script.synopsis.slice(0, 300);
  const synopsisEntry = (script.customMetadata ?? []).find(
    (e) => ["synopsis", "summary", "摘要", "outline", "大綱"].includes(
      (e.key ?? "").toLowerCase().replace(/\s/g, "")
    )
  );
  if (synopsisEntry?.value) return synopsisEntry.value.slice(0, 300);
  if (script.content) {
    const firstLine = script.content.split("\n").find((l) => l.trim());
    if (firstLine) return firstLine.trim().slice(0, 200);
  }
  return "公開劇本閱讀頁";
}

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
    ...(script.coverUrl && { image: script.coverUrl }),
  };

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonicalUrl,
      siteName: "Screenplay Reader",
      locale: "zh_TW",
      ...(script.coverUrl && {
        images: [{ url: script.coverUrl, alt: script.title }],
      }),
    },
    twitter: {
      card: script.coverUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(script.coverUrl && { images: [script.coverUrl] }),
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
    ...(script.coverUrl && { image: script.coverUrl }),
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
      {/* Static content for crawlers — visible before JS hydrates */}
      <noscript>
        <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>{script.title}</h1>
          {authorName && <p>作者：{authorName}</p>}
          {description && <p>{description}</p>}
          {tags.length > 0 && <p>標籤：{tags.join("、")}</p>}
          {script.content && (
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {script.content}
            </pre>
          )}
        </article>
      </noscript>
      {/* Interactive client component handles full reader UI */}
      <ScriptReaderClient scriptId={id} initialScript={script} />
    </>
  );
}

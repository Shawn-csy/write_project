import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { TagPageClient } from "./TagPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";
import { filterScriptsByTag } from "./filterScriptsByTag";
import { BASE_URL, SITE_NAME, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

interface BundleResponse {
  scripts?: PublicScript[];
}

async function fetchTagScripts(tagName: string): Promise<PublicScript[]> {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    return filterScriptsByTag(bundle.scripts ?? [], tagName);
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
  const tagName = decodeURIComponent(name);
  const scripts = await fetchTagScripts(tagName);

  if (scripts.length === 0) return { title: "找不到標籤｜Screenplay Reader" };

  const title = `#${tagName}｜Screenplay Reader`;
  const description = `標籤「${tagName}」共 ${scripts.length} 部台本，免費線上閱讀。`;
  const canonicalUrl = `${BASE_URL}/tag/${name}`;

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
      images: [{ url: DEFAULT_OG_IMAGE_URL, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE_URL],
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const tagName = decodeURIComponent(name);
  const scripts = await fetchTagScripts(tagName);

  if (scripts.length === 0) notFound();

  const canonicalUrl = `${BASE_URL}/tag/${name}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `#${tagName}`,
    url: canonicalUrl,
    inLanguage: "zh-Hant",
    description: `標籤「${tagName}」的公開台本列表`,
    hasPart: scripts.map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: `${BASE_URL}/read/${s.id}`,
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
          <h1>#{tagName}</h1>
          <ul>
            {scripts.map((s) => (
              <li key={s.id}>
                <a href={`/read/${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </article>
      </noscript>
      <TagPageClient tagName={tagName} scripts={scripts} />
    </>
  );
}

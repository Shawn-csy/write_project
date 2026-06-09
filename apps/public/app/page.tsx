import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { GalleryClient } from "./GalleryClient";

export const revalidate = 300; // 5-min ISR; on-demand revalidation handles real-time updates

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

export const metadata: Metadata = {
  title: "免費台本 · 劇本線上閱讀｜Screenplay Reader",
  description:
    "免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。",
  alternates: { canonical: BASE_URL },
  openGraph: {
    type: "website",
    title: "免費台本 · 劇本線上閱讀｜Screenplay Reader",
    description: "免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。",
    url: BASE_URL,
    siteName: "Screenplay Reader",
    locale: "zh_TW",
  },
  twitter: {
    card: "summary",
    title: "免費台本 · 劇本線上閱讀｜Screenplay Reader",
    description: "免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。",
  },
};

interface BundleResponse {
  scripts?: PublicScript[];
}

async function fetchInitialScripts(): Promise<PublicScript[]> {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    return (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const initialScripts = await fetchInitialScripts();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Screenplay Reader",
    url: BASE_URL,
    description: "免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。",
    inLanguage: "zh-Hant",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
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
      {/* Static script list for crawlers (hidden visually; GalleryClient renders the real UI) */}
      <noscript>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>公開台本列表｜Screenplay Reader</h1>
          <p>免費瀏覽、閱讀與分享創作台本。</p>
          <ul>
            {initialScripts.slice(0, 100).map((s) => (
              <li key={s.id}>
                <a href={`/read/${s.id}`}>{s.title}</a>
                {s.synopsis && <span> — {s.synopsis.slice(0, 80)}</span>}
              </li>
            ))}
          </ul>
        </main>
      </noscript>
      <GalleryClient initialScripts={initialScripts} />
    </>
  );
}

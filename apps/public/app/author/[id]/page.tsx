import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicPersona, PublicScript } from "@/lib/types";
import { AuthorPageClient } from "./AuthorPageClient";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com";

async function fetchPersona(id: string): Promise<PublicPersona | null> {
  try {
    return await apiFetch<PublicPersona>(`/public-personas/${id}`);
  } catch {
    return null;
  }
}

async function fetchScripts(personaId: string): Promise<PublicScript[]> {
  try {
    return await apiFetch<PublicScript[]>(`/public-scripts?personaId=${personaId}`);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const persona = await fetchPersona(id);
  if (!persona) return { title: "找不到作者｜Screenplay Reader" };

  const title = `${persona.displayName}｜Screenplay Reader`;
  const description = (persona.bio || `${persona.displayName} 的公開台本作品`).slice(0, 200);
  const canonicalUrl = `${BASE_URL}/author/${id}`;
  const image = persona.avatar || persona.bannerUrl;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: persona.displayName,
    url: canonicalUrl,
    ...(persona.bio && { description: persona.bio }),
    ...(image && { image }),
    ...(persona.website && { sameAs: [persona.website] }),
  };

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "profile",
      title,
      description,
      url: canonicalUrl,
      siteName: "Screenplay Reader",
      locale: "zh_TW",
      ...(image && { images: [{ url: image, alt: persona.displayName }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image] }),
    },
    other: {
      "application/ld+json": JSON.stringify(structuredData)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026"),
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [persona, scripts] = await Promise.all([fetchPersona(id), fetchScripts(id)]);

  if (!persona) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: persona.displayName,
    url: `${BASE_URL}/author/${id}`,
    ...(persona.bio && { description: persona.bio }),
    ...(persona.avatar && { image: persona.avatar }),
    ...(persona.website && { sameAs: [persona.website] }),
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
      <noscript>
        <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>{persona.displayName}</h1>
          {persona.bio && <p>{persona.bio}</p>}
          {scripts.length > 0 && (
            <>
              <h2>公開作品</h2>
              <ul>
                {scripts.map((s) => (
                  <li key={s.id}>
                    <a href={`/read/${s.id}`}>{s.title}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      </noscript>
      <AuthorPageClient persona={persona} scripts={scripts} />
    </>
  );
}

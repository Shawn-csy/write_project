import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicAudioWork, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import { getPublicVoicePerformances } from "@/lib/publicVoicePerformances";
import { combinePublicIdentities, externalScriptsForPersona } from "@/lib/publicIdentity";
import { AuthorPageClient } from "./AuthorPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, pickPreviewImage, absoluteUrl } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";
import { getStaticAuthorParams } from "@/lib/staticParams";
import { LiveAuthorPage } from "@/components/LiveEntityPages";
import { ROLE_LABELS } from "@/components/identity/identityRoles";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

/** Back to the directory this person is most likely reached from. */
function identityTopBar(persona: PublicPersona): { activeTab: string; backHref: string; backLabel: string } {
  const roles = persona.roles || [];
  if (roles.includes("scriptwriter")) return { activeTab: "authors", backHref: "/authors", backLabel: "返回作者" };
  const production = roles.find((role) => role !== "voice_actor");
  if (roles.includes("voice_actor") || !production) return { activeTab: "resources", backHref: "/resources", backLabel: "返回資源" };
  return { activeTab: "resources", backHref: `/resources?category=${production}`, backLabel: "返回資源" };
}

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getStaticAuthorParams();
}

const fetchPersona = cache(async (id: string): Promise<PublicPersona | null> => {
  try {
    return await apiFetch<PublicPersona>(`/public-personas/${id}`);
  } catch {
    return null;
  }
});

async function fetchScripts(personaId: string): Promise<PublicScript[]> {
  try {
    return await apiFetch<PublicScript[]>(`/public-scripts?personaId=${personaId}`);
  } catch {
    return [];
  }
}

const fetchPublicBundle = cache(async (): Promise<{
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  demoSubmissions?: PublicDemoSubmission[];
  organizations?: PublicOrg[];
  audioWorks?: PublicAudioWork[];
}> => {
  try {
    return await apiFetch("/public-bundle?sections=scripts,externalPublicScripts,demoSubmissions,organizations,audioWorks", { next: { revalidate: 300, tags: ["public-bundle"] } });
  } catch {
    return {};
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const persona = await fetchPersona(id);
  if (!persona) return { title: `找不到作者｜${TITLE_SUFFIX}` };

  const title = `${persona.displayName}｜${TITLE_SUFFIX}`;
  const roleNames = (persona.roles || []).map((role) => ROLE_LABELS[role]).filter(Boolean).join("、");
  const description = (persona.bio || `${persona.displayName}${roleNames ? `（${roleNames}）` : ""} 的公開作品與參與紀錄`).slice(0, 200);
  const canonicalUrl = `${BASE_URL}/author/${id}`;
  const previewImage = pickPreviewImage(persona.avatar || persona.bannerUrl);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: persona.displayName,
    url: canonicalUrl,
    ...(persona.bio && { description: persona.bio }),
    ...(persona.avatar && { image: absoluteUrl(persona.avatar) }),
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
      siteName: SITE_NAME,
      locale: "zh_TW",
      images: [{ url: previewImage, alt: persona.displayName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [persona, scripts, bundle] = await Promise.all([fetchPersona(id), fetchScripts(id), fetchPublicBundle()]);

  if (!persona) notFound();

  const performances = getPublicVoicePerformances(id, bundle);
  const externalScripts = externalScriptsForPersona(persona, bundle.externalPublicScripts || []);
  const audioWorks = (bundle.audioWorks || []).filter((work) => work.voiceActors?.some((actor) => actor.id === id));
  const displayPersona = combinePublicIdentities([persona], externalScripts)[0];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: persona.displayName,
    url: `${BASE_URL}/author/${id}`,
    ...(displayPersona.bio && { description: displayPersona.bio }),
    ...(displayPersona.avatar && { image: absoluteUrl(displayPersona.avatar) }),
    ...(displayPersona.website && { sameAs: [displayPersona.website] }),
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <PublicTopBar {...identityTopBar(persona)} showBack />
      <noscript>
        <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>{persona.displayName}</h1>
          {displayPersona.bio && <p>{displayPersona.bio}</p>}
          {scripts.length > 0 && (
            <>
              <h2>台本作品</h2>
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
      {STATIC_EXPORT ? (
        <LiveAuthorPage id={id} initial={{ persona, scripts, performances, externalScripts, audioWorks }} />
      ) : (
        <AuthorPageClient persona={persona} scripts={scripts} performances={performances} externalScripts={externalScripts} audioWorks={audioWorks} />
      )}
    </>
  );
}

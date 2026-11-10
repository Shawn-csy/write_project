import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicAudioWork, PublicOrg, PublicScript } from "@/lib/types";
import { externalScriptsForOrganization } from "@/lib/organizationExternalScripts";
import { OrgPageClient } from "./OrgPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, pickPreviewImage, absoluteUrl } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";
import { getStaticOrgParams } from "@/lib/staticParams";
import { LiveOrgPage } from "@/components/LiveEntityPages";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return getStaticOrgParams();
}

const fetchOrg = cache(async (id: string): Promise<PublicOrg | null> => {
  try {
    return await apiFetch<PublicOrg>(`/public-organizations/${id}`);
  } catch {
    return null;
  }
});

async function fetchScripts(orgId: string): Promise<PublicScript[]> {
  try {
    return await apiFetch<PublicScript[]>(`/public-scripts?organizationId=${orgId}`);
  } catch {
    return [];
  }
}

async function fetchWorksBundle(): Promise<{ audioWorks?: PublicAudioWork[]; externalPublicScripts?: ExternalPublicScript[] }> {
  try {
    return await apiFetch<{ audioWorks?: PublicAudioWork[]; externalPublicScripts?: ExternalPublicScript[] }>("/public-bundle?sections=audioWorks,externalPublicScripts");
  } catch {
    return {};
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const org = await fetchOrg(id);
  if (!org) return { title: `找不到組織｜${TITLE_SUFFIX}` };

  const title = `${org.name}｜${TITLE_SUFFIX}`;
  const description = (org.description || `${org.name} 的公開台本作品`).slice(0, 200);
  const canonicalUrl = `${BASE_URL}/org/${id}`;
  const previewImage = pickPreviewImage(org.logoUrl || org.bannerUrl);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: canonicalUrl,
    ...(org.description && { description: org.description }),
    ...(org.logoUrl && { logo: absoluteUrl(org.logoUrl) }),
    ...(org.logoUrl && { image: absoluteUrl(org.logoUrl) }),
    ...(org.website && { sameAs: [org.website] }),
  };

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
      images: [{ url: previewImage, alt: org.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [previewImage],
    },
  };
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org, scripts, bundle] = await Promise.all([fetchOrg(id), fetchScripts(id), fetchWorksBundle()]);

  if (!org) notFound();
  const audioWorks = (bundle.audioWorks || []).filter((work) => work.organizationId === id);
  const externalScripts = externalScriptsForOrganization(org, bundle.externalPublicScripts || []);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: `${BASE_URL}/org/${id}`,
    ...(org.description && { description: org.description }),
    ...(org.logoUrl && { logo: absoluteUrl(org.logoUrl) }),
    ...(org.logoUrl && { image: absoluteUrl(org.logoUrl) }),
    ...(org.website && { sameAs: [org.website] }),
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <PublicTopBar activeTab="orgs" showBack backHref="/?view=orgs" backLabel="返回組織列表" />
      <noscript>
        <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>{org.name}</h1>
          {org.description && <p>{org.description}</p>}
          {scripts.length + externalScripts.length > 0 && (
            <>
              <h2>公開作品</h2>
              <ul>
                {scripts.map((s) => (
                  <li key={s.id}>
                    <a href={`/read/${s.id}`}>{s.title}</a>
                  </li>
                ))}
                {externalScripts.map((s) => (
                  <li key={s.id}><a href={s.sourceUrl}>{s.title || s.remoteTitle}</a></li>
                ))}
              </ul>
            </>
          )}
          {audioWorks.length > 0 && <p><a href={`/audio-works?organization=${encodeURIComponent(id)}`}>音聲作品（{audioWorks.length}）</a></p>}
        </article>
      </noscript>
      {STATIC_EXPORT ? (
        <LiveOrgPage id={id} initial={{ org, scripts, externalScripts, audioWorks }} />
      ) : (
        <OrgPageClient org={org} scripts={scripts} externalScripts={externalScripts} audioWorks={audioWorks} />
      )}
    </>
  );
}

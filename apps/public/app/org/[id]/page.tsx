import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { PublicOrg, PublicScript } from "@/lib/types";
import { OrgPageClient } from "./OrgPageClient";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, pickPreviewImage, absoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

async function fetchOrg(id: string): Promise<PublicOrg | null> {
  try {
    return await apiFetch<PublicOrg>(`/public-organizations/${id}`);
  } catch {
    return null;
  }
}

async function fetchScripts(orgId: string): Promise<PublicScript[]> {
  try {
    return await apiFetch<PublicScript[]>(`/public-scripts?organizationId=${orgId}`);
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
    other: {
      "application/ld+json": JSON.stringify(structuredData)
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026"),
    },
  };
}

export default async function OrgPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [org, scripts] = await Promise.all([fetchOrg(id), fetchScripts(id)]);

  if (!org) notFound();

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />
      <PublicTopBar activeTab="orgs" trailing={<PublicShellActions />} />
      <noscript>
        <article style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>{org.name}</h1>
          {org.description && <p>{org.description}</p>}
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
      <OrgPageClient org={org} scripts={scripts} />
    </>
  );
}

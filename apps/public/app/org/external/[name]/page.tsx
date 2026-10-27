import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref, externalEntitySlug, socialAvatarUrl } from "@/lib/externalEntity";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";
import { ExternalEntityPage } from "@/components/ExternalEntityPage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";
import { decodeRouteName, findExternalOrgModel } from "@/lib/entityModels";
import { getStaticExternalOrgParams } from "@/lib/staticParams";
import { LiveExternalOrgPage } from "@/components/LiveEntityPages";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const revalidate = process.env.CF_STATIC_EXPORT === "1" ? false : 300;
export const dynamicParams = process.env.CF_STATIC_EXPORT !== "1";

export async function generateStaticParams() {
  return getStaticExternalOrgParams();
}

async function fetchExternalScripts(): Promise<ExternalPublicScript[]> {
  try {
    const bundle = await apiFetch<{ externalPublicScripts?: ExternalPublicScript[] }>("/public-bundle", { next: { revalidate } });
    return (bundle.externalPublicScripts || []).filter((item) => item.status === "published");
  } catch {
    return [];
  }
}

function decodeName(value: string): string {
  return decodeRouteName(value);
}

async function getModel(rawName: string) {
  return findExternalOrgModel(await fetchExternalScripts(), rawName);
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name: rawName } = await params;
  const model = await getModel(rawName);
  if (!model) return { title: `找不到外部組織｜${TITLE_SUFFIX}` };
  const canonicalUrl = `${BASE_URL}${externalEntityHref("org", model.name, model.profileUrl)}`;
  const previewImage = model.profileAvatarUrl || socialAvatarUrl(model.profileUrl) || DEFAULT_OG_IMAGE_URL;
  const title = `${model.name}｜${TITLE_SUFFIX}`;
  const description = model.bio || `${model.name} 收錄於本站的外部公開台本作品。`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { type: "website", title, description, url: canonicalUrl, siteName: SITE_NAME, locale: "zh_TW", images: [{ url: previewImage, alt: model.name }] },
    twitter: { card: "summary_large_image", title, description, images: [previewImage] },
  };
}

export default async function ExternalOrgPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const model = await getModel(rawName);
  if (!model) notFound();
  const canonicalPath = externalEntityHref("org", model.name, model.profileUrl);
  if (decodeName(rawName).trim() !== externalEntitySlug(model.name, model.profileUrl)) {
    redirect(canonicalPath);
  }
  return (
    <>
      <PublicTopBar activeTab="orgs" trailing={<PublicShellActions />} />
      {STATIC_EXPORT ? (
        <LiveExternalOrgPage rawName={rawName} initial={model} />
      ) : (
        <ExternalEntityPage kind="org" name={model.name} bio={model.bio} profileUrl={model.profileUrl} profileAvatarUrl={model.profileAvatarUrl} items={model.items} />
      )}
    </>
  );
}

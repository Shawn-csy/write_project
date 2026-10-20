import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref, socialAvatarUrl } from "@/lib/externalEntity";
import { BASE_URL, SITE_NAME, TITLE_SUFFIX, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";
import { ExternalEntityPage } from "@/components/ExternalEntityPage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

export const revalidate = 300;
export const dynamicParams = true;

async function fetchExternalScripts(): Promise<ExternalPublicScript[]> {
  try {
    const bundle = await apiFetch<{ externalPublicScripts?: ExternalPublicScript[] }>("/public-bundle", { next: { revalidate } });
    return (bundle.externalPublicScripts || []).filter((item) => item.status === "published");
  } catch {
    return [];
  }
}

function decodeName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function getModel(rawName: string) {
  const name = decodeName(rawName);
  const items = (await fetchExternalScripts()).filter((item) => item.organizationName?.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase());
  if (items.length === 0) return null;
  return {
    name: items[0].organizationName?.trim() || name,
    profileUrl: items.find((item) => item.organizationUrl)?.organizationUrl || "",
    profileAvatarUrl: items.find((item) => item.organizationAvatarUrl)?.organizationAvatarUrl || "",
    items,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name: rawName } = await params;
  const model = await getModel(rawName);
  if (!model) return { title: `找不到外部組織｜${TITLE_SUFFIX}` };
  const canonicalUrl = `${BASE_URL}${externalEntityHref("org", model.name)}`;
  const previewImage = model.profileAvatarUrl || socialAvatarUrl(model.profileUrl) || DEFAULT_OG_IMAGE_URL;
  const title = `${model.name}｜${TITLE_SUFFIX}`;
  const description = `${model.name} 收錄於本站的外部公開台本作品。`;
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
  return (
    <>
      <PublicTopBar activeTab="orgs" trailing={<PublicShellActions />} />
      <ExternalEntityPage kind="org" name={model.name} profileUrl={model.profileUrl} profileAvatarUrl={model.profileAvatarUrl} items={model.items} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript } from "@/lib/types";
import { externalEntityHref, externalEntitySlug, socialAvatarUrl } from "@/lib/externalEntity";
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
  const normalizedName = name.trim().toLocaleLowerCase();
  const items = (await fetchExternalScripts()).filter((item) => {
    const authorName = item.authorName?.trim() || "";
    return authorName.toLocaleLowerCase() === normalizedName
      || externalEntitySlug(authorName, item.authorUrl).toLocaleLowerCase() === normalizedName;
  });
  if (items.length === 0) return null;
  return {
    name: items[0].authorName?.trim() || name,
    bio: items.find((item) => item.authorBio?.trim())?.authorBio?.trim() || "",
    profileUrl: items.find((item) => item.authorUrl)?.authorUrl || "",
    profileAvatarUrl: items.find((item) => item.authorAvatarUrl)?.authorAvatarUrl || "",
    items,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name: rawName } = await params;
  const model = await getModel(rawName);
  if (!model) return { title: `找不到外部作者｜${TITLE_SUFFIX}` };
  const canonicalUrl = `${BASE_URL}${externalEntityHref("author", model.name, model.profileUrl)}`;
  const previewImage = model.profileAvatarUrl || socialAvatarUrl(model.profileUrl) || DEFAULT_OG_IMAGE_URL;
  const title = `${model.name}｜${TITLE_SUFFIX}`;
  const description = model.bio || `${model.name} 收錄於本站的外部公開台本作品。`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { type: "profile", title, description, url: canonicalUrl, siteName: SITE_NAME, locale: "zh_TW", images: [{ url: previewImage, alt: model.name }] },
    twitter: { card: "summary_large_image", title, description, images: [previewImage] },
  };
}

export default async function ExternalAuthorPage({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = await params;
  const model = await getModel(rawName);
  if (!model) notFound();
  const canonicalPath = externalEntityHref("author", model.name, model.profileUrl);
  if (decodeName(rawName).trim() !== externalEntitySlug(model.name, model.profileUrl)) {
    redirect(canonicalPath);
  }
  return (
    <>
      <PublicTopBar activeTab="authors" trailing={<PublicShellActions />} />
      <ExternalEntityPage kind="author" name={model.name} bio={model.bio} profileUrl={model.profileUrl} profileAvatarUrl={model.profileAvatarUrl} items={model.items} />
    </>
  );
}

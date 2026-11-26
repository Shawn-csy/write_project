import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoDetailHref } from "@write/public-ui/demo-detail-href";
import { IdentityRedirect } from "@/components/IdentityRedirect";
import { demoArtwork } from "@/lib/demoArtwork";
import { fetchDemoCatalog } from "@/lib/demoPageData";
import { absoluteUrl, pickPreviewImage, SITE_SEARCH_NAME, TITLE_SUFFIX } from "@/lib/seo";
import { DemoShowcaseClient } from "../../DemoShowcaseClient";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";
const EMPTY_ROUTE = { kind: "internal", id: "index" };

type DemoParams = Promise<{ kind: string; id: string }>;

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  if (!STATIC_EXPORT && process.env.PREBUILD_PUBLIC_PAGES !== "1") return [];
  const { groups } = await fetchDemoCatalog();
  const params = groups.map(({ key, id }) => ({ kind: key.slice(0, key.indexOf(":")), id }));
  return params.length ? params : [EMPTY_ROUTE];
}

export async function generateMetadata({ params }: { params: DemoParams }): Promise<Metadata> {
  const { kind, id } = await params;
  const catalog = await fetchDemoCatalog();
  const group = catalog.groups.find(({ key }) => key === `${kind}:${id}`);
  if (!group) return { title: `Demo｜${TITLE_SUFFIX}`, robots: { index: false, follow: true } };

  const title = `${group.title}｜演出 Demo｜${TITLE_SUFFIX}`;
  const description = (group.summary.trim() || `試聽《${group.title}》的演出 Demo，查看聲演與原始台本。`).slice(0, 180);
  const url = absoluteUrl(demoDetailHref(group.key));
  const artwork = group.demos.map((demo) => demoArtwork(demo.url, demo.coverUrl)).find(Boolean) || group.coverUrl;
  const image = { url: pickPreviewImage(artwork, "/og/demos.png"), alt: `${group.title}的演出封面` };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: SITE_SEARCH_NAME, locale: "zh_TW", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function DemoDetailPage({ params }: { params: DemoParams }) {
  const { kind, id } = await params;
  const key = `${kind}:${id}`;
  const catalog = await fetchDemoCatalog();
  if (!catalog.groups.some((group) => group.key === key)) {
    if (kind === EMPTY_ROUTE.kind && id === EMPTY_ROUTE.id && catalog.groups.length === 0) return <IdentityRedirect href="/demos" />;
    notFound();
  }
  return <DemoShowcaseClient key={key} initialCatalog={catalog} initialScriptKey={key} refreshOnMount={STATIC_EXPORT} />;
}

import { notFound } from "next/navigation";
import { getWorkCatalog } from "@/lib/workPageData";
import { workHref } from "@/lib/workIdentity";
import { BASE_URL, TITLE_SUFFIX } from "@/lib/seo";
import { LiveWorkDetail } from "../LiveWorkDetail";
import { WorkDetail } from "../WorkDetail";

export const revalidate = 300;
export const dynamicParams = true;
type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  if (process.env.CF_STATIC_EXPORT !== "1") return [];
  return Array.from((await getWorkCatalog()).keys(), id => ({ id }));
}

export async function generateMetadata({ params }: Props) {
  const work = (await getWorkCatalog()).get((await params).id);
  if (work) return { title: `${work.title}｜作品卡｜${TITLE_SUFFIX}`, alternates: { canonical: BASE_URL + workHref(work.id) } };
}

export default async function WorkPage({ params }: Props) {
  const work = (await getWorkCatalog()).get((await params).id);
  if (!work) notFound();
  return process.env.CF_STATIC_EXPORT === "1" ? <LiveWorkDetail id={work.id} initial={work} /> : <WorkDetail work={work} />;
}

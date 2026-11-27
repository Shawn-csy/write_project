import { getWorkCatalog } from "@/lib/workPageData";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { WorksDirectory } from "./WorksDirectory";

export const metadata = publicDirectoryMetadata("/works", `作品卡｜${TITLE_SUFFIX}`, "查閱台本、音聲、遊戲與原聲帶的作品資料和參與人員。");
export const revalidate = 300;

export default async function WorksPage() {
  const catalog = await getWorkCatalog();
  return <WorksDirectory works={Array.from(catalog.values(), ({ id, kind, title, cover, gated, primaryHref }) => ({ id, kind, title, cover, gated, primaryHref }))} />;
}

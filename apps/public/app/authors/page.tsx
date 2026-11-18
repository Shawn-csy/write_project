import { DEFAULT_URL_STATE } from "@write/public-ui/server";
import { GalleryClient } from "@/app/GalleryClient";
import { LiveGalleryClient } from "@/app/LiveGalleryClient";
import { loadHomepageBundle } from "@/lib/loadHomepageBundle";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

// The standalone image must not bake an empty directory when the Backend is
// unavailable during build. Runtime data is cached at the API boundary.
export const dynamic = "force-dynamic";

export const metadata = publicDirectoryMetadata(
  "/authors",
  `作者｜${TITLE_SUFFIX}`,
  "探索公開台本的作者，依姓名或標籤找創作者，查看個人介紹、公開台本與參與作品。",
);

export default async function AuthorsPage() {
  const bundle = await loadHomepageBundle();
  const initialUrlState = { ...DEFAULT_URL_STATE, view: "authors" as const };

  return STATIC_EXPORT ? (
    <LiveGalleryClient {...bundle} initialUrlState={initialUrlState} />
  ) : (
    <GalleryClient
      initialScripts={bundle.scripts}
      initialExternalPublicScripts={bundle.externalPublicScripts}
      initialPersonas={bundle.personas}
      initialOrganizations={bundle.organizations}
      initialActivities={bundle.activities}
      initialBannerSlides={bundle.bannerSlides}
      showBrandHero={bundle.showBrandHero}
      initialUrlState={initialUrlState}
    />
  );
}

import { Suspense } from "react";
import { PublicDirectoryLoading } from "@/components/PublicDirectoryLoading";
import { apiFetch } from "@/lib/api";
import { AUTHOR_DIRECTORY_SECTIONS, buildAuthorDirectory } from "@/lib/authorDirectory";
import type { HomepageBundleResponse } from "@/lib/homepageBundle";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { AuthorDirectoryClient } from "./AuthorDirectoryClient";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const dynamic = "force-dynamic";

export const metadata = publicDirectoryMetadata(
  "/authors",
  `作者｜${TITLE_SUFFIX}`,
  "探索公開台本的作者，依姓名或標籤找創作者，查看個人介紹、公開台本與參與作品。",
);

export default function AuthorsPage() {
  return (
    <Suspense fallback={<PublicDirectoryLoading title="作者" />}>
      <AuthorsDirectory />
    </Suspense>
  );
}

async function AuthorsDirectory() {
  const bundle = await apiFetch<HomepageBundleResponse>(`/public-bundle?sections=${AUTHOR_DIRECTORY_SECTIONS.join(",")}`, {
    next: { revalidate: 300, tags: ["public-bundle"] },
  }).catch((error: unknown) => {
    if (STATIC_EXPORT) throw error;
    return null;
  });
  return <AuthorDirectoryClient initialDirectory={bundle ? buildAuthorDirectory(bundle) : null} refreshOnMount={STATIC_EXPORT || !bundle} />;
}

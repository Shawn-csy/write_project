import { PublicBrowseHeader } from "./PublicBrowseHeader";
import { PublicBrowseMain } from "./PublicBrowseMain";
import { PublicCardGridSkeleton, PublicListSkeleton } from "./PublicSkeleton";

export function PublicDirectoryLoading({ title, layout = "list" }: { title: string; layout?: "list" | "grid" }) {
  return (
    <PublicBrowseMain>
      <PublicBrowseHeader title={title} />
      {layout === "grid"
        ? <PublicCardGridSkeleton count={4} aspect="aspect-video" />
        : <PublicListSkeleton />}
    </PublicBrowseMain>
  );
}

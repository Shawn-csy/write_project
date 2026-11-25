const INTERNAL_PUBLICATION_TAGS = new Set(["demo 投稿建立", "待認領"]);

export function getPublicPersonaTags(tags?: readonly string[] | null): string[] {
  return (tags ?? []).filter((tag) => !INTERNAL_PUBLICATION_TAGS.has(
    tag.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(),
  ));
}

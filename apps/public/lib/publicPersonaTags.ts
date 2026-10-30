const INTERNAL_PUBLICATION_TAGS = new Set(["demo 投稿建立"]);

export function getPublicPersonaTags(tags?: string[] | null): string[] {
  return (tags || []).filter((tag) => !INTERNAL_PUBLICATION_TAGS.has(String(tag).trim().toLocaleLowerCase()));
}

export const AUDIENCE_TAG_GROUP = ["男性向", "女性向", "全性向"];
export const RATING_TAG_GROUP = ["一般", "R-18", "r18", "一般內容", "全年齡向", "成人向"];

import type { TagLike } from "../../types/persona";

const toLower = (value: unknown) => String(value || "").trim().toLowerCase();

export function findTagByName(tags: TagLike[] | null | undefined, name: string) {
  const needle = toLower(name);
  return (tags || []).find((tag) => toLower(tag?.name) === needle) || null;
}

export function removeGroupTagsExcept(tags: TagLike[] | null | undefined, groupNames: string[], keepName: string) {
  const keep = toLower(keepName);
  const groupSet = new Set((groupNames || []).map(toLower));
  return (tags || []).filter((tag) => {
    const name = toLower(tag?.name);
    if (!groupSet.has(name)) return true;
    return name === keep;
  });
}

export async function syncGroupedTagSelection({
  currentTags,
  availableTags,
  selectedName,
  groupNames,
  createTag,
  resolveColor,
  onTagCreated,
}: {
  currentTags: TagLike[];
  availableTags: TagLike[];
  selectedName: string;
  groupNames: string[];
  createTag: (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>;
  resolveColor?: (name: string) => string;
  onTagCreated?: (tag: TagLike) => void;
}) {
  const selected = String(selectedName || "").trim();
  if (!selected) return [...(currentTags || [])];

  const nextTags = removeGroupTagsExcept(currentTags, groupNames, selected);
  if (findTagByName(nextTags, selected)) return nextTags;

  let resolved = findTagByName(availableTags, selected);
  if (!resolved) {
    resolved = await createTag(selected, resolveColor ? resolveColor(selected) : "bg-gray-500");
    if (onTagCreated) onTagCreated(resolved);
  }
  return [...nextTags, resolved];
}

import type { PublicAudioWork } from "@/lib/types";

export type AudioWorkSortOrder = "newest" | "oldest";

export function audioWorkTime(work: PublicAudioWork): number {
  return work.publishedAt ?? work.createdAt ?? 0;
}

export function sortAudioWorks(works: PublicAudioWork[], order: AudioWorkSortOrder): PublicAudioWork[] {
  const direction = order === "newest" ? -1 : 1;
  return [...works].sort((a, b) => {
    const aHasRelease = a.publishedAt != null;
    const bHasRelease = b.publishedAt != null;
    if (aHasRelease !== bHasRelease) return aHasRelease ? -1 : 1;
    return direction * (audioWorkTime(a) - audioWorkTime(b)) || a.id.localeCompare(b.id);
  });
}

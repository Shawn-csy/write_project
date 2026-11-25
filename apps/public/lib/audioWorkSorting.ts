import { audioWorkReleaseTime } from "./publicAudioWorkContent";
import type { PublicAudioWork } from "@/lib/types";

export type AudioWorkSortOrder = "newest" | "oldest";

export function sortAudioWorks(works: PublicAudioWork[], order: AudioWorkSortOrder): PublicAudioWork[] {
  const direction = order === "newest" ? -1 : 1;
  return [...works].sort((a, b) => {
    const aRelease = audioWorkReleaseTime(a);
    const bRelease = audioWorkReleaseTime(b);
    if ((aRelease === undefined) !== (bRelease === undefined)) return aRelease === undefined ? 1 : -1;
    return direction * ((aRelease ?? a.createdAt ?? 0) - (bRelease ?? b.createdAt ?? 0)) || a.id.localeCompare(b.id);
  });
}

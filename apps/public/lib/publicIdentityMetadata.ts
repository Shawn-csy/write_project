import { PARTICIPATION_ROLE_LABELS } from "@write/public-ui/participation-roles";
import { getPublicPersonaTags } from "./publicPersonaTags";
import type { PublicIdentityRole } from "./types";

export function publicIdentityRoleLabel(role: PublicIdentityRole, recordingEntityType?: unknown) {
  if (role === "recording_studio") {
    if (recordingEntityType === "person") return "錄音師";
    if (recordingEntityType === "studio") return "錄音室";
  }
  return PARTICIPATION_ROLE_LABELS[role];
}

const roleTags = new Set([
  ...Object.keys(PARTICIPATION_ROLE_LABELS),
  ...Object.values(PARTICIPATION_ROLE_LABELS),
  publicIdentityRoleLabel("recording_studio", "person"),
  publicIdentityRoleLabel("recording_studio", "studio"),
  "recording_engineer", "recording_unclassified", "待分類錄音", "封面", "封面插畫",
]);

export function publicIdentityTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  return getPublicPersonaTags(tags).filter((tag) => {
    const key = tag.normalize("NFKC").trim().toLocaleLowerCase();
    if (!key || roleTags.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((tag) => tag.trim());
}

import { gameResourceProfiles, mergeGameParticipations } from "./gameCatalog";
import { buildResourceDirectory, type ResourceDirectoryEntry, type ResourceDirectorySummary } from "./resourceDirectory";
import type { PublicPersona, PublicWorkParticipation, ProductionRole } from "./types";

type WorkReference = Pick<PublicWorkParticipation, "id" | "creditRole">
  & Partial<Pick<PublicWorkParticipation, "audioWorkId" | "url" | "characterName" | "title">>;

export interface ResourceIndexRow extends Pick<PublicPersona, "id" | "displayName" | "roles" | "links" | "bio" | "tags" | "avatar" | "website" | "voiceActorHidden"> {
  workReferences: WorkReference[];
  recordingEntityType?: "person" | "studio" | null;
  commissionCategories: ProductionRole[];
}

export interface ResourceSummary extends ResourceDirectorySummary {
  localOnly?: boolean;
}

const gameEntries = buildResourceDirectory(gameResourceProfiles, []);
const localWorks = new Map(gameEntries.map(entry => [entry.id, entry.works]));

export function gameResourceWorks(id: string) {
  return localWorks.get(id) ?? [];
}

export function buildResourceIndex(rows: ResourceIndexRow[]): ResourceSummary[] {
  // Preserve identity fields for duplicate credits and locally curated games.
  // The snapshot contains only the resulting counts and visible profile fields.
  const people = rows.map(({ workReferences, recordingEntityType, ...profile }) => ({
    ...profile,
    recordingEntityType: recordingEntityType ?? undefined,
    workParticipations: workReferences.map(ref => ({
      title: "", coverUrl: "", url: "", creditedAs: "", ...ref,
    })),
  }));
  const index: ResourceSummary[] = buildResourceDirectory(mergeGameParticipations(people), []).map(summaryOf);
  const existing = new Set(index.map(row => row.id));
  for (const entry of gameEntries) {
    if (!existing.has(entry.id)) index.push({ ...summaryOf(entry), localOnly: true });
  }
  return index;
}

function summaryOf({ works: _works, ...summary }: ResourceDirectoryEntry): ResourceDirectorySummary {
  return summary;
}

export function resourceWorks(person: PublicPersona) {
  return buildResourceDirectory(mergeGameParticipations([person]), [])[0]?.works ?? [];
}

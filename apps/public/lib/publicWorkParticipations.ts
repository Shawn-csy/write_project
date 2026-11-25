import type { PublicPersona, PublicWorkParticipation } from "./types";

/** Current credits take precedence while legacy-only works and missing fields remain visible. */
export function mergePublicWorkParticipations(...sources: readonly PublicWorkParticipation[][]): PublicWorkParticipation[] {
  const works: PublicWorkParticipation[] = [];
  for (const source of sources) {
    for (const work of source) {
      const match = works.find((candidate) =>
        candidate.creditRole === work.creditRole
        && (!candidate.characterName || !work.characterName || candidate.characterName === work.characterName)
        && (
          (work.audioWorkId && candidate.audioWorkId === work.audioWorkId)
          || (work.url?.trim() && candidate.url?.trim() === work.url.trim())
          || candidate.id === work.id
        )
      );
      if (!match) {
        works.push({ ...work });
        continue;
      }
      match.coverUrl ||= work.coverUrl;
      match.url ||= work.url;
      match.title ||= work.title;
      match.creditedAs ||= work.creditedAs;
      match.characterName ||= work.characterName;
      match.description ||= work.description;
      match.audioWorkId ||= work.audioWorkId;
      match.workType ||= work.workType;
    }
  }
  return works;
}


export function legacyVoiceWorkParticipations(person?: PublicPersona): PublicWorkParticipation[] {
  return (person?.voiceActorWorks || []).map((work, index) => ({
    id: `legacy-voice-${index}`,
    title: work.title || "未命名作品",
    url: work.url || "",
    coverUrl: work.coverUrl || "",
    creditRole: "voice_actor",
    creditedAs: "",
    characterName: work.role,
    description: work.description,
  }));
}

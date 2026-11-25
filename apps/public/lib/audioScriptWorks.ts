import type { PublicAudioWork, PublicPersona } from "@/lib/types";

/** Only backend-confirmed identity links may associate a script with an author. */
export function audioScriptWorksForPersona(persona: PublicPersona, works: PublicAudioWork[]): PublicAudioWork[] {
  const ids = new Set((persona.workParticipations || [])
    .filter((credit) => credit.creditRole === "scriptwriter").map((credit) => credit.audioWorkId));
  return works.filter((work) => ids.has(work.id));
}


/** Locate catalog works that already have a published work/identity association. */
export function audioWorksForOtherParticipations(persona: PublicPersona, works: PublicAudioWork[], displayed: PublicAudioWork[]): PublicAudioWork[] {
  const linkedIds = new Set((persona.workParticipations || []).map((credit) => credit.audioWorkId).filter(Boolean));
  const displayedIds = new Set(displayed.map((work) => work.id));
  return works.filter((work) => linkedIds.has(work.id) && !displayedIds.has(work.id));
}

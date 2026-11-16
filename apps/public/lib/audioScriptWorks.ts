import type { PublicAudioWork, PublicPersona } from "@/lib/types";

/** Only backend-confirmed identity links may associate a script with an author. */
export function audioScriptWorksForPersona(persona: PublicPersona, works: PublicAudioWork[]): PublicAudioWork[] {
  const ids = new Set((persona.workParticipations || [])
    .filter((credit) => credit.creditRole === "scriptwriter").map((credit) => credit.audioWorkId));
  return works.filter((work) => ids.has(work.id));
}

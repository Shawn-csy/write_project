import type { PublicAudioWork, PublicPersona } from "@/lib/types";

/** Link a credited audio script only when the source uses this exact identity name. */
export function audioScriptWorksForPersona(persona: PublicPersona, works: PublicAudioWork[]): PublicAudioWork[] {
  return works.filter((work) => work.credits?.some((credit) =>
    (credit.role === "script" || credit.role === "author") && credit.creditedAs === persona.displayName,
  ));
}

import { getPublicVoicePerformances, hasVoiceActorSelfTag, type PublicVoiceWorkBundle } from "./publicVoicePerformances";
import type { PublicPersona } from "./types";

export const VOICE_ACTOR_DIRECTORY_SECTIONS = ["personas", "scripts", "externalPublicScripts", "demoSubmissions"] as const;

export interface VoiceActorDirectoryBundle extends PublicVoiceWorkBundle {
  personas?: PublicPersona[];
}

export type VoiceActorDirectoryEntry = Pick<PublicPersona, "id" | "displayName" | "bio" | "tags" | "links" | "externalHref" | "avatar">;

export function buildVoiceActorDirectory(bundle: VoiceActorDirectoryBundle): VoiceActorDirectoryEntry[] {
  return (bundle.personas || [])
    .filter((persona) => !persona.voiceActorHidden && (persona.roles?.includes("voice_actor") ?? (hasVoiceActorSelfTag(persona)
      || getPublicVoicePerformances(persona.id, bundle).length > 0)))
    .map(({ id, displayName, bio, tags, links, externalHref, avatar }) => ({ id, displayName, bio, tags, links, externalHref, avatar }));
}

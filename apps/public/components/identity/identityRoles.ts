import type { ExternalPublicScript, ProductionRole, PublicAudioWork, PublicDemoSubmission, PublicIdentityRole, PublicPersona, PublicScript } from "@/lib/types";
import { PRODUCTION_ROLES } from "@/lib/types";
import { hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";
import { hasScriptwriterRole } from "@/lib/publicIdentity";

/** Display names for every identity role, in page order. */
export const ROLE_LABELS: Record<PublicIdentityRole, string> = {
  scriptwriter: "台本師",
  voice_actor: "聲演",
  post_production: "後製",
  cover_art: "封面",
  recording_studio: "錄音室",
};

export const ROLE_ORDER: PublicIdentityRole[] = ["scriptwriter", "voice_actor", ...PRODUCTION_ROLES];

export type ProfileFormKind = "author" | "voice_actor" | "production";

export interface IdentityWorks {
  scripts: PublicScript[];
  externalScripts: ExternalPublicScript[];
  performances: PublicDemoSubmission[];
  audioWorks: PublicAudioWork[];
}

/**
 * The roles a page shows. The server's role list is authoritative; the
 * fallbacks only cover payloads cached from before roles were published.
 */
export function resolveIdentityRoles(persona: PublicPersona, works: IdentityWorks): PublicIdentityRole[] {
  const declared = new Set<PublicIdentityRole>(persona.roles || []);
  if (!persona.roles) {
    if (hasScriptwriterRole(persona, works.scripts, works.externalScripts) || works.scripts.length > 0 || works.externalScripts.length > 0) declared.add("scriptwriter");
    if (hasVoiceActorSelfTag(persona) || works.performances.length > 0 || works.audioWorks.length > 0 || (persona.voiceActorWorks || []).length > 0) declared.add("voice_actor");
  }
  return ROLE_ORDER.filter((role) => declared.has(role));
}

export function productionRolesOf(roles: PublicIdentityRole[]): ProductionRole[] {
  return roles.filter((role): role is ProductionRole => (PRODUCTION_ROLES as readonly string[]).includes(role));
}

/** Which kinds of profile data a visitor may propose for this identity. */
export function editableProfileKinds(persona: PublicPersona, roles: PublicIdentityRole[]): ProfileFormKind[] {
  const kinds: ProfileFormKind[] = [];
  if (roles.includes("scriptwriter")) kinds.push("author");
  if (roles.includes("voice_actor") && persona.voiceActorCollaborationEnabled !== false) kinds.push("voice_actor");
  if (productionRolesOf(roles).length > 0) kinds.push("production");
  return kinds;
}

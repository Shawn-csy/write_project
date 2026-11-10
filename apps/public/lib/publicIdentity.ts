import type { ExternalPublicScript, PublicPersona, PublicScript } from "./types";
import { externalPersonasFromScripts } from "./galleryProjection";

export function externalScriptsForPersona(persona: Pick<PublicPersona, "id" | "displayName">, scripts: ExternalPublicScript[]): ExternalPublicScript[] {
  return scripts.filter((script) => script.status === "published" && script.authorPersonaId === persona.id);
}

export function hasScriptwriterRole(persona: PublicPersona, internalScripts: PublicScript[], externalScripts: ExternalPublicScript[]): boolean {
  void internalScripts;
  void externalScripts;
  return persona.roles?.includes("scriptwriter") === true;
}

export function combinePublicIdentities(personas: PublicPersona[], externalScripts: ExternalPublicScript[]): PublicPersona[] {
  const personaIds = new Set(personas.map((persona) => persona.id));
  const linkedScripts = new Map<string, ExternalPublicScript[]>();
  for (const script of externalScripts) {
    if (!script.authorPersonaId || !personaIds.has(script.authorPersonaId)) continue;
    const scripts = linkedScripts.get(script.authorPersonaId) || [];
    scripts.push(script);
    linkedScripts.set(script.authorPersonaId, scripts);
  }

  const mergedPersonas = personas.map((persona) => {
    const scripts = linkedScripts.get(persona.id) || [];
    if (scripts.length === 0) return persona;
    const external = externalPersonasFromScripts(scripts)[0];
    if (!external) return persona;
    return {
      ...persona,
      bio: persona.bio || external.bio,
      avatar: persona.avatar || external.avatar,
      website: persona.website || external.website,
      links: persona.links?.length ? persona.links : external.links,
      tags: Array.from(new Set([...(persona.tags || []), ...(external.tags || [])])),
    };
  });
  // A linked script whose persona is absent from this response still needs a card.
  const externalOnly = externalPersonasFromScripts(externalScripts.filter((script) => !script.authorPersonaId || !personaIds.has(script.authorPersonaId)));
  return [...mergedPersonas, ...externalOnly];
}

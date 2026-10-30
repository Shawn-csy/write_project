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
  const externalOnly = externalPersonasFromScripts(externalScripts.filter((script) => !script.authorPersonaId));
  return [...personas, ...externalOnly];
}

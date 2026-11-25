import type { PublicAudioWork, PublicOrg } from "./types";

export const AUDIO_CATALOG_SECTIONS = ["audioWorks", "organizations"] as const;
export const AUDIO_CATALOG_SNAPSHOT = "/audio-works/catalog.json";

export interface AudioCatalog {
  audioWorks: PublicAudioWork[];
  organizations: PublicOrg[];
}

export function parseAudioCatalog(value: unknown): AudioCatalog {
  const catalog = value as Partial<AudioCatalog> | null;
  if (!Array.isArray(catalog?.audioWorks) || !Array.isArray(catalog.organizations)) {
    throw new Error("Incomplete audio catalog");
  }
  return { audioWorks: catalog.audioWorks, organizations: catalog.organizations };
}

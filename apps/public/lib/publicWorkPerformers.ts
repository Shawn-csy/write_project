import type { PublicAudioWork, PublicPersona } from "./types";

export interface PublicWorkPerformer {
  name: string;
  href?: string;
  avatar?: string;
  socialUrl?: string;
}

function nameKey(name: string): string {
  return name.normalize("NFKC").trim().toLocaleLowerCase();
}

function mergePerformers(performers: PublicWorkPerformer[]): PublicWorkPerformer[] {
  const result: PublicWorkPerformer[] = [];
  for (const performer of performers) {
    const name = performer.name.trim();
    if (!name) continue;
    const key = nameKey(name);
    const existing = result.find((item) =>
      nameKey(item.name) === key
      && (!performer.href || !item.href || performer.href === item.href)
      && (!performer.socialUrl || !item.socialUrl || performer.socialUrl === item.socialUrl)
    );
    if (!existing) {
      result.push({ ...performer, name });
      continue;
    }
    existing.href ||= performer.href;
    existing.avatar ||= performer.avatar;
    existing.socialUrl ||= performer.socialUrl;
  }
  return result;
}

export function publicDemoPerformers(demo: {
  voiceActorIds?: readonly string[];
  manualVoiceActors?: ReadonlyArray<{ name: string; personaId?: string; socialUrl?: string }>;
  cast?: string;
}, personas?: ReadonlyMap<string, PublicPersona>): PublicWorkPerformer[] {
  const linked = (demo.voiceActorIds || []).flatMap((id) => {
    const persona = personas?.get(id);
    return persona && !persona.voiceActorHidden ? [{
      name: persona.displayName,
      href: persona.externalHref || `/author/${encodeURIComponent(id)}`,
      avatar: persona.avatar,
    }] : [];
  });
  const manual = (demo.manualVoiceActors || []).map((actor) => {
    const persona = actor.personaId ? personas?.get(actor.personaId) : undefined;
    return {
      name: actor.name,
      href: actor.personaId && (!personas || persona) && !persona?.voiceActorHidden ? persona?.externalHref || `/author/${encodeURIComponent(actor.personaId)}` : undefined,
      avatar: persona?.voiceActorHidden ? undefined : persona?.avatar,
      socialUrl: /^https?:\/\//i.test(actor.socialUrl?.trim() || "") ? actor.socialUrl?.trim() : undefined,
    };
  });
  const legacy = (demo.cast || "").split(/[、,，/／|;；\n]+/).map((value) => value.trim())
    .filter((value) => !/^(作者|原作者|台本師|編劇|劇本師|腳本家|脚本家|シナリオライター|author|writer|script\s*writer)(?:\s*[:：]|\s|$)/i.test(value))
    .map((value) => ({ name: value.replace(/^(聲演|声優|配音|演出者|cast)\s*[:：]?\s*/i, "").trim() }));
  return mergePerformers([...linked, ...manual, ...legacy]);
}

// Reviewed aliases from server/scripts/data/public_catalog_backfills.json.
// Only used to remove duplicate text when that person is already on this work's roster.
const AUDIO_ROSTER_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "f878d56b-5077-418b-a15c-6755e65f7018": ["伊橙"],
  "826f24e7-1fac-4718-8ac4-c7682eb8bffb": ["晚晚配音中", "楓林晚"],
};

export function publicAudioPerformers(work: PublicAudioWork): PublicWorkPerformer[] {
  const roster = (work.voiceActors || []).map((actor) => ({
    name: actor.name,
    href: `/author/${encodeURIComponent(actor.id)}`,
    avatar: actor.avatar,
  }));
  const rosterById = new Map((work.voiceActors || []).map((actor) => [actor.id, actor.name]));
  const rosterAliases = new Map<string, string>();
  for (const [id, name] of rosterById) {
    for (const alias of AUDIO_ROSTER_ALIASES[id] || []) rosterAliases.set(nameKey(alias), name);
  }
  const voiceCredits = (work.credits || []).filter((credit) => credit.role === "voice_actor");
  const linkedCredits = voiceCredits.filter((credit) => credit.personaId);
  const confirmedNames = new Set([...roster.map((actor) => actor.name), ...linkedCredits.map((credit) => credit.creditedAs)].map(nameKey));
  for (const alias of rosterAliases.keys()) confirmedNames.add(alias);
  const credits = voiceCredits.filter((credit) => {
    if (credit.personaId || confirmedNames.has(nameKey(credit.creditedAs))) return true;
    // Suppress an old combined label only when every printed name is already confirmed for this work.
    const names = credit.creditedAs.split(/[、,，／]+|\s+\/\s+/).map(nameKey).filter(Boolean);
    return names.length < 2 || !names.every((name) => confirmedNames.has(name));
  });

  return mergePerformers([
    ...roster,
    ...credits.map((credit) => ({
      name: (credit.personaId ? rosterById.get(credit.personaId) : rosterAliases.get(nameKey(credit.creditedAs))) || credit.creditedAs,
      href: credit.personaId ? `/author/${encodeURIComponent(credit.personaId)}` : undefined,
      avatar: credit.personaAvatar,
    })),
  ]);
}

export function publicAudioWorksForPerformer(works: PublicAudioWork[] | undefined, personaId: string): PublicAudioWork[] {
  return (works || []).filter((work) => work.voiceActors?.some((actor) => actor.id === personaId)
    || work.credits?.some((credit) => credit.role === "voice_actor" && credit.personaId === personaId));
}

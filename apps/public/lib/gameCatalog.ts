import participations from "../../../server/scripts/data/taiwan_adult_games_participations_2026-11-26.json";
import resourceProfiles from "../../../server/scripts/data/taiwan_adult_games_resource_profiles_2026-11-26.json";
import { additionalGameScreenshots, gameCreditIdentity, gameCredits, type GameCreditCategory, type GameCreditsEntry } from "./gameCredits";
import type { PublicIdentityRole, PublicPersona, PublicWorkParticipation } from "./types";

const roleCategories: Partial<Record<string, GameCreditCategory>> = {
  voice_actor: "配音",
  recording_studio: "錄音",
  cover_art: "美術",
  post_production: "後製",
};
const cleanRoleLabel = (role: string, sourceRole: string): string => {
  if (role === "voice_actor") return "配音";
  if (role === "cover_art") return "美術";
  if (/音樂製作|原聲帶創作|原聲帶音樂|Production/.test(sourceRole)) return "音樂";
  if (role === "recording_studio") return "錄音";
  return "後製";
};
const works = [...participations.works, ...resourceProfiles.works];

const groupedGames = new Map(gameCredits.map((game) => [game.appId, {
  ...game, credits: [...game.credits],
}]));

const identityWorks = new Map<string, PublicWorkParticipation[]>();
for (const work of works) {
  const appId = new URL(work.url).pathname.split("/")[2];
  const game = groupedGames.get(appId) ?? {
    appId,
    title: work.title,
    screenshotUrl: additionalGameScreenshots[appId] ?? work.coverUrl,
    credits: [],
  };
  const performerNames = new Set(game.performers);
  for (const person of work.participants) {
    const { personaId, role, creditedAs, sourceUrl, sourceRole, characterName, description } = person;
    if (role === "voice_actor" && /英文配音|日文配音|日語配音/.test(description ?? "")) continue;
    let category = roleCategories[role];
    if (!category) continue;
    if (/音樂製作|原聲帶創作|原聲帶音樂|Production|^音樂／錄音$/.test(sourceRole)) category = "音樂";
    if (role === "voice_actor") performerNames.add(creditedAs);

    const displayRole = cleanRoleLabel(role, sourceRole);
    const recorded = game.credits.find((credit) =>
      gameCreditIdentity(credit)?.id === personaId
      && (credit.role === displayRole || (role === "voice_actor" && credit.category === "配音")
        || (credit.role === "後製" && displayRole === "錄音") || (credit.role === "錄音" && displayRole === "後製")),
    );
    const character = recorded ? undefined : characterName;
    if (recorded) {
      if ((recorded.role === "後製" && displayRole === "錄音") || (recorded.role === "錄音" && displayRole === "後製")) {
        recorded.role = "錄音／混音";
      }
    } else {
      game.credits.push({
        category,
        role: displayRole,
        attribution: character ? `${creditedAs}（${character}）` : creditedAs,
        creditedAs,
        personaId,
        sourceUrl,
      });
    }
    const personWorks = identityWorks.get(personaId) ?? [];
    personWorks.push({
      id: `${appId}-${role}`,
      title: game.title,
      coverUrl: game.screenshotUrl,
      creditRole: role as PublicIdentityRole,
      creditedAs,
      url: `/games/${appId}`,
      workType: "game",
      characterName: character,
      description: recorded?.attribution ?? description,
    });
    identityWorks.set(personaId, personWorks);
  }
  game.performers = [...performerNames];
  // Sort credits in a consistent order: 配音 -> 聲音導演 -> 美術 -> 錄音 -> 後製 -> 音樂 -> 音效
  const order: Record<string, number> = { 配音: 0, 聲音導演: 1, 美術: 2, 錄音: 3, "錄音／混音": 4, 後製: 5, 音樂: 6, 音效: 7 };
  game.credits.sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9));
  groupedGames.set(appId, game);
}

// Games with Taiwanese voice performers appear first, ordered by completeness.
export const gameCatalog: GameCreditsEntry[] = [...groupedGames.values()].sort((a, b) => {
  const aHasCast = (a.performers?.length ?? 0) > 0 ? 1 : 0;
  const bHasCast = (b.performers?.length ?? 0) > 0 ? 1 : 0;
  if (bHasCast !== aHasCast) return bHasCast - aHasCast;
  return (b.credits.length + (b.performers?.length ?? 0)) - (a.credits.length + (a.performers?.length ?? 0));
});

export function gamesForIdentity(id: string): GameCreditsEntry[] {
  return gameCatalog.filter((game) => game.credits.some((credit) => gameCreditIdentity(credit)?.id === id));
}

export function gameParticipationsForIdentity(id: string): PublicWorkParticipation[] {
  return identityWorks.get(id) ?? [];
}

export function mergeGameParticipations(personas: PublicPersona[]): PublicPersona[] {
  return personas.map((person) => {
    const extra = identityWorks.get(person.id);
    if (!extra?.length) return person;
    const existing = person.workParticipations ?? [];
    const seen = new Set(existing.map((w) => `${w.creditRole}:${w.url || w.title}`));
    const additions = extra.filter((w) => !seen.has(`${w.creditRole}:${w.url || w.title}`));
    if (!additions.length) return person;
    return { ...person, workParticipations: [...existing, ...additions] };
  });
}

export const gameResourceProfiles: PublicPersona[] = resourceProfiles.resourceProfiles.map((profile) => ({
  id: profile.id,
  displayName: profile.displayName,
  avatar: "avatarUrl" in profile ? profile.avatarUrl : undefined,
  roles: profile.roles as PublicIdentityRole[],
  bio: profile.summary,
  website: profile.website,
  links: [],
  workParticipations: identityWorks.get(profile.id) ?? [],
  roleProfiles: profile.recordingEntityType ? { recording_studio: {
    entityType: profile.recordingEntityType,
    entityTypeSourceUrl: profile.entityTypeSourceUrl,
  } } : undefined,
}));

export const gameResourceAvatars: Record<string, string> = Object.fromEntries(
  gameResourceProfiles.filter((profile) => profile.avatar).map((profile) => [profile.id, profile.avatar!]),
);

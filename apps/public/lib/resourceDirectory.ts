import type { ProductionRole, PublicIdentityRole, PublicPersona, PublicProductionCredit, PublicWorkParticipation } from "./types";

export type ResourceCategory = Exclude<PublicIdentityRole, "scriptwriter"> | "recording_engineer" | "recording_unclassified";
/** Compatibility shape of the productionResources bundle section. */
export interface ProductionResource {
  id: string; personaId: string; name: string; categories: ProductionRole[];
  commissionCategories?: ProductionRole[]; otherRoles?: string[];
  recordingEntityType?: "person" | "studio";
  summary: string; bio?: string; avatarUrl?: string; websiteUrl: string;
  links?: Array<{ label?: string; url: string }>; legacyIds?: string[];
  works: PublicProductionCredit[];
}
export interface ResourceDirectoryEntry {
  id: string; name: string; href: string; avatar?: string; bio: string;
  roles: PublicIdentityRole[]; commissionRoles: ProductionRole[]; tags: string[];
  recordingEntityType: "person" | "studio" | "unknown";
  links: Array<{ label: string; url: string }>; works: Pick<PublicWorkParticipation, "id" | "title" | "url" | "coverUrl" | "creditRole" | "workType">[];
}

function linksOf(person?: PublicPersona, resource?: ProductionResource): ResourceDirectoryEntry["links"] {
  let raw = person?.links ?? resource?.links ?? [];
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = []; } }
  const website = person?.website || resource?.websiteUrl;
  const seen = new Set<string>();
  return [...(website ? [{ label: "官方／委託頁", url: website }] : []), ...(Array.isArray(raw) ? raw : [])]
    .flatMap((entry) => {
      if (!entry || typeof entry.url !== "string") return [];
      let url: URL;
      try { url = new URL(entry.url); } catch { return []; }
      if (!["http:", "https:"].includes(url.protocol) || seen.has(url.href)) return [];
      seen.add(url.href);
      return [{ label: entry.label?.trim() || "連結", url: entry.url }];
    });
}

/** A single identity/role/work projection for every directory tab. */
export function buildResourceDirectory(personas: PublicPersona[], resources: ProductionResource[]): ResourceDirectoryEntry[] {
  const people = new Map(personas.map((p) => [p.id, p]));
  const legacy = new Map(resources.map((r) => [r.personaId || r.id, r]));
  return Array.from(new Set([...people.keys(), ...legacy.keys()])).flatMap((id) => {
    const person = people.get(id), resource = legacy.get(id);
    const commissions = resource?.commissionCategories || [];
    const roles = Array.from(new Set<PublicIdentityRole>([
      ...(person?.roles ?? []), ...(resource?.categories ?? []), ...commissions,
      ...((resource?.otherRoles || []).filter((r): r is PublicIdentityRole => ["scriptwriter", "voice_actor"].includes(r))),
      ...(person?.workParticipations ?? []).map((work) => work.creditRole),
      ...(resource?.works ?? []).map((work) => work.creditRole),
    ])).filter((r) => !(r === "voice_actor" && person?.voiceActorHidden));
    if (!roles.some((r) => r !== "scriptwriter")) return [];
    const seen = new Set<string>();
    const works = (person?.workParticipations ?? resource?.works ?? person?.productionCredits ?? [])
      .filter((work) => {
        const key = `${work.creditRole}:${work.audioWorkId || work.url || work.id}`;
        if (!roles.includes(work.creditRole) || seen.has(key)) return false;
        seen.add(key); return true;
      })
      .map(({ id, title, url, coverUrl, creditRole, workType }) => ({
        id: `${id}-${creditRole}`, title, url, coverUrl, creditRole, workType,
      }));
    return [{ id, name: person?.displayName || resource?.name || "未命名", href: person?.externalHref || `/author/${encodeURIComponent(id)}`,
      avatar: person?.avatar || resource?.avatarUrl, bio: person?.bio || resource?.bio || resource?.summary || "",
      roles, commissionRoles: commissions, tags: person?.tags || [], links: linksOf(person, resource), works,
      recordingEntityType: (() => { const value = person?.roleProfiles?.recording_studio?.entityType ?? resource?.recordingEntityType; return value === "person" || value === "studio" ? value : "unknown"; })() }];
  });
}

export function selectResourceDirectory(entries: ResourceDirectoryEntry[], category: ResourceCategory, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  const role = category === "recording_engineer" || category === "recording_unclassified" ? "recording_studio" : category;
  return entries.filter((item) => item.roles.includes(role)
      && (category !== "recording_studio" || item.recordingEntityType === "studio")
      && (category !== "recording_engineer" || item.recordingEntityType === "person")
      && (category !== "recording_unclassified" || item.recordingEntityType === "unknown")
      && (role === "voice_actor" || item.works.some((w) => w.creditRole === role) || item.commissionRoles.includes(role)))
    .filter((item) => !needle || `${item.name} ${item.bio} ${item.tags.join(" ")}`.toLocaleLowerCase().includes(needle))
    .sort((a, b) => b.works.filter((w) => w.creditRole === role).length - a.works.filter((w) => w.creditRole === role).length
      || a.name.localeCompare(b.name, "zh-Hant"));
}

import type { PublicDemoSubmission } from "./types";

export interface DemoLink {
  id: string;
  name: string;
  url: string;
  coverUrl: string;
  cast: string;
  voiceTypes: Array<"male" | "female">;
  voiceActorIds: string[];
  manualVoiceActors: ManualVoiceActor[];
  description: string;
  createdAt: number;
}

export interface ManualVoiceActor {
  name: string;
  socialUrl: string;
  personaId?: string;
}

export function demoTimestamp(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function parsePublicDemoLinks(value: unknown): DemoLink[] {
  let parsed = value;
  if (typeof parsed === "string") {
    const raw = parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }
  if (typeof parsed === "string" || (parsed && typeof parsed === "object" && !Array.isArray(parsed))) parsed = [parsed];
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((raw, index) => {
    if (typeof raw !== "string" && (!raw || typeof raw !== "object" || Array.isArray(raw))) return [];
    const item = typeof raw === "string" ? { url: raw } : raw as Record<string, unknown>;
    const url = String(item.url || item.link || item.demoUrl || "").trim();
    if (!/^https?:\/\//i.test(url)) return [];
    return [{
      id: String(item.id || `demo-${index + 1}`),
      name: String(item.name || item.demoName || item.title || item.label || "").trim(),
      url,
      coverUrl: String(item.coverUrl || item.thumbnailUrl || item.imageUrl || item.image || "").trim(),
      cast: String(item.cast || item.voiceActor || item.speaker || "").trim(),
      voiceTypes: Array.isArray(item.voiceTypes) ? [...new Set(item.voiceTypes.filter((type): type is "male" | "female" => type === "male" || type === "female"))] : [],
      voiceActorIds: [...new Set([
        ...(Array.isArray(item.voiceActorIds) ? item.voiceActorIds : []),
        item.voiceActorPersonaId,
      ].flatMap((id) => typeof id === "string" && id.trim() ? [id.trim()] : []))],
      manualVoiceActors: Array.isArray(item.manualVoiceActors)
        ? item.manualVoiceActors.flatMap((actor) => {
          if (!actor || typeof actor !== "object") return [];
          const item = actor as Record<string, unknown>;
          const name = String(item.name || "").trim();
          const socialUrl = String(item.socialUrl || "").trim();
          const personaId = String(item.personaId || "").trim();
          return name ? [{ name, socialUrl: /^https?:\/\//i.test(socialUrl) ? socialUrl : "", personaId }] : [];
        })
        : [],
      description: String(item.description || item.desc || "").trim(),
      createdAt: demoTimestamp(item.createdAt || item.publishedAt),
    }];
  });
}

export function publicSubmittedDemoLink(submission: PublicDemoSubmission): DemoLink[] {
  return parsePublicDemoLinks([submission]);
}

/** The same URL can appear on a legacy work and in a newer approved submission. */
export function mergePublicDemoLinks(links: DemoLink[]): DemoLink[] {
  const byUrl = new Map<string, DemoLink>();
  for (const link of links) {
    const previous = byUrl.get(link.url);
    if (!previous) {
      byUrl.set(link.url, link);
      continue;
    }
    const manual = new Map([...previous.manualVoiceActors, ...link.manualVoiceActors].map((actor) =>
      [JSON.stringify([actor.name, actor.personaId || "", actor.socialUrl || ""]), actor]
    ));
    byUrl.set(link.url, {
      ...previous,
      name: previous.name || link.name,
      coverUrl: previous.coverUrl || link.coverUrl,
      description: previous.description || link.description,
      cast: [...new Set([previous.cast, link.cast].filter(Boolean))].join("\n"),
      voiceTypes: [...new Set([...previous.voiceTypes, ...link.voiceTypes])],
      voiceActorIds: [...new Set([...previous.voiceActorIds, ...link.voiceActorIds])],
      manualVoiceActors: [...manual.values()],
      createdAt: Math.max(previous.createdAt, link.createdAt),
    });
  }
  return [...byUrl.values()];
}

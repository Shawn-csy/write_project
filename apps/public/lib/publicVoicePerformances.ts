import type { ExternalPublicScript, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import { demoScriptOrganization, demoScriptSummary } from "@/lib/demoScriptContext";
import { externalEntityHref } from "@/lib/externalEntity";

export interface PublicVoiceWorkBundle {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  demoSubmissions?: PublicDemoSubmission[];
  organizations?: PublicOrg[];
}

function parseDemoEntries(value: unknown): Array<Record<string, unknown>> {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed)
    ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function includesPersona(entry: Record<string, unknown>, personaId: string): boolean {
  const actorIds = Array.isArray(entry.voiceActorIds) ? entry.voiceActorIds.map(String) : [];
  const manualActors = Array.isArray(entry.manualVoiceActors) ? entry.manualVoiceActors : [];
  return actorIds.includes(personaId) || manualActors.some((actor) =>
    Boolean(actor) && typeof actor === "object" && String((actor as Record<string, unknown>).personaId || "") === personaId
  );
}

function normalizeWork(input: {
  id: string;
  scriptType: "internal" | "external";
  scriptId?: string;
  externalScriptId?: string;
  scriptTitle: string;
  scriptUrl: string;
  raw: Record<string, unknown>;
  scriptCoverUrl?: string;
  createdAt?: number;
}): PublicDemoSubmission | null {
  const demoUrl = String(input.raw.url || input.raw.demoUrl || "").trim();
  if (!/^https?:\/\//i.test(demoUrl)) return null;
  return {
    id: input.id,
    scriptType: input.scriptType,
    scriptId: input.scriptId,
    externalScriptId: input.externalScriptId,
    scriptTitle: input.scriptTitle,
    scriptUrl: input.scriptUrl,
    demoName: String(input.raw.name || input.raw.demoName || "演出 Demo").trim(),
    demoUrl,
    coverUrl: String(input.raw.coverUrl || input.raw.thumbnailUrl || input.scriptCoverUrl || "").trim(),
    cast: String(input.raw.cast || "").trim(),
    voiceTypes: Array.isArray(input.raw.voiceTypes) ? input.raw.voiceTypes.filter((type): type is "male" | "female" => type === "male" || type === "female") : [],
    voiceActorIds: Array.isArray(input.raw.voiceActorIds) ? input.raw.voiceActorIds.map(String) : [],
    manualVoiceActors: Array.isArray(input.raw.manualVoiceActors)
      ? input.raw.manualVoiceActors.flatMap((rawActor) => {
        if (!rawActor || typeof rawActor !== "object") return [];
        const actor = rawActor as Record<string, unknown>;
        const name = String(actor.name || "").trim();
        return name ? [{ name, socialUrl: String(actor.socialUrl || ""), personaId: String(actor.personaId || "") }] : [];
      })
      : [],
    description: String(input.raw.description || input.raw.desc || "").trim(),
    createdAt: input.createdAt || 0,
  };
}

/** Public Demo links that explicitly identify a persona as a performer. */
export function getPublicVoicePerformances(personaId: string, bundle: PublicVoiceWorkBundle): PublicDemoSubmission[] {
  if (!personaId) return [];
  const works: PublicDemoSubmission[] = [];

  for (const demo of bundle.demoSubmissions || []) {
    if ((demo.voiceActorIds || []).includes(personaId) || (demo.manualVoiceActors || []).some((actor) => actor.personaId === personaId)) {
      works.push(demo);
    }
  }

  for (const script of bundle.scripts || []) {
    for (const [index, raw] of parseDemoEntries(script.activityDemoLinks).entries()) {
      if (!includesPersona(raw, personaId)) continue;
      const work = normalizeWork({
        id: String(raw.id || `activity:${script.id}:${index}`),
        scriptType: "internal",
        scriptId: script.id,
        scriptTitle: script.title || "未命名台本",
        scriptUrl: `/read/${encodeURIComponent(script.id)}`,
        scriptCoverUrl: script.coverUrl || "",
        raw,
        createdAt: Number(script.updatedAt || script.lastModified || 0),
      });
      if (work) works.push(work);
    }
  }

  for (const script of bundle.externalPublicScripts || []) {
    if (script.status !== "published") continue;
    for (const [index, raw] of parseDemoEntries(script.demoLinks).entries()) {
      if (!includesPersona(raw, personaId)) continue;
      const work = normalizeWork({
        id: String(raw.id || `external:${script.id}:${index}`),
        scriptType: "external",
        externalScriptId: script.id,
        scriptTitle: script.title || script.remoteTitle || "未命名台本",
        scriptUrl: script.sourceUrl,
        scriptCoverUrl: script.coverUrlOverride || script.coverUrl || script.remoteCoverUrl || "",
        raw,
        createdAt: Number(script.updatedAt || script.mountedAt || 0),
      });
      if (work) works.push(work);
    }
  }

  const seen = new Set<string>();
  return works.filter((work) => {
    if (seen.has(work.demoUrl)) return false;
    seen.add(work.demoUrl);
    return true;
  }).map((work) => {
    const internalScript = work.scriptType === "internal"
      ? bundle.scripts?.find((item) => item.id === work.scriptId) : undefined;
    const externalScript = work.scriptType === "external"
      ? bundle.externalPublicScripts?.find((item) => item.id === work.externalScriptId) : undefined;
    const script = internalScript || externalScript;
    if (!script) return work;
    const organization = demoScriptOrganization(script, bundle.organizations);
    const overrideName = internalScript?.authorOverrideName?.trim();
    const scriptAuthorName = internalScript
      ? overrideName || internalScript.persona?.displayName || internalScript.owner?.displayName || ""
      : externalScript?.authorName?.trim() || "";
    const scriptAuthorHref = internalScript
      ? overrideName ? "" : internalScript.persona?.id ? `/author/${encodeURIComponent(internalScript.persona.id)}` : ""
      : externalScript?.authorPersonaId
        ? `/author/${encodeURIComponent(externalScript.authorPersonaId)}`
        : scriptAuthorName ? externalEntityHref("author", scriptAuthorName, externalScript?.authorUrl) : "";
    return {
      ...work,
      scriptSummary: demoScriptSummary(script),
      scriptAuthorName,
      scriptAuthorHref,
      organizationName: organization?.name,
      organizationHref: organization?.href,
    };
  });
}

const VOICE_ACTOR_TAG = /聲演|配音|voice[\s-]?actor/i;

export function hasVoiceActorSelfTag(persona: PublicPersona): boolean {
  return (persona.tags || []).some((tag) => VOICE_ACTOR_TAG.test(String(tag)));
}

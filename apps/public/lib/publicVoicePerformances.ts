import type { ExternalPublicScript, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import { demoScriptOrganization, demoScriptSummary } from "@/lib/demoScriptContext";
import { parsePublicDemoLinks, type DemoLink } from "@/lib/publicDemoLinks";
import { publicScriptAttribution } from "@/lib/publicScriptAttribution";

export interface PublicVoiceWorkBundle {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  demoSubmissions?: PublicDemoSubmission[];
  organizations?: PublicOrg[];
}

function includesPersona(entry: DemoLink, personaId: string): boolean {
  return entry.voiceActorIds.includes(personaId) || entry.manualVoiceActors.some((actor) => actor.personaId === personaId);
}

function normalizeWork(input: {
  id: string;
  scriptType: "internal" | "external";
  scriptId?: string;
  externalScriptId?: string;
  scriptTitle: string;
  scriptUrl: string;
  raw: DemoLink;
  scriptCoverUrl?: string;
  createdAt?: number;
}): PublicDemoSubmission {
  const { raw, scriptCoverUrl, ...script } = input;
  return {
    ...script,
    demoName: raw.name || "演出 Demo",
    demoUrl: raw.url,
    coverUrl: raw.coverUrl,
    scriptCoverUrl,
    cast: raw.cast,
    voiceTypes: raw.voiceTypes,
    voiceActorIds: raw.voiceActorIds,
    manualVoiceActors: raw.manualVoiceActors,
    description: raw.description,
    createdAt: raw.createdAt || script.createdAt || 0,
  };
}

/** Public Demo links that explicitly identify a persona as a performer. */
export function getPublicVoicePerformances(personaId: string, bundle: PublicVoiceWorkBundle): PublicDemoSubmission[] {
  if (!personaId) return [];
  const works: PublicDemoSubmission[] = [];

  for (const demo of bundle.demoSubmissions || []) {
    if (demo.voiceActorPersonaId === personaId || (demo.voiceActorIds || []).includes(personaId) || (demo.manualVoiceActors || []).some((actor) => actor.personaId === personaId)) {
      const [link] = parsePublicDemoLinks([demo]);
      if (link) works.push({ ...demo, voiceActorIds: link.voiceActorIds });
    }
  }

  for (const script of bundle.scripts || []) {
    for (const [index, raw] of parsePublicDemoLinks(script.activityDemoLinks).entries()) {
      if (!includesPersona(raw, personaId)) continue;
      const work = normalizeWork({
        id: raw.id === `demo-${index + 1}` ? `activity:${script.id}:${index}` : raw.id,
        scriptType: "internal",
        scriptId: script.id,
        scriptTitle: script.title || "未命名台本",
        scriptUrl: `/read/${encodeURIComponent(script.id)}`,
        scriptCoverUrl: script.coverUrl || "",
        raw,
        createdAt: Number(script.updatedAt || script.lastModified || 0),
      });
      works.push(work);
    }
  }

  for (const script of bundle.externalPublicScripts || []) {
    if (script.status !== "published") continue;
    for (const [index, raw] of parsePublicDemoLinks(script.demoLinks).entries()) {
      if (!includesPersona(raw, personaId)) continue;
      const work = normalizeWork({
        id: raw.id === `demo-${index + 1}` ? `external:${script.id}:${index}` : raw.id,
        scriptType: "external",
        externalScriptId: script.id,
        scriptTitle: script.title || script.remoteTitle || "未命名台本",
        scriptUrl: script.sourceUrl,
        scriptCoverUrl: script.coverUrlOverride || script.coverUrl || script.remoteCoverUrl || "",
        raw,
        createdAt: Number(script.updatedAt || script.mountedAt || 0),
      });
      works.push(work);
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
    const author = publicScriptAttribution(script);
    return {
      ...work,
      scriptCoverUrl: externalScript
        ? externalScript.coverUrlOverride || externalScript.coverUrl || externalScript.remoteCoverUrl || ""
        : internalScript?.coverUrl || "",
      scriptSummary: demoScriptSummary(script),
      scriptAuthorName: author.authorName,
      scriptAuthorHref: author.authorHref,
      scriptAuthorAvatarUrl: author.authorAvatarUrl,
      organizationName: organization?.name,
      organizationHref: organization?.href,
    };
  });
}

const VOICE_ACTOR_TAG = /聲演|配音|voice[\s-]?actor/i;

export function hasVoiceActorSelfTag(persona: PublicPersona): boolean {
  return (persona.tags || []).some((tag) => VOICE_ACTOR_TAG.test(String(tag)));
}

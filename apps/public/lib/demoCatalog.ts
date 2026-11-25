import { externalEntityHref } from "./externalEntity";
import { demoScriptOrganization } from "./demoScriptContext";
import { cleanScriptSummary } from "./scriptSummary";
import { buildVoiceActorDirectory } from "./voiceActorDirectory";
import type { ExternalPublicScript, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "./types";

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

export interface DemoScriptGroup {
  key: string;
  id: string;
  scriptType: "internal" | "external";
  title: string;
  authorName: string;
  authorHref?: string;
  organizationName?: string;
  organizationHref?: string;
  summary: string;
  coverUrl: string;
  sourceUrl: string;
  demos: DemoLink[];
  sortAt: number;
}

interface SubmissionTarget {
  value: string;
  title: string;
  authorName: string;
  label: string;
}

export interface DemoCatalogBundle {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  personas?: PublicPersona[];
  organizations?: PublicOrg[];
  demoSubmissions?: PublicDemoSubmission[];
}

function timestamp(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function parseDemoLinks(value: unknown): DemoLink[] {
  let parsed = value;
  if (typeof parsed === "string") {
    const raw = parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw.startsWith("http") ? [{ url: raw }] : [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const url = String(item.url || item.link || "").trim();
    if (!/^https?:\/\//i.test(url)) return [];
    return [{
      id: String(item.id || `demo-${index + 1}`),
      name: String(item.name || item.title || item.label || "").trim(),
      url,
      coverUrl: String(item.coverUrl || item.thumbnailUrl || item.imageUrl || item.image || "").trim(),
      cast: String(item.cast || item.voiceActor || item.speaker || "").trim(),
      voiceTypes: Array.isArray(item.voiceTypes) ? item.voiceTypes.filter((type): type is "male" | "female" => type === "male" || type === "female") : [],
      voiceActorIds: Array.isArray(item.voiceActorIds) ? item.voiceActorIds.map(String) : [],
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
      createdAt: timestamp(item.createdAt || item.publishedAt),
    }];
  });
}

function buildScriptGroups(
  scripts: PublicScript[],
  externalScripts: ExternalPublicScript[],
  submissions: PublicDemoSubmission[],
  organizations: PublicOrg[],
): DemoScriptGroup[] {
  const groups = new Map<string, DemoScriptGroup>();
  const addDemos = (
    key: string,
    group: Omit<DemoScriptGroup, "demos">,
    demos: DemoLink[],
  ) => {
    if (demos.length === 0) return;
    const existing = groups.get(key);
    const sortAt = Math.max(group.sortAt, ...demos.map((demo) => demo.createdAt));
    if (existing) {
      existing.demos.push(...demos);
      existing.sortAt = Math.max(existing.sortAt, sortAt);
    } else groups.set(key, { ...group, sortAt, demos });
  };

  for (const script of scripts) {
    const demos = parseDemoLinks(script.activityDemoLinks);
    if (demos.length === 0) continue;
    const key = `internal:${script.id}`;
    const organization = demoScriptOrganization(script, organizations);
    addDemos(key, {
      key,
      id: script.id,
      scriptType: "internal",
      title: script.title || "未命名台本",
      authorName: script.persona?.displayName || script.owner?.displayName || "",
      authorHref: script.persona?.id ? `/author/${encodeURIComponent(script.persona.id)}` : undefined,
      organizationName: organization?.name,
      organizationHref: organization?.href,
      summary: script.synopsis || "",
      coverUrl: script.coverUrl || "",
      sourceUrl: `/read/${encodeURIComponent(script.id)}`,
      sortAt: timestamp(script.createdAt),
    }, demos);
  }

  for (const script of externalScripts) {
    if (script.status !== "published") continue;
    const demos = parseDemoLinks(script.demoLinks);
    if (demos.length === 0) continue;
    const key = `external:${script.id}`;
    const organization = demoScriptOrganization(script, organizations);
    addDemos(key, {
      key,
      id: script.id,
      scriptType: "external",
      title: script.title || script.remoteTitle || "未命名台本",
      authorName: script.authorName || "",
      authorHref: script.authorName ? (script.authorPersonaId
        ? `/author/${encodeURIComponent(script.authorPersonaId)}`
        : externalEntityHref("author", script.authorName, script.authorUrl)) : undefined,
      organizationName: organization?.name,
      organizationHref: organization?.href,
      summary: cleanScriptSummary(script.summary || script.remoteSummary),
      coverUrl: script.coverUrlOverride || script.coverUrl || script.remoteCoverUrl || "",
      sourceUrl: script.sourceUrl,
      sortAt: timestamp(script.mountedAt || script.createdAt || script.sourceCreatedAt),
    }, demos);
  }

  for (const submission of submissions) {
    const scriptType = submission.scriptType === "external" ? "external" : "internal";
    const id = scriptType === "external" ? submission.externalScriptId : submission.scriptId;
    const key = id ? `${scriptType}:${id}` : `submitted:${submission.id}`;
    const linkedExternalScript = scriptType === "external" ? externalScripts.find((script) => script.id === id) : undefined;
    const linkedInternalScript = scriptType === "internal" ? scripts.find((script) => script.id === id) : undefined;
    const organization = linkedExternalScript
      ? demoScriptOrganization(linkedExternalScript, organizations)
      : linkedInternalScript ? demoScriptOrganization(linkedInternalScript, organizations) : null;
    addDemos(key, {
      key,
      id: id || submission.id,
      scriptType,
      title: submission.scriptTitle || linkedExternalScript?.title || linkedExternalScript?.remoteTitle || linkedInternalScript?.title || "未命名台本",
      authorName: scriptType === "external"
        ? linkedExternalScript?.authorName || ""
        : linkedInternalScript?.persona?.displayName || linkedInternalScript?.owner?.displayName || "",
      authorHref: scriptType === "external"
        ? linkedExternalScript?.authorName
          ? linkedExternalScript.authorPersonaId
            ? `/author/${encodeURIComponent(linkedExternalScript.authorPersonaId)}`
            : externalEntityHref("author", linkedExternalScript.authorName, linkedExternalScript.authorUrl)
          : undefined
        : linkedInternalScript?.persona?.id ? `/author/${encodeURIComponent(linkedInternalScript.persona.id)}` : undefined,
      organizationName: organization?.name,
      organizationHref: organization?.href,
      summary: scriptType === "external"
        ? linkedExternalScript?.summary || linkedExternalScript?.remoteSummary || ""
        : linkedInternalScript?.synopsis || "",
      coverUrl: scriptType === "external"
        ? linkedExternalScript?.coverUrlOverride || linkedExternalScript?.coverUrl || linkedExternalScript?.remoteCoverUrl || ""
        : linkedInternalScript?.coverUrl || "",
      sourceUrl: submission.scriptUrl,
      sortAt: timestamp(submission.createdAt),
    }, [{
      id: submission.id,
      name: submission.demoName || "演出 Demo",
      url: submission.demoUrl,
      coverUrl: submission.coverUrl || "",
      cast: submission.cast || "",
      voiceTypes: submission.voiceTypes || [],
      voiceActorIds: submission.voiceActorIds || [],
      manualVoiceActors: (submission.manualVoiceActors || []).map((actor) => ({ name: actor.name, socialUrl: actor.socialUrl || "", personaId: actor.personaId || "" })),
      description: submission.description || "",
      createdAt: timestamp(submission.createdAt),
    }]);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, demos: group.demos.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")) }));
}

export function buildDemoCatalog(bundle: DemoCatalogBundle) {
  const scripts = bundle.scripts ?? [];
  const externalScripts = bundle.externalPublicScripts ?? [];
  const groups = buildScriptGroups(scripts, externalScripts, bundle.demoSubmissions ?? [], bundle.organizations ?? []);
  const voiceActorIds = buildVoiceActorDirectory(bundle)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant"))
    .map((persona) => persona.id);
  const relevantPersonaIds = new Set(voiceActorIds);
  for (const group of groups) {
    for (const demo of group.demos) {
      for (const id of demo.voiceActorIds) relevantPersonaIds.add(id);
    }
  }
  const personas = (bundle.personas ?? []).filter((persona) => relevantPersonaIds.has(persona.id))
    .map(({ id, displayName, avatar, tags, externalHref }) => ({ id, displayName, avatar, tags, externalHref }));
  const submissionTargets: SubmissionTarget[] = [
    ...scripts.map((script) => {
      const title = script.title || "未命名台本";
      const authorName = script.persona?.displayName || script.owner?.displayName || "";
      return { value: `internal:${script.id}`, title, authorName, label: title };
    }),
    ...externalScripts.filter((script) => script.status === "published").map((script) => {
      const title = script.title || script.remoteTitle || "未命名台本";
      const authorName = script.authorName || "";
      return { value: `external:${script.id}`, title, authorName, label: title };
    }),
  ];
  return { groups, personas, voiceActorIds, submissionTargets };
}

export type DemoCatalog = ReturnType<typeof buildDemoCatalog>;

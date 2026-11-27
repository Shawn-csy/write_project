import { demoTimestamp, mergePublicDemoLinks, parsePublicDemoLinks, publicSubmittedDemoLink, type DemoLink } from "./publicDemoLinks";
export type { DemoLink, ManualVoiceActor } from "./publicDemoLinks";
import { publicScriptAttribution } from "./publicScriptAttribution";
import { demoScriptOrganization } from "./demoScriptContext";
import { cleanScriptSummary } from "./scriptSummary";
import { buildVoiceActorDirectory } from "./voiceActorDirectory";
import type { ExternalPublicScript, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "./types";

export interface DemoScriptGroup {
  key: string;
  id: string;
  scriptType: "internal" | "external";
  title: string;
  authorName: string;
  authorHref?: string;
  authorAvatarUrl?: string;
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

export function buildScriptGroups(
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
    const demos = parsePublicDemoLinks(script.activityDemoLinks);
    if (demos.length === 0) continue;
    const key = `internal:${script.id}`;
    const organization = demoScriptOrganization(script, organizations);
    addDemos(key, {
      key,
      id: script.id,
      scriptType: "internal",
      title: script.title || "未命名台本",
      ...publicScriptAttribution(script),
      organizationName: organization?.name,
      organizationHref: organization?.href,
      summary: cleanScriptSummary(script.synopsis),
      coverUrl: script.coverUrl || "",
      sourceUrl: `/read/${encodeURIComponent(script.id)}`,
      sortAt: demoTimestamp(script.createdAt),
    }, demos);
  }

  for (const script of externalScripts) {
    if (script.status !== "published") continue;
    const demos = parsePublicDemoLinks(script.demoLinks);
    if (demos.length === 0) continue;
    const key = `external:${script.id}`;
    const organization = demoScriptOrganization(script, organizations);
    addDemos(key, {
      key,
      id: script.id,
      scriptType: "external",
      title: script.title || script.remoteTitle || "未命名台本",
      ...publicScriptAttribution(script),
      organizationName: organization?.name,
      organizationHref: organization?.href,
      summary: cleanScriptSummary(script.summary || script.remoteSummary),
      coverUrl: script.coverUrlOverride || script.coverUrl || script.remoteCoverUrl || "",
      sourceUrl: script.sourceUrl,
      sortAt: demoTimestamp(script.mountedAt || script.createdAt || script.sourceCreatedAt),
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
      ...publicScriptAttribution(linkedExternalScript || linkedInternalScript),
      organizationName: organization?.name,
      organizationHref: organization?.href,
      summary: cleanScriptSummary(scriptType === "external"
        ? linkedExternalScript?.summary || linkedExternalScript?.remoteSummary
        : linkedInternalScript?.synopsis),
      coverUrl: scriptType === "external"
        ? linkedExternalScript?.coverUrlOverride || linkedExternalScript?.coverUrl || linkedExternalScript?.remoteCoverUrl || ""
        : linkedInternalScript?.coverUrl || "",
      sourceUrl: submission.scriptUrl,
      sortAt: demoTimestamp(submission.createdAt),
    }, publicSubmittedDemoLink(submission));
  }

  return [...groups.values()]
    .map((group) => ({ ...group, demos: mergePublicDemoLinks(group.demos).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")) }));
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
      for (const actor of demo.manualVoiceActors) if (actor.personaId) relevantPersonaIds.add(actor.personaId);
    }
  }
  const personas = (bundle.personas ?? []).filter((persona) => relevantPersonaIds.has(persona.id))
    .map(({ id, displayName, avatar, tags, externalHref, voiceActorHidden }) => ({ id, displayName, avatar, tags, externalHref, voiceActorHidden }));
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

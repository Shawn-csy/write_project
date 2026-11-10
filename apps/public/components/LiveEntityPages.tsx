"use client";

/**
 * Author, organization, tag, series and external author/organization pages for
 * the static build.
 *
 * Each page hydrates with the data baked in at build time and then rebuilds
 * itself from the live API, so editing a profile, a tag or a series in the
 * studio shows up without a redeploy. An address with no prebuilt page (a new
 * author or tag) is rendered by LiveEntityRoute from 404.html.
 */

import { useEffect, type ReactNode } from "react";
import { PublicTopBar } from "@/components/PublicTopBar";
import { NotFoundBody, NotFoundContent } from "@/components/NotFoundContent";
import { ExternalEntityPage } from "@/components/ExternalEntityPage";
import { AuthorPageClient } from "@/app/author/[id]/AuthorPageClient";
import { OrgPageClient } from "@/app/org/[id]/OrgPageClient";
import { SeriesPageClient } from "@/app/series/[name]/SeriesPageClient";
import { TagPageClient } from "@/app/tag/[name]/TagPageClient";
import {
  buildSeriesData,
  buildTagData,
  decodeRouteName,
  findExternalAuthorModel,
  findExternalOrgModel,
  publishedExternalScripts,
  type ExternalEntityModel,
  type PublicBundleLike,
  type SeriesData,
  type TagData,
} from "@/lib/entityModels";
import { LiveApiError, liveApi } from "@/lib/liveApi";
import { readPublicBundle } from "@/lib/readPublicBundle";
import type { PublicBundleSection } from "@/lib/publicBundleProjection";
import { getPublicVoicePerformances, hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";
import { externalScriptsForPersona } from "@/lib/publicIdentity";
import { externalScriptsForOrganization } from "@/lib/organizationExternalScripts";
import { TITLE_SUFFIX } from "@/lib/seo";
import type { ExternalPublicScript, PublicAudioWork, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import { useLiveData, type LiveData } from "@/lib/useLiveData";

type Chrome = { activeTab: string; back?: boolean };

interface FrameProps {
  state: LiveData<unknown>;
  chrome?: Chrome;
  children: ReactNode;
}

/** Top bar (only when the 404 shell renders the page) plus loading / missing / error states. */
function Frame({ state, chrome, children }: FrameProps) {
  const bar = chrome ? (
    <PublicTopBar
      activeTab={chrome.activeTab}
      showBack={chrome.back}
      backHref={chrome.activeTab === "voice-actors" ? "/resources" : chrome.activeTab === "authors" ? "/authors" : chrome.activeTab === "orgs" ? "/?view=orgs" : "/"}
      backLabel="返回列表"
    />
  ) : null;
  if (state.status === "ready") return <>{bar}{children}</>;
  if (state.status === "missing") return <>{bar}<NotFoundBody /></>;
  if (state.status === "error") {
    return (
      <>
        {bar}
        <main className="flex min-h-[50vh] items-center justify-center px-4 text-center">
          <p className="text-lg text-muted-foreground">暫時無法載入這個頁面，請稍後再試。</p>
        </main>
      </>
    );
  }
  return (
    <>
      {bar}
      <div className="min-h-[50vh] flex items-center justify-center">
        <span className="text-sm text-muted-foreground">載入中…</span>
      </div>
    </>
  );
}

async function readOrNull<T>(path: string, signal: AbortSignal): Promise<T | null> {
  try {
    return (await liveApi.readJson<T>(path, { signal })).data;
  } catch (error) {
    if (error instanceof LiveApiError && error.status === 404) return null;
    throw error;
  }
}

const VOICE_PROFILE_SECTIONS = ["scripts", "externalPublicScripts", "demoSubmissions", "organizations", "audioWorks"] as const;
const SCRIPT_ENTITY_SECTIONS = ["scripts", "externalPublicScripts"] as const;
const EXTERNAL_ENTITY_SECTIONS = ["externalPublicScripts"] as const;

async function readBundle(signal: AbortSignal, sections: readonly PublicBundleSection[]): Promise<PublicBundleLike | null> {
  try {
    // This snapshot is also used by navigation and other public page sections.
    // Keep the shared request alive if one page unmounts while it is loading.
    const { data } = await readPublicBundle<PublicBundleLike>(sections);
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    return data;
  } catch (error) {
    if (error instanceof LiveApiError && error.status === 404) return null;
    throw error;
  }
}

/** Sets the tab title for a page that has no prebuilt HTML to carry one. */
function useDocumentTitle(label: string | null): void {
  useEffect(() => {
    if (label) document.title = `${label}｜${TITLE_SUFFIX}`;
  }, [label]);
}

// ── Author / organization (profile plus their works) ────────────────────────

interface AuthorData { persona: PublicPersona; scripts: PublicScript[]; performances: PublicDemoSubmission[]; externalScripts: ExternalPublicScript[]; audioWorks?: PublicAudioWork[] }

export function LiveAuthorPage({ id, initial, chrome }: { id: string; initial?: AuthorData; chrome?: Chrome }) {
  const state = useLiveData<AuthorData>(initial, async (signal) => {
    const persona = await readOrNull<PublicPersona>(`/api/public-personas/${encodeURIComponent(id)}`, signal);
    if (!persona) return null;
    const [scripts, bundle] = await Promise.all([
      readOrNull<PublicScript[]>(`/api/public-scripts?personaId=${encodeURIComponent(id)}`, signal),
      readBundle(signal, VOICE_PROFILE_SECTIONS),
    ]);
    const performances = getPublicVoicePerformances(id, bundle || {});
    const externalScripts = externalScriptsForPersona(persona, bundle?.externalPublicScripts || []);
    const audioWorks = (bundle?.audioWorks || []).filter((work) => work.voiceActors?.some((actor) => actor.id === id));
    return { persona, scripts: scripts ?? [], performances, externalScripts, audioWorks };
  }, `author:${id}`);
  useDocumentTitle(!initial && state.status === "ready" ? state.data.persona.displayName : null);
  const resolvedChrome = state.status === "ready" && chrome && (hasVoiceActorSelfTag(state.data.persona) || state.data.performances.length > 0)
    ? { ...chrome, activeTab: "voice-actors" }
    : chrome;
  return (
    <Frame state={state} chrome={resolvedChrome}>
      {state.status === "ready" && <AuthorPageClient persona={state.data.persona} scripts={state.data.scripts} performances={state.data.performances} externalScripts={state.data.externalScripts} audioWorks={state.data.audioWorks} />}
    </Frame>
  );
}

interface OrgData { org: PublicOrg; scripts: PublicScript[]; externalScripts: ExternalPublicScript[]; audioWorks: PublicAudioWork[] }

export function LiveOrgPage({ id, initial, chrome }: { id: string; initial?: OrgData; chrome?: Chrome }) {
  const state = useLiveData<OrgData>(initial, async (signal) => {
    const org = await readOrNull<PublicOrg>(`/api/public-organizations/${encodeURIComponent(id)}`, signal);
    if (!org) return null;
    const [scripts, bundle] = await Promise.all([
      readOrNull<PublicScript[]>(`/api/public-scripts?organizationId=${encodeURIComponent(id)}`, signal),
      readBundle(signal, ["audioWorks", "externalPublicScripts"]),
    ]);
    const audioWorks = (bundle?.audioWorks || []).filter((work) => work.organizationId === id);
    const externalScripts = externalScriptsForOrganization(org, bundle?.externalPublicScripts || []);
    return { org, scripts: scripts ?? [], externalScripts, audioWorks };
  }, `org:${id}`);
  useDocumentTitle(!initial && state.status === "ready" ? state.data.org.name : null);
  return (
    <Frame state={state} chrome={chrome}>
      {state.status === "ready" && <OrgPageClient org={state.data.org} scripts={state.data.scripts} externalScripts={state.data.externalScripts} audioWorks={state.data.audioWorks} />}
    </Frame>
  );
}

// ── Tag / series (derived from the bundle) ──────────────────────────────────

export function LiveTagPage({ tagName, initial, chrome }: { tagName: string; initial?: TagData; chrome?: Chrome }) {
  const state = useLiveData<TagData>(initial, async (signal) => {
    const bundle = await readBundle(signal, SCRIPT_ENTITY_SECTIONS);
    if (!bundle) return null;
    const data = buildTagData(bundle, tagName);
    return data.scripts.length + data.externalScripts.length === 0 ? null : data;
  }, `tag:${tagName}`);
  useDocumentTitle(!initial && state.status === "ready" ? `#${tagName}` : null);
  return (
    <Frame state={state} chrome={chrome}>
      {state.status === "ready" && (
        <TagPageClient tagName={tagName} scripts={state.data.scripts} externalScripts={state.data.externalScripts} />
      )}
    </Frame>
  );
}

export function LiveSeriesPage({ seriesName, initial, chrome }: { seriesName: string; initial?: SeriesData; chrome?: Chrome }) {
  const state = useLiveData<SeriesData>(initial, async (signal) => {
    const bundle = await readBundle(signal, SCRIPT_ENTITY_SECTIONS);
    if (!bundle) return null;
    const data = buildSeriesData(bundle, seriesName);
    return data.scripts.length + data.externalItems.length === 0 ? null : data;
  }, `series:${seriesName}`);
  useDocumentTitle(!initial && state.status === "ready" ? seriesName : null);
  return (
    <Frame state={state} chrome={chrome}>
      {state.status === "ready" && (
        <SeriesPageClient
          seriesName={seriesName}
          scripts={state.data.scripts}
          externalItems={state.data.externalItems}
          seriesMeta={{
            summary: state.data.summary,
            coverUrl: state.data.coverUrl,
            coverCrop: null,
            latestScriptId: state.data.latestScriptId,
          }}
        />
      )}
    </Frame>
  );
}

// ── External author / organization ──────────────────────────────────────────

function LiveExternalPage({ kind, rawName, initial, chrome }: {
  kind: "author" | "org";
  rawName: string;
  initial?: ExternalEntityModel;
  chrome?: Chrome;
}) {
  const find = kind === "author" ? findExternalAuthorModel : findExternalOrgModel;
  const state = useLiveData<ExternalEntityModel>(initial, async (signal) => {
    const bundle = await readBundle(signal, EXTERNAL_ENTITY_SECTIONS);
    return bundle ? find(publishedExternalScripts(bundle), rawName) : null;
  }, `external-${kind}:${rawName}`);
  useEffect(() => {
    if (kind === "author" && state.status === "ready" && state.data.personaId) {
      window.location.replace(`/author/${encodeURIComponent(state.data.personaId)}`);
    }
  }, [kind, state]);
  useDocumentTitle(!initial && state.status === "ready" ? state.data.name : null);
  return (
    <Frame state={state} chrome={chrome}>
      {state.status === "ready" && (
        <ExternalEntityPage
          kind={kind}
          name={state.data.name}
          bio={state.data.bio}
          profileUrl={state.data.profileUrl}
          profileAvatarUrl={state.data.profileAvatarUrl}
          authorKey={state.data.authorKey}
          supplement={state.data.supplement}
          contributors={state.data.contributors}
          items={state.data.items}
        />
      )}
    </Frame>
  );
}

export const LiveExternalAuthorPage = (props: { rawName: string; initial?: ExternalEntityModel; chrome?: Chrome }) =>
  <LiveExternalPage kind="author" {...props} />;
export const LiveExternalOrgPage = (props: { rawName: string; initial?: ExternalEntityModel; chrome?: Chrome }) =>
  <LiveExternalPage kind="org" {...props} />;

// ── Route dispatch for addresses with no prebuilt page ──────────────────────

const ROUTES: Array<{ pattern: RegExp; raw?: boolean; render: (name: string) => ReactNode }> = [
  { pattern: /^\/author\/external\/([^/]+)\/?$/, raw: true, render: (n) => <LiveExternalAuthorPage rawName={n} chrome={{ activeTab: "authors", back: true }} /> },
  { pattern: /^\/org\/external\/([^/]+)\/?$/, raw: true, render: (n) => <LiveExternalOrgPage rawName={n} chrome={{ activeTab: "orgs", back: true }} /> },
  { pattern: /^\/author\/([^/]+)\/?$/, render: (n) => <LiveAuthorPage id={n} chrome={{ activeTab: "authors", back: true }} /> },
  { pattern: /^\/org\/([^/]+)\/?$/, render: (n) => <LiveOrgPage id={n} chrome={{ activeTab: "orgs", back: true }} /> },
  { pattern: /^\/tag\/([^/]+)\/?$/, render: (n) => <LiveTagPage tagName={n} chrome={{ activeTab: "scripts", back: true }} /> },
  { pattern: /^\/series\/([^/]+)\/?$/, render: (n) => <LiveSeriesPage seriesName={n} chrome={{ activeTab: "scripts", back: true }} /> },
];

function renderLiveEntityRoute(pathname: string): ReactNode | null {
  for (const { pattern, raw, render } of ROUTES) {
    const match = pathname.match(pattern);
    if (match) return <div key={pathname}>{render(raw ? match[1] : decodeRouteName(match[1]))}</div>;
  }
  return null;
}

/** The page for an address such as /tag/new-tag that has no prebuilt HTML; a 404 if it is not one. */
export function LiveEntityRoute({ pathname }: { pathname: string }) {
  return <>{renderLiveEntityRoute(pathname) ?? <NotFoundContent />}</>;
}

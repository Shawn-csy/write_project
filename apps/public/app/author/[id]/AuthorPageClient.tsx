"use client";

import { PublicContentLink, PublicPersonLink, PublicPlayLink, PublicTag } from "@/components/PublicDirectoryDetails";
import { partitionContacts } from "@/lib/publicContactPrivacy";
import { useMemo, useState, type ReactNode } from "react";
import type { ExternalPublicScript, ProductionRole, PublicAudioWork, PublicDemoSubmission, PublicIdentityRole, PublicPersona, PublicWorkParticipation, PublicScript } from "@/lib/types";
import { buildAuthorEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicAudioWorkCard } from "@/components/PublicAudioWorkCard";
import { PublicCatalogWorkCard } from "@/components/PublicCatalogWorkCard";
import { PublicVoiceTypes, PublicWorkDetails } from "@/components/PublicWorkDetails";
import { audioWorkPurchaseLabel } from "@/lib/publicAudioWorkContent";
import { legacyVoiceWorkParticipations, mergePublicWorkParticipations } from "@/lib/publicWorkParticipations";
import { usePublicDemoIdentities } from "@/lib/usePublicDemoIdentities";
import { publicDemoPerformers } from "@/lib/publicWorkPerformers";
import { PublicImage } from "@/components/PublicImage";
import { LinkifiedText } from "@/components/LinkifiedText";
import { Clapperboard, ExternalLink, FileText, Gamepad2, Grid2x2, Grid3x3, Headphones, X } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { AdultContentNotice } from "@/components/AdultContentNotice";
import { useResourceAgeGate } from "@/lib/useResourceAgeGate";
import { demoArtwork } from "@/lib/demoArtwork";
import { combinePublicIdentities } from "@/lib/publicIdentity";
import { PublicProfileAvatar, PublicProfileCard, PublicProfileContainer, PublicProfileLink, PublicProfileRole, PublicProfileSection, PublicProfileWorkCard } from "@/components/PublicProfileLayout";
import { IdentityProfileForm } from "@/components/identity/IdentityProfileForm";
import { editableProfileKinds, productionRolesOf, resolveIdentityRoles } from "@/components/identity/identityRoles";
import { publicIdentityRoleLabel } from "@/lib/publicIdentityMetadata";
import { externalCoverSrc } from "@/lib/externalCover";
import { cleanScriptSummary } from "@/lib/scriptSummary";
import type { GameCreditsEntry } from "@/lib/gameCredits";
import { GameCard } from "@/app/games/GameCard";

/**
 * The one public page for a person: writer, voice actor, post-production,
 * cover artist or recording studio. The header is shared; each role switches
 * on its own sections, and a section with nothing to show stays hidden.
 */

interface Props {
  persona: PublicPersona & {
    bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
    avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  };
  scripts: PublicScript[];
  performances?: PublicDemoSubmission[];
  externalScripts?: ExternalPublicScript[];
  audioWorks?: PublicAudioWork[];
  audioScriptWorks?: PublicAudioWork[];
  otherAudioWorks?: PublicAudioWork[];
  gameWorks?: GameCreditsEntry[];
  avatarsById?: Record<string, string>;
}

type WorkViewMode = "card" | "list";

interface SectionContext {
  persona: Props["persona"];
  scripts: PublicScript[];
  externalScripts: ExternalPublicScript[];
  performances: PublicDemoSubmission[];
  catalogWorks: PublicAudioWork[];
  demoIdentities: ReadonlyMap<string, PublicPersona>;
  credits: PublicWorkParticipation[];
  gameWorks: NonNullable<Props["gameWorks"]>;
  avatarsById: Record<string, string>;
  series: Array<{ name: string; count: number; coverUrl: string | null }>;
  viewMode: WorkViewMode;
}

interface IdentitySection {
  id: string;
  title: string;
  roles: PublicIdentityRole[];
  /** Adult audio covers wait behind the shared age confirmation. */
  ageGated?: boolean;
  /** Show with an empty note instead of hiding when there is nothing yet. */
  showWhenEmpty?: string;
  count: (ctx: SectionContext) => number;
  render: (ctx: SectionContext) => ReactNode;
}

const WORK_TYPE_LABELS = { audio: "音聲", game: "遊戲", video: "影片", other: "其他" } as const;
const PRODUCTION_SECTION_TITLES: Record<PublicIdentityRole, string> = {
  scriptwriter: "參與台本作品",
  voice_actor: "參演作品",
  post_production: "後製作品",
  cover_art: "美術作品",
  recording_studio: "錄音作品",
};

function parseLinks(links: PublicPersona["links"]): Array<{ url?: string; label?: string }> {
  if (Array.isArray(links)) return links;
  if (typeof links === "string") {
    try {
      const parsed = JSON.parse(links);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function productionSection(role: PublicIdentityRole): IdentitySection {
  const items = (ctx: SectionContext) => ctx.credits.filter((credit) => credit.creditRole === role);
  return {
    id: `production-${role}`,
    title: PRODUCTION_SECTION_TITLES[role],
    roles: [role],
    ageGated: true,
    count: (ctx) => items(ctx).length,
    render: (ctx) => {
      const list = items(ctx);
      if (ctx.viewMode === "list") {
        return <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {list.map((credit, index) => {
            const audio = ctx.catalogWorks.find((work) => work.id === credit.audioWorkId || work.id === credit.id || (credit.url && work.url === credit.url));
            const matchedGame = credit.workType === "game"
              ? ctx.gameWorks.find((game) => credit.url === `/games/${game.appId}` || credit.url === `/games#game-${game.appId}` || credit.url?.includes(`/app/${game.appId}`))
              : undefined;
            return <PublicProfileWorkCard
              key={`${credit.id}-${credit.creditRole}-${index}`}
              title={matchedGame?.title || audio?.title || credit.title}
              url={matchedGame ? `/games/${matchedGame.appId}` : (audio?.url || credit.url || "")}
              coverUrl={matchedGame?.screenshotUrl || audio?.coverUrl || credit.coverUrl}
              workType={credit.workType || "audio"}
              compact
            />;
          })}
        </div>;
      }
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((credit, index) => {
          const audio = ctx.catalogWorks.find((work) => work.id === credit.audioWorkId || work.id === credit.id || (credit.url && work.url === credit.url));
          const attribution = [WORK_TYPE_LABELS[credit.workType || "audio"], credit.creditedAs && credit.creditedAs !== ctx.persona.displayName ? `署名 ${credit.creditedAs}` : "", credit.characterName ? `角色：${credit.characterName}` : ""].filter(Boolean).join("・");
          if (audio) return <PublicAudioWorkCard
            key={`${credit.id}-${credit.creditRole}-${index}`}
            work={audio}
            description={credit.description}
            attribution={attribution}
          />;
          const matchedGame = credit.workType === "game"
            ? ctx.gameWorks.find((game) => credit.url === `/games/${game.appId}` || credit.url === `/games#game-${game.appId}` || credit.url?.includes(`/app/${game.appId}`))
            : undefined;
          if (matchedGame) return <GameCard
            key={`${credit.id}-${credit.creditRole}-${index}`}
            game={matchedGame}
            heading="h3"
            avatarsById={ctx.avatarsById}
          />;
          const FallbackIcon = credit.workType === "game" ? Gamepad2 : credit.workType === "video" ? Clapperboard : credit.workType === "other" ? FileText : Headphones;
          return <PublicCatalogWorkCard
            key={`${credit.id}-${credit.creditRole}-${index}`}
            title={credit.title}
            heading="h3"
            href={credit.url || undefined}
            sourceLabel={credit.url ? (audioWorkPurchaseLabel(credit.url) || "前往作品") : undefined}
            hasArtwork={Boolean(credit.coverUrl)}
            linkArtwork={Boolean(credit.url)}
            artwork={credit.coverUrl
              ? <PublicImage src={credit.coverUrl} alt={`${credit.title}封面`} preset="script-cover" />
              : <FallbackIcon className="absolute inset-0 m-auto size-8 text-muted-foreground/50" aria-hidden />}
            details={credit.description ? <section className="mt-2">
              <h4 className="text-sm font-semibold">作品介紹</h4>
              <LinkifiedText text={credit.description} className="mt-1 whitespace-pre-line leading-7 text-foreground/85 [overflow-wrap:anywhere]" />
            </section> : undefined}
          >
            {attribution && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{attribution}</p>}
          </PublicCatalogWorkCard>;
        })}
      </div>;
    },
  };
}

const SECTIONS: IdentitySection[] = [
  {
    id: "performances", title: "參與演出", roles: ["voice_actor"], ageGated: true,
    count: (ctx) => ctx.performances.length,
    render: (ctx) => {
      if (ctx.viewMode === "list") {
        return <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {ctx.performances.map((demo) => <PublicProfileWorkCard
            key={demo.id}
            title={demo.scriptTitle}
            url={demo.demoUrl}
            coverUrl={demoArtwork(demo.demoUrl, demo.coverUrl, demo.scriptCoverUrl)}
            workType="audio"
            compact
          />)}
        </div>;
      }
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.performances.map((demo) => {
          const artwork = demoArtwork(demo.demoUrl, demo.coverUrl, demo.scriptCoverUrl);
          return <PublicWorkDetails
            key={demo.id}
            title={demo.scriptTitle}
            meta={<>
              {demo.scriptAuthorName && <p className="mt-1 text-xs text-muted-foreground">台本師：{demo.scriptAuthorHref ? <PublicPersonLink href={demo.scriptAuthorHref} name={demo.scriptAuthorName} avatar={demo.scriptAuthorAvatarUrl} compact /> : demo.scriptAuthorName}</p>}
              {demo.demoName && demo.demoName !== "YouTube 試聽" && <p className="mt-1 text-xs text-muted-foreground">{demo.demoName}</p>}
              {demo.organizationName && demo.organizationHref && <PublicContentLink href={demo.organizationHref} appearance="identity" className="mt-1 text-xs">{demo.organizationName}</PublicContentLink>}
              <PublicVoiceTypes types={demo.voiceTypes} />
            </>}
            action={<PublicPlayLink href={demo.demoUrl} target="_blank" rel="noopener noreferrer" className="text-xs">播放 Demo</PublicPlayLink>}
            artwork={artwork ? <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
              <PublicImage src={artwork} alt={`${demo.scriptTitle}演出圖片`} preset="script-cover" />
            </div> : undefined}
            performers={publicDemoPerformers(demo, ctx.demoIdentities)}
            description={cleanScriptSummary(demo.scriptSummary) || demo.description}
          >
            <PublicContentLink href={demo.scriptUrl} target={demo.scriptType === "external" ? "_blank" : undefined} rel={demo.scriptType === "external" ? "noopener noreferrer" : undefined} appearance="source" arrow={demo.scriptType === "external"} className="mt-3 text-xs">看台本</PublicContentLink>
          </PublicWorkDetails>;
        })}
      </div>;
    },
  },
  ...(["scriptwriter", "voice_actor", "post_production", "cover_art", "recording_studio"] as const).map(productionSection),
  {
    id: "games", title: "參與遊戲", roles: ["voice_actor", "post_production", "cover_art", "recording_studio"], ageGated: true,
    count: (ctx) => ctx.gameWorks.filter((game) => !ctx.credits.some((credit) => credit.workType === "game" && (credit.url === `/games/${game.appId}` || credit.url === `/games#game-${game.appId}` || credit.url?.includes(`/app/${game.appId}`)))).length,
    render: (ctx) => {
      const standaloneGames = ctx.gameWorks.filter((game) => !ctx.credits.some((credit) => credit.workType === "game" && (credit.url === `/games/${game.appId}` || credit.url === `/games#game-${game.appId}` || credit.url?.includes(`/app/${game.appId}`))));
      if (ctx.viewMode === "list") {
        return <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {standaloneGames.map((game) => <PublicProfileWorkCard
            key={game.appId}
            title={game.title}
            url={`/games/${game.appId}`}
            coverUrl={game.screenshotUrl}
            workType="game"
            compact
          />)}
        </div>;
      }
      return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {standaloneGames.map((game) => <GameCard key={game.appId} game={game} heading="h3" avatarsById={ctx.avatarsById} />)}
      </div>;
    },
  },
  {
    id: "series", title: "系列作品", roles: ["scriptwriter"],
    count: (ctx) => ctx.series.length,
    render: (ctx) => <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ctx.series.map((series) => <a key={series.name} href={`/series/${encodeURIComponent(series.name)}`} className="group flex items-center gap-3 border-b border-border py-2">
        {series.coverUrl && <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-sm border border-border"><PublicImage src={series.coverUrl} alt={series.name} preset="thumbnail" /></div>}
        <div className="min-w-0"><p className="line-clamp-1 text-sm font-bold group-hover:text-link group-hover:underline">{series.name}</p><p className="text-xs text-muted-foreground">{series.count} 部</p></div>
      </a>)}
    </div>,
  },
  {
    id: "scripts", title: "台本作品", roles: ["scriptwriter"], showWhenEmpty: "目前沒有公開台本",
    count: (ctx) => ctx.scripts.length + ctx.externalScripts.length,
    render: (ctx) => {
      if (ctx.viewMode === "list") {
        return <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {ctx.scripts.map((script) => <PublicProfileWorkCard
            key={script.id}
            title={script.title}
            url={`/read/${script.id}`}
            coverUrl={script.coverUrl}
            workType="script"
            compact
          />)}
          {ctx.externalScripts.map((script) => <PublicProfileWorkCard
            key={script.id}
            title={script.title || script.remoteTitle || "未命名台本"}
            url={script.sourceUrl}
            coverUrl={externalCoverSrc(script)}
            workType="other"
            sourceLabel={script.sourceName || script.sourceDomain || "外部台本"}
            compact
          />)}
        </div>;
      }
      return <>
        {ctx.scripts.length > 0 && <EntityScriptGrid scripts={ctx.scripts} />}
        {ctx.externalScripts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ctx.externalScripts.map((script) => <PublicProfileWorkCard key={script.id}
            title={script.title || script.remoteTitle || "未命名台本"} url={script.sourceUrl} coverUrl={externalCoverSrc(script)}
            workType="other" sourceLabel={script.sourceName || script.sourceDomain || "外部台本"}
            subtitle={cleanScriptSummary(script.summary || script.remoteSummary)} linkLabel="閱讀台本" />)}
        </div>}
      </>;
    },
  },
];

export function AuthorPageClient({ persona, scripts, performances = [], externalScripts = [], audioWorks = [], audioScriptWorks = [], otherAudioWorks = [], gameWorks = [], avatarsById = {} }: Props) {
  const demoIdentities = usePublicDemoIdentities(performances, persona);
  const identity = combinePublicIdentities([persona], externalScripts)[0];
  const model = buildAuthorEntityModel(identity, scripts);
  const roles = resolveIdentityRoles(persona, { scripts, externalScripts, performances, audioWorks });
  const productionRoles = productionRolesOf(roles);
  const profileKinds = editableProfileKinds(persona, roles);
  const links = parseLinks(identity.links);
  const { confirmed: ageConfirmed, ready: ageGateReady, confirm: confirmAge } = useResourceAgeGate();
  const [showPrivateContacts, setShowPrivateContacts] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewMode, setViewMode] = useState<WorkViewMode>("card");

  const series = useMemo(() => {
    const map = new Map<string, { name: string; count: number; coverUrl: string | null }>();
    for (const script of scripts) {
      const name = script.series?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { name, count: 0, coverUrl: script.series?.coverUrl ?? null });
      const bucket = map.get(key)!;
      bucket.count += 1;
      if (!bucket.coverUrl && script.coverUrl) bucket.coverUrl = script.coverUrl;
    }
    return Array.from(map.values());
  }, [scripts]);

  const legacyCredits: PublicWorkParticipation[] = [
    ...(persona.productionCredits || []),
    ...audioWorks.map((work) => ({ ...work, creditRole: "voice_actor" as const, coverUrl: work.coverUrl || "", creditedAs: "" })),
    ...audioScriptWorks.map((work) => ({ ...work, creditRole: "scriptwriter" as const, coverUrl: work.coverUrl || "", creditedAs: "" })),
    ...legacyVoiceWorkParticipations(persona),
  ];
  const ctx: SectionContext = { persona, scripts, externalScripts, performances, demoIdentities, catalogWorks: [...audioWorks, ...audioScriptWorks, ...otherAudioWorks],
    credits: mergePublicWorkParticipations(persona.workParticipations ?? legacyCredits), gameWorks, avatarsById, series, viewMode };
  const commissionOffers = Object.values(persona.roleProfiles || {}).flatMap((profile) => {
    const raw = profile?.commissionOffers;
    if (!Array.isArray(raw)) return [];
    return raw.filter((offer): offer is { service: string; details: string; scope: string; sourceUrl: string; sourceUpdatedOn: string } =>
      !!offer && typeof offer.service === "string" && typeof offer.details === "string"
      && typeof offer.scope === "string" && typeof offer.sourceUrl === "string"
      && typeof offer.sourceUpdatedOn === "string");
  });
  const sections = SECTIONS.filter((section) => section.roles.some((role) => roles.includes(role)) && (section.count(ctx) > 0 || section.showWhenEmpty));
  const needsAgeGate = sections.some((section) => section.ageGated && section.count(ctx) > 0);
  const contributors = persona.profileContributors?.length ? persona.profileContributors : persona.voiceActorContributors || [];

  // Contacts: website, links and the external writer's profile, without repeats.
  const externalWriterUrl = externalScripts.find((script) => script.authorUrl?.trim())?.authorUrl?.trim() || "";
  const seenContactUrls = new Set<string>();
  const allContactItems = [
    ...(identity.website ? [{ label: "網站", value: identity.website }] : []),
    ...links.filter((link) => String(link.url || "").trim()).map((link) => ({
      label: String(link.label || "聯絡方式").trim() || "聯絡方式",
      value: String(link.url || "").trim(),
      isPublic: (link as { isPublic?: boolean; public?: boolean }).isPublic === true || (link as { public?: boolean }).public === true,
    })),
    ...(externalWriterUrl ? [{ label: "社群", value: externalWriterUrl }] : []),
  ].filter((item) => {
    const url = item.value.trim();
    if (seenContactUrls.has(url)) return false;
    seenContactUrls.add(url);
    return true;
  });
  // Email / Discord stay hidden until the visitor asks, unless the owner flagged them public.
  const { visible: contactItems, hidden: privateContactItems } = partitionContacts(allContactItems);
  const profileTags = model.profileTags;

  return (
    <>
    <main className="min-h-screen bg-background">
      {persona.bannerUrl && (
        <div className="relative h-28 overflow-hidden border-b border-border bg-muted sm:h-36">
          <PublicImage src={persona.bannerUrl} alt="" preset="author-banner" crop={persona.bannerCrop} />
        </div>
      )}

      <PublicProfileContainer>
        <PublicProfileCard overlap={Boolean(persona.bannerUrl)}>
          <div className="min-w-0 space-y-2.5">
            {!editing && <>
              <header className="flex items-center gap-3">
                <PublicProfileAvatar src={identity.avatar} name={identity.displayName} crop={persona.avatarCrop} />
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-bold leading-tight">{identity.displayName}</h1>
                  {roles.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5" aria-label="創作者身份">
                      {roles.map((role) => (
                        <PublicProfileRole key={role} href={productionRoles.includes(role as ProductionRole)
                          ? `/resources?category=${role === "recording_studio" ? persona.roleProfiles?.recording_studio?.entityType === "person" ? "recording_engineer" : persona.roleProfiles?.recording_studio?.entityType === "studio" ? "recording_studio" : "recording_unclassified" : role}`
                          : undefined}>{publicIdentityRoleLabel(role, persona.roleProfiles?.recording_studio?.entityType)}</PublicProfileRole>
                      ))}
                    </div>
                  )}
                </div>
              </header>

              {(persona.voiceActorOrganizations || []).length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {persona.voiceActorOrganizations!.map((org, index) => org.url ? (
                    <span key={`${org.name}-${index}`} className="text-sm text-muted-foreground">團體：<PublicContentLink href={org.url} target="_blank" rel="noopener noreferrer" arrow>{org.name || "未命名"}</PublicContentLink></span>
                  ) : <span key={`${org.name}-${index}`} className="text-sm text-muted-foreground">團體：{org.name || "未命名"}</span>)}
                </div>
              )}

              {identity.bio && <LinkifiedText text={identity.bio} className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-foreground" />}

              {profileTags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="個人標籤">
                  {profileTags.map((tag, i) => <li key={i} className="text-xs text-muted-foreground"><PublicTag>{tag}</PublicTag></li>)}
                </ul>
              )}

              {(contactItems.length > 0 || privateContactItems.length > 0) && <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground" aria-label="聯絡與官方連結">
                {contactItems.map((item, i) => (
                  /^https?:\/\//i.test(item.value) ? <PublicProfileLink key={`${item.label}-${i}`} label={item.label} url={item.value} /> : <span key={`${item.label}-${i}`} className="break-all">{item.label}：{item.value}</span>
                ))}
                {privateContactItems.length > 0 && !showPrivateContacts && (
                  <button type="button" onClick={() => setShowPrivateContacts(true)} className="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 text-xs text-foreground hover:bg-muted">顯示聯絡方式</button>
                )}
                {showPrivateContacts && privateContactItems.map((item, i) => (
                  <span key={`private-${item.label}-${i}`} className="inline-flex items-baseline gap-1 break-all">
                    <span className="font-medium text-foreground/80">{item.label}：</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>}
            </>}

            {profileKinds.length > 0 && (
              <div className="pt-1">
                {!editing && !notice && <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted">更新資料</button>}
                {notice && <p role="status" className="text-sm text-success">{notice}</p>}
                {editing && (
                  <IdentityProfileForm
                    persona={persona}
                    fallback={identity}
                    kinds={profileKinds}
                    productionRoles={productionRoles}
                    onCancel={() => setEditing(false)}
                    onSubmitted={(message) => { setNotice(message); setEditing(false); }}
                  />
                )}
              </div>
            )}
          </div>
        </PublicProfileCard>

        {commissionOffers.length > 0 && (
          <PublicProfileSection title="音聲委託參考價" count={commissionOffers.length}>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{commissionOffers[0].scope} 來源於 {commissionOffers[0].sourceUpdatedOn} 更新的公開資料，實際報價與可接案狀態請向創作者確認。</p>
            <dl className="border-t border-border">
              {commissionOffers.map((offer, index) => <div key={`${offer.service}-${index}`} className="grid gap-1 border-b border-border py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm font-bold">{offer.service}</dt>
                <dd className="whitespace-pre-line text-sm leading-relaxed text-foreground">{offer.details}</dd>
              </div>)}
            </dl>
            <a href={commissionOffers[0].sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-link hover:underline">查看收費標準來源<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
          </PublicProfileSection>
        )}

        {needsAgeGate && ageGateReady && !ageConfirmed && <div className="my-4"><AdultContentNotice scope="participations" onConfirm={confirmAge} /></div>}

        {sections.some((section) => (!section.ageGated || ageConfirmed) && section.count(ctx) > 0 && (section.id.startsWith("production-") || section.id === "games" || section.id === "scripts" || section.id === "performances")) && (
          <div className="mb-3 flex items-center justify-end gap-1" role="group" aria-label="作品顯示方式">
            <button
              type="button"
              aria-pressed={viewMode === "card"}
              onClick={() => setViewMode("card")}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              <Grid2x2 className="size-3.5" aria-hidden />
              <span>標準</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              <Grid3x3 className="size-3.5" aria-hidden />
              <span>密集</span>
            </button>
          </div>
        )}

        {sections.map((section) => (
          (!section.ageGated || ageConfirmed) && (
            <PublicProfileSection key={section.id} title={section.title} count={section.count(ctx)}>
              {section.count(ctx) === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">{section.showWhenEmpty}</p> : section.render(ctx)}
            </PublicProfileSection>
          )
        ))}

        {contributors.length > 0 && (
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <button type="button" onClick={() => setHistoryOpen(true)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">修改紀錄</button>
          </div>
        )}
      </PublicProfileContainer>
    </main>
    <PublicFooter />
    {historyOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="profile-history-title">
        <button type="button" aria-label="關閉修改紀錄" className="absolute inset-0 bg-black/60" onClick={() => setHistoryOpen(false)} />
        <section className="relative z-10 max-h-[min(80vh,36rem)] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-background p-4 shadow-lg sm:p-5">
          <header className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 id="profile-history-title" className="text-lg font-semibold">修改紀錄</h2>
            <button type="button" aria-label="關閉修改紀錄" onClick={() => setHistoryOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" aria-hidden /></button>
          </header>
          <ol>
            {contributors.map((contributor, index) => (
              <li key={`${contributor.name}-${contributor.contributedAt || index}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-1 py-2.5">
                <span className="text-sm font-medium">{contributor.name || "訪客協作者"}</span>
                <time className="text-xs text-muted-foreground" dateTime={contributor.contributedAt ? new Date(contributor.contributedAt).toISOString() : undefined}>
                  核准時間：{contributor.contributedAt ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(contributor.contributedAt)) : "日期未記錄"}
                </time>
              </li>
            ))}
          </ol>
        </section>
      </div>
    )}
    </>
  );
}

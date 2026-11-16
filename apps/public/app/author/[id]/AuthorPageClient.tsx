"use client";

import { partitionContacts } from "@/lib/publicContactPrivacy";
import { useMemo, useState, type ReactNode } from "react";
import type { ExternalPublicScript, ProductionRole, PublicAudioWork, PublicDemoSubmission, PublicIdentityRole, PublicPersona, PublicProductionCredit, PublicScript } from "@/lib/types";
import { buildAuthorEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicImage } from "@/components/PublicImage";
import { LinkifiedText } from "@/components/LinkifiedText";
import { ExternalLink, BriefcaseBusiness, X } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { ResourceAgeGate, useResourceAgeGate } from "@/components/ResourceAgeGate";
import { demoArtwork } from "@/lib/demoArtwork";
import { combinePublicIdentities } from "@/lib/publicIdentity";
import { PublicProfileAvatar, PublicProfileCard, PublicProfileContainer, PublicProfileLink, PublicProfileRole, PublicProfileSection, PublicProfileWorkCard } from "@/components/PublicProfileLayout";
import { IdentityProfileForm } from "@/components/identity/IdentityProfileForm";
import { ROLE_LABELS, editableProfileKinds, productionRolesOf, resolveIdentityRoles } from "@/components/identity/identityRoles";
import { cleanScriptSummary } from "@/lib/scriptSummary";

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
}

interface SectionContext {
  persona: Props["persona"];
  scripts: PublicScript[];
  externalScripts: ExternalPublicScript[];
  performances: PublicDemoSubmission[];
  audioWorks: PublicAudioWork[];
  audioScriptWorks: PublicAudioWork[];
  credits: PublicProductionCredit[];
  series: Array<{ name: string; count: number; coverUrl: string | null }>;
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
const PRODUCTION_SECTION_TITLES: Record<ProductionRole, string> = {
  post_production: "後製作品",
  cover_art: "封面作品",
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

function productionSection(role: ProductionRole): IdentitySection {
  const items = (ctx: SectionContext) => ctx.credits.filter((credit) => credit.creditRole === role);
  return {
    id: `production-${role}`,
    title: PRODUCTION_SECTION_TITLES[role],
    roles: [role],
    ageGated: true,
    count: (ctx) => items(ctx).length,
    render: (ctx) => <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items(ctx).map((credit) => <PublicProfileWorkCard key={`${credit.id}-${credit.creditRole}`} title={credit.title} url={credit.url} coverUrl={credit.coverUrl} workType={credit.workType}
        subtitle={`${WORK_TYPE_LABELS[credit.workType || "audio"]}${credit.creditedAs && credit.creditedAs !== ctx.persona.displayName ? `・署名 ${credit.creditedAs}` : ""}`} />)}
    </div>,
  };
}

const SECTIONS: IdentitySection[] = [
  {
    id: "performances", title: "參與演出", roles: ["voice_actor"], ageGated: true,
    count: (ctx) => ctx.performances.length,
    render: (ctx) => <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ctx.performances.map((demo) => {
        const artwork = demoArtwork(demo.demoUrl, demo.coverUrl || "");
        return <article key={demo.id} className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-sm border border-border bg-muted">
            {artwork ? <PublicImage src={artwork} alt={`${demo.scriptTitle}演出圖片`} preset="script-cover" /> : <BriefcaseBusiness className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/50" aria-hidden />}
          </div>
          <div className="pt-2">
            <p className="line-clamp-2 text-sm font-bold">{demo.scriptTitle}</p>
            {demo.scriptAuthorName && <p className="mt-1 text-xs text-muted-foreground">台本師：{demo.scriptAuthorHref ? <a href={demo.scriptAuthorHref} className="text-link hover:underline">{demo.scriptAuthorName}</a> : demo.scriptAuthorName}</p>}
            {demo.demoName && demo.demoName !== "YouTube 試聽" && <h3 className="mt-1 text-xs text-muted-foreground">{demo.demoName}</h3>}
            {(cleanScriptSummary(demo.scriptSummary) || demo.description) && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{cleanScriptSummary(demo.scriptSummary) || demo.description}</p>}
            {demo.organizationName && demo.organizationHref && <a href={demo.organizationHref} className="mt-2 inline-block text-xs text-link hover:underline">{demo.organizationName}</a>}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={demo.scriptUrl} target={demo.scriptType === "external" ? "_blank" : undefined} rel={demo.scriptType === "external" ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-muted">看台本</a>
              <a href={demo.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">播放 Demo<ExternalLink className="h-3 w-3" aria-hidden /></a>
            </div>
          </div>
        </article>;
      })}
    </div>,
  },
  {
    id: "audioWorks", title: "音聲作品", roles: ["voice_actor"], ageGated: true,
    count: (ctx) => ctx.audioWorks.length,
    render: (ctx) => <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ctx.audioWorks.map((work) => <PublicProfileWorkCard key={work.id} title={work.title} url={work.url} coverUrl={work.coverUrl} />)}</div>,
  },
  {
    id: "audioScriptWorks", title: "參與音聲台本", roles: ["scriptwriter"], ageGated: true,
    count: (ctx) => ctx.audioScriptWorks.length,
    render: (ctx) => <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ctx.audioScriptWorks.map((work) => <PublicProfileWorkCard key={work.id} title={work.title} url={work.url} coverUrl={work.coverUrl} />)}</div>,
  },
  {
    id: "voiceActorWorks", title: "參演作品", roles: ["voice_actor"], ageGated: true,
    count: (ctx) => (ctx.persona.voiceActorWorks || []).length,
    render: (ctx) => <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(ctx.persona.voiceActorWorks || []).map((work, index) => <article key={`${work.title}-${index}`} className="min-w-0">{work.coverUrl && <div className="relative aspect-video overflow-hidden rounded-sm border border-border bg-muted"><PublicImage src={work.coverUrl} alt={`${work.title || "參演作品"}封面`} preset="script-cover" /></div>}<div className="pt-2"><h3 className="text-sm font-bold">{work.title || "未命名作品"}</h3>{work.role && <p className="mt-1 text-xs text-muted-foreground">角色：{work.role}</p>}{work.description && <p className="mt-1 text-xs text-muted-foreground">{work.description}</p>}{work.url && <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-link hover:underline">查看作品<ExternalLink className="h-3 w-3" aria-hidden /></a>}</div></article>)}</div>,
  },
  ...(["post_production", "cover_art", "recording_studio"] as const).map(productionSection),
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
    render: (ctx) => <>
      {ctx.scripts.length > 0 && <EntityScriptGrid scripts={ctx.scripts} />}
      {ctx.externalScripts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.externalScripts.map((script) => <article key={script.id} className="min-w-0">
          {script.coverUrl && <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-border bg-muted"><PublicImage src={script.coverUrl} alt={`${script.title}封面`} preset="script-cover" /></div>}
          <div className="pt-2">
            <h3 className="line-clamp-2 text-sm font-bold">{script.title || script.remoteTitle || "未命名台本"}</h3>
            {cleanScriptSummary(script.summary) && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{cleanScriptSummary(script.summary)}</p>}
            <a href={script.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-link hover:underline">閱讀台本<ExternalLink className="h-3 w-3" aria-hidden /></a>
          </div>
        </article>)}
      </div>}
    </>,
  },
];

export function AuthorPageClient({ persona, scripts, performances = [], externalScripts = [], audioWorks = [], audioScriptWorks = [] }: Props) {
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

  const ctx: SectionContext = { persona, scripts, externalScripts, performances, audioWorks, audioScriptWorks, credits: persona.productionCredits || [], series };
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
  const profileTags = model.profileTags.filter((tag) => tag.trim() !== "待認領");

  return (
    <>
    <main className="min-h-screen bg-background">
      {persona.bannerUrl && (
        <div className="relative h-36 overflow-hidden border-b border-border bg-muted sm:h-44">
          <PublicImage src={persona.bannerUrl} alt="" preset="author-banner" crop={persona.bannerCrop} />
        </div>
      )}

      <PublicProfileContainer>
        {needsAgeGate && ageGateReady && !ageConfirmed && <div className="pt-6"><ResourceAgeGate onConfirm={confirmAge} /></div>}
        <PublicProfileCard overlap={Boolean(persona.bannerUrl) && (!needsAgeGate || ageConfirmed)}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {!editing && <PublicProfileAvatar src={identity.avatar} name={identity.displayName} crop={persona.avatarCrop} />}

            <div className="min-w-0 flex-1 space-y-3">
              {!editing && <>
                <h1 className="text-2xl font-bold">{identity.displayName}</h1>

                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" aria-label="創作者身份">
                    {roles.map((role) => (
                      <PublicProfileRole key={role} href={productionRoles.includes(role as ProductionRole) ? `/resources?category=${role}` : undefined}>{ROLE_LABELS[role]}</PublicProfileRole>
                    ))}
                  </div>
                )}

                {(persona.voiceActorOrganizations || []).length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {persona.voiceActorOrganizations!.map((org, index) => org.url ? (
                      <a key={`${org.name}-${index}`} href={org.url} target="_blank" rel="noopener noreferrer" className="text-sm text-link hover:underline">團體：{org.name || "未命名"}<ExternalLink className="ml-1 inline h-3 w-3" aria-hidden /></a>
                    ) : <span key={`${org.name}-${index}`} className="text-sm text-muted-foreground">團體：{org.name || "未命名"}</span>)}
                  </div>
                )}

                {identity.bio && <LinkifiedText text={identity.bio} className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-foreground" />}

                {profileTags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">個人標籤</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profileTags.map((tag, i) => <span key={i} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{tag}</span>)}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-sm text-muted-foreground" aria-label="聯絡與官方連結">
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
                </div>
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

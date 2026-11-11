"use client";

import { partitionContacts } from "@/lib/publicContactPrivacy";
import { useMemo, useState } from "react";
import type { ExternalPublicScript, PublicAudioWork, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";
import { buildAuthorEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicImage } from "@/components/PublicImage";
import { LinkifiedText } from "@/components/LinkifiedText";
import { ExternalLink, Plus, Trash2, UserRound, Building2, BriefcaseBusiness, Link2, X } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { ResourceAgeGate, useResourceAgeGate } from "@/components/ResourceAgeGate";
import { hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";
import { demoArtwork } from "@/lib/demoArtwork";
import { liveApi } from "@/lib/liveApi";
import { combinePublicIdentities, hasScriptwriterRole } from "@/lib/publicIdentity";
import { PublicProfileAvatar, PublicProfileCard, PublicProfileContainer, PublicProfileLink, PublicProfileRole, PublicProfileSection, PublicProfileWorkCard } from "@/components/PublicProfileLayout";

interface Props {
  persona: PublicPersona & {
    bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
    avatarCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  };
  scripts: PublicScript[];
  performances?: PublicDemoSubmission[];
  externalScripts?: ExternalPublicScript[];
  audioWorks?: PublicAudioWork[];
}

function parseLinks(
  links: PublicPersona["links"]
): Array<{ url?: string; label?: string }> {
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

function createProfileForm(persona: PublicPersona) {
  const personaLinks = parseLinks(persona.links);
  const organizations = persona.voiceActorOrganizations || [];
  const works = persona.voiceActorWorks || [];
  return {
    displayName: persona.displayName || "",
    submitterName: "",
    contactEmail: "",
    contributorName: "",
    bio: persona.bio || "",
    avatar: persona.avatar || "",
    website: persona.website || "",
    links: personaLinks.map((link) => ({ label: link.label || "", url: link.url || "" })).concat(personaLinks.length ? [] : [{ label: "", url: "" }]),
    organizations: organizations.map((item) => ({ name: item.name || "", url: item.url || "" })).concat(organizations.length ? [] : [{ name: "", url: "" }]),
    works: works.map((item) => ({ title: item.title || "", role: item.role || "", url: item.url || "", coverUrl: item.coverUrl || "" })).concat(works.length ? [] : [{ title: "", role: "", url: "", coverUrl: "" }]),
  };
}

const profileInputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70";
const profileAreaClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70";
type ProfileFormKind = "voice_actor" | "author";

export function AuthorPageClient({ persona, scripts, performances = [], externalScripts = [], audioWorks = [] }: Props) {
  const identity = combinePublicIdentities([persona], externalScripts)[0];
  const model = buildAuthorEntityModel(identity, scripts);
  const profileBio = identity.bio || "";
  const links = parseLinks(identity.links);
  const isVoiceActor = persona.roles?.includes("voice_actor") ?? (hasVoiceActorSelfTag(persona) || performances.length > 0 || audioWorks.length > 0 || (persona.voiceActorWorks || []).length > 0);
  const { confirmed: ageConfirmed, ready: ageGateReady, confirm: confirmAge } = useResourceAgeGate();
  const hasVoiceWorks = performances.length > 0 || audioWorks.length > 0 || (persona.voiceActorWorks || []).length > 0;
  const isScriptwriter = persona.roles?.includes("scriptwriter") || hasScriptwriterRole(persona, scripts, externalScripts);
  const canEditVoiceActorProfile = isVoiceActor && persona.voiceActorCollaborationEnabled !== false;
  const defaultProfileFormKind: ProfileFormKind = isScriptwriter ? "author" : "voice_actor";
  const roles = [
    ...(scripts.length > 0 || isScriptwriter || externalScripts.length > 0 ? ["台本師"] : []),
    ...(isVoiceActor ? ["聲演"] : []),
  ];
  const externalWriterUrl = externalScripts.find((script) => script.authorUrl?.trim())?.authorUrl?.trim() || "";
  const contactItemsWithDuplicates = [
    ...(identity.website
      ? [{ label: "網站", value: identity.website }]
      : []),
    ...links
      .filter((link) => String(link.url || "").trim())
      .map((link) => ({
        label: String(link.label || "聯絡方式").trim() || "聯絡方式",
        value: String(link.url || "").trim(),
        isPublic: (link as { isPublic?: boolean; public?: boolean }).isPublic === true || (link as { public?: boolean }).public === true,
      })),
    ...(externalWriterUrl && !links.some((link) => link.url?.trim() === externalWriterUrl)
      ? [{ label: "社群", value: externalWriterUrl }]
      : []),
  ];
  const seenContactUrls = new Set<string>();
  const allContactItems = contactItemsWithDuplicates.filter((item) => {
    const url = item.value.trim();
    if (seenContactUrls.has(url)) return false;
    seenContactUrls.add(url);
    return true;
  });
  // Email / Discord stay hidden until the visitor asks, unless the owner flagged them public.
  const { visible: contactItems, hidden: privateContactItems } = partitionContacts(allContactItems);
  const [showPrivateContacts, setShowPrivateContacts] = useState(false);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [profileFormBusy, setProfileFormBusy] = useState(false);
  const [profileFormLoading, setProfileFormLoading] = useState(false);
  const [profileFormNotice, setProfileFormNotice] = useState("");
  const [profileFormError, setProfileFormError] = useState("");
  const [profileFormKind, setProfileFormKind] = useState<ProfileFormKind>("voice_actor");
  const [profileForm, setProfileForm] = useState(() => createProfileForm(identity));
  const [historyOpen, setHistoryOpen] = useState(false);

  const openProfileEditor = async (kind: ProfileFormKind) => {
    setProfileFormError("");
    setProfileFormKind(kind);
    setProfileFormLoading(true);
    try {
      const { data } = await liveApi.readJson<PublicPersona>(`/api/public-personas/${encodeURIComponent(persona.id)}`);
      setProfileForm(createProfileForm(data));
    } catch (error) {
      console.warn("Could not refresh the public voice actor profile before editing", error);
      setProfileForm(createProfileForm(identity));
    } finally {
      setProfileFormLoading(false);
      setProfileFormOpen(true);
    }
  };

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFormBusy(true);
    setProfileFormError("");
    try {
      const links = profileForm.links.filter((item) => item.label.trim() || item.url.trim()).map((item) => ({ label: item.label.trim(), url: item.url.trim() }));
      const organizations = profileFormKind === "voice_actor" ? profileForm.organizations.filter((item) => item.name.trim() || item.url.trim()).map((item) => ({ name: item.name.trim(), url: item.url.trim() })) : [];
      const works = profileFormKind === "voice_actor" ? profileForm.works.filter((item) => item.title.trim() || item.role.trim() || item.url.trim() || item.coverUrl.trim()).map((item) => ({ title: item.title.trim(), role: item.role.trim(), url: item.url.trim(), coverUrl: item.coverUrl.trim() })) : [];
      const response = await liveApi.write("/api/voice-actor-profile-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id, profileKind: profileFormKind, ...profileForm, contributorName: profileFormKind === "voice_actor" ? profileForm.contributorName : "", links, organizations, works }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "送出失敗，請稍後再試。 ");
      }
      setProfileFormNotice(profileFormKind === "author" ? "作者資料已送交管理員審核；核准後才會更新公開作者頁。謝謝你協助補充資料。" : "資料已送交審核；核准後才會更新公開聲演頁面。謝謝你協助補充資料。");
      setProfileFormOpen(false);
    } catch (error) {
      setProfileFormError(error instanceof Error ? error.message : "送出失敗，請稍後再試。 ");
    } finally {
      setProfileFormBusy(false);
    }
  };

  // Derive series list from scripts
  const authorSeries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; coverUrl: string | null }
    >();
    for (const s of scripts) {
      const name = s.series?.name;
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map.has(key))
        map.set(key, { name, count: 0, coverUrl: s.series?.coverUrl ?? null });
      const bucket = map.get(key)!;
      bucket.count += 1;
      if (!bucket.coverUrl && s.coverUrl) bucket.coverUrl = s.coverUrl;
    }
    return Array.from(map.values());
  }, [scripts]);

  return (
    <>
    <main className="min-h-screen bg-background">
      {/* Banner */}
      {persona.bannerUrl && (
        <div className="relative h-48 overflow-hidden bg-muted">
          <PublicImage src={persona.bannerUrl} alt="" preset="author-banner" crop={persona.bannerCrop} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <PublicProfileContainer>
        {isVoiceActor && hasVoiceWorks && ageGateReady && !ageConfirmed && <div className="pt-6"><ResourceAgeGate onConfirm={confirmAge} /></div>}
        {/* Profile header */}
        <PublicProfileCard overlap={Boolean(persona.bannerUrl) && (!isVoiceActor || !hasVoiceWorks || ageConfirmed)}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Avatar */}
            {!profileFormOpen && <PublicProfileAvatar src={identity.avatar} name={identity.displayName} crop={persona.avatarCrop} />}

            <div className="flex-1 space-y-3 pt-2">
              {!profileFormOpen && <>
              <h1 className="font-serif text-3xl font-bold">{identity.displayName}</h1>

              {roles.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="創作者身份">
                  {roles.map((role) => (
                    <PublicProfileRole key={role}>{role}</PublicProfileRole>
                  ))}
                </div>
              )}

              {(persona.voiceActorOrganizations || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {persona.voiceActorOrganizations!.map((org, index) => org.url ? (
                    <a key={`${org.name}-${index}`} href={org.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-2.5 py-1 text-xs text-primary hover:bg-muted/50">團體 · {org.name || "未命名"}<ExternalLink className="ml-1 inline h-3 w-3" aria-hidden /></a>
                  ) : <span key={`${org.name}-${index}`} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">團體 · {org.name || "未命名"}</span>)}
                </div>
              )}

              {profileBio && (
                <LinkifiedText
                  text={profileBio}
                  className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground"
                />
              )}

              {model.profileTags.filter((tag) => tag.trim() !== "待認領").length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">個人標籤</p>
                  <div className="flex flex-wrap gap-2">
                    {model.profileTags.filter((tag) => tag.trim() !== "待認領").map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1 text-sm text-muted-foreground" aria-label="聯絡與官方連結">
                {contactItems.map((item, i) => (
                  /^https?:\/\//i.test(item.value) ? <PublicProfileLink key={`${item.label}-${i}`} label={item.label} url={item.value} /> : <span key={`${item.label}-${i}`} className="break-all">{item.label}：{item.value}</span>
                ))}
                {privateContactItems.length > 0 && !showPrivateContacts && (
                  <button
                    type="button"
                    onClick={() => setShowPrivateContacts(true)}
                    className="inline-flex h-8 items-center rounded-md border border-border/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    顯示聯絡方式
                  </button>
                )}
                {showPrivateContacts && privateContactItems.map((item, i) => (
                  <span key={`private-${item.label}-${i}`} className="inline-flex items-baseline gap-1 break-all">
                    <span className="font-medium text-foreground/80">{item.label}：</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
              </>}

              {(isScriptwriter || canEditVoiceActorProfile) && (
                <div className="pt-1">
                  {!profileFormOpen && !profileFormNotice && <button type="button" disabled={profileFormLoading} onClick={() => void openProfileEditor(defaultProfileFormKind)} className="rounded-md border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60">{profileFormLoading ? "讀取目前資料…" : "更新資料"}</button>}
                  {profileFormNotice && <p role="status" className="text-sm text-emerald-400">{profileFormNotice}</p>}
                  {profileFormError && <p role="alert" className="mb-2 text-sm text-destructive">{profileFormError}</p>}
                  {profileFormOpen && (
                    <form onSubmit={submitProfile} className="mt-0 w-full max-w-5xl space-y-3 rounded-xl border border-border/70 bg-background p-3 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3"><div><h2 className="font-semibold">更新資料</h2><p className="mt-1 text-xs text-muted-foreground">可更新公開名稱、頭像、個人介紹、網站與社群連結；{profileFormKind === "author" ? "作者資料" : "聲演資料"}送出後由{profileFormKind === "author" || !persona.voiceActorClaimed ? "管理員" : "本人"}審核，核准後更新公開頁。</p></div><span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 [font-size:var(--public-font-caption)] text-primary">更新公開資料</span></div>
                      {isScriptwriter && canEditVoiceActorProfile && <div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">資料類型</span><button type="button" aria-pressed={profileFormKind === "author"} onClick={() => setProfileFormKind("author")} className={`rounded-full border px-2.5 py-1 ${profileFormKind === "author" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>作者資料</button><button type="button" aria-pressed={profileFormKind === "voice_actor"} onClick={() => setProfileFormKind("voice_actor")} className={`rounded-full border px-2.5 py-1 ${profileFormKind === "voice_actor" ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>聲演資料</button></div>}

                      <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <div className="flex shrink-0 items-center gap-3 sm:block">
                            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-2xl font-semibold text-muted-foreground sm:h-28 sm:w-28">
                              {profileForm.avatar ? <img src={profileForm.avatar} alt={`${profileFormKind === "author" ? "作者" : "聲演"}頭像預覽`} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (profileForm.displayName.trim()[0] || <UserRound className="h-8 w-8" />)}
                            </div>
                            <label className="block min-w-0 flex-1 space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground sm:mt-2 sm:w-40">頭像圖片網址<input maxLength={2000} value={profileForm.avatar} onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })} placeholder="貼上圖片網址" className={`${profileInputClass} mt-1 h-8 px-2 text-xs`} /></label>
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <label className="block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">公開名稱<input required maxLength={120} value={profileForm.displayName} onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })} placeholder="輸入你想顯示的名稱" className="h-11 w-full rounded-md border border-transparent bg-transparent px-2 text-2xl font-bold font-serif text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-border focus:border-primary focus:bg-background sm:text-3xl" /></label>
                            <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">公開資料</span>
                            <label className="block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">個人介紹<textarea rows={3} maxLength={4000} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} placeholder="輸入想放在個人頁上的介紹…" className={`${profileAreaClass} min-h-24 resize-y bg-background/70`} /></label>
                            <label className="block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">個人網站<input maxLength={2000} value={profileForm.website} onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })} placeholder="https://…" className={profileInputClass} /></label>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5 text-xs font-medium"><Link2 className="h-3.5 w-3.5 text-primary" />社群連結</div><button type="button" onClick={() => setProfileForm({ ...profileForm, links: [...profileForm.links, { label: "", url: "" }] })} className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增連結</button></div>
                              {profileForm.links.map((link, index) => <div key={`social-${index}`} className="grid grid-cols-[minmax(80px,0.55fr)_minmax(0,1fr)_32px] gap-1.5"><input aria-label={`社群名稱 ${index + 1}`} value={link.label} onChange={(e) => setProfileForm({ ...profileForm, links: profileForm.links.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} placeholder="平台／名稱" className={`${profileInputClass} h-8 px-2 text-xs`} /><input aria-label={`社群網址 ${index + 1}`} value={link.url} onChange={(e) => setProfileForm({ ...profileForm, links: profileForm.links.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} placeholder="貼上連結" className={`${profileInputClass} h-8 px-2 text-xs`} /><button type="button" aria-label="移除社群連結" onClick={() => setProfileForm({ ...profileForm, links: profileForm.links.filter((_, i) => i !== index) })} className="inline-flex h-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
                            </div>
                          </div>
                        </div>
                      </section>

                      {profileFormKind === "voice_actor" && <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />所屬團體</h3><p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">會以團體卡片顯示在你的公開頁。</p></div><button type="button" onClick={() => setProfileForm({ ...profileForm, organizations: [...profileForm.organizations, { name: "", url: "" }] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增團體</button></div>
                        <div className="grid gap-2 sm:grid-cols-2">{profileForm.organizations.map((org, index) => <div key={`org-${index}`} className="rounded-lg border border-border/60 bg-background p-2.5"><div className="flex gap-2"><input aria-label={`團體名稱 ${index + 1}`} value={org.name} onChange={(e) => setProfileForm({ ...profileForm, organizations: profileForm.organizations.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} placeholder="團體名稱" className={`${profileInputClass} min-w-0 font-medium`} /><button type="button" aria-label="移除團體" onClick={() => setProfileForm({ ...profileForm, organizations: profileForm.organizations.filter((_, i) => i !== index) })} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div><input aria-label={`團體網址 ${index + 1}`} value={org.url} onChange={(e) => setProfileForm({ ...profileForm, organizations: profileForm.organizations.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} placeholder="團體網站或社群（選填）" className={`${profileInputClass} mt-2 h-8 border-transparent bg-transparent px-1 text-xs`} /></div>)}</div>
                      </section>}

                      {profileFormKind === "voice_actor" && <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
                        <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="h-4 w-4 text-primary" />參演作品</h3><p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">作品會以清單卡片顯示在你的公開頁。</p></div><button type="button" onClick={() => setProfileForm({ ...profileForm, works: [...profileForm.works, { title: "", role: "", url: "", coverUrl: "" }] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增作品</button></div>
                        <div className="grid gap-2 sm:grid-cols-2">{profileForm.works.map((work, index) => <div key={`work-${index}`} className="overflow-hidden rounded-lg border border-border/60 bg-background">
                          {work.coverUrl && <div className="relative aspect-video overflow-hidden bg-muted"><PublicImage src={work.coverUrl} alt={`${work.title || "作品"}封面預覽`} preset="script-cover" /></div>}
                          <div className="p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><input aria-label={`作品名稱 ${index + 1}`} value={work.title} onChange={(e) => setProfileForm({ ...profileForm, works: profileForm.works.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} placeholder="作品／台本名稱" className={`${profileInputClass} border-transparent bg-transparent px-1 font-semibold`} /><input aria-label={`參演角色 ${index + 1}`} value={work.role} onChange={(e) => setProfileForm({ ...profileForm, works: profileForm.works.map((item, i) => i === index ? { ...item, role: e.target.value } : item) })} placeholder="參演角色或補充（選填）" className={`${profileInputClass} mt-1 h-8 border-transparent bg-transparent px-1 text-xs`} /></div><button type="button" aria-label="移除參演作品" onClick={() => setProfileForm({ ...profileForm, works: profileForm.works.filter((_, i) => i !== index) })} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div><input aria-label={`作品網址 ${index + 1}`} value={work.url} onChange={(e) => setProfileForm({ ...profileForm, works: profileForm.works.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} placeholder="作品連結（選填）" className={`${profileInputClass} mt-2 h-8 border-transparent bg-transparent px-1 text-xs`} /><label className="mt-2 block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">封面圖片網址<input type="text" inputMode="url" aria-label={`封面圖片網址 ${index + 1}`} value={work.coverUrl} onChange={(e) => setProfileForm({ ...profileForm, works: profileForm.works.map((item, i) => i === index ? { ...item, coverUrl: e.target.value } : item) })} placeholder="https://… 或 /media/…" className={`${profileInputClass} h-8 px-2 text-xs`} /></label></div>
                        </div>)}</div>
                      </section>}

                      <section className="rounded-lg border border-border/60 p-3"><h3 className="mb-2 text-xs font-semibold">資料補充者與審核聯絡方式</h3><div className="grid gap-2 sm:grid-cols-2">{profileFormKind === "voice_actor" && <label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">資料補充者名稱（公開顯示）<input required maxLength={120} value={profileForm.contributorName} onChange={(e) => setProfileForm({ ...profileForm, contributorName: e.target.value })} placeholder="輸入公開署名或暱稱" className={profileInputClass} /><span className="block [font-size:var(--public-font-caption)]">核准後會和核准時間一起列在聲演頁。</span></label>}<label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">聯絡姓名（不公開）<input required maxLength={120} value={profileForm.submitterName} onChange={(e) => setProfileForm({ ...profileForm, submitterName: e.target.value })} className={profileInputClass} /></label><label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground sm:col-span-2">聯絡 Email（不公開）<input required type="email" maxLength={320} value={profileForm.contactEmail} onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })} className={profileInputClass} /></label></div></section>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3"><p className="text-xs text-muted-foreground">送出後提案會進入審核，核准前不會公開變更。</p><div className="flex justify-end gap-2"><button type="button" onClick={() => { setProfileFormOpen(false); setProfileFormError(""); }} className="rounded-md border border-border px-3 py-1.5 text-sm">取消編輯</button><button type="submit" disabled={profileFormBusy} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60">{profileFormBusy ? "送出中…" : "送交審核"}</button></div></div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </PublicProfileCard>

        {ageConfirmed && performances.length > 0 && (
          <PublicProfileSection title="參與演出" count={performances.length}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {performances.map((demo) => {
                const artwork = demoArtwork(demo.demoUrl, demo.coverUrl || "");
                return <article key={demo.id} className="overflow-hidden rounded-lg border border-border/60 bg-background">
                  <div className="relative aspect-video overflow-hidden bg-muted/50">
                    {artwork ? <PublicImage src={artwork} alt={`${demo.scriptTitle}演出圖片`} preset="script-cover" /> : <BriefcaseBusiness className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/50" aria-hidden />}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold">{demo.scriptTitle}</p>
                    {demo.scriptAuthorName && <p className="mt-1 text-xs text-muted-foreground">台本師：{demo.scriptAuthorHref ? <a href={demo.scriptAuthorHref} className="text-primary underline underline-offset-2 hover:text-primary/80">{demo.scriptAuthorName}</a> : demo.scriptAuthorName}</p>}
                    {demo.demoName && demo.demoName !== "YouTube 試聽" && <h3 className="mt-1 text-xs text-muted-foreground">{demo.demoName}</h3>}
                    {(demo.scriptSummary || demo.description) && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{demo.scriptSummary || demo.description}</p>}
                    {demo.organizationName && demo.organizationHref && <a href={demo.organizationHref} className="mt-2 inline-block text-xs text-primary hover:underline">{demo.organizationName}</a>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={demo.scriptUrl} target={demo.scriptType === "external" ? "_blank" : undefined} rel={demo.scriptType === "external" ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs hover:bg-muted/60">看台本</a>
                      <a href={demo.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">播放 Demo<ExternalLink className="h-3 w-3" aria-hidden /></a>
                    </div>
                  </div>
                </article>;
              })}
            </div>
          </PublicProfileSection>
        )}

        {ageConfirmed && audioWorks.length > 0 && <PublicProfileSection title="音聲作品" count={audioWorks.length}><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{audioWorks.map((work) => <PublicProfileWorkCard key={work.id} title={work.title} url={work.url} coverUrl={work.coverUrl} />)}</div></PublicProfileSection>}

        {ageConfirmed && (persona.voiceActorWorks || []).length > 0 && (
          <PublicProfileSection title="參演作品" count={persona.voiceActorWorks!.length}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{persona.voiceActorWorks!.map((work, index) => <article key={`${work.title}-${index}`} className="overflow-hidden rounded-lg border border-border/60 bg-background">{work.coverUrl && <div className="relative aspect-video overflow-hidden bg-muted"><PublicImage src={work.coverUrl} alt={`${work.title || "參演作品"}封面`} preset="script-cover" /></div>}<div className="p-3"><h3 className="text-sm font-semibold">{work.title || "未命名作品"}</h3>{work.role && <p className="mt-1 text-xs text-muted-foreground">角色：{work.role}</p>}{work.description && <p className="mt-1 text-xs text-muted-foreground">{work.description}</p>}{work.url && <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">查看作品<ExternalLink className="h-3 w-3" aria-hidden /></a>}</div></article>)}</div>
          </PublicProfileSection>
        )}

        {/* Series block */}
        {authorSeries.length > 0 && (
          <PublicProfileSection title="系列作品" count={authorSeries.length}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {authorSeries.map((series) => (
                <a
                  key={series.name}
                  href={`/series/${encodeURIComponent(series.name)}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 hover:border-primary/50 transition-colors"
                >
                  {series.coverUrl && (
                    <div className="relative w-10 h-14 rounded border border-border/50 shrink-0 overflow-hidden">
                      <PublicImage src={series.coverUrl} alt={series.name} preset="thumbnail" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{series.name}</p>
                    <p className="text-xs text-muted-foreground">{series.count} 部</p>
                  </div>
                </a>
              ))}
            </div>
          </PublicProfileSection>
        )}

        {/* Scripts */}
        {isScriptwriter && <PublicProfileSection title="台本作品" count={scripts.length + externalScripts.length}>
          {scripts.length === 0 && externalScripts.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">目前沒有公開台本</p>}
          {scripts.length > 0 && <EntityScriptGrid scripts={scripts} />}
          {externalScripts.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {externalScripts.map((script) => <article key={script.id} className="overflow-hidden rounded-lg border border-border/60 bg-background">
              {script.coverUrl && <div className="relative aspect-[16/10] overflow-hidden bg-muted"><PublicImage src={script.coverUrl} alt={`${script.title}封面`} preset="script-cover" /></div>}
              <div className="p-3">
                <h3 className="line-clamp-2 text-sm font-semibold">{script.title || script.remoteTitle || "未命名台本"}</h3>
                {script.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{script.summary}</p>}
                <a href={script.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs hover:bg-muted/60">閱讀台本<ExternalLink className="h-3 w-3" aria-hidden /></a>
              </div>
            </article>)}
          </div>}
        </PublicProfileSection>}
        {(persona.voiceActorContributors || []).length > 0 && (
          <div className="mt-4 flex justify-end border-t border-border/50 pt-3">
            <button type="button" onClick={() => setHistoryOpen(true)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              修改紀錄
            </button>
          </div>
        )}
      </PublicProfileContainer>
    </main>
    <PublicFooter />
    {historyOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="voice-actor-history-title">
        <button type="button" aria-label="關閉修改紀錄" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
        <section className="relative z-10 max-h-[min(80vh,36rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-background p-4 shadow-2xl sm:p-5">
          <header className="mb-4 flex items-center justify-between gap-3 border-b border-border/70 pb-3">
            <h2 id="voice-actor-history-title" className="text-lg font-semibold">修改紀錄</h2>
            <button type="button" aria-label="關閉修改紀錄" onClick={() => setHistoryOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" aria-hidden /></button>
          </header>
          <ol className="space-y-2">
            {(persona.voiceActorContributors || []).map((contributor, index) => (
              <li key={`${contributor.name}-${contributor.contributedAt || index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
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

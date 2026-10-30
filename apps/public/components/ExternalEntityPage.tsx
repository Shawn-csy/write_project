"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { ExternalEntityKind } from "@/lib/externalEntity";
import { socialAvatarUrl } from "@/lib/externalEntity";
import type { ExternalPublicScript } from "@/lib/types";
import { ExternalPublicScriptCard } from "./ExternalPublicScriptSection";
import { GalleryHoverPreviewProvider } from "@write/public-ui";
import { LinkifiedText } from "./LinkifiedText";
import { publicApiUrl } from "@/lib/publicApiUrl";
import { externalCoverSrc } from "@/lib/externalCover";
import { liveApi } from "@/lib/liveApi";

type LinkItem = { label: string; url: string };
type OrganizationItem = { name: string; url: string; description: string };
type WorkItem = { title: string; role: string; url: string; coverUrl: string; description: string };

interface Props {
  kind: ExternalEntityKind;
  name: string;
  bio?: string;
  profileUrl?: string;
  profileAvatarUrl?: string;
  authorKey?: string;
  externalAuthorId?: string;
  supplement?: NonNullable<ExternalPublicScript["authorSupplement"]>;
  contributors?: NonNullable<ExternalPublicScript["authorContributors"]>;
  items: ExternalPublicScript[];
}

export function ExternalEntityPage({ kind, name, bio, profileUrl, profileAvatarUrl, authorKey, externalAuthorId, supplement, contributors = [], items }: Props) {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio || "");
  const [avatar, setAvatar] = useState(profileAvatarUrl || "");
  const [draftProfileUrl, setDraftProfileUrl] = useState(profileUrl || "");
  const [website, setWebsite] = useState(supplement?.website || "");
  const [links, setLinks] = useState<LinkItem[]>(supplement?.links?.length ? supplement.links.map((link) => ({ label: link.label || "", url: link.url || "" })) : [{ label: "", url: "" }]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>(supplement?.organizations?.length ? supplement.organizations.map((org) => ({ name: org.name || "", url: org.url || "", description: org.description || "" })) : []);
  const [works, setWorks] = useState<WorkItem[]>(supplement?.works?.length ? supplement.works.map((work) => ({ title: work.title || "", role: work.role || "", url: work.url || "", coverUrl: work.coverUrl || "", description: work.description || "" })) : []);
  const [contributorName, setContributorName] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const avatarUrl = profileAvatarUrl
    || (items[0] && (kind === "author" ? items[0].authorAvatarUrl : items[0].organizationAvatarUrl))
    || socialAvatarUrl(profileUrl);
  const isAuthor = kind === "author";
  const approvedLinks = supplement?.links || [];
  const approvedOrganizations = supplement?.organizations || [];
  const approvedWorks = supplement?.works || [];
  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true); setError(""); setNotice("");
    try {
      const response = await liveApi.write("/api/external-author-profile-submissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalAuthorId, authorKey: authorKey || name.normalize("NFKC").trim().toLocaleLowerCase(), displayName, submitterName, contactEmail, contributorName,
          bio: draftBio, avatar, profileUrl: draftProfileUrl, website,
          links: links.filter((item) => item.label.trim() || item.url.trim()),
          organizations: organizations.filter((item) => item.name.trim()),
          works: works.filter((item) => item.title.trim()), websiteTrap: "",
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "送出失敗，請確認欄位後重試。");
      }
      setNotice("已送交管理員審核，核准後會更新公開作者頁。");
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送出失敗，請稍後重試。");
    } finally { setSubmitting(false); }
  };
  const seriesGroups = Array.from(
    items.reduce((groups, item) => {
      const seriesName = item.seriesName?.trim();
      if (!seriesName) return groups;
      const key = seriesName.toLocaleLowerCase();
      const group = groups.get(key) || { name: seriesName, items: [] as ExternalPublicScript[] };
      group.items.push(item);
      groups.set(key, group);
      return groups;
    }, new Map<string, { name: string; items: ExternalPublicScript[] }>()).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));

  return (
    <main className="min-h-screen bg-background">
      <div className="relative h-40 overflow-hidden bg-gradient-to-r from-slate-950 via-slate-800 to-primary/30 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,hsl(var(--primary)/0.28),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
      </div>

      <div className="w-full px-3 pb-20 sm:px-5 lg:px-8">
        <section className="relative -mt-14 mb-8 rounded-xl border border-border/60 bg-background p-5 shadow-sm sm:-mt-16 sm:p-8">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className={`${isAuthor ? "rounded-full" : "rounded-xl"} relative h-24 w-24 shrink-0 overflow-hidden border-4 border-background bg-muted shadow sm:h-32 sm:w-32`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">{name.slice(0, 1)}</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="break-words font-serif text-3xl font-bold">{name}</h1>
              <LinkifiedText
                text={bio || "收錄於本站的外部公開台本作品"}
                className="whitespace-pre-line text-sm leading-6 text-muted-foreground"
              />
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{items.length} 部作品</span>
                {profileUrl && (
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {socialAvatarUrl(profileUrl) ? "𝕏 / Twitter" : "連結"}
                  </a>
                )}
              </div>
              {isAuthor && <button type="button" onClick={() => { setNotice(""); setEditing((value) => !value); }} className="mt-1 rounded-md border border-primary/40 px-3 py-1.5 text-xs text-primary hover:bg-primary/10">{editing ? "取消補充" : "補充／更新作者資料"}</button>}
            </div>
          </div>
          {isAuthor && contributors.length > 0 && <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">資料協力者：{contributors.map((item) => item.name).filter(Boolean).join("、")}</p>}
          {notice && <p role="status" className="mt-4 rounded-md border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-300">{notice}</p>}
        </section>

        {isAuthor && editing && <form onSubmit={submitProfile} className="mb-8 space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4 sm:p-6">
          <div><h2 className="text-lg font-semibold">補充／更新作者資料</h2><p className="mt-1 text-xs text-muted-foreground">可一次更新個人介紹、社群、團體與作品。送出後由管理員審核。</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">公開名稱<input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
            <label className="space-y-1 text-xs">頭像圖片網址<input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://… 或 /media/…" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
            <label className="space-y-1 text-xs sm:col-span-2">個人介紹<textarea value={draftBio} onChange={(e) => setDraftBio(e.target.value)} rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></label>
            <label className="space-y-1 text-xs">作者頁／社群主連結<input value={draftProfileUrl} onChange={(e) => setDraftProfileUrl(e.target.value)} placeholder="https://…" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
            <label className="space-y-1 text-xs">個人網站<input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm" /></label>
          </div>
          <section className="space-y-2 rounded-lg border border-border/60 p-3"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">社群連結</h3><button type="button" onClick={() => setLinks((list) => [...list, { label: "", url: "" }])} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="h-3.5 w-3.5"/>新增連結</button></div>{links.map((item, index) => <div key={index} className="flex gap-2"><input aria-label="社群名稱" placeholder="平台／名稱" value={item.label} onChange={(e) => setLinks((list) => list.map((row, i) => i === index ? { ...row, label: e.target.value } : row))} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"/><input aria-label="社群網址" placeholder="https://…" value={item.url} onChange={(e) => setLinks((list) => list.map((row, i) => i === index ? { ...row, url: e.target.value } : row))} className="h-9 min-w-0 flex-[2] rounded-md border border-border bg-background px-3 text-sm"/><button type="button" aria-label="刪除連結" onClick={() => setLinks((list) => list.filter((_, i) => i !== index))} className="px-2 text-muted-foreground"><Trash2 className="h-4 w-4"/></button></div>)}</section>
          <section className="space-y-2 rounded-lg border border-border/60 p-3"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">所屬團體</h3><button type="button" onClick={() => setOrganizations((list) => [...list, { name: "", url: "", description: "" }])} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="h-3.5 w-3.5"/>新增團體</button></div>{organizations.map((item, index) => <div key={index} className="grid gap-2 rounded-md bg-muted/20 p-2 sm:grid-cols-3"><input placeholder="團體名稱" value={item.name} onChange={(e) => setOrganizations((list) => list.map((row, i) => i === index ? { ...row, name: e.target.value } : row))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"/><input placeholder="團體連結" value={item.url} onChange={(e) => setOrganizations((list) => list.map((row, i) => i === index ? { ...row, url: e.target.value } : row))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"/><div className="flex gap-2"><input placeholder="簡介（選填）" value={item.description} onChange={(e) => setOrganizations((list) => list.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"/><button type="button" onClick={() => setOrganizations((list) => list.filter((_, i) => i !== index))} className="px-2 text-muted-foreground"><Trash2 className="h-4 w-4"/></button></div></div>)}</section>
          <section className="space-y-2 rounded-lg border border-border/60 p-3"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">作品</h3><button type="button" onClick={() => setWorks((list) => [...list, { title: "", role: "", url: "", coverUrl: "", description: "" }])} className="inline-flex items-center gap-1 text-xs text-primary"><Plus className="h-3.5 w-3.5"/>新增作品</button></div>{works.map((item, index) => <div key={index} className="grid gap-2 rounded-md bg-muted/20 p-2 sm:grid-cols-2"><input placeholder="作品名稱" value={item.title} onChange={(e) => setWorks((list) => list.map((row, i) => i === index ? { ...row, title: e.target.value } : row))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"/><input placeholder="參與角色／職務" value={item.role} onChange={(e) => setWorks((list) => list.map((row, i) => i === index ? { ...row, role: e.target.value } : row))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"/><input placeholder="作品連結" value={item.url} onChange={(e) => setWorks((list) => list.map((row, i) => i === index ? { ...row, url: e.target.value } : row))} className="h-9 rounded-md border border-border bg-background px-3 text-sm"/><div className="flex gap-2"><input placeholder="封面圖片網址" value={item.coverUrl} onChange={(e) => setWorks((list) => list.map((row, i) => i === index ? { ...row, coverUrl: e.target.value } : row))} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"/><button type="button" onClick={() => setWorks((list) => list.filter((_, i) => i !== index))} className="px-2 text-muted-foreground"><Trash2 className="h-4 w-4"/></button></div><textarea placeholder="作品說明（選填）" value={item.description} onChange={(e) => setWorks((list) => list.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} rows={2} className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2"/></div>)}</section>
          <div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1 text-xs">資料補充者公開名稱<input required value={contributorName} onChange={(e) => setContributorName(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"/></label><label className="space-y-1 text-xs">聯絡姓名（不公開）<input required value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"/></label><label className="space-y-1 text-xs">聯絡 Email（不公開）<input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"/></label></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-3 py-2 text-sm">取消</button><button disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60">{submitting ? "送出中…" : "送交審核"}</button></div>
        </form>}

        {isAuthor && (approvedLinks.length > 0 || approvedOrganizations.length > 0 || approvedWorks.length > 0 || contributors.length > 0) && <section className="mb-8 space-y-5 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
          {approvedLinks.length > 0 && <div><h2 className="mb-2 font-semibold">社群連結</h2><div className="flex flex-wrap gap-3">{approvedLinks.map((link, index) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{link.label || link.url}</a>)}</div></div>}
          {approvedOrganizations.length > 0 && <div><h2 className="mb-2 font-semibold">所屬團體</h2><div className="grid gap-2 sm:grid-cols-2">{approvedOrganizations.map((org, index) => <article key={`${org.name}-${index}`} className="rounded-lg border border-border/60 bg-background/60 p-3"><strong className="text-sm">{org.name}</strong>{org.description && <p className="mt-1 text-xs text-muted-foreground">{org.description}</p>}{org.url && <a href={org.url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-xs text-primary hover:underline">{org.url}</a>}</article>)}</div></div>}
          {approvedWorks.length > 0 && <div><h2 className="mb-2 font-semibold">其他作品</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{approvedWorks.map((work, index) => <article key={`${work.title}-${index}`} className="overflow-hidden rounded-lg border border-border/60 bg-background/60">{work.coverUrl && <img src={publicApiUrl(work.coverUrl)} alt="" className="aspect-video w-full object-cover" loading="lazy"/>}<div className="p-3"><strong className="text-sm">{work.title}</strong>{work.role && <p className="mt-1 text-xs text-muted-foreground">{work.role}</p>}{work.description && <p className="mt-1 text-xs text-muted-foreground">{work.description}</p>}{work.url && <a href={work.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">查看作品</a>}</div></article>)}</div></div>}
        </section>}

        {seriesGroups.length > 0 && (
          <section className="mb-8 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="text-xl font-bold">系列作品</h2>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{seriesGroups.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {seriesGroups.map((series) => {
                const cover = series.items.find((item) => item.coverUrl);
                return (
                  <Link key={series.name} href={`/series/${encodeURIComponent(series.name)}`} className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 p-3 no-underline transition-colors hover:border-primary/50 hover:bg-background">
                    <div className="h-16 w-11 shrink-0 overflow-hidden rounded border bg-muted">
                      {cover ? <img src={publicApiUrl(externalCoverSrc(cover) ?? "")} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center p-1 text-center text-[9px] text-muted-foreground">{series.name}</div>}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-2 text-sm font-medium group-hover:text-primary">{series.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{series.items.length} 部作品</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xl font-bold">公開作品</h2>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
          </div>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">目前沒有公開作品</p>
          ) : (
            <GalleryHoverPreviewProvider>
              <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                {items.map((item) => <ExternalPublicScriptCard key={item.id} item={item} variant="standard" />)}
              </div>
            </GalleryHoverPreviewProvider>
          )}
        </section>
      </div>
    </main>
  );
}

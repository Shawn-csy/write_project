"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { liveApi } from "@/lib/liveApi";
import type { ProductionResource } from "../ResourcesClient";

type Link = { label: string; url: string };
type Work = { title: string; url: string; coverUrl: string; workType: string; creditRole: ProductionResource["categories"][number] };
const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70";

export function ResourceContributionForm({ item, onClose, onSubmitted }: {
  item: ProductionResource;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [displayName, setDisplayName] = useState(item.name);
  const [bio, setBio] = useState(item.bio || item.summary || "");
  const [avatarUrl, setAvatarUrl] = useState(item.avatarUrl || "");
  const [profileUrl, setProfileUrl] = useState(item.profileUrl || "");
  const [profileLabel, setProfileLabel] = useState(item.profileLabel || "");
  const [links, setLinks] = useState<Link[]>(item.links || []);
  const [works, setWorks] = useState<Work[]>([]);
  const [contributorName, setContributorName] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (works.some((work) => !work.url.trim() && (work.title.trim() || work.coverUrl.trim()))) {
        throw new Error("已填寫的參與作品都需要作品網址。");
      }
      if (works.some((work) => work.url.trim() && !work.title.trim())) {
        throw new Error("請填寫每部參與作品的名稱。");
      }
      if (links.some((link) => !link.url.trim() && link.label.trim())) {
        throw new Error("已填寫名稱的連結需要網址。");
      }
      const response = await liveApi.write("/api/production-resource-profile-submissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: item.id, displayName, bio, avatarUrl, profileUrl, profileLabel,
          links: links.filter((link) => link.url.trim()), works: works.filter((work) => work.url.trim()),
          contributorName, submitterName, contactEmail, websiteTrap: "" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "送出失敗，請稍後再試。");
      }
      onSubmitted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送出失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-4 rounded-xl border border-border/70 bg-background p-4 sm:p-5" aria-label="補充或更新資源資料">
    <div className="border-b border-border/60 pb-3"><h2 className="font-semibold">補充／更新資源頁</h2><p className="mt-1 text-xs text-muted-foreground">可補充介紹、頭像、聯絡方式及參與作品；送出後由管理員審核，核准後才會更新公開頁面。</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs text-muted-foreground">公開名稱<input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">頭像圖片網址<input maxLength={2000} value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" className={inputClass} /></label>
      <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">介紹<textarea rows={3} maxLength={4000} value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
      <label className="space-y-1 text-xs text-muted-foreground">個人／委託頁網址<input value={profileUrl} onChange={(event) => setProfileUrl(event.target.value)} placeholder="https://…" className={inputClass} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">連結名稱<input maxLength={120} value={profileLabel} onChange={(event) => setProfileLabel(event.target.value)} placeholder="官方網站、X、委託頁…" className={inputClass} /></label>
    </div>
    <section className="space-y-2 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">其他社群與聯絡連結</h3><button type="button" disabled={links.length >= 30} onClick={() => setLinks([...links, { label: "", url: "" }])} className="inline-flex items-center gap-1 text-xs text-primary disabled:opacity-50"><Plus className="h-3.5 w-3.5" />新增連結</button></div>
      {links.map((link, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_32px] gap-2"><input aria-label={`連結名稱 ${index + 1}`} value={link.label} onChange={(event) => setLinks(links.map((value, i) => i === index ? { ...value, label: event.target.value } : value))} placeholder="名稱" className={inputClass} /><input aria-label={`連結網址 ${index + 1}`} value={link.url} onChange={(event) => setLinks(links.map((value, i) => i === index ? { ...value, url: event.target.value } : value))} placeholder="https://…" className={inputClass} /><button type="button" aria-label="移除連結" onClick={() => setLinks(links.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-destructive"><Trash2 className="mx-auto h-4 w-4" /></button></div>)}
    </section>
    <section className="space-y-2 rounded-lg border border-border/60 p-3">
      <div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">補充參與作品</h3><p className="text-xs text-muted-foreground">可補充音聲、遊戲、影片等作品，審核通過後會顯示在資源頁。</p></div><button type="button" disabled={works.length >= 30} onClick={() => setWorks([...works, { title: "", url: "", coverUrl: "", workType: "audio", creditRole: item.categories.find((category) => category !== "voice_actor") || "post_production" }])} className="inline-flex shrink-0 items-center gap-1 text-xs text-primary disabled:opacity-50"><Plus className="h-3.5 w-3.5" />新增作品</button></div>
      {works.map((work, index) => <div key={index} className="grid gap-2 rounded-md border border-border/50 p-2 sm:grid-cols-2">
        <input aria-label={`作品名稱 ${index + 1}`} value={work.title} onChange={(event) => setWorks(works.map((value, i) => i === index ? { ...value, title: event.target.value } : value))} placeholder="作品名稱" className={inputClass} />
        <input aria-label={`作品網址 ${index + 1}`} type="url" value={work.url} onChange={(event) => setWorks(works.map((value, i) => i === index ? { ...value, url: event.target.value } : value))} placeholder="作品網址" className={inputClass} />
        <select aria-label={`作品類型 ${index + 1}`} value={work.workType} onChange={(event) => setWorks(works.map((value, i) => i === index ? { ...value, workType: event.target.value } : value))} className={inputClass}><option value="audio">音聲</option><option value="game">遊戲</option><option value="video">影片</option><option value="other">其他</option></select>
        <select aria-label={`製作類別 ${index + 1}`} value={work.creditRole} onChange={(event) => setWorks(works.map((value, i) => i === index ? { ...value, creditRole: event.target.value as Work["creditRole"] } : value))} className={inputClass}>{item.categories.filter((category) => category !== "voice_actor").map((category) => <option key={category} value={category}>{category === "post_production" ? "後製" : category === "cover_art" ? "封面" : "錄音室"}</option>)}</select>
        <input aria-label={`作品封面網址 ${index + 1}`} type="url" value={work.coverUrl} onChange={(event) => setWorks(works.map((value, i) => i === index ? { ...value, coverUrl: event.target.value } : value))} placeholder="封面圖片網址（選填）" className={inputClass} />
        <button type="button" aria-label="移除作品" onClick={() => setWorks(works.filter((_, i) => i !== index))} className="justify-self-end text-muted-foreground hover:text-destructive"><Trash2 className="mx-auto h-4 w-4" /></button>
      </div>)}
    </section>
    <section className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs text-muted-foreground">資料補充者名稱（公開顯示）<input required maxLength={120} value={contributorName} onChange={(event) => setContributorName(event.target.value)} className={inputClass} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">聯絡姓名（不公開）<input required maxLength={120} value={submitterName} onChange={(event) => setSubmitterName(event.target.value)} className={inputClass} /></label>
      <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">聯絡 Email（不公開）<input required type="email" maxLength={320} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className={inputClass} /></label>
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm">取消編輯</button><button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60">{busy ? "送出中…" : "送交審核"}</button></div>
  </form>;
}

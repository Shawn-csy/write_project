"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, BriefcaseBusiness, Clapperboard, Link2, Plus, Trash2, UserRound } from "lucide-react";
import { PublicImage } from "@/components/PublicImage";
import { liveApi } from "@/lib/liveApi";
import type { ProductionRole, PublicPersona } from "@/lib/types";
import { ROLE_LABELS, type ProfileFormKind } from "./identityRoles";

/**
 * One edit form for every identity. The shared fields (name, avatar, bio,
 * website, links) are always present; each data kind adds its own block:
 * voice actors list groups and appearances, production people add credited works.
 * Every kind goes to the same moderated submission endpoint.
 */

const KIND_LABELS: Record<ProfileFormKind, string> = { author: "作者資料", voice_actor: "聲演資料", production: "製作資料" };
const WORK_TYPES = [
  { value: "audio", label: "音聲" },
  { value: "game", label: "遊戲" },
  { value: "video", label: "影片" },
  { value: "other", label: "其他" },
] as const;

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70";
const areaClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/70";

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

type ProductionWorkDraft = { title: string; url: string; creditRole: ProductionRole; workType: string; coverUrl: string };

function createForm(persona: PublicPersona, productionRoles: ProductionRole[]) {
  const links = parseLinks(persona.links);
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
    links: links.map((link) => ({ label: link.label || "", url: link.url || "" })).concat(links.length ? [] : [{ label: "", url: "" }]),
    organizations: organizations.map((item) => ({ name: item.name || "", url: item.url || "" })).concat(organizations.length ? [] : [{ name: "", url: "" }]),
    works: works.map((item) => ({ title: item.title || "", role: item.role || "", url: item.url || "", coverUrl: item.coverUrl || "" })).concat(works.length ? [] : [{ title: "", role: "", url: "", coverUrl: "" }]),
    productionWorks: [{ title: "", url: "", creditRole: productionRoles[0] ?? "post_production", workType: "audio", coverUrl: "" }] as ProductionWorkDraft[],
  };
}

interface Props {
  persona: PublicPersona;
  /** The merged identity shown on the page, used if the live profile cannot be read. */
  fallback: PublicPersona;
  kinds: ProfileFormKind[];
  productionRoles: ProductionRole[];
  onCancel: () => void;
  onSubmitted: (message: string) => void;
}

export function IdentityProfileForm({ persona, fallback, kinds, productionRoles, onCancel, onSubmitted }: Props) {
  const [kind, setKind] = useState<ProfileFormKind>(kinds[0]);
  const [form, setForm] = useState(() => createForm(fallback, productionRoles));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    liveApi.readJson<PublicPersona>(`/api/public-personas/${encodeURIComponent(persona.id)}`)
      .then(({ data }) => { if (active) setForm(createForm(data, productionRoles)); })
      .catch((cause) => console.warn("Could not refresh the public profile before editing", cause));
    return () => { active = false; };
  }, [persona.id, productionRoles]);

  const needsContributor = kind !== "author";
  const reviewer = kind === "voice_actor" && persona.voiceActorClaimed ? "本人" : "管理員";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const links = form.links.filter((item) => item.label.trim() || item.url.trim()).map((item) => ({ label: item.label.trim(), url: item.url.trim() }));
      const organizations = kind === "voice_actor" ? form.organizations.filter((item) => item.name.trim() || item.url.trim()).map((item) => ({ name: item.name.trim(), url: item.url.trim() })) : [];
      const works = kind === "voice_actor"
        ? form.works.filter((item) => item.title.trim() || item.role.trim() || item.url.trim() || item.coverUrl.trim()).map((item) => ({ title: item.title.trim(), role: item.role.trim(), url: item.url.trim(), coverUrl: item.coverUrl.trim() }))
        : kind === "production"
          ? form.productionWorks.filter((item) => item.title.trim() || item.url.trim()).map((item) => ({ ...item, title: item.title.trim(), url: item.url.trim(), coverUrl: item.coverUrl.trim() }))
          : [];
      const response = await liveApi.write("/api/voice-actor-profile-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id, profileKind: kind,
          displayName: form.displayName, submitterName: form.submitterName, contactEmail: form.contactEmail,
          contributorName: needsContributor ? form.contributorName : "",
          bio: form.bio, avatar: form.avatar, website: form.website, links, organizations, works,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "送出失敗，請稍後再試。");
      }
      onSubmitted(`${KIND_LABELS[kind]}已送交審核；核准後才會更新公開頁面。謝謝你協助補充資料。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送出失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-0 w-full max-w-5xl space-y-3 rounded-xl border border-border/70 bg-background p-3 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h2 className="font-semibold">更新資料</h2>
          <p className="mt-1 text-xs text-muted-foreground">可更新公開名稱、頭像、個人介紹、網站與社群連結；{KIND_LABELS[kind]}送出後由{reviewer}審核，核准後更新公開頁。</p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 [font-size:var(--public-font-caption)] text-primary">更新公開資料</span>
      </div>
      {kinds.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">資料類型</span>
          {kinds.map((value) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={`rounded-full border px-2.5 py-1 ${kind === value ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{KIND_LABELS[value]}</button>
          ))}
        </div>
      )}

      <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 items-center gap-3 sm:block">
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-2xl font-semibold text-muted-foreground sm:h-28 sm:w-28">
              {form.avatar ? <img src={form.avatar} alt="頭像預覽" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (form.displayName.trim()[0] || <UserRound className="h-8 w-8" />)}
            </div>
            <label className="block min-w-0 flex-1 space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground sm:mt-2 sm:w-40">頭像圖片網址<input maxLength={2000} value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="貼上圖片網址" className={`${inputClass} mt-1 h-8 px-2 text-xs`} /></label>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">公開名稱<input required maxLength={120} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="輸入你想顯示的名稱" className="h-11 w-full rounded-md border border-transparent bg-transparent px-2 text-2xl font-bold font-serif text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-border focus:border-primary focus:bg-background sm:text-3xl" /></label>
            <label className="block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">個人介紹<textarea rows={3} maxLength={4000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="輸入想放在個人頁上的介紹…" className={`${areaClass} min-h-24 resize-y bg-background/70`} /></label>
            <label className="block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">個人網站<input maxLength={2000} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" className={inputClass} /></label>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5 text-xs font-medium"><Link2 className="h-3.5 w-3.5 text-primary" />社群連結</div><button type="button" onClick={() => setForm({ ...form, links: [...form.links, { label: "", url: "" }] })} className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增連結</button></div>
              {form.links.map((link, index) => <div key={`social-${index}`} className="grid grid-cols-[minmax(80px,0.55fr)_minmax(0,1fr)_32px] gap-1.5"><input aria-label={`社群名稱 ${index + 1}`} value={link.label} onChange={(e) => setForm({ ...form, links: form.links.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} placeholder="平台／名稱" className={`${inputClass} h-8 px-2 text-xs`} /><input aria-label={`社群網址 ${index + 1}`} value={link.url} onChange={(e) => setForm({ ...form, links: form.links.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} placeholder="貼上連結" className={`${inputClass} h-8 px-2 text-xs`} /><button type="button" aria-label="移除社群連結" onClick={() => setForm({ ...form, links: form.links.filter((_, i) => i !== index) })} className="inline-flex h-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
            </div>
          </div>
        </div>
      </section>

      {kind === "voice_actor" && <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />所屬團體</h3><p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">會以團體卡片顯示在你的公開頁。</p></div><button type="button" onClick={() => setForm({ ...form, organizations: [...form.organizations, { name: "", url: "" }] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增團體</button></div>
        <div className="grid gap-2 sm:grid-cols-2">{form.organizations.map((org, index) => <div key={`org-${index}`} className="rounded-lg border border-border/60 bg-background p-2.5"><div className="flex gap-2"><input aria-label={`團體名稱 ${index + 1}`} value={org.name} onChange={(e) => setForm({ ...form, organizations: form.organizations.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} placeholder="團體名稱" className={`${inputClass} min-w-0 font-medium`} /><button type="button" aria-label="移除團體" onClick={() => setForm({ ...form, organizations: form.organizations.filter((_, i) => i !== index) })} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div><input aria-label={`團體網址 ${index + 1}`} value={org.url} onChange={(e) => setForm({ ...form, organizations: form.organizations.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} placeholder="團體網站或社群（選填）" className={`${inputClass} mt-2 h-8 border-transparent bg-transparent px-1 text-xs`} /></div>)}</div>
      </section>}

      {kind === "voice_actor" && <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><BriefcaseBusiness className="h-4 w-4 text-primary" />參演作品</h3><p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">作品會以清單卡片顯示在你的公開頁。</p></div><button type="button" onClick={() => setForm({ ...form, works: [...form.works, { title: "", role: "", url: "", coverUrl: "" }] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增作品</button></div>
        <div className="grid gap-2 sm:grid-cols-2">{form.works.map((work, index) => <div key={`work-${index}`} className="overflow-hidden rounded-lg border border-border/60 bg-background">
          {work.coverUrl && <div className="relative aspect-video overflow-hidden bg-muted"><PublicImage src={work.coverUrl} alt={`${work.title || "作品"}封面預覽`} preset="script-cover" /></div>}
          <div className="p-3"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><input aria-label={`作品名稱 ${index + 1}`} value={work.title} onChange={(e) => setForm({ ...form, works: form.works.map((item, i) => i === index ? { ...item, title: e.target.value } : item) })} placeholder="作品／台本名稱" className={`${inputClass} border-transparent bg-transparent px-1 font-semibold`} /><input aria-label={`參演角色 ${index + 1}`} value={work.role} onChange={(e) => setForm({ ...form, works: form.works.map((item, i) => i === index ? { ...item, role: e.target.value } : item) })} placeholder="參演角色或補充（選填）" className={`${inputClass} mt-1 h-8 border-transparent bg-transparent px-1 text-xs`} /></div><button type="button" aria-label="移除參演作品" onClick={() => setForm({ ...form, works: form.works.filter((_, i) => i !== index) })} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div><input aria-label={`作品網址 ${index + 1}`} value={work.url} onChange={(e) => setForm({ ...form, works: form.works.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} placeholder="作品連結（選填）" className={`${inputClass} mt-2 h-8 border-transparent bg-transparent px-1 text-xs`} /><label className="mt-2 block space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">封面圖片網址<input type="text" inputMode="url" aria-label={`封面圖片網址 ${index + 1}`} value={work.coverUrl} onChange={(e) => setForm({ ...form, works: form.works.map((item, i) => i === index ? { ...item, coverUrl: e.target.value } : item) })} placeholder="https://… 或 /media/…" className={`${inputClass} h-8 px-2 text-xs`} /></label></div>
        </div>)}</div>
      </section>}

      {kind === "production" && <section className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="flex items-center gap-2 text-sm font-semibold"><Clapperboard className="h-4 w-4 text-primary" />新增參與作品</h3><p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">核准後加入公開頁；已收錄的作品不必重填。</p></div><button type="button" onClick={() => setForm({ ...form, productionWorks: [...form.productionWorks, { title: "", url: "", creditRole: productionRoles[0], workType: "audio", coverUrl: "" }] })} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-xs hover:bg-muted"><Plus className="h-3.5 w-3.5" />新增作品</button></div>
        <div className="grid gap-2 sm:grid-cols-2">{form.productionWorks.map((work, index) => {
          const update = (patch: Partial<ProductionWorkDraft>) => setForm({ ...form, productionWorks: form.productionWorks.map((item, i) => i === index ? { ...item, ...patch } : item) });
          return <div key={`production-${index}`} className="space-y-2 rounded-lg border border-border/60 bg-background p-3">
            <div className="flex items-start gap-2"><input aria-label={`參與作品名稱 ${index + 1}`} value={work.title} onChange={(e) => update({ title: e.target.value })} placeholder="作品名稱" className={`${inputClass} min-w-0 font-semibold`} /><button type="button" aria-label="移除參與作品" onClick={() => setForm({ ...form, productionWorks: form.productionWorks.filter((_, i) => i !== index) })} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
            <input aria-label={`參與作品網址 ${index + 1}`} value={work.url} onChange={(e) => update({ url: e.target.value })} placeholder="作品連結" className={`${inputClass} h-8 text-xs`} />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">負責項目<select aria-label={`負責項目 ${index + 1}`} value={work.creditRole} onChange={(e) => update({ creditRole: e.target.value as ProductionRole })} className={`${inputClass} h-8 px-2 text-xs`}>{productionRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
              <label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">作品類型<select aria-label={`作品類型 ${index + 1}`} value={work.workType} onChange={(e) => update({ workType: e.target.value })} className={`${inputClass} h-8 px-2 text-xs`}>{WORK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
            </div>
            <input aria-label={`參與作品封面網址 ${index + 1}`} value={work.coverUrl} onChange={(e) => update({ coverUrl: e.target.value })} placeholder="封面圖片網址（選填）" className={`${inputClass} h-8 text-xs`} />
          </div>;
        })}</div>
      </section>}

      <section className="rounded-lg border border-border/60 p-3">
        <h3 className="mb-2 text-xs font-semibold">資料補充者與審核聯絡方式</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {needsContributor && <label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">資料補充者名稱（公開顯示）<input required maxLength={120} value={form.contributorName} onChange={(e) => setForm({ ...form, contributorName: e.target.value })} placeholder="輸入公開署名或暱稱" className={inputClass} /><span className="block [font-size:var(--public-font-caption)]">核准後會和核准時間一起列在修改紀錄。</span></label>}
          <label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground">聯絡姓名（不公開）<input required maxLength={120} value={form.submitterName} onChange={(e) => setForm({ ...form, submitterName: e.target.value })} className={inputClass} /></label>
          <label className="space-y-1 [font-size:var(--public-font-caption)] text-muted-foreground sm:col-span-2">聯絡 Email（不公開）<input required type="email" maxLength={320} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className={inputClass} /></label>
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-xs text-muted-foreground">送出後提案會進入審核，核准前不會公開變更。</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-sm">取消編輯</button>
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-60">{busy ? "送出中…" : "送交審核"}</button>
        </div>
      </div>
    </form>
  );
}

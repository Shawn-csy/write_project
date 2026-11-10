import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getVoiceActorProfileSubmissionsAdmin, updateVoiceActorProfileSubmissionAdmin } from "../../lib/api/admin";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { VoiceActorProfileSubmission } from "../../types/api";

type Status = "all" | "pending" | "approved" | "rejected";
type FieldKey = "displayName" | "bio" | "avatar" | "website" | "links" | "organizations" | "works" | "contributorName";
type SectionKey = "profile" | "organizations" | "works" | "contributors";
type PageVersion = "current" | "proposal";
const fieldLabels: Record<FieldKey, string> = {
  displayName: "公開名稱", bio: "個人介紹", avatar: "頭像圖片", website: "個人網站",
  links: "社群連結", organizations: "所屬團體", works: "參演作品", contributorName: "公開協力者名稱",
};
const sectionConfig: Array<{ key: SectionKey; label: string; fields: FieldKey[] }> = [
  { key: "profile", label: "個人頁首與介紹", fields: ["displayName", "bio", "avatar", "website", "links"] },
  { key: "organizations", label: "所屬團體", fields: ["organizations"] },
  { key: "works", label: "參演作品", fields: ["works"] },
  { key: "contributors", label: "資料協力者", fields: ["contributorName"] },
];
const fieldKeys = Object.keys(fieldLabels) as FieldKey[];

function getChangedFields(item: VoiceActorProfileSubmission): FieldKey[] {
  const before = item.currentProfile || {};
  const after = item.profile || {};
  return fieldKeys.filter((key) => {
    if (key === "contributorName") return Boolean(item.contributorName || after.contributorName);
    return JSON.stringify(before[key] ?? (["links", "organizations", "works"].includes(key) ? [] : "")) !==
      JSON.stringify(after[key] ?? (["links", "organizations", "works"].includes(key) ? [] : ""));
  });
}

function PagePreview({ item, version }: { item: VoiceActorProfileSubmission; version: PageVersion }): React.JSX.Element {
  const profile = version === "proposal" ? item.profile : item.currentProfile || {};
  const links = Array.isArray(profile.links) ? profile.links : [];
  const organizations = Array.isArray(profile.organizations) ? profile.organizations : [];
  const works = Array.isArray(profile.works) ? profile.works : [];
  const collaborators = [...(item.collaborators || [])];
  const pendingContributor = version === "proposal" ? (item.contributorName || item.profile.contributorName || "").trim() : "";
  if (pendingContributor && !collaborators.some((person) => person.name?.toLocaleLowerCase() === pendingContributor.toLocaleLowerCase())) {
    collaborators.push({ name: pendingContributor });
  }
  const displayName = profile.displayName || item.personaName;
  const avatar = profile.avatar || "";

  return <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
    <div className="h-20 bg-gradient-to-r from-slate-900 via-slate-800 to-primary/30 sm:h-28" />
    <div className="px-4 pb-5 sm:px-6">
      <div className="-mt-9 flex items-end gap-3 sm:-mt-11 sm:gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted text-2xl font-semibold text-muted-foreground sm:h-24 sm:w-24">
          {avatar ? <img src={avatar} alt={`${displayName}頭像`} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : displayName.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1 pb-1"><h2 className="truncate text-2xl font-bold font-serif sm:text-3xl">{displayName}</h2><span className="mt-1 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">聲演</span></div>
      </div>
      {profile.bio && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{profile.bio}</p>}
      {(profile.website || links.length > 0) && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {profile.website && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={profile.website} target="_blank" rel="noopener noreferrer">個人網站<ExternalLink className="h-3 w-3" /></a>}
        {links.map((link, index) => <a key={`${link.label}-${index}`} className="inline-flex items-center gap-1 text-primary hover:underline" href={link.url} target="_blank" rel="noopener noreferrer">{link.label || "社群連結"}<ExternalLink className="h-3 w-3" /></a>)}
      </div>}
      {organizations.length > 0 && <section className="mt-6 border-t border-border/70 pt-4"><div className="mb-2 flex items-center gap-2"><h3 className="font-semibold">所屬團體</h3><Badge variant="secondary" className="text-[10px]">{organizations.length}</Badge></div><div className="grid gap-2 sm:grid-cols-2">{organizations.map((org, index) => <div key={`${org.name}-${index}`} className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-sm font-medium">{org.name || "未命名團體"}</p>{org.url && <a className="mt-1 inline-flex items-center gap-1 break-all text-xs text-primary hover:underline" href={org.url} target="_blank" rel="noopener noreferrer">{org.url}<ExternalLink className="h-3 w-3 shrink-0" /></a>}</div>)}</div></section>}
      {works.length > 0 && <section className="mt-6 border-t border-border/70 pt-4"><div className="mb-2 flex items-center gap-2"><h3 className="font-semibold">參演作品</h3><Badge variant="secondary" className="text-[10px]">{works.length}</Badge></div><div className="grid gap-3 sm:grid-cols-2">{works.map((work, index) => <article key={`${work.title}-${index}`} className="overflow-hidden rounded-lg border border-border/70 bg-muted/10">{work.coverUrl && <img src={work.coverUrl} alt={`${work.title || "參演作品"}封面`} className="aspect-video w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />}<div className="p-3"><h4 className="text-sm font-semibold">{work.title || "未命名作品"}</h4>{work.role && <p className="mt-1 text-xs text-muted-foreground">角色：{work.role}</p>}{work.description && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{work.description}</p>}{work.url && <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={work.url} target="_blank" rel="noopener noreferrer">查看作品<ExternalLink className="h-3 w-3" /></a>}</div></article>)}</div></section>}
      {collaborators.length > 0 && <section className="mt-6 border-t border-border/70 pt-4"><h3 className="font-semibold">資料協力者</h3><div className="mt-2 flex flex-wrap gap-2">{collaborators.map((person, index) => <span key={`${person.name}-${index}`} className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs">{person.name}</span>)}</div></section>}
      {!profile.bio && !profile.website && !links.length && !organizations.length && !works.length && !collaborators.length && <p className="mt-5 rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">這個頁面目前還沒有補充其他資料。</p>}
    </div>
  </div>;
}

export function VoiceActorProfileReviewInbox(): React.JSX.Element {
  const [items, setItems] = useState<VoiceActorProfileSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageVersions, setPageVersions] = useState<Record<string, PageVersion>>({});
  const [selectedFields, setSelectedFields] = useState<Record<string, FieldKey[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (q: string, nextStatus: Status) => {
    setLoading(true);
    setError("");
    try {
      const result = await getVoiceActorProfileSubmissionsAdmin({ q, status: nextStatus, limit: 100, offset: 0 });
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (cause) {
      console.error("Failed to load voice actor profile submissions", cause);
      setError("讀取聲演資料審核失敗，請確認管理員權限後重試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load("", "pending"); }, [load]);

  const review = async (item: VoiceActorProfileSubmission, nextStatus: "approved" | "rejected", accepted: FieldKey[] = []) => {
    setBusyId(item.id);
    setError("");
    try {
      const updated = await updateVoiceActorProfileSubmissionAdmin(item.id, nextStatus, accepted);
      notifyAdminQueueUpdated();
      if (status === "pending") {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setTotal((current) => Math.max(0, current - 1));
        setOpenId(null);
      } else {
        setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
      }
    } catch (cause) {
      console.error("Failed to review voice actor profile submission", cause);
      setError("更新審核結果失敗，請稍後再試。");
    } finally {
      setBusyId(null);
    }
  };

  const toggleOpen = (item: VoiceActorProfileSubmission) => {
    const next = openId === item.id ? null : item.id;
    setOpenId(next);
    if (next && selectedFields[next] === undefined) setSelectedFields((current) => ({ ...current, [next]: getChangedFields(item) }));
  };

  return <div className="space-y-3">
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"><h2 className="text-sm font-semibold">聲演頁面補充審核</h2><p className="mt-1 text-xs text-muted-foreground">打開申請即可預覽整張聲演頁；可切換目前頁面與提案版本，再選擇要採用的頁面區塊。</p></div>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input className="h-8 text-sm" placeholder="搜尋聲演、申請人或 Email" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(query, status); }} />
      <select aria-label="審核狀態" className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={status} onChange={(e) => { const next = e.target.value as Status; setStatus(next); void load(query, next); }}>
        <option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option>
      </select>
      <Button variant="outline" size="sm" className="h-8" disabled={loading} onClick={() => void load(query, status)}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新整理</Button>
      <span className="shrink-0 text-xs text-muted-foreground">共 {total} 筆</span>
    </div>
    {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
    {!loading && !error && items.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">目前沒有符合的聲演資料申請。</div>}
    <div className="space-y-2">{items.map((item) => {
      const changed = getChangedFields(item);
      const selected = selectedFields[item.id] ?? changed;
      const isOpen = openId === item.id;
      const version = pageVersions[item.id] || "proposal";
      return <article key={item.id} className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex min-w-0 flex-wrap items-center gap-2"><Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}</Badge><strong>{item.personaName}</strong><span className="text-xs text-muted-foreground">{item.submitterName}</span><span className="text-xs text-muted-foreground">{changed.map((key) => fieldLabels[key]).join("、") || "沒有資料變更"}</span></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="h-8" onClick={() => toggleOpen(item)} aria-expanded={isOpen}>{isOpen ? "收合預覽" : "檢視內容"}</Button>{item.status === "pending" && <Button size="sm" className="h-8" disabled={busyId === item.id || selected.length === 0} onClick={() => void review(item, "approved", selected)}>{busyId === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}核准變更</Button>}</div></div>
        {item.contributorName && <p className="mt-2 text-xs text-muted-foreground">本次提案的公開協力者：<strong className="text-foreground">{item.contributorName}</strong></p>}
        {(item.collaborators || []).length > 0 && <p className="mt-1 text-xs text-muted-foreground">既有協力者：{item.collaborators!.map((contributor) => contributor.name).filter(Boolean).join("、")}</p>}
        {item.acceptedFields?.length && item.status !== "pending" ? <p className="mt-1 text-xs text-muted-foreground">已套用：{item.acceptedFields.map((key) => fieldLabels[key as FieldKey] || key).join("、")}</p> : null}
        {isOpen && <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-semibold">整頁預覽</h3><p className="text-xs text-muted-foreground">頁面上的內容依所選版本完整呈現。</p></div><div className="flex rounded-md border border-border p-0.5"><Button size="sm" variant={version === "current" ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setPageVersions((current) => ({ ...current, [item.id]: "current" }))}>目前公開頁</Button><Button size="sm" variant={version === "proposal" ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setPageVersions((current) => ({ ...current, [item.id]: "proposal" }))}>本次提案</Button></div></div>
          {item.status === "pending" && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{sectionConfig.map((section) => {
            const sectionChanges = section.fields.filter((field) => changed.includes(field));
            const checked = sectionChanges.length > 0 && sectionChanges.every((field) => selected.includes(field));
            return <label key={section.key} className={`flex min-h-10 items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${sectionChanges.length ? "cursor-pointer border-primary/30 bg-primary/5" : "cursor-not-allowed border-border/60 opacity-60"}`}><input type="checkbox" disabled={!sectionChanges.length} checked={checked} onChange={(event) => setSelectedFields((current) => {
              const existing = current[item.id] ?? changed;
              const nextFields = event.target.checked ? [...new Set([...existing, ...sectionChanges])] : existing.filter((field) => !sectionChanges.includes(field));
              return { ...current, [item.id]: nextFields };
            })} className="accent-primary" /><span className="min-w-0 flex-1 font-medium">{section.label}</span><Badge variant={sectionChanges.length ? "outline" : "secondary"} className="text-[9px]">{sectionChanges.length ? "有更新" : "未變更"}</Badge></label>;
          })}</div>}
          <PagePreview item={item} version={version} />
          {item.status === "pending" && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3"><p className="text-xs text-muted-foreground">將套用 {selected.length} 個欄位，未選取的頁面區塊會保留目前資料。</p><div className="flex gap-2"><Button size="sm" className="h-8" disabled={busyId === item.id || selected.length === 0} onClick={() => void review(item, "approved", selected)}>{busyId === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}核准所選區塊</Button><Button size="sm" variant="outline" className="h-8" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>退回整份提案</Button></div></div>}
        </div>}
      </article>;
    })}</div>
  </div>;
}

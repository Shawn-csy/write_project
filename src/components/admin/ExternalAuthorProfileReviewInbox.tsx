import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getExternalAuthorProfileSubmissionsAdmin, updateExternalAuthorProfileSubmissionAdmin } from "../../lib/api/admin";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { ExternalAuthorProfileSubmission } from "../../types/api";

type Status = "all" | "pending" | "approved" | "rejected";
const fields = ["displayName", "bio", "avatar", "profileUrl", "website", "links", "organizations", "works", "contributorName"] as const;
type Field = typeof fields[number];
const labels: Record<Field, string> = { displayName: "公開名稱", bio: "作者介紹", avatar: "頭像", profileUrl: "主要社群", website: "個人網站", links: "社群連結", organizations: "所屬團體", works: "其他作品", contributorName: "資料協力者" };

function changedFields(item: ExternalAuthorProfileSubmission): Field[] {
  return fields.filter((field) => JSON.stringify(item.currentProfile?.[field] ?? "") !== JSON.stringify(item.profile?.[field] ?? ""));
}

function ProfilePage({ item, proposal }: { item: ExternalAuthorProfileSubmission; proposal: boolean }) {
  const profile = (proposal ? item.profile : item.currentProfile || {}) as Record<string, any>;
  const links = Array.isArray(profile.links) ? profile.links : [];
  const organizations = Array.isArray(profile.organizations) ? profile.organizations : [];
  const works = Array.isArray(profile.works) ? profile.works : [];
  const name = String(profile.displayName || item.authorName || "外部作者");
  return <div className="overflow-hidden rounded-xl border bg-background">
    <div className="h-24 bg-gradient-to-r from-slate-950 via-slate-800 to-primary/30" />
    <div className="px-5 pb-5"><div className="-mt-10 flex items-end gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted text-2xl font-semibold">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1)}</div><div className="min-w-0 pb-2"><h3 className="truncate font-serif text-2xl font-bold">{name}</h3><Badge variant="outline">台本師</Badge></div></div>
      {profile.bio && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{profile.bio}</p>}
      {(profile.profileUrl || profile.website || links.length) && <div className="mt-3 flex flex-wrap gap-3 text-xs">{profile.profileUrl && <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="text-primary">主要社群 <ExternalLink className="inline h-3 w-3" /></a>}{profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="text-primary">個人網站 <ExternalLink className="inline h-3 w-3" /></a>}{links.map((link: any, index: number) => <a key={index} href={link.url} target="_blank" rel="noreferrer" className="text-primary">{link.label || "社群"}</a>)}</div>}
      {organizations.length > 0 && <section className="mt-5 border-t pt-4"><h4 className="font-semibold">所屬團體</h4><div className="mt-2 grid gap-2 sm:grid-cols-2">{organizations.map((org: any, index: number) => <div key={index} className="rounded-lg border p-3 text-sm"><strong>{org.name}</strong>{org.description && <p className="mt-1 text-xs text-muted-foreground">{org.description}</p>}</div>)}</div></section>}
      {works.length > 0 && <section className="mt-5 border-t pt-4"><h4 className="font-semibold">其他作品</h4><div className="mt-2 grid gap-2 sm:grid-cols-2">{works.map((work: any, index: number) => <div key={index} className="overflow-hidden rounded-lg border">{work.coverUrl && <img src={work.coverUrl} alt="" className="aspect-video w-full object-cover" />}<div className="p-3 text-sm"><strong>{work.title}</strong>{work.role && <p className="text-xs text-muted-foreground">{work.role}</p>}</div></div>)}</div></section>}
      {proposal && profile.contributorName && <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">本次資料協力者：{String(profile.contributorName)}</p>}
    </div>
  </div>;
}

export function ExternalAuthorProfileReviewInbox(): React.JSX.Element {
  const [items, setItems] = useState<ExternalAuthorProfileSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState("");
  const [proposal, setProposal] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, Field[]>>({});
  const [error, setError] = useState("");
  const load = useCallback(async (q = query, nextStatus = status) => { setLoading(true); setError(""); try { const result = await getExternalAuthorProfileSubmissionsAdmin({ q, status: nextStatus }); setItems(result.items || []); setTotal(result.total || 0); } catch { setError("讀取外部作者資料審核失敗。"); } finally { setLoading(false); } }, [query, status]);
  useEffect(() => { void load("", "pending"); }, []);
  const review = async (item: ExternalAuthorProfileSubmission, next: "approved" | "rejected") => { setBusy(item.id); setError(""); try { await updateExternalAuthorProfileSubmissionAdmin(item.id, next, selected[item.id] || changedFields(item)); notifyAdminQueueUpdated(); await load(); setOpen(""); } catch { setError("更新審核結果失敗，請稍後再試。"); } finally { setBusy(""); } };
  return <div className="space-y-3">
    <div className="rounded-lg border px-3 py-2"><h2 className="text-sm font-semibold">外部台本師頁面審核</h2><p className="mt-1 text-xs text-muted-foreground">以完整公開頁預覽目前資料與提案；可按欄位採用，核准後直接更新作者頁。</p></div>
    <div className="flex flex-col gap-2 sm:flex-row"><Input className="h-8" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} placeholder="搜尋作者、申請人或 Email"/><select value={status} onChange={(e) => { const next = e.target.value as Status; setStatus(next); void load(query, next); }} className="h-8 rounded-md border bg-background px-2 text-xs"><option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option></select><Button variant="outline" size="sm" className="h-8" onClick={() => void load()}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5"/>}重新整理</Button><span className="self-center text-xs text-muted-foreground">共 {total} 筆</span></div>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
    {!loading && !items.length && <p className="py-8 text-center text-sm text-muted-foreground">目前沒有符合的外部作者資料申請。</p>}
    {items.map((item) => { const changed = changedFields(item); const chosen = selected[item.id] || changed; const isOpen = open === item.id; return <article key={item.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Badge>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}</Badge><strong>{item.authorName}</strong><span className="text-xs text-muted-foreground">申請人：{item.submitterName} · {item.contactEmail}</span></div><Button variant="outline" size="sm" className="h-7" onClick={() => { setOpen(isOpen ? "" : item.id); if (!selected[item.id]) setSelected((state) => ({ ...state, [item.id]: changed })); }}>{isOpen ? "收合" : "開啟頁面審核"}</Button></div>{isOpen && <div className="mt-3 space-y-3 border-t pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2">{changed.map((field) => <label key={field} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"><input type="checkbox" checked={chosen.includes(field)} onChange={(e) => setSelected((state) => ({ ...state, [item.id]: e.target.checked ? [...new Set([...chosen, field])] : chosen.filter((value) => value !== field) }))}/>{labels[field]}</label>)}</div><div className="flex rounded-md border p-0.5"><Button size="sm" variant={!proposal[item.id] ? "secondary" : "ghost"} className="h-7" onClick={() => setProposal((state) => ({ ...state, [item.id]: false }))}>目前頁面</Button><Button size="sm" variant={proposal[item.id] !== false ? "secondary" : "ghost"} className="h-7" onClick={() => setProposal((state) => ({ ...state, [item.id]: true }))}>本次提案</Button></div></div><ProfilePage item={item} proposal={proposal[item.id] !== false}/>{item.status === "pending" && <div className="flex justify-end gap-2"><Button variant="outline" size="sm" disabled={busy === item.id} onClick={() => void review(item, "rejected")}>退回</Button><Button size="sm" disabled={busy === item.id || !chosen.length} onClick={() => void review(item, "approved")}>{busy === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}核准所選欄位</Button></div>}</div>}</article>; })}
  </div>;
}

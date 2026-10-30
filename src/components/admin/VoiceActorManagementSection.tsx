import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw, Search, UserRound, Eye, EyeOff } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { getVoiceActorsAdmin, updateVoiceActorAdmin } from "../../lib/api/admin";
import type { AdminVoiceActor } from "../../types/api";

type Visibility = "all" | "visible" | "hidden";

export function VoiceActorManagementSection(): React.JSX.Element {
  const [items, setItems] = useState<AdminVoiceActor[]>([]);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [editing, setEditing] = useState<AdminVoiceActor | null>(null);
  const [form, setForm] = useState({ displayName: "", bio: "", avatar: "", website: "", socialUrl: "", socialLabel: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (search = appliedQuery) => {
    setIsLoading(true);
    setError("");
    try { setItems(await getVoiceActorsAdmin(search)); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "載入聲演資料失敗。"); }
    finally { setIsLoading(false); }
  }, [appliedQuery]);

  useEffect(() => { void load(""); }, []);

  const visibleItems = useMemo(() => items.filter((item) => visibility === "all" || (visibility === "hidden") === item.voiceActorHidden), [items, visibility]);
  const visibleCount = items.filter((item) => !item.voiceActorHidden).length;
  const hiddenCount = items.length - visibleCount;

  const beginEdit = (item: AdminVoiceActor) => {
    const links = Array.isArray(item.links) ? item.links : [];
    const social = links.find((link) => /^https:\/\//i.test(String(link.url || "")));
    setEditing(item);
    setForm({ displayName: item.displayName || "", bio: item.bio || "", avatar: item.avatar || "", website: item.website || "", socialUrl: String(social?.url || ""), socialLabel: String(social?.label || "社群") });
    setError("");
    setNotice("");
  };

  const save = async () => {
    if (!editing) return;
    setBusyId(editing.id);
    setError("");
    const links = Array.isArray(editing.links) ? editing.links.filter((link) => link.url !== (Array.isArray(editing.links) ? editing.links.find((item) => /^https:\/\//i.test(String(item.url || "")) )?.url : "")) : [];
    if (form.socialUrl.trim()) links.push({ url: form.socialUrl.trim(), label: form.socialLabel.trim() || "社群" });
    try {
      const updated = await updateVoiceActorAdmin(editing.id, { displayName: form.displayName, bio: form.bio, avatar: form.avatar, website: form.website, links, voiceActorHidden: editing.voiceActorHidden });
      setItems((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setNotice("聲演身份資料已更新；若此人同時是台本師，公開身份頁也會同步更新。");
      setEditing(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "儲存聲演資料失敗。"); }
    finally { setBusyId(""); }
  };

  const toggleVisibility = async (item: AdminVoiceActor) => {
    setBusyId(item.id);
    setError("");
    try {
      const updated = await updateVoiceActorAdmin(item.id, { displayName: item.displayName || "", bio: item.bio || "", avatar: item.avatar || "", website: item.website || "", links: Array.isArray(item.links) ? item.links : [], voiceActorHidden: !item.voiceActorHidden });
      setItems((current) => current.map((entry) => entry.id === updated.id ? { ...entry, ...updated } : entry));
      setNotice(updated.voiceActorHidden ? `已從公開聲演名錄隱藏「${updated.displayName}」。作者身份與作品不受影響。` : `已將「${updated.displayName}」恢復到公開聲演名錄。`);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "更新公開狀態失敗。"); }
    finally { setBusyId(""); }
  };

  const search = () => {
    const next = query.trim();
    setAppliedQuery(next);
    void load(next);
  };

  return <section className="space-y-4">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold">聲演管理</h2><p className="mt-1 text-xs text-muted-foreground">集中管理自填聲演身份，以及本站／外部台本 Demo 帶入的聲演。若同時是台本師，編輯會同步到共用身份頁。</p></div><Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void load()} disabled={isLoading}>{isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新載入</Button></header>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">{notice}</p>}
    <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-border/70 bg-background p-3"><p className="text-[11px] text-muted-foreground">身份總數</p><p className="mt-1 text-xl font-semibold">{items.length}</p></div><div className="rounded-lg border border-border/70 bg-background p-3"><p className="text-[11px] text-muted-foreground">公開名錄</p><p className="mt-1 text-xl font-semibold">{visibleCount}</p></div><div className="rounded-lg border border-border/70 bg-background p-3"><p className="text-[11px] text-muted-foreground">已隱藏</p><p className="mt-1 text-xl font-semibold">{hiddenCount}</p></div></div>
    <div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") search(); }} placeholder="搜尋聲演、身份 ID 或 owner" aria-label="搜尋聲演" /></div><select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} aria-label="公開狀態"><option value="all">全部狀態</option><option value="visible">公開中</option><option value="hidden">已隱藏</option></select><Button type="button" variant="outline" size="sm" className="h-9" onClick={search} disabled={isLoading}>搜尋</Button></div>
    {isLoading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div> : visibleItems.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{items.length ? "沒有符合此狀態的聲演。" : "目前沒有聲演身份或公開 Demo 關聯身份。"}</div> : <div className="grid gap-2 lg:grid-cols-2">{visibleItems.map((item) => <article key={item.id} className="flex min-w-0 gap-3 rounded-xl border border-border/70 bg-background p-3"><div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">{item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-muted-foreground" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="max-w-full truncate text-sm font-semibold">{item.displayName || "未命名聲演"}</h3>{item.voiceActorHidden && <Badge variant="secondary">已隱藏</Badge>}{item.scriptCount > 0 && <Badge variant="outline">兼台本師</Badge>}</div><p className="mt-0.5 truncate text-[10px] text-muted-foreground">owner：{item.ownerName || "未認領"} · {item.id}</p><div className="mt-1 flex flex-wrap gap-1">{item.sourceTypes.map((source) => <Badge key={source} variant="outline" className="text-[9px]">{source}</Badge>)}<Badge variant="secondary" className="text-[9px]">本站 Demo {item.internalDemoCount}</Badge><Badge variant="secondary" className="text-[9px]">外部 Demo {item.externalDemoCount}</Badge></div>{item.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.bio}</p>}</div><div className="flex shrink-0 items-start gap-1"><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="編輯聲演" onClick={() => beginEdit(item)}><Pencil className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={item.voiceActorHidden ? "恢復公開" : "從聲演名錄隱藏"} disabled={busyId === item.id} onClick={() => void toggleVisibility(item)}>{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : item.voiceActorHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button></div></article>)}</div>}
    <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>編輯聲演身份</DialogTitle><DialogDescription>{editing?.ownerName ? `owner：${editing.ownerName}` : "此身份尚未認領"} · 共用作者身份資料</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs">顯示名稱<Input maxLength={120} value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} /></label><label className="grid gap-1 text-xs">頭像網址<Input value={form.avatar} onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))} placeholder="https://… 或 /media/…" /></label><label className="grid gap-1 text-xs sm:col-span-2">個人介紹<Textarea rows={4} maxLength={4000} value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} /></label><label className="grid gap-1 text-xs">個人網站<Input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://…" /></label><label className="grid gap-1 text-xs">社群名稱<Input value={form.socialLabel} onChange={(event) => setForm((current) => ({ ...current, socialLabel: event.target.value }))} /></label><label className="grid gap-1 text-xs sm:col-span-2">社群連結<Input value={form.socialUrl} onChange={(event) => setForm((current) => ({ ...current, socialUrl: event.target.value }))} placeholder="https://…" /></label></div>{error && <p role="alert" className="text-xs text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>取消</Button><Button type="button" onClick={() => void save()} disabled={busyId === editing?.id}>{busyId === editing?.id && <Loader2 className="h-4 w-4 animate-spin" />}儲存變更</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

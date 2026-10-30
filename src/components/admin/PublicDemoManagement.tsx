import React, { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createAllDemoAdmin, createVoiceActorAdmin, deleteAllDemoAdmin, getAllDemoTargetsAdmin, getAllDemosAdmin, getVoiceActorsAdmin, updateAllDemoAdmin } from "../../lib/api/admin";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { AdminDemoMutationPayload, AdminDemoRecord, AdminDemoTarget, AdminVoiceActor } from "../../types/api";

type DemoStatus = "all" | "pending" | "approved" | "rejected";
type Draft = Omit<AdminDemoMutationPayload, "status"> & { status: "pending" | "approved" | "rejected" };
const PAGE_SIZE = 100;

const emptyDraft: Draft = { sourceKind: "internal", demoName: "", demoUrl: "", coverUrl: "", cast: "", voiceTypes: [], voiceActorIds: [], description: "", status: "approved" };
const statusLabel = (status: string) => status === "pending" ? "未公開／待審核" : status === "rejected" ? "已退回" : "已公開";
const sourceLabel = (source: AdminDemoRecord["sourceKind"]) => source === "submission" ? "投稿 Demo" : source === "external" ? "外部台本" : "本站台本";
const formatDate = (value: number) => value ? new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function PublicDemoManagement(): React.JSX.Element {
  const [items, setItems] = useState<AdminDemoRecord[]>([]);
  const [targets, setTargets] = useState<AdminDemoTarget[]>([]);
  const [voiceActors, setVoiceActors] = useState<AdminVoiceActor[]>([]);
  const [actorQuery, setActorQuery] = useState("");
  const [isCreatingActor, setIsCreatingActor] = useState(false);
  const [showCreateActorInput, setShowCreateActorInput] = useState(false);
  const [newActorName, setNewActorName] = useState("");
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState<DemoStatus>("all");
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AdminDemoRecord | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async (search: string, filter: DemoStatus, nextOffset: number) => {
    setIsLoading(true); setError("");
    try {
      const result = await getAllDemosAdmin({ q: search, status: filter, limit: PAGE_SIZE, offset: nextOffset });
      setItems(result.items || []); setTotal(result.total || 0); setOffset(nextOffset);
    } catch (loadError) {
      console.error("Failed to load all demo records", loadError); setItems([]); setTotal(0);
      setError("讀取全站 Demo 失敗，請確認管理員權限後重試。");
    } finally { setIsLoading(false); }
  }, []);

  const loadTargets = useCallback(async () => {
    try { setTargets(await getAllDemoTargetsAdmin()); }
    catch (targetError) { console.error("Failed to load demo targets", targetError); }
  }, []);

  const loadVoiceActors = useCallback(async () => {
    try { setVoiceActors(await getVoiceActorsAdmin()); }
    catch (actorError) { console.error("Failed to load voice actor identities", actorError); }
  }, []);

  useEffect(() => { void load("", "all", 0); void loadTargets(); void loadVoiceActors(); }, [load, loadTargets, loadVoiceActors]);

  const beginCreate = () => {
    const first = targets[0];
    setEditing(null);
    setDraft({ ...emptyDraft, ...(first ? { sourceKind: first.sourceKind, parentId: first.id, scriptTitle: first.title, scriptUrl: first.sourceKind === "external" ? first.id : `/read/${first.id}` } : {}) });
    setShowForm(true); setError("");
  };

  const beginEdit = (item: AdminDemoRecord) => {
    setEditing(item);
    setDraft({ sourceKind: item.sourceKind, parentId: item.parentId || undefined, scriptTitle: item.scriptTitle, scriptUrl: item.scriptUrl, demoName: item.demoName, demoUrl: item.demoUrl, coverUrl: item.coverUrl, cast: item.cast, voiceTypes: item.voiceTypes || [], voiceActorIds: item.voiceActorIds || [], description: item.description, displayName: item.displayName, contactEmail: item.contactEmail, status: item.status as Draft["status"] });
    setShowForm(true); setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.demoUrl.trim()) { setError("請填寫 Demo 公開連結。"); return; }
    if (draft.sourceKind !== "submission" && !draft.parentId) { setError("請先選擇對應台本。"); return; }
    setBusyId(editing?.id || "new"); setError("");
    try {
      const payload: AdminDemoMutationPayload = { ...draft, demoName: draft.demoName.trim(), demoUrl: draft.demoUrl.trim(), coverUrl: draft.coverUrl?.trim() || "", cast: draft.cast?.trim() || "", description: draft.description?.trim() || "" };
      if (editing) await updateAllDemoAdmin(editing, payload); else await createAllDemoAdmin(payload);
      notifyAdminQueueUpdated(); setShowForm(false); setEditing(null); await load(appliedQuery, status, offset); await loadTargets();
    } catch (saveError) {
      console.error("Failed to save demo", saveError); setError(saveError instanceof Error ? `儲存 Demo 失敗：${saveError.message}` : "儲存 Demo 失敗，請確認連結與台本來源後重試。");
    } finally { setBusyId(null); }
  };

  const remove = async (item: AdminDemoRecord) => {
    if (!window.confirm(`確定刪除「${item.demoName || item.scriptTitle || "此 Demo"}」？這會從其所屬台本或投稿記錄中移除。`)) return;
    setBusyId(item.id); setError("");
    try {
      await deleteAllDemoAdmin(item); notifyAdminQueueUpdated();
      const nextOffset = items.length === 1 && offset > 0 ? Math.max(0, offset - PAGE_SIZE) : offset;
      await load(appliedQuery, status, nextOffset);
    } catch (deleteError) { console.error("Failed to delete demo", deleteError); setError("刪除 Demo 失敗，請稍後再試。"); }
    finally { setBusyId(null); }
  };

  const submitSearch = () => { setAppliedQuery(query.trim()); void load(query.trim(), status, 0); };
  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const filteredVoiceActors = voiceActors.filter((actor) => `${actor.displayName} ${actor.ownerName || ""}`.toLocaleLowerCase().includes(actorQuery.trim().toLocaleLowerCase())).slice(0, 8);
  const toggleVoiceActor = (id: string) => updateDraft("voiceActorIds", draft.voiceActorIds?.includes(id) ? draft.voiceActorIds.filter((item) => item !== id) : [...(draft.voiceActorIds || []), id]);
  const createAndAddVoiceActor = async (name = actorQuery) => {
    const displayName = name.trim();
    if (!displayName) return;
    setIsCreatingActor(true); setError("");
    try {
      const actor = await createVoiceActorAdmin(displayName);
      setVoiceActors((current) => [...current.filter((item) => item.id !== actor.id), actor]);
      setDraft((current) => ({ ...current, voiceActorIds: [...new Set([...(current.voiceActorIds || []), actor.id])] }));
      setActorQuery("");
      setNewActorName("");
      setShowCreateActorInput(false);
    } catch (createError) {
      console.error("Failed to create voice actor identity", createError);
      setError(createError instanceof Error ? createError.message : "建立聲演身份失敗，請稍後再試。");
    } finally { setIsCreatingActor(false); }
  };

  return <div className="space-y-3">
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background px-3 py-3 sm:flex-row sm:items-center sm:px-4">
      <Input className="h-9 min-w-0 flex-1 text-sm" placeholder="搜尋台本、Demo、聲演或投稿者" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} />
      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={status} onChange={(event) => { const next = event.target.value as DemoStatus; setStatus(next); void load(appliedQuery, next, 0); }} aria-label="Demo 狀態">
        <option value="all">全部狀態</option><option value="pending">待審核／未公開</option><option value="approved">已公開</option><option value="rejected">已退回</option>
      </select>
      <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={submitSearch} disabled={isLoading}>{isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}搜尋</Button>
      <Button size="sm" className="h-9 shrink-0" onClick={beginCreate} disabled={!targets.length}><Plus className="h-3.5 w-3.5" />新增 Demo</Button>
      <span className="shrink-0 text-xs text-muted-foreground">共 {total} 筆</span>
    </div>

    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">清單包含投稿 Demo、本站台本內的 Demo 連結，以及外部台本的 Demo 連結；編輯或刪除會同步寫回所屬台本。</div>
    {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}

    {showForm && <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-xl border border-primary/40 bg-background p-3 sm:p-4">
      <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">{editing ? "編輯 Demo" : "新增 Demo"}</h3><p className="text-xs text-muted-foreground">{editing ? "儲存後會更新所屬台本的 Demo 資料。" : "新增內容會直接加入所選台本的 Demo 清單。"}</p></div><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForm(false)} aria-label="關閉"><X className="h-4 w-4" /></Button></div>
      {draft.sourceKind === "submission" ? <div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1 text-xs">台本名稱<Input className="h-8" value={draft.scriptTitle || ""} onChange={(event) => updateDraft("scriptTitle", event.target.value)} /></label><label className="space-y-1 text-xs">台本連結<Input className="h-8" value={draft.scriptUrl || ""} onChange={(event) => updateDraft("scriptUrl", event.target.value)} /></label><label className="space-y-1 text-xs">公開署名<Input className="h-8" value={draft.displayName || ""} onChange={(event) => updateDraft("displayName", event.target.value)} /></label><label className="space-y-1 text-xs">聯絡 Email<Input className="h-8" value={draft.contactEmail || ""} onChange={(event) => updateDraft("contactEmail", event.target.value)} /></label><label className="space-y-1 text-xs">審核狀態<select className="h-8 w-full rounded-md border border-input bg-background px-2" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as Draft["status"])}><option value="pending">待審核</option><option value="approved">已公開</option><option value="rejected">已退回</option></select></label></div> : <label className="block space-y-1 text-xs">對應台本<select className="h-9 w-full rounded-md border border-input bg-background px-2" value={`${draft.sourceKind}:${draft.parentId || ""}`} disabled={!!editing} onChange={(event) => { const [sourceKind, parentId] = event.target.value.split(":"); const target = targets.find((entry) => entry.id === parentId && entry.sourceKind === sourceKind); updateDraft("sourceKind", sourceKind as Draft["sourceKind"]); updateDraft("parentId", parentId); updateDraft("scriptTitle", target?.title || ""); updateDraft("scriptUrl", target?.sourceKind === "external" ? target.id : `/read/${target?.id || ""}`); }}><option value="">選擇台本</option>{targets.map((target) => <option key={`${target.sourceKind}:${target.id}`} value={`${target.sourceKind}:${target.id}`}>[{target.sourceKind === "external" ? "外部" : "本站"}] {target.title}{target.authorName ? ` · ${target.authorName}` : ""}</option>)}</select></label>}
      <div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1 text-xs">Demo 名稱<Input className="h-8" value={draft.demoName} onChange={(event) => updateDraft("demoName", event.target.value)} /></label><label className="space-y-1 text-xs">Demo 公開連結<Input className="h-8" type="url" required placeholder="https://…" value={draft.demoUrl} onChange={(event) => updateDraft("demoUrl", event.target.value)} /></label><label className="space-y-1 text-xs sm:col-span-2">封面連結<Input className="h-8" type="url" placeholder="https://…" value={draft.coverUrl || ""} onChange={(event) => updateDraft("coverUrl", event.target.value)} /></label></div>
      <section className="space-y-2 rounded-lg border border-border/70 p-3"><div className="flex items-start justify-between gap-2"><div><h4 className="text-xs font-medium">聲演身份</h4><p className="text-[11px] text-muted-foreground">可複選現有身份，或新增聲演身份並加入這筆 Demo。</p></div><Button type="button" size="sm" variant="outline" className="h-7 shrink-0" onClick={() => setShowCreateActorInput((current) => !current)}><Plus className="h-3.5 w-3.5" />新增聲演</Button></div>{showCreateActorInput && <div className="flex gap-2"><Input autoFocus className="h-8 min-w-0 text-xs" value={newActorName} onChange={(event) => setNewActorName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createAndAddVoiceActor(newActorName); } }} placeholder="輸入聲演名稱" /><Button type="button" size="sm" className="h-8 shrink-0" onClick={() => void createAndAddVoiceActor(newActorName)} disabled={!newActorName.trim() || isCreatingActor}>{isCreatingActor ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}建立並加入</Button></div>}{draft.voiceActorIds?.length ? <div className="flex flex-wrap gap-1.5">{draft.voiceActorIds.map((id) => { const actor = voiceActors.find((item) => item.id === id); return <button type="button" key={id} onClick={() => toggleVoiceActor(id)} className="inline-flex h-7 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 text-xs">{actor?.displayName || id}<X className="h-3 w-3" /></button>; })}</div> : <p className="text-xs text-muted-foreground">尚未選擇聲演</p>}<div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" value={actorQuery} onChange={(event) => setActorQuery(event.target.value)} placeholder="搜尋聲演身份" /></div><div className="grid gap-1 sm:grid-cols-2">{filteredVoiceActors.map((actor) => { const selected = draft.voiceActorIds?.includes(actor.id) || false; return <button type="button" key={actor.id} aria-pressed={selected} onClick={() => toggleVoiceActor(actor.id)} className={`flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs ${selected ? "border-primary/50 bg-primary/10" : "border-border/60 hover:bg-muted/50"}`}><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border">{selected && <Check className="h-3 w-3" />}</span><span className="truncate">{actor.displayName || "未命名聲演"}</span>{actor.voiceActorHidden && <Badge variant="secondary" className="text-[9px]">已隱藏</Badge>}<span className="ml-auto truncate text-[10px] text-muted-foreground">{actor.ownerName || "未認領"}</span></button>; })}{actorQuery.trim() && filteredVoiceActors.length === 0 && <div className="text-xs text-muted-foreground">沒有符合的聲演身份，可按「新增聲演」建立。</div>}{filteredVoiceActors.length === 0 && !actorQuery.trim() && <p className="text-xs text-muted-foreground">目前沒有可選聲演。</p>}</div><label className="block space-y-1 text-xs text-muted-foreground">角色名稱／演出補充<input className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={draft.cast || ""} onChange={(event) => updateDraft("cast", event.target.value)} placeholder="可填角色名稱或補充演出資訊" /></label></section>
      <label className="block space-y-1 text-xs">簡介<textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={draft.description || ""} onChange={(event) => updateDraft("description", event.target.value)} /></label>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>取消</Button><Button type="submit" size="sm" disabled={busyId !== null}>{busyId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}{editing ? "儲存修改" : "新增 Demo"}</Button></div>
    </form>}

    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">目前沒有符合的 Demo。</div> : <div className="space-y-1.5">{items.map((item) => <article key={`${item.sourceKind}:${item.parentId}:${item.id}`} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/60 p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{item.demoName || item.scriptTitle || "演出 Demo"}</h3><Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>{statusLabel(item.status)}</Badge><Badge variant="outline">{sourceLabel(item.sourceKind)}</Badge></div><p className="mt-1 truncate text-xs text-muted-foreground">台本：{item.scriptTitle} · {item.voiceActorIds?.map((id) => voiceActors.find((actor) => actor.id === id)?.displayName).filter(Boolean).join("、") || item.voiceActorNames?.join("、") || item.cast || item.displayName || "未標示聲演"}</p><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>投稿：{item.displayName || "台本連結"}</span><span>{formatDate(item.createdAt)}</span>{item.voiceTypes?.length > 0 && <span>{item.voiceTypes.map((type) => type === "male" ? "男聲演" : "女聲演").join("、")}</span>}</div>{item.description && <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{item.description}</p>}<a href={item.demoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">開啟 Demo <ExternalLink className="h-3 w-3" /></a></div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-start"><Button type="button" variant="outline" size="sm" className="h-8" disabled={busyId === item.id} onClick={() => beginEdit(item)}>編輯</Button><Button type="button" variant="destructive" size="icon" className="h-8 w-8" aria-label="刪除 Demo" disabled={busyId === item.id} onClick={() => void remove(item)}>{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div>
    </article>)}</div>}
    {total > PAGE_SIZE && <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>顯示 {offset + 1}–{Math.min(offset + items.length, total)} / {total}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="h-8" disabled={offset === 0 || isLoading} onClick={() => void load(appliedQuery, status, Math.max(0, offset - PAGE_SIZE))}>上一頁</Button><Button type="button" variant="outline" size="sm" className="h-8" disabled={offset + PAGE_SIZE >= total || isLoading} onClick={() => void load(appliedQuery, status, offset + PAGE_SIZE)}>下一頁</Button></div></div>}
  </div>;
}

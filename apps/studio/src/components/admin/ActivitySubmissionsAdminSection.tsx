import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { deleteActivitySubmissionAdmin, getActivityPagesAdmin, getActivitySubmissionsAdmin, updateActivitySubmissionAdmin } from "../../lib/api/admin";
import type { ActivityPage, ActivitySubmissionRecord } from "../../types/api";

function formatDate(value: number): string {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export function ActivitySubmissionsAdminSection(): React.JSX.Element {
  const [pages, setPages] = useState<ActivityPage[]>([]);
  const [pageId, setPageId] = useState("");
  const [items, setItems] = useState<ActivitySubmissionRecord[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActivitySubmissionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadPages = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getActivityPagesAdmin();
      setPages(result);
      const nextId = result.some((page) => page.id === pageId) ? pageId : result[0]?.id || "";
      setPageId(nextId);
      setItems(nextId ? await getActivitySubmissionsAdmin(nextId) : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "載入活動徵件失敗。");
    } finally {
      setIsLoading(false);
    }
  }, [pageId]);

  useEffect(() => { void loadPages(); }, []);

  const changePage = async (nextId: string) => {
    setPageId(nextId);
    setItems([]);
    setEditing(null);
    setDraft(null);
    setIsLoading(true);
    setError("");
    try { setItems(nextId ? await getActivitySubmissionsAdmin(nextId) : []); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "載入活動徵件失敗。"); }
    finally { setIsLoading(false); }
  };

  const save = async () => {
    if (!draft || !pageId) return;
    setBusyId(draft.id);
    setError("");
    try {
      const updated = await updateActivitySubmissionAdmin(pageId, draft);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice("投稿資料已更新並即時套用至前台。");
      setEditing(null);
      setDraft(null);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "更新投稿失敗。"); }
    finally { setBusyId(""); }
  };

  const remove = async (item: ActivitySubmissionRecord) => {
    const action = item.kind === "demo" ? "刪除這筆 Demo 投稿" : "將這筆台本投稿從活動頁移除";
    if (!window.confirm(`確定${action}「${item.title}」？`)) return;
    setBusyId(item.id);
    setError("");
    try {
      await deleteActivitySubmissionAdmin(pageId, item);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(item.kind === "demo" ? "Demo 投稿已刪除。" : "台本已從此活動移除，仍保留在全站外部台本中。");
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "刪除投稿失敗。"); }
    finally { setBusyId(""); }
  };

  const selectedPage = pages.find((page) => page.id === pageId);
  return <section className="space-y-3">
    <header className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">活動徵件結果</h2><p className="mt-1 text-xs text-muted-foreground">依活動管理直接公開的 Demo 與台本投稿，可編輯或移除。</p></div><Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void loadPages()} disabled={isLoading}>{isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新載入</Button></header>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">{notice}</p>}
    <div className="flex flex-wrap items-center gap-2"><label htmlFor="activity-submissions-page" className="text-xs font-medium">活動</label><select id="activity-submissions-page" value={pageId} onChange={(event) => void changePage(event.target.value)} className="h-9 min-w-56 rounded-md border border-input bg-background px-3 text-sm"><option value="">選擇活動</option>{pages.map((page) => <option key={page.id} value={page.id}>{page.title} · {page.status === "published" ? "已發布" : "草稿"}</option>)}</select>{selectedPage && <Badge variant={selectedPage.acceptingSubmissions ? "default" : "secondary"}>{selectedPage.acceptingSubmissions ? "徵件開放" : "徵件關閉"}</Badge>}<span className="text-xs text-muted-foreground">{items.length} 筆投稿</span></div>
    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div> : !pageId ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">尚未建立活動頁。</div> : items.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">此活動尚無投稿結果。</div> : <div className="space-y-2">{items.map((item) => {
      const activeDraft = editing === item.id && draft;
      return <article key={`${item.kind}:${item.id}`} className="rounded-lg border border-border/70 bg-background/60 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={item.kind === "demo" ? "secondary" : "outline"}>{item.kind === "demo" ? "Demo" : "台本"}</Badge><span className="text-[11px] text-muted-foreground">{formatDate(item.createdAt)}</span></div>
          {activeDraft ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs">名稱<Input value={activeDraft.title} onChange={(event) => setDraft({ ...activeDraft, title: event.target.value })} /></label><label className="grid gap-1 text-xs">連結<Input value={activeDraft.link} onChange={(event) => setDraft({ ...activeDraft, link: event.target.value })} /></label><label className="grid gap-1 text-xs sm:col-span-2">封面連結<Input value={activeDraft.coverUrl} onChange={(event) => setDraft({ ...activeDraft, coverUrl: event.target.value })} /></label><label className="grid gap-1 text-xs sm:col-span-2">介紹<Textarea rows={3} value={activeDraft.summary} onChange={(event) => setDraft({ ...activeDraft, summary: event.target.value })} /></label>{item.kind === "demo" && <div className="flex gap-4 text-xs sm:col-span-2">{(["male", "female"] as const).map((voice) => <label key={voice} className="flex items-center gap-1"><input type="checkbox" checked={activeDraft.voiceTypes.includes(voice)} onChange={(event) => setDraft({ ...activeDraft, voiceTypes: event.target.checked ? [...activeDraft.voiceTypes, voice] : activeDraft.voiceTypes.filter((value) => value !== voice) })} />{voice === "male" ? "男聲演" : "女聲演"}</label>)}</div>}</div> : <><h3 className="mt-2 truncate text-sm font-semibold">{item.title}</h3>{item.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>}<a className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline" href={item.link} target="_blank" rel="noopener noreferrer">{item.link}<ExternalLink className="h-3 w-3 shrink-0" /></a></>}
        </div><div className="flex shrink-0 gap-1">{activeDraft ? <><Button type="button" size="sm" className="h-8" disabled={busyId === item.id} onClick={() => void save()}>{busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}儲存</Button><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="取消編輯" onClick={() => { setEditing(null); setDraft(null); }}><X className="h-4 w-4" /></Button></> : <><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="編輯投稿" onClick={() => { setEditing(item.id); setDraft({ ...item }); }}><Pencil className="h-4 w-4" /></Button><Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="刪除投稿" disabled={busyId === item.id} onClick={() => void remove(item)}>{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></>}</div></div>
      </article>;
    })}</div>}
  </section>;
}

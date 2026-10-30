import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, ImageIcon, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { MediaPicker, type MediaSelection } from "../ui/MediaPicker";
import { getPublicBundle } from "../../lib/api/public";
import { createActivityPageAdmin, deleteActivityPageAdmin, getActivityPagesAdmin, updateActivityPageAdmin, type ActivityPagePayload } from "../../lib/api/admin";
import type { ActivityPage, BaseScriptApi, ExternalPublicScript } from "../../types/api";

const emptyDraft: ActivityPagePayload = {
  slug: "",
  title: "",
  summary: "",
  coverUrl: "",
  coverCrop: null,
  body: "",
  scriptIds: [],
  externalScriptIds: [],
  acceptingSubmissions: false,
  status: "draft",
  sortOrder: 0,
};

function makeSlug(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export function ActivityPagesAdminSection(): React.JSX.Element {
  const [pages, setPages] = useState<ActivityPage[]>([]);
  const [scripts, setScripts] = useState<BaseScriptApi[]>([]);
  const [externalScripts, setExternalScripts] = useState<ExternalPublicScript[]>([]);
  const [draft, setDraft] = useState<ActivityPagePayload>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [workQuery, setWorkQuery] = useState("");
  const [workSource, setWorkSource] = useState<"all" | "internal" | "external">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [nextPages, bundle] = await Promise.all([getActivityPagesAdmin(), getPublicBundle()]);
      setPages(nextPages || []);
      setScripts((bundle.scripts || []).filter((script) => script.type !== "folder" && script.status === "Public"));
      setExternalScripts((bundle.externalPublicScripts || []).filter((script) => script.status === "published"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "載入活動頁資料失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const matchingScripts = useMemo(() => {
    const normalized = workQuery.trim().toLocaleLowerCase();
    return workSource !== "external" ? scripts.filter((script) => {
      const author = script.authorOverrideName || script.persona?.displayName || script.owner?.displayName || "";
      return !normalized || `${script.title || ""} ${script.synopsis || ""} ${author}`.toLocaleLowerCase().includes(normalized);
    }).slice(0, 80) : [];
  }, [scripts, workQuery, workSource]);
  const matchingExternalScripts = useMemo(() => {
    const normalized = workQuery.trim().toLocaleLowerCase();
    return workSource !== "internal" ? externalScripts.filter((script) => !normalized || `${script.title} ${script.remoteTitle || ""} ${script.authorName || ""} ${script.summary || script.remoteSummary || ""}`.toLocaleLowerCase().includes(normalized)).slice(0, 80) : [];
  }, [externalScripts, workQuery, workSource]);
  const selectedWorkCount = draft.scriptIds.length + draft.externalScriptIds.length;
  const visiblePages = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return pages.filter((page) => !normalized || `${page.title} ${page.slug} ${page.summary}`.toLocaleLowerCase().includes(normalized));
  }, [pages, query]);

  const reset = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setWorkQuery("");
    setError("");
    setNotice("");
  };

  const edit = (page: ActivityPage) => {
    setEditingId(page.id);
    setDraft({
      slug: page.slug,
      title: page.title,
      summary: page.summary || "",
      coverUrl: page.coverUrl || "",
      coverCrop: page.coverCrop || null,
      body: page.body || "",
      scriptIds: page.scriptIds || [],
      externalScriptIds: page.externalScriptIds || [],
      acceptingSubmissions: page.acceptingSubmissions || false,
      status: page.status,
      sortOrder: page.sortOrder || 0,
    });
    setIsFormOpen(true);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const requestedStatus = submitter?.dataset.status === "published" ? "published" : submitter?.dataset.status === "draft" ? "draft" : draft.status;
    const payload = { ...draft, status: requestedStatus, slug: makeSlug(draft.slug), title: draft.title.trim() };
    if (!payload.slug) {
      setError("請設定英文或數字網址代稱，例如 christmas-2026。");
      setIsSaving(false);
      return;
    }
    try {
      const saved = editingId ? await updateActivityPageAdmin(editingId, payload) : await createActivityPageAdmin(payload);
      setPages((current) => [saved, ...current.filter((page) => page.id !== saved.id)].sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt - a.updatedAt));
      setEditingId(saved.id);
      setDraft({ ...payload, status: saved.status });
      setNotice(saved.status === "published" ? "活動頁已發布，前台活動專區會顯示此頁。" : "草稿已儲存。發布後才會出現在前台。 ");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "儲存活動頁失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (page: ActivityPage) => {
    if (!window.confirm(`確定刪除活動頁「${page.title}」？`)) return;
    setBusyId(page.id);
    setError("");
    try {
      await deleteActivityPageAdmin(page.id);
      setPages((current) => current.filter((entry) => entry.id !== page.id));
      if (editingId === page.id) reset();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "刪除活動頁失敗。");
    } finally {
      setBusyId(null);
    }
  };

  const toggleScript = (id: string, external = false) => {
    const key = external ? "externalScriptIds" : "scriptIds";
    setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-semibold">活動頁面</h2><p className="mt-1 text-xs text-muted-foreground">建立活動主題頁，加入公開台本；發布後前台 Topbar 會顯示「活動專區」。</p></div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void load()} disabled={isLoading}>{isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新載入</Button>
          <Button type="button" size="sm" className="h-8" onClick={() => { reset(); setIsFormOpen((open) => !open); }}><Plus className="mr-1.5 h-3.5 w-3.5" />{isFormOpen ? "收合表單" : "建立活動頁"}</Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">{notice}</div>}

      {isFormOpen && <form onSubmit={save} className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
        <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">{editingId ? "編輯活動頁" : "建立活動頁"}</h3><p className="mt-0.5 text-xs text-muted-foreground">未發布的頁面只有後台可見。</p></div>{editingId && <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => { reset(); setIsFormOpen(false); }}>取消編輯</Button>}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">活動名稱<Input required maxLength={160} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value, ...(editingId ? {} : { slug: makeSlug(event.target.value) }) }))} placeholder="例如：聖誕節特別企劃" /></label>
          <label className="grid gap-1 text-xs">網址代稱<Input required maxLength={100} value={draft.slug} onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="christmas-2026" /></label>
          <label className="grid gap-1 text-xs sm:col-span-2">頁面摘要<Input maxLength={1000} value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} placeholder="活動介紹，會顯示在頁面封面與分享摘要" /></label>
          <div className="grid gap-2 text-xs sm:col-span-2">
            <label className="grid gap-1">活動主視覺圖片網址<Input type="url" value={draft.coverUrl} onChange={(event) => setDraft((current) => ({ ...current, coverUrl: event.target.value, coverCrop: null }))} placeholder="https://… 或站內 /media/ 路徑" /></label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" className="h-8" onClick={() => setIsMediaPickerOpen(true)}><ImageIcon className="mr-1.5 h-3.5 w-3.5" />從媒體庫選擇／上傳</Button>
              {draft.coverUrl && <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setDraft((current) => ({ ...current, coverUrl: "", coverCrop: null }))}><X className="mr-1 h-3.5 w-3.5" />移除封面</Button>}
              <span className="text-[11px] text-muted-foreground">與首頁 Banner 共用媒體庫，選圖後可設定主視覺焦點。</span>
            </div>
            {draft.coverUrl ? <div className="relative aspect-[16/5] overflow-hidden rounded-lg border bg-muted/40"><img src={draft.coverUrl} alt="活動主視覺預覽" className="h-full w-full object-cover" style={draft.coverCrop ? { objectPosition: `${50 + (draft.coverCrop.cx ?? 0) * 20}% ${50 + (draft.coverCrop.cy ?? 0) * 20}%`, transform: `scale(${draft.coverCrop.zoom ?? 1})` } : undefined} referrerPolicy="no-referrer" /><div className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-[10px] text-white">活動主視覺預覽</div></div> : <div className="flex aspect-[16/5] items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground"><ImageIcon className="h-4 w-4" />尚未選擇活動主視覺</div>}
          </div>
          <label className="grid gap-1 text-xs sm:col-span-2">活動內容<Textarea rows={8} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder={"用空行分段。\n## 小標題\n- 清單項目"} /><span className="text-[11px] text-muted-foreground">支援純文字分段、## 小標題與 - 清單項目。</span></label>
        </div>
        <section className="space-y-2 rounded-lg border border-border/60 bg-card/30 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h4 className="text-xs font-semibold">加入相關台本</h4><p className="mt-0.5 text-[11px] text-muted-foreground">只列出目前公開的本站與外部台本；已選 {selectedWorkCount} 部。</p></div><div className="flex gap-2"><select aria-label="篩選台本來源" className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={workSource} onChange={(event) => setWorkSource(event.target.value as typeof workSource)}><option value="all">全部來源</option><option value="internal">本站台本</option><option value="external">外部台本</option></select><div className="relative sm:w-64"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" value={workQuery} onChange={(event) => setWorkQuery(event.target.value)} placeholder="搜尋台本或作者" /></div></div></div>
          <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
            {matchingScripts.map((script) => <label key={`internal:${script.id}`} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"><input type="checkbox" checked={draft.scriptIds.includes(script.id)} onChange={() => toggleScript(script.id)} /><span className="min-w-0 flex-1 truncate">{script.title || "未命名台本"}</span><Badge variant="outline" className="text-[9px]">本站</Badge></label>)}
            {matchingExternalScripts.map((script) => <label key={`external:${script.id}`} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"><input type="checkbox" checked={draft.externalScriptIds.includes(script.id)} onChange={() => toggleScript(script.id, true)} /><span className="min-w-0 flex-1 truncate">{script.title || script.remoteTitle || "外部台本"}</span><Badge variant="outline" className="text-[9px]">外部</Badge></label>)}
            {matchingScripts.length + matchingExternalScripts.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">沒有符合的公開台本。</p>}
          </div>
        </section>
        <label className="flex items-start gap-2 rounded-lg border border-border/60 p-3 text-xs">
          <input type="checkbox" className="mt-0.5" checked={draft.acceptingSubmissions} onChange={(event) => setDraft((current) => ({ ...current, acceptingSubmissions: event.target.checked }))} />
          <span><span className="block font-semibold">開啟徵件並直接公開</span><span className="mt-0.5 block text-muted-foreground">前台顯示「投稿 Demo」與「投稿台本」；活動內投稿會略過審核並立即公開。</span></span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.status === "published"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.checked ? "published" : "draft" }))} />發布並顯示在前台活動專區</label>
          <div className="flex items-center gap-2"><Button type="submit" data-status="draft" variant="outline" size="sm" className="h-8" disabled={isSaving}>{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "儲存草稿"}</Button><Button type="submit" data-status="published" size="sm" className="h-8" disabled={isSaving}>{isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "發布活動頁"}</Button></div>
        </div>
      </form>}

      <MediaPicker
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        cropPurpose="banner"
        onSelect={(url) => setDraft((current) => ({ ...current, coverUrl: url, coverCrop: null }))}
        onSelectMedia={(selection: MediaSelection) => setDraft((current) => ({ ...current, coverUrl: selection.url, coverCrop: selection.crop ?? null }))}
      />

      <div className="flex flex-col gap-2 sm:flex-row"><Input className="h-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋活動名稱或網址代稱" /><span className="shrink-0 self-center text-xs text-muted-foreground">{visiblePages.length} / {pages.length} 頁</span></div>
      {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        : visiblePages.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">尚未建立活動頁。</div>
          : <div className="space-y-2">{visiblePages.map((page) => <article key={page.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/60 p-3 sm:flex-row sm:items-center">
            {page.coverUrl && <img src={page.coverUrl} alt="" className="h-16 w-24 shrink-0 rounded-md border object-cover" loading="lazy" referrerPolicy="no-referrer" />}
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{page.title}</h3><Badge variant={page.status === "published" ? "default" : "secondary"}>{page.status === "published" ? "已發布" : "草稿"}</Badge>{page.acceptingSubmissions && <Badge variant="outline">徵件中／直接公開</Badge>}</div><p className="mt-1 truncate text-xs text-muted-foreground">/activities?event={page.slug}{page.summary ? ` · ${page.summary}` : ""}</p><p className="mt-1 text-[11px] text-muted-foreground">已選 {page.scriptIds.length + page.externalScriptIds.length} 部台本</p></div>
            <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">{page.status === "published" && <a href={`https://dev-open-scripts.shawnup.com/activities?event=${encodeURIComponent(page.slug)}`} target="_blank" rel="noopener noreferrer" aria-label="預覽活動頁" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"><ExternalLink className="h-4 w-4" /></a>}<Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="編輯活動頁" onClick={() => edit(page)}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="刪除活動頁" disabled={busyId === page.id} onClick={() => void remove(page)}>{busyId === page.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div>
          </article>)}</div>}
    </div>
  );
}

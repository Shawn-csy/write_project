import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import type { PersonaLike } from "../../../types/persona";
import type { ExternalPublicScript } from "../../../types/api";
import {
  getStudioExternalScripts,
  previewStudioExternalScript,
  publishStudioExternalScript,
  deleteStudioExternalScript,
  type StudioExternalScriptPreview,
} from "../../../lib/api/studioExternalScripts";

interface Props { personas: PersonaLike[]; }

function firstSocialLink(persona?: PersonaLike): string {
  if (!persona) return "";
  let links = persona.links;
  if (typeof links === "string") {
    try { links = JSON.parse(links) as Array<{ url?: string; label?: string }>; } catch { links = []; }
  }
  if (Array.isArray(links)) {
    const social = links.find((link) => link.url?.trim() && /社群|social|twitter|x\.com|pixiv|instagram|facebook|youtube|噗浪/i.test(`${link.label || ""} ${link.url}`));
    if (social?.url?.trim()) return social.url.trim();
    const first = links.find((link) => link.url?.trim());
    if (first?.url?.trim()) return first.url.trim();
  }
  return persona.website?.trim() || "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作失敗，請稍後再試。";
}

export function StudioExternalScriptsTab({ personas }: Props): React.JSX.Element {
  const [items, setItems] = useState<ExternalPublicScript[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [authorPersonaId, setAuthorPersonaId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [preview, setPreview] = useState<StudioExternalScriptPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selectedPersona = useMemo(() => personas.find((persona) => persona.id === authorPersonaId), [personas, authorPersonaId]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      setItems(await getStudioExternalScripts());
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const handlePreview = async () => {
    setError("");
    setMessage("");
    if (!sourceUrl.trim()) { setError("請先貼上公開台本連結。"); return; }
    if (!authorPersonaId) { setError("請先選擇工作室中的作者。"); return; }
    setIsPreviewing(true);
    try {
      const result = await previewStudioExternalScript(sourceUrl.trim(), firstSocialLink(selectedPersona));
      setPreview(result);
      setSourceUrl(result.sourceUrl || sourceUrl.trim());
      setTitle((current) => current || result.remoteTitle || "");
      setSummary((current) => current || result.remoteSummary || "");
      setCoverUrl((current) => current || result.remoteCoverUrl || "");
      setMessage("已讀取外部台本資訊，確認內容後即可直接發布。");
    } catch (previewError) {
      setError(errorMessage(previewError));
      setPreview(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePublish = async () => {
    setError("");
    setMessage("");
    if (!preview) { setError("請先讀取連結資訊。"); return; }
    if (!selectedPersona) { setError("請選擇工作室中的作者。"); return; }
    if (!title.trim()) { setError("請填寫台本名稱。"); return; }
    setIsPublishing(true);
    try {
      await publishStudioExternalScript({
        sourceUrl: preview.sourceUrl || sourceUrl.trim(),
        authorPersonaId,
        canonicalUrl: preview.canonicalUrl || "",
        sourceDomain: preview.sourceDomain || "",
        sourceName: preview.sourceName || "",
        remoteTitle: preview.remoteTitle || "",
        remoteSummary: preview.remoteSummary || "",
        remoteCoverUrl: preview.remoteCoverUrl || "",
        titleOverride: title.trim(),
        summaryOverride: summary.trim(),
        coverUrlOverride: coverUrl.trim(),
        seriesName: seriesName.trim(),
        categories: categoriesText.split(/[,，、]/).map((value) => value.trim()).filter(Boolean),
      });
      setMessage("已直接發布，公開台本頁面會立即收錄這部作品。");
      setSourceUrl(""); setTitle(""); setSummary(""); setCoverUrl(""); setCategoriesText(""); setSeriesName(""); setPreview(null);
      await loadItems();
    } catch (publishError) {
      setError(errorMessage(publishError));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (item: ExternalPublicScript) => {
    if (!window.confirm(`確定要刪除「${item.title || item.remoteTitle || "未命名台本"}」嗎？刪除後會從公開列表移除。`)) return;
    setError("");
    setMessage("");
    try {
      await deleteStudioExternalScript(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setMessage("外部台本已刪除，並已從公開列表移除。");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  };

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
      <section className="max-w-2xl space-y-5" aria-label="外部作品資料">
        <div className="space-y-1.5">
          <label htmlFor="studio-external-url" className="text-sm font-medium">台本公開連結</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="studio-external-url" type="url" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setPreview(null); }} placeholder="https://…" />
            <Button type="button" variant="outline" onClick={() => void handlePreview()} disabled={isPreviewing} className="shrink-0">
              {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              讀取連結
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="studio-external-author" className="text-sm font-medium">工作室作者</label>
          <select id="studio-external-author" value={authorPersonaId} onChange={(event) => setAuthorPersonaId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">選擇自己的作者身份</option>
            {personas.map((persona) => <option key={persona.id} value={persona.id}>{persona.displayName || "未命名作者"}</option>)}
          </select>
          {selectedPersona && <p className="text-xs text-muted-foreground">發布時會使用「{selectedPersona.displayName}」的作者名稱與介紹。</p>}
          {personas.length === 0 && <p className="text-xs text-[hsl(var(--status-ready-fg))]">請先在工作室建立作者身份，再發布外部台本。</p>}
        </div>
        <div className="space-y-4 border-t border-border/70 pt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">作品資料</h2>
            {preview && <span className="text-xs text-muted-foreground">已讀取來源資料，可自行補充或修改</span>}
          </div>
          <div className="space-y-1.5"><label htmlFor="studio-external-title" className="text-sm">台本名稱</label><Input id="studio-external-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} placeholder="讀取連結後自動帶入，也可以自行填寫" /></div>
          <div className="space-y-1.5"><label htmlFor="studio-external-summary" className="text-sm">台本摘要／介紹</label><Textarea id="studio-external-summary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} maxLength={4000} placeholder="可補充作品內容，會顯示在公開台本頁" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><label htmlFor="studio-external-tags" className="text-sm">標籤</label><Input id="studio-external-tags" value={categoriesText} onChange={(event) => setCategoriesText(event.target.value)} placeholder="例如：全年齡、療癒；用逗號分隔" /></div>
            <div className="space-y-1.5"><label htmlFor="studio-external-series" className="text-sm">系列（選填）</label><Input id="studio-external-series" value={seriesName} onChange={(event) => setSeriesName(event.target.value)} placeholder="填入系列名稱" /></div>
          </div>
          <div className="space-y-1.5"><label htmlFor="studio-external-cover" className="text-sm">封面連結（選填）</label><Input id="studio-external-cover" type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="來源有封面時會自動帶入，也可以貼上圖片網址" /></div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handlePublish()} disabled={isPublishing || !selectedPersona || !preview || !title.trim()}>
            {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            直接發布
            </Button>
            {!preview && <span className="text-xs text-muted-foreground">先讀取公開連結，確認來源有效後即可發布。</span>}
          </div>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-[hsl(var(--status-live-fg))]">{message}</p>}
      </section>

      <div className="space-y-8">
      <section className="overflow-hidden rounded-[10px] border border-border">
        <div className="border-b border-border p-4"><h2 className="text-[15px] font-semibold">公開頁預覽</h2><p className="mt-1 text-sm text-muted-foreground">欄位會即時反映到這張卡片。</p></div>
        {coverUrl.trim() ? <div className="relative aspect-[16/7] bg-muted"><img src={coverUrl.trim()} alt="台本封面預覽" className="h-full w-full object-cover" /></div> : <div className="flex aspect-[16/7] items-center justify-center bg-muted/40 text-xs text-muted-foreground">尚未設定封面</div>}
        <div className="space-y-2.5 p-4">
          <div className="flex flex-wrap gap-1">{categoriesText.split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean).map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div>
          <h3 className="font-serif text-lg font-semibold leading-snug">{title.trim() || "台本名稱"}</h3>
          <p className="text-xs text-muted-foreground">作者：{selectedPersona?.displayName || "選擇工作室作者"}{seriesName.trim() ? ` · 系列：${seriesName.trim()}` : ""}</p>
          <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{summary.trim() || "台本摘要或介紹會顯示在這裡。"}</p>
          {preview && <a href={preview.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">開啟來源<ExternalLink className="h-3 w-3" /></a>}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-[15px] font-semibold">我的外部台本</h2><p className="mt-1 text-sm text-muted-foreground">由這個工作室直接發布的外部作品。</p></div><Badge variant="outline">{items.length}</Badge></div>
        {isLoading ? <div className="flex justify-center p-6"><Loader2 className="animate-spin" /></div> : items.length === 0 ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">目前沒有外部台本。</p> : <div className="space-y-2">
          {items.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{item.title || item.remoteTitle || "未命名台本"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.authorName} · {item.sourceDomain || item.sourceName}</p><div className="mt-2 flex flex-wrap gap-1">{(item.categories || []).slice(0, 4).map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div></div>
            <div className="flex shrink-0 items-center gap-1">
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="開啟原始台本連結"><ExternalLink className="h-4 w-4" /></a>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(item)} aria-label={`刪除${item.title || item.remoteTitle || "外部台本"}`} title="刪除外部台本"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>)}
        </div>}
      </section>
      </div>
    </div>
  );
}

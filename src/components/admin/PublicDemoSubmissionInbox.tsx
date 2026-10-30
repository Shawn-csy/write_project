import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getPublicDemoSubmissionsAdmin, updatePublicDemoSubmissionStatusAdmin } from "../../lib/api/admin";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { PublicDemoSubmissionRecord } from "../../types/api";

type StatusFilter = "all" | PublicDemoSubmissionRecord["status"];

function formatDate(value: number): string {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export function PublicDemoSubmissionInbox(): React.JSX.Element {
  const [items, setItems] = useState<PublicDemoSubmissionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (search: string, nextStatus: StatusFilter) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getPublicDemoSubmissionsAdmin({ q: search, status: nextStatus, limit: 100, offset: 0 });
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (loadError) {
      console.error("Failed to load demo submissions", loadError);
      setItems([]);
      setTotal(0);
      setError("讀取 Demo 投稿失敗，請確認管理員權限後重試。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load("", "pending"); }, [load]);

  const updateStatus = async (id: string, nextStatus: PublicDemoSubmissionRecord["status"]) => {
    setUpdatingId(id);
    setError("");
    try {
      const updated = await updatePublicDemoSubmissionStatusAdmin(id, nextStatus);
      notifyAdminQueueUpdated();
      setItems((current) => current.map((item) => item.id === id ? updated : item));
      if (status === "pending" && nextStatus !== "pending") {
        setItems((current) => current.filter((item) => item.id !== id));
        setTotal((current) => Math.max(0, current - 1));
      }
    } catch (updateError) {
      console.error("Failed to review demo submission", updateError);
      setError("更新審核結果失敗，請稍後再試。");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="h-8 text-sm"
          placeholder="搜尋台本、Demo、演出者或聯絡 Email"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void load(query, status); }}
        />
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={status}
          onChange={(event) => {
            const value = event.target.value as StatusFilter;
            setStatus(value);
            void load(query, value);
          }}
          aria-label="投稿狀態"
        >
          <option value="pending">待審核</option>
          <option value="approved">已核准</option>
          <option value="rejected">已退回</option>
          <option value="all">全部</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void load(query, status)} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          重新整理
        </Button>
        <span className="shrink-0 text-xs text-muted-foreground">共 {total} 筆</span>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {!isLoading && !error && items.length === 0 && <div className="py-5 text-center text-sm text-muted-foreground">目前沒有符合的 Demo 投稿。</div>}

      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>
                  {item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                <Badge variant="outline">{item.scriptType === "external" ? "外部台本" : "本站台本"}</Badge>
              </div>
              <a href={item.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">
                開啟 Demo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>台本：<a className="text-primary hover:underline" href={item.scriptUrl} target={item.scriptType === "external" ? "_blank" : undefined} rel={item.scriptType === "external" ? "noopener noreferrer" : undefined}>{item.scriptTitle}</a></span>
              <span>Demo：{item.demoName || "演出 Demo"}</span>
              {item.cast && <span>演出者：{item.cast}</span>}
              {item.voiceTypes?.length > 0 && <span>聲演聲線：{item.voiceTypes.map((type) => type === "male" ? "男聲演" : "女聲演").join("、")}</span>}
              {item.voiceActorNames?.length > 0 && <span>聲演名單：{item.voiceActorNames.join("、")}</span>}
              {item.manualVoiceActors?.length > 0 && <span className="sm:col-span-2">名單外聲演：{item.manualVoiceActors.map((actor, index) => <React.Fragment key={`${actor.name}-${index}`}>{index > 0 ? "、" : " "}{actor.socialUrl ? <a href={actor.socialUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{actor.name} ↗</a> : actor.name}</React.Fragment>)}</span>}
              {item.displayName && <span>公開署名：{item.displayName}</span>}
              {item.contactEmail && <span>聯絡 Email：<a className="text-primary hover:underline" href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a></span>}
            </div>
            {item.coverUrl && <a href={item.coverUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs text-primary hover:underline"><img src={item.coverUrl} alt="Demo 封面預覽" className="h-12 w-20 rounded border border-border/70 object-cover" loading="lazy" referrerPolicy="no-referrer" />檢視封面</a>}
            {item.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description}</p>}
            {item.status !== "approved" && (item.manualVoiceActors?.length || 0) > 0 && <p className="mt-2 text-xs text-muted-foreground">核准後會建立尚未連結帳戶的聲演身份頁，並列入聲演名錄。</p>}
            {item.status !== "approved" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="h-8" disabled={updatingId === item.id} onClick={() => void updateStatus(item.id, "approved")}>
                  {updatingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}核准並公開
                </Button>
                {item.status === "pending" && <Button size="sm" variant="outline" className="h-8" disabled={updatingId === item.id} onClick={() => void updateStatus(item.id, "rejected")}>退回</Button>}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

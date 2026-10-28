import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { deletePublicFeedbackAdmin, getPublicFeedbackAdmin, updatePublicFeedbackStatusAdmin } from "../../lib/api/admin";
import type { PublicFeedbackRecord } from "../../types/api";

function formatFeedbackDate(value: number): string {
  return new Date(value).toLocaleString("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getFeedbackKindLabel(kind: PublicFeedbackRecord["kind"]): string {
  if (kind === "bug") return "Bug 回報";
  if (kind === "listing") return "上架申請";
  return "廣告申請";
}

function getAdBannerUrl(item: PublicFeedbackRecord): string | null {
  if (item.kind !== "ad_application") return null;
  const rawUrl = item.content.match(/^Banner 圖片：(.+)$/m)?.[1]?.trim();
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function PublicFeedbackInbox() {
  const [items, setItems] = useState<PublicFeedbackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async (search = "") => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getPublicFeedbackAdmin({ q: search, excludeKind: "demo_submission", limit: 100, offset: 0 });
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (loadError: unknown) {
      console.error("Failed to load public feedback", loadError);
      setItems([]);
      setTotal(0);
      setError("讀取回報失敗，請確認目前帳號具有超級管理員權限。 ");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const handleDelete = useCallback(async (feedbackId: string) => {
    if (!window.confirm("確定要刪除這筆回報嗎？刪除後無法復原。")) return;

    setDeletingId(feedbackId);
    setError("");
    try {
      await deletePublicFeedbackAdmin(feedbackId);
      setItems((currentItems) => currentItems.filter((item) => item.id !== feedbackId));
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
    } catch (deleteError: unknown) {
      console.error("Failed to delete public feedback", deleteError);
      setError("刪除回報失敗，請稍後再試。 ");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleStatusChange = useCallback(async (feedbackId: string, status: "new" | "reviewed" | "closed") => {
    setUpdatingStatusId(feedbackId);
    setError("");
    try {
      const updated = await updatePublicFeedbackStatusAdmin(feedbackId, status);
      setItems((currentItems) => currentItems.map((item) => item.id === feedbackId ? updated : item));
    } catch (updateError: unknown) {
      console.error("Failed to update public feedback status", updateError);
      setError("更新申請狀態失敗，請稍後再試。");
    } finally {
      setUpdatingStatusId(null);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="h-8 text-sm"
          placeholder="搜尋聯絡人、Email、內容或頁面"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void loadFeedback(query.trim());
          }}
        />
        <Button variant="outline" size="sm" onClick={() => void loadFeedback(query.trim())} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          重新整理
        </Button>
        <span className="shrink-0 text-xs text-muted-foreground">共 {total} 筆</span>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {!isLoading && !error && items.length === 0 && <div className="py-4 text-xs text-muted-foreground">目前沒有申請或回報。</div>}

      <div className="space-y-2">
        {items.map((item) => {
          const bannerUrl = getAdBannerUrl(item);
          return (
            <article key={item.id} className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.kind === "bug" ? "destructive" : "secondary"}>
                  {getFeedbackKindLabel(item.kind)}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatFeedbackDate(item.createdAt)}</span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  狀態
                  <select
                    className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                    value={item.status}
                    disabled={updatingStatusId === item.id}
                    onChange={(event) => void handleStatusChange(item.id, event.target.value as "new" | "reviewed" | "closed")}
                    aria-label={`更新${getFeedbackKindLabel(item.kind)}狀態`}
                  >
                    <option value="new">待處理</option>
                    <option value="reviewed">已檢視</option>
                    <option value="closed">已結案</option>
                  </select>
                  {updatingStatusId === item.id && <Loader2 className="h-3 w-3 animate-spin" />}
                </label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="刪除這筆回報"
                title="刪除這筆回報"
                disabled={deletingId !== null}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDelete(item.id);
                }}
              >
                {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>聯絡人：{item.contactName || "未提供"}</span>
              {item.contactEmail ? (
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${item.contactEmail}`}>
                  <Mail className="h-3 w-3" />
                  {item.contactEmail}
                </a>
              ) : <span>Email：未提供</span>}
              {item.pageUrl && <a className="max-w-full truncate text-primary hover:underline" href={item.pageUrl} target="_blank" rel="noreferrer">來源頁面</a>}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-foreground">{item.content}</p>
            {bannerUrl && (
              <a href={bannerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full flex-col gap-1 text-xs text-primary hover:underline">
                <img src={bannerUrl} alt="申請的廣告 Banner" className="max-h-40 max-w-full rounded-md border object-contain" />
                開啟 Banner 圖片
              </a>
            )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

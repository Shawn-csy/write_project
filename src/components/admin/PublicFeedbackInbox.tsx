import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, RefreshCw, Trash2, Upload } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { createExternalPublicScriptAdmin, deletePublicFeedbackAdmin, getActivityPagesAdmin, getPublicFeedbackAdmin, updateActivityPageAdmin, updatePublicFeedbackStatusAdmin } from "../../lib/api/admin";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { PublicFeedbackRecord } from "../../types/api";

function formatFeedbackDate(value: number): string {
  return new Date(value).toLocaleString("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getFeedbackKindLabel(kind: PublicFeedbackRecord["kind"]): string {
  if (kind === "bug") return "Bug 回報";
  if (kind === "listing") return "台本投稿";
  return "廣告申請";
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      notifyAdminQueueUpdated();
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
      notifyAdminQueueUpdated();
      setItems((currentItems) => currentItems.map((item) => item.id === feedbackId ? updated : item));
    } catch (updateError: unknown) {
      console.error("Failed to update public feedback status", updateError);
      setError("更新申請狀態失敗，請稍後再試。");
    } finally {
      setUpdatingStatusId(null);
    }
  }, []);

  const handleImportAsDraft = useCallback(async (item: PublicFeedbackRecord) => {
    setImportingId(item.id);
    setError("");
    setNotice("");
    try {
      const created = await createExternalPublicScriptAdmin({
        sourceUrl: item.documentUrl,
        authorName: item.authorName,
        authorBio: item.authorBio,
        authorUrl: item.authorSocialUrl,
        titleOverride: item.scriptTitle,
        summaryOverride: item.scriptSummary,
        coverUrlOverride: item.coverUrl,
        seriesName: item.seriesName,
        categories: item.categories,
        status: "draft",
      });
      let linkedActivity = "";
      if (item.activityPageId) {
        const pages = await getActivityPagesAdmin();
        const activity = pages.find((page) => page.id === item.activityPageId);
        if (activity && !activity.externalScriptIds.includes(created.id)) {
          await updateActivityPageAdmin(activity.id, {
            slug: activity.slug, title: activity.title, summary: activity.summary, coverUrl: activity.coverUrl,
            coverCrop: activity.coverCrop || null, body: activity.body, scriptIds: activity.scriptIds,
            externalScriptIds: [...activity.externalScriptIds, created.id], acceptingSubmissions: activity.acceptingSubmissions,
            status: activity.status, sortOrder: activity.sortOrder,
          });
          linkedActivity = activity.title;
        }
      }
      const updated = await updatePublicFeedbackStatusAdmin(item.id, "closed");
      notifyAdminQueueUpdated();
      setItems((currentItems) => currentItems.map((current) => current.id === item.id ? updated : current));
      setNotice(`已建立「${created.title || item.scriptTitle}」草稿${linkedActivity ? `並加入「${linkedActivity}」活動` : ""}；請到外部台本管理檢查後發佈。`);
    } catch (importError: unknown) {
      console.error("Failed to import public script submission", importError);
      setError("自動匯入草稿失敗；請檢查文件連結，或確認這份台本是否已經加入。 ");
    } finally {
      setImportingId(null);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          className="h-8 text-sm"
          placeholder="搜尋台本、作者、聯絡人或文件"
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
      {notice && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">{notice}</div>}
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
              {item.activityPageId && <Badge variant="outline">活動徵件</Badge>}
              {item.contactEmail ? (
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${item.contactEmail}`}>
                  <Mail className="h-3 w-3" />
                  {item.contactEmail}
                </a>
              ) : <span>Email：未提供</span>}
              {item.pageUrl && <a className="max-w-full truncate text-primary hover:underline" href={item.pageUrl} target="_blank" rel="noreferrer">來源頁面</a>}
            </div>
            {item.kind === "listing" && (
              <div className="mt-3 grid gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                {item.coverUrl && safeExternalUrl(item.coverUrl) && <img src={safeExternalUrl(item.coverUrl) || undefined} alt="台本封面預覽" referrerPolicy="no-referrer" className="aspect-[3/4] w-28 rounded-md border border-border/60 bg-background object-cover" />}
                <div className="min-w-0 space-y-2 text-xs">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.scriptTitle || "未命名台本"}</h3>
                    <p className="text-muted-foreground">作者：{item.authorName || "未提供"}{item.seriesName ? `　·　系列：${item.seriesName}` : ""}</p>
                  </div>
                  {item.scriptSummary && <p className="line-clamp-3 text-foreground/80">{item.scriptSummary}</p>}
                  {item.authorBio && <p className="whitespace-pre-wrap break-words text-muted-foreground">作者介紹：{item.authorBio}</p>}
                  {item.categories?.length > 0 && <div className="flex flex-wrap gap-1">{item.categories.map((category) => <span key={category} className="rounded-full border border-border/60 bg-background px-2 py-0.5">{category}</span>)}</div>}
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {item.authorSocialUrl && (safeExternalUrl(item.authorSocialUrl)
                      ? <a className="text-primary hover:underline" href={safeExternalUrl(item.authorSocialUrl) || undefined} target="_blank" rel="noreferrer">作者社群</a>
                      : <span>作者社群：{item.authorSocialUrl}</span>)}
                    {item.documentUrl && (safeExternalUrl(item.documentUrl)
                      ? <a className="text-primary hover:underline" href={safeExternalUrl(item.documentUrl) || undefined} target="_blank" rel="noreferrer">開啟台本文件</a>
                      : <span>台本文件：{item.documentUrl}</span>)}
                  </div>
                  {item.notes && <p className="whitespace-pre-wrap break-words text-muted-foreground">備註：{item.notes}</p>}
                  {item.status !== "closed" && <Button type="button" size="sm" variant="outline" disabled={importingId !== null} onClick={() => void handleImportAsDraft(item)}>
                    {importingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    自動匯入為草稿
                  </Button>}
                </div>
              </div>
            )}
            {item.kind !== "listing" && <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-foreground">{item.content}</p>}
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

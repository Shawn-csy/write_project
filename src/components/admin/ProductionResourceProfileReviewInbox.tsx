import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { getProductionResourceProfileSubmissionsAdmin, updateProductionResourceProfileSubmissionAdmin } from "../../lib/api/admin";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { ProductionResourceProfileSubmission } from "../../types/api";

type Field = "displayName" | "bio" | "avatarUrl" | "profileUrl" | "links" | "works" | "contributorName";
const labels: Record<Field, string> = {
  displayName: "公開名稱", bio: "介紹", avatarUrl: "頭像", profileUrl: "個人／委託頁",
  links: "社群連結", works: "補充作品", contributorName: "資料協力者",
};
const fields = Object.keys(labels) as Field[];

function changedFields(item: ProductionResourceProfileSubmission): Field[] {
  return fields.filter((field) => {
    if (field === "contributorName") return Boolean(item.profile.contributorName);
    if (field === "works") return Array.isArray(item.profile.works) && item.profile.works.length > 0;
    return JSON.stringify(item.currentProfile[field] ?? (field === "links" ? [] : "")) !== JSON.stringify(item.profile[field] ?? (field === "links" ? [] : ""));
  });
}

function DisplayValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) return <div className="space-y-1">{value.length ? value.map((row, index) => <p key={index} className="break-all">{typeof row === "object" && row !== null ? Object.entries(row).map(([key, item]) => `${key}: ${String(item)}`).join(" · ") : String(row)}</p>) : "（無）"}</div>;
  return <span className="whitespace-pre-wrap break-all">{String(value || "（無）")}</span>;
}

export function ProductionResourceProfileReviewInbox(): React.JSX.Element {
  const [items, setItems] = useState<ProductionResourceProfileSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [selected, setSelected] = useState<Record<string, Field[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextStatus: typeof status) => {
    setLoading(true);
    setError("");
    try {
      const result = await getProductionResourceProfileSubmissionsAdmin({ status: nextStatus, limit: 100 });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setError("載入資源資料申請失敗，請稍後重試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load("pending"); }, [load]);

  async function review(item: ProductionResourceProfileSubmission, decision: "approved" | "rejected") {
    setBusyId(item.id);
    setError("");
    try {
      const updated = await updateProductionResourceProfileSubmissionAdmin(item.id, decision, decision === "approved" ? selected[item.id] ?? changedFields(item) : []);
      notifyAdminQueueUpdated();
      if (status === "pending") {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setTotal((current) => Math.max(0, current - 1));
        setOpenId(null);
      } else setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新審核結果失敗。");
    } finally {
      setBusyId(null);
    }
  }

  return <div className="space-y-3">
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"><h2 className="text-sm font-semibold">資源頁面補充審核</h2><p className="mt-1 text-xs text-muted-foreground">逐項比較目前資料與訪客提案，選擇要採用的欄位；新增作品須先存在本站音聲目錄。</p></div>
    <div className="flex items-center gap-2"><select aria-label="審核狀態" value={status} onChange={(event) => { const next = event.target.value as typeof status; setStatus(next); void load(next); }} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option></select><Button variant="outline" size="sm" disabled={loading} onClick={() => void load(status)}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}重新整理</Button><span className="text-xs text-muted-foreground">共 {total} 筆</span></div>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!loading && items.length === 0 && !error && <p className="py-8 text-center text-sm text-muted-foreground">目前沒有符合的資源資料申請。</p>}
    {items.map((item) => {
      const changed = changedFields(item);
      const accepted = selected[item.id] ?? changed;
      return <article key={item.id} className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}</Badge><strong>{item.resourceName}</strong><span className="text-xs text-muted-foreground">{item.submitterName} · {changed.map((field) => labels[field]).join("、") || "沒有資料變更"}</span></div><Button size="sm" variant="outline" onClick={() => setOpenId(openId === item.id ? null : item.id)}>{openId === item.id ? "收合預覽" : "檢視內容"}</Button></div>
        {openId === item.id && <div className="mt-3 space-y-3 border-t border-border/70 pt-3"><p className="text-xs text-muted-foreground">聯絡 Email：{item.contactEmail}</p><div className="space-y-2">{changed.map((field) => <label key={field} className="grid gap-2 rounded-md border border-border/60 p-2 text-xs sm:grid-cols-[20px_100px_1fr_1fr]"><input type="checkbox" disabled={item.status !== "pending"} checked={accepted.includes(field)} onChange={(event) => setSelected((current) => ({ ...current, [item.id]: event.target.checked ? [...accepted, field] : accepted.filter((entry) => entry !== field) }))} className="accent-primary" /><span className="font-semibold">{labels[field]}</span><div><span className="text-muted-foreground">目前：</span><DisplayValue value={item.currentProfile[field]} /></div><div><span className="text-muted-foreground">提案：</span><DisplayValue value={item.profile[field]} /></div></label>)}</div>{item.status === "pending" && <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>退回提案</Button><Button size="sm" disabled={busyId === item.id || accepted.length === 0} onClick={() => void review(item, "approved")}>核准所選欄位</Button></div>}</div>}
      </article>;
    })}
  </div>;
}

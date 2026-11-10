import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getProductionResourceSubmissionsAdmin, updateProductionResourceSubmissionAdmin } from "../../lib/api/admin";
import type { ProductionResourceSubmission } from "../../types/api";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";

const labels = { voice_actor: "聲演", post_production: "後製", cover_art: "封面", recording_studio: "錄音室" };

export function ProductionResourceSubmissionInbox() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<ProductionResourceSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async (next: typeof status) => {
    setLoading(true);
    setError("");
    try {
      const result = await getProductionResourceSubmissionsAdmin({ status: next, limit: 100 });
      setItems(result.items);
      setTotal(result.total);
    } catch { setError("載入資源投稿失敗，請稍後重試。"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load("pending"); }, [load]);

  async function review(item: ProductionResourceSubmission, decision: "approved" | "rejected") {
    setBusyId(item.id);
    setError("");
    try {
      const updated = await updateProductionResourceSubmissionAdmin(item.id, decision);
      notifyAdminQueueUpdated();
      if (status === "pending") {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setTotal((current) => Math.max(0, current - 1));
      } else setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "審核失敗，請稍後重試。"); }
    finally { setBusyId(null); }
  }

  return <div className="space-y-3">
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"><h2 className="text-sm font-semibold">新資源投稿審核</h2><p className="mt-1 text-xs text-muted-foreground">核准後才建立公開頁。製作資源的參與作品須已收錄於音聲目錄。</p></div>
    <div className="flex items-center gap-2"><select aria-label="審核狀態" value={status} onChange={(event) => { const next = event.target.value as typeof status; setStatus(next); void load(next); }} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option></select><Button variant="outline" size="sm" disabled={loading} onClick={() => void load(status)}>重新整理</Button><span className="text-xs text-muted-foreground">共 {total} 筆</span></div>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!loading && items.length === 0 && !error && <p className="py-8 text-center text-sm text-muted-foreground">目前沒有符合的資源投稿。</p>}
    {items.map((item) => <article key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2"><Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}</Badge><strong>{item.profile.name}</strong><span className="text-xs text-muted-foreground">{labels[item.profile.category]} · {item.submitterName}</span></div>
      {item.profile.bio && <p className="whitespace-pre-wrap text-muted-foreground">{item.profile.bio}</p>}
      <p>投稿聯絡：{item.contactEmail}</p>
      {item.profile.avatarUrl && <p>頭像：<a href={item.profile.avatarUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{item.profile.avatarUrl}</a></p>}
      {item.profile.profileUrl && <p>官方／委託頁：<a href={item.profile.profileUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{item.profile.profileUrl}</a></p>}
      {item.profile.links?.map((link) => <p key={link.url}>{link.label}：<a href={link.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{link.url}</a></p>)}
      {item.profile.works?.length > 0 && <div><p className="font-medium">參與作品</p><ul className="mt-1 space-y-1">{item.profile.works.map((work) => <li key={work.url}><a href={work.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{work.title || work.url}</a>{work.role && ` · ${work.role}`}</li>)}</ul></div>}
      {item.reviewNote && <p className="text-xs text-muted-foreground">審核備註：{item.reviewNote}</p>}
      {item.publishedId && <a href={`${window.location.hostname.startsWith("studio-dev-") ? "https://dev-open-scripts.shawnup.com" : "https://open-scripts.shawnup.com"}${item.profile.category === "voice_actor" ? `/author/${item.publishedId}` : `/resources/${item.publishedId}`}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">查看公開頁</a>}
      {item.status === "pending" && <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>退回</Button><Button size="sm" disabled={busyId === item.id} onClick={() => void review(item, "approved")}>核准上架</Button></div>}
    </article>)}
  </div>;
}

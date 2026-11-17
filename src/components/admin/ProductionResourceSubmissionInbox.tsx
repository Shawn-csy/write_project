import { PARTICIPATION_ROLE_LABELS } from "@write/public-ui/participation-roles";
import { useCallback, useEffect, useState } from "react";
import { publicSiteUrl } from "../../lib/publicSiteUrl";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getProductionResourceSubmissionsAdmin, updateProductionResourceSubmissionAdmin, getRecordingIdentitiesAdmin, updateRecordingIdentityTypeAdmin, type RecordingIdentityAdmin } from "../../lib/api/admin";
import type { ProductionResourceSubmission } from "../../types/api";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";

const labels: Record<string, string> = PARTICIPATION_ROLE_LABELS;
const workLabels = { audio: "音聲", game: "遊戲", video: "影片", other: "其他" };

export function ProductionResourceSubmissionInbox() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<ProductionResourceSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recordingTypes, setRecordingTypes] = useState<Record<string, "person" | "studio" | "">>({});
  const [recordingIdentities, setRecordingIdentities] = useState<RecordingIdentityAdmin[]>([]);
  const [recordingEdits, setRecordingEdits] = useState<Record<string, { entityType: "person" | "studio" | ""; sourceUrl: string }>>({});
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
  useEffect(() => { void load("pending"); void getRecordingIdentitiesAdmin().then(setRecordingIdentities).catch(() => setError("載入既有錄音身份失敗。")); }, [load]);

  async function saveRecordingIdentity(item: RecordingIdentityAdmin) {
    const edit = recordingEdits[item.personaId] || { entityType: item.entityType || "", sourceUrl: item.sourceUrl };
    if (!edit.entityType || !/^https?:\/\//i.test(edit.sourceUrl.trim())) { setError("請選擇錄音身份並提供可核實的來源網址。"); return; }
    setBusyId(item.personaId); setError("");
    try {
      const updated = await updateRecordingIdentityTypeAdmin(item.personaId, edit.entityType, edit.sourceUrl.trim());
      setRecordingIdentities((current) => current.map((row) => row.personaId === item.personaId ? { ...row, ...updated } : row));
      setRecordingEdits((current) => { const next = { ...current }; delete next[item.personaId]; return next; });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "更新錄音身份失敗。"); }
    finally { setBusyId(null); }
  }

  async function review(item: ProductionResourceSubmission, decision: "approved" | "rejected") {
    setBusyId(item.id);
    setError("");
    try {
      const recordingType = item.profile.category === "recording_studio" ? recordingTypes[item.id] || item.profile.recordingEntityType || "" : "";
      if (decision === "approved" && item.profile.category === "recording_studio" && !recordingType) throw new Error("請先確認錄音身份為個人或工作室");
      const updated = await updateProductionResourceSubmissionAdmin(item.id, decision, "", recordingType || undefined);
      notifyAdminQueueUpdated();
      if (status === "pending") {
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setTotal((current) => Math.max(0, current - 1));
      } else setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
      if (decision === "approved" && item.profile.category === "recording_studio") void getRecordingIdentitiesAdmin().then(setRecordingIdentities);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "審核失敗，請稍後重試。"); }
    finally { setBusyId(null); }
  }

  return <div className="space-y-3">
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2"><h2 className="text-sm font-semibold">新資源投稿審核</h2><p className="mt-1 text-xs text-muted-foreground">核准後才建立公開頁，音聲、遊戲與其他參與作品都可顯示。</p></div>
    <div className="flex items-center gap-2"><select aria-label="審核狀態" value={status} onChange={(event) => { const next = event.target.value as typeof status; setStatus(next); void load(next); }} className="h-8 rounded-md border border-input bg-background px-2 text-xs"><option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option></select><Button variant="outline" size="sm" disabled={loading} onClick={() => void load(status)}>重新整理</Button><span className="text-xs text-muted-foreground">共 {total} 筆</span></div>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {!loading && items.length === 0 && !error && <p className="py-8 text-center text-sm text-muted-foreground">目前沒有符合的資源投稿。</p>}
    {items.map((item) => <article key={item.id} className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2"><Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}</Badge><strong>{item.profile.name}</strong><span className="text-xs text-muted-foreground">{labels[item.profile.category]} · {item.submitterName}</span></div>
      {item.profile.bio && <p className="whitespace-pre-wrap text-muted-foreground">{item.profile.bio}</p>}
      {item.profile.category === "recording_studio" && <label className="flex items-center gap-2 text-sm">錄音身份<select aria-label={`${item.profile.name}的錄音身份`} value={recordingTypes[item.id] ?? item.profile.recordingEntityType ?? ""} onChange={(event) => setRecordingTypes((current) => ({ ...current, [item.id]: event.target.value as "person" | "studio" | "" }))} disabled={item.status !== "pending"} className="h-8 rounded-md border border-input bg-background px-2"><option value="">待確認</option><option value="person">個人錄音師</option><option value="studio">錄音室／工作室</option></select></label>}
      <p>投稿聯絡：{item.contactEmail}</p>
      {item.profile.avatarUrl && <p>頭像：<a href={item.profile.avatarUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{item.profile.avatarUrl}</a></p>}
      {item.profile.profileUrl && <p>官方／委託頁：<a href={item.profile.profileUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{item.profile.profileUrl}</a></p>}
      {item.profile.links?.map((link) => <p key={link.url}>{link.label}：<a href={link.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{link.url}</a></p>)}
      {item.profile.works?.length > 0 && <div><p className="font-medium">參與作品</p><ul className="mt-1 space-y-1">{item.profile.works.map((work) => <li key={work.url}><span className="text-muted-foreground">{workLabels[work.workType || "audio"]} · </span><a href={work.url} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">{work.title || work.url}</a>{work.role && ` · ${work.role}`}{work.coverUrl && <> · <a href={work.coverUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">封面圖</a></>}</li>)}</ul></div>}
      {item.reviewNote && <p className="text-xs text-muted-foreground">審核備註：{item.reviewNote}</p>}
      {item.publishedId && <a href={publicSiteUrl(item.profile.category === "voice_actor" ? `/author/${item.publishedId}` : `/resources/${item.publishedId}`)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">查看公開頁</a>}
      {item.status === "pending" && <div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>退回</Button><Button size="sm" disabled={busyId === item.id} onClick={() => void review(item, "approved")}>核准上架</Button></div>}
    </article>)}
    <section className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">既有錄音身份分類</h3>
      <p className="text-xs text-muted-foreground">依官方或本人來源更正分類；待分類身份會保留在公開目錄。</p>
      {recordingIdentities.map((item) => {
        const edit = recordingEdits[item.personaId] || { entityType: item.entityType || "", sourceUrl: item.sourceUrl };
        return <div key={item.personaId} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-xs">
          <span className="min-w-28 font-medium">{item.name}</span>
          <select aria-label={`${item.name}既有錄音身份`} value={edit.entityType} onChange={(event) => setRecordingEdits((current) => ({ ...current, [item.personaId]: { ...edit, entityType: event.target.value as "person" | "studio" | "" } }))} className="h-8 rounded-md border border-input bg-background px-2"><option value="">待分類</option><option value="person">個人錄音師</option><option value="studio">錄音室／工作室</option></select>
          <input aria-label={`${item.name}分類來源`} type="url" value={edit.sourceUrl} onChange={(event) => setRecordingEdits((current) => ({ ...current, [item.personaId]: { ...edit, sourceUrl: event.target.value } }))} placeholder="https:// 官方或本人來源" className="h-8 min-w-52 flex-1 rounded-md border border-input bg-background px-2" />
          <Button size="sm" variant="outline" disabled={busyId === item.personaId} onClick={() => void saveRecordingIdentity(item)}>儲存分類</Button>
        </div>;
      })}
    </section>
  </div>;
}

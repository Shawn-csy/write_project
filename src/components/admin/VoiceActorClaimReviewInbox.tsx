import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getVoiceActorClaimsAdmin, updateVoiceActorClaimAdmin, type VoiceActorClaimRecord } from "../../lib/api/admin";

export function VoiceActorClaimReviewInbox(): React.JSX.Element {
  const [items, setItems] = useState<VoiceActorClaimRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await getVoiceActorClaimsAdmin({ q: query, status }); setItems(result.items || []); setTotal(result.total || 0); }
    catch (cause) { console.error(cause); setError("讀取聲演認領申請失敗。"); }
    finally { setLoading(false); }
  }, [query, status]);
  useEffect(() => { void load(); }, [load]);
  const review = async (item: VoiceActorClaimRecord, next: "approved" | "rejected") => {
    const prompt = next === "approved"
      ? `核准後會將「${item.personaName}」這個共用身份（包含台本師／聲演角色）交由 ${item.verifiedEmail} 管理。確定核准？`
      : `確定退回「${item.personaName}」的認領申請？`;
    if (!window.confirm(prompt)) return;
    const reviewNote = next === "rejected"
      ? window.prompt("退回原因（選填，會顯示給申請人）") || ""
      : "";
    setBusyId(item.id); setError("");
    try { await updateVoiceActorClaimAdmin(item.id, next, reviewNote); await load(); }
    catch (cause) { console.error(cause); setError(cause instanceof Error ? cause.message : "審核失敗，請重新整理後再試。"); }
    finally { setBusyId(""); }
  };
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <header className="flex flex-wrap items-center gap-2"><div className="min-w-0 flex-1"><h2 className="font-semibold">聲演身份認領</h2><p className="text-xs text-muted-foreground">核准後會移交共用身份的管理權；同名但不同身份不會合併。共 {total} 筆</p></div><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋身份或已驗證 Email" className="h-9 w-56"/><select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option></select><Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}/>重新整理</Button></header>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {loading ? <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>讀取中…</div> : items.length ? <div className="space-y-2">{items.map((item) => <article key={item.id} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-x-2"><strong>{item.personaName}</strong><span className="text-xs text-muted-foreground">申請帳號：{item.verifiedEmail}</span><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><p className="text-xs text-muted-foreground">帳號 ID：{item.requesterId}</p>{item.note && <p className="whitespace-pre-wrap text-sm">{item.note}</p>}{item.proofUrl && <a href={item.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">身份佐證連結<ExternalLink className="h-3 w-3"/></a>}{item.reviewNote && <p className="text-xs text-muted-foreground">審核備註：{item.reviewNote}</p>}</div>
      {item.status === "pending" && <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void review(item, "rejected")}>退回</Button><Button size="sm" disabled={busyId === item.id} onClick={() => void review(item, "approved")}>{busyId === item.id ? "處理中…" : "核准並移交身份"}</Button></div>}
      {item.status !== "pending" && <span className="self-center text-xs text-muted-foreground">{item.status === "approved" ? "已核准" : "已退回"}</span>}
    </article>)}</div> : <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">目前沒有符合的認領申請。</div>}
  </section>;
}

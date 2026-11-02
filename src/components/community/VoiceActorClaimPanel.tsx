import React, { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, RefreshCw, Search } from "lucide-react";
import { fetchApi } from "../../lib/api/client";
import type { VoiceActorProfileSubmission } from "../../types/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface Candidate { id: string; displayName: string; avatar: string; hasScriptwriterRole: boolean }
interface Claim { id: string; personaName: string; verifiedEmail: string; proofUrl: string; note: string; status: string; reviewNote: string }
interface OwnedVoiceActor { id: string; displayName: string; collaborationEnabled: boolean; pendingSubmissionCount: number }
const approveFields = ["displayName", "bio", "avatar", "website", "links", "organizations", "works", "contributorName"];

export function VoiceActorClaimPanel({ currentUser }: { currentUser: { email?: string | null; emailVerified?: boolean; providerData?: Array<{ providerId: string }> } | null }): React.JSX.Element {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [owned, setOwned] = useState<OwnedVoiceActor[]>([]);
  const [submissions, setSubmissions] = useState<VoiceActorProfileSubmission[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const load = useCallback(async () => {
    try {
      const [candidateRows, claimRows, ownedRows, pending] = await Promise.all([
        fetchApi<Candidate[]>(`/voice-actor-claims/candidates?q=${encodeURIComponent(query)}`, { cache: "no-store" }),
        fetchApi<{ items: Claim[] }>("/voice-actor-claims/mine", { cache: "no-store" }),
        fetchApi<OwnedVoiceActor[]>("/my-voice-actors", { cache: "no-store" }),
      fetchApi<{ items: VoiceActorProfileSubmission[] }>("/voice-actor-profile-submissions/mine?status=pending", { cache: "no-store" }),
      ]);
      setCandidates(candidateRows); setClaims(claimRows.items || []); setOwned(ownedRows); setSubmissions(pending.items || []);
      setError("");
    } catch (cause) {
      console.error("Failed to load voice actor claim data", cause);
      setError(cause instanceof Error ? cause.message : "聲演認領資料載入失敗，請重新整理後再試。");
    }
  }, [query]);
  useEffect(() => { void load(); }, [load]);
  const requestClaim = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await fetchApi("/voice-actor-claims", { method: "POST", body: JSON.stringify({ personaId: selectedId, proofUrl, note }) });
      setNotice("認領申請已送出，審核結果會顯示在下方。"); setSelectedId(""); setProofUrl(""); setNote(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "送出認領申請失敗。"); }
    finally { setBusy(false); }
  };
  const setCollaboration = async (item: OwnedVoiceActor, enabled: boolean) => {
    setBusy(true); setError("");
    try { await fetchApi(`/voice-actor-collaboration/${encodeURIComponent(item.id)}`, { method: "PUT", body: JSON.stringify({ enabled }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "更新協作設定失敗。"); }
    finally { setBusy(false); }
  };
  const reviewSubmission = async (item: VoiceActorProfileSubmission, status: "approved" | "rejected") => {
    const action = status === "approved" ? "核准並套用這次補充的資料？" : "退回這筆資料補充？";
    if (!window.confirm(action)) return;
    setBusy(true); setError("");
    try { await fetchApi(`/voice-actor-profile-submissions/${encodeURIComponent(item.id)}/owner-status`, { method: "PATCH", body: JSON.stringify({ status, acceptedFields: status === "approved" ? (selectedFields[item.id] || approveFields) : [] }) }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "審核失敗，請稍後再試。"); }
    finally { setBusy(false); }
  };
  const selected = candidates.find((item) => item.id === selectedId);
  const canClaim = Boolean(currentUser?.emailVerified && currentUser.providerData?.some((provider) => provider.providerId === "google.com"));
  return <section className="mt-6 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
    <header><h2 className="text-base font-semibold">聲演認領與協作管理</h2><p className="mt-1 text-sm text-muted-foreground">以已驗證的 Google 帳戶認領現有聲演身份。認領需管理員核准；認領後可管理協作者補充。</p></header>
    {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-500">{notice}</p>}
    <form onSubmit={requestClaim} className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2"><h3 className="flex-1 font-medium">提出聲演認領</h3><Button type="button" variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-1 h-3.5 w-3.5"/>重新整理</Button></div>
      <p className="text-xs text-muted-foreground">目前登入：{currentUser?.email || "尚未登入"}{currentUser && !canClaim ? "（需使用已驗證 Email 的 Google 帳戶）" : ""}</p>
      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder="搜尋尚未認領的聲演身份"/></div>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">選擇要認領的身份</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.displayName}{item.hasScriptwriterRole ? "（同時有台本師身份，核准會一併移交共用身份）" : ""}</option>)}</select>
      {selected && <div className="grid gap-2 sm:grid-cols-2"><label className="space-y-1 text-xs">可核對的公開社群連結<input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://…" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"/></label><label className="space-y-1 text-xs">身份佐證說明<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="簡述這個身份如何能確認是你" className="min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"/></label></div>}
      <Button disabled={busy || !selectedId || !canClaim} size="sm">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}送出認領申請</Button>
    </form>
    {claims.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">我的認領申請</h3>{claims.map((claim) => <div key={claim.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm"><strong>{claim.personaName}</strong><span className="text-muted-foreground">{claim.status === "pending" ? "審核中" : claim.status === "approved" ? "已核准" : "已退回"}</span>{claim.proofUrl && <a href={claim.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">佐證<ExternalLink className="h-3 w-3"/></a>}{claim.reviewNote && <p className="basis-full text-xs text-muted-foreground">審核備註：{claim.reviewNote}</p>}</div>)}</div>}
    {owned.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">我管理的聲演頁</h3>{owned.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"><div className="min-w-0 flex-1"><strong>{item.displayName}</strong><p className="text-xs text-muted-foreground">{item.pendingSubmissionCount} 筆待審核補充</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.collaborationEnabled} disabled={busy} onChange={(e) => void setCollaboration(item, e.target.checked)}/>允許他人補充資料</label></div>)}</div>}
    {submissions.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">待我審核的聲演資料補充</h3>{submissions.map((item) => {
      const fields = selectedFields[item.id] || approveFields;
      const toggleField = (field: string, checked: boolean) => setSelectedFields((current) => ({ ...current, [item.id]: checked ? [...(current[item.id] || approveFields).filter((key) => key !== field), field] : (current[item.id] || approveFields).filter((key) => key !== field) }));
      const rows: Array<[string, string, unknown, unknown]> = [["displayName", "公開名稱", item.currentProfile?.displayName, item.profile.displayName], ["bio", "個人介紹", item.currentProfile?.bio, item.profile.bio], ["avatar", "頭像網址", item.currentProfile?.avatar, item.profile.avatar], ["website", "個人網站", item.currentProfile?.website, item.profile.website], ["links", "社群連結", item.currentProfile?.links, item.profile.links], ["organizations", "所屬團體", item.currentProfile?.organizations, item.profile.organizations], ["works", "參演作品", item.currentProfile?.works, item.profile.works], ["contributorName", "協力者署名", "", item.profile.contributorName]];
      return <article key={item.id} className="space-y-3 rounded-lg border border-border p-3"><div className="flex flex-wrap items-center gap-x-3"><strong>{item.personaName}</strong><span className="text-xs text-muted-foreground">補充者：{item.contributorName || item.submitterName}</span><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><div className="grid gap-1 px-2 text-[11px] text-muted-foreground sm:grid-cols-[auto_8rem_1fr_1fr]"><span/><span>資料欄位</span><span>目前內容</span><span>補充提案</span></div><div className="space-y-2">{rows.map(([field, label, before, after]) => <label key={field} className="grid gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-[auto_8rem_1fr_1fr] sm:items-start"><input type="checkbox" checked={fields.includes(field)} onChange={(e) => toggleField(field, e.target.checked)} className="mt-1"/><span className="text-xs font-medium">{label}</span><span className="min-w-0 whitespace-pre-wrap break-words text-xs text-muted-foreground">{JSON.stringify(before ?? "（空白）")}</span><span className="min-w-0 whitespace-pre-wrap break-words text-xs text-foreground">{JSON.stringify(after ?? "（空白）")}</span></label>)}</div><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void reviewSubmission(item, "rejected")}>退回</Button><Button size="sm" disabled={busy || fields.length === 0} onClick={() => void reviewSubmission(item, "approved")}><Check className="mr-1 h-3.5 w-3.5"/>核准所選資料</Button></div></article>;
    })}</div>}
  </section>;
}

import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getAllOrganizationsAdmin, getPublicAudioWorkSubmissionsAdmin, getVoiceActorsAdmin, updatePublicAudioWorkSubmissionAdmin } from "../../lib/api/admin";
import { createOrganization } from "../../lib/api/organizations";
import { notifyAdminQueueUpdated } from "../../lib/adminNotifications";
import type { AdminVoiceActor, OrgData, PublicAudioWorkSubmissionRecord } from "../../types/api";

type StatusFilter = "all" | PublicAudioWorkSubmissionRecord["status"];

function formatDate(value: number): string {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" });
}

export function PublicAudioWorkSubmissionInbox(): React.JSX.Element {
  const [items, setItems] = useState<PublicAudioWorkSubmissionRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrgData[]>([]);
  const [voiceActors, setVoiceActors] = useState<AdminVoiceActor[]>([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState<Record<string, string>>({});
  const [selectedActors, setSelectedActors] = useState<Record<string, string[]>>({});
  const [selectedAccessTypes, setSelectedAccessTypes] = useState<Record<string, "paid" | "free">>({});
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgWebsite, setNewOrgWebsite] = useState("");
  const [newOrgBanner, setNewOrgBanner] = useState("");
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
      const result = await getPublicAudioWorkSubmissionsAdmin({ q: search, status: nextStatus, limit: 100, offset: 0 });
      setItems(result.items || []);
      setTotal(result.total || 0);
    } catch (cause) {
      console.error("Failed to load audio work submissions", cause);
      setItems([]);
      setTotal(0);
      setError("讀取音聲作品投稿失敗，請確認管理員權限後重試。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("", "pending");
    void getAllOrganizationsAdmin({ limit: 500 }).then(setOrganizations).catch(() => {});
    void getVoiceActorsAdmin().then(setVoiceActors).catch(() => {});
  }, [load]);

  const updateStatus = async (id: string, nextStatus: PublicAudioWorkSubmissionRecord["status"]) => {
    setUpdatingId(id);
    setError("");
    try {
      const item = items.find((entry) => entry.id === id);
      const organizationId = selectedOrganizations[id] ?? item?.organizationId ?? "";
      const voiceActorIds = selectedActors[id] ?? item?.voiceActorIds ?? [];
      const updated = await updatePublicAudioWorkSubmissionAdmin(id, nextStatus, organizationId || null, voiceActorIds, selectedAccessTypes[id] ?? item?.accessType ?? "paid");
      notifyAdminQueueUpdated();
      setItems((current) => current.map((item) => item.id === id ? updated : item));
      if (status === "pending" && nextStatus !== "pending") {
        setItems((current) => current.filter((item) => item.id !== id));
        setTotal((current) => Math.max(0, current - 1));
      }
    } catch (cause) {
      console.error("Failed to review audio work submission", cause);
      setError(cause instanceof Error ? cause.message : "更新審核結果失敗，請稍後再試。");
    } finally {
      setUpdatingId(null);
    }
  };

  const addOrganization = async (submissionId: string) => {
    const name = newOrgName.trim();
    if (!name) { setError("請填寫組織名稱。"); return; }
    setUpdatingId(submissionId);
    setError("");
    try {
      const org = await createOrganization({ name, website: newOrgWebsite.trim(), bannerUrl: newOrgBanner.trim() });
      setOrganizations((current) => [...current, org]);
      setSelectedOrganizations((current) => ({ ...current, [submissionId]: org.id }));
      setCreatingFor(null);
      setNewOrgName(""); setNewOrgWebsite(""); setNewOrgBanner("");
    } catch (cause) {
      console.error("Failed to create audio work organization", cause);
      setError("新增組織失敗，請確認資料後重試。");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input className="h-8 text-sm" placeholder="搜尋作品、創作者或 Email" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(query, status); }} />
        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={status} onChange={(event) => { const value = event.target.value as StatusFilter; setStatus(value); void load(query, value); }} aria-label="投稿狀態">
          <option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已退回</option><option value="all">全部</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => void load(query, status)} disabled={isLoading}>{isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新整理</Button>
        <span className="shrink-0 text-xs text-muted-foreground">共 {total} 筆</span>
      </div>

      {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {!isLoading && !error && items.length === 0 && <div className="py-5 text-center text-sm text-muted-foreground">目前沒有符合的音聲作品投稿。</div>}

      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.id} className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "default" : "destructive"}>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已退回"}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline">開啟作品<ExternalLink className="h-3 w-3" /></a>
            </div>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
            <div className="mt-1 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              {item.creatorName && <span>創作者：{item.creatorName}</span>}
              {item.creatorUrl && <span><a href={item.creatorUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">創作者頁面</a></span>}
              {item.contactEmail && <span>聯絡 Email：<a className="text-primary hover:underline" href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a></span>}
            </div>
            {item.coverUrl && <a href={item.coverUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs text-primary hover:underline"><img src={item.coverUrl} alt="作品封面預覽" className="h-12 w-20 rounded border border-border/70 object-cover" loading="lazy" referrerPolicy="no-referrer" />檢視封面</a>}
            {item.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.description}</p>}
            <label className="mt-3 inline-flex items-center gap-2 text-xs">作品類型<select className="h-8 rounded-md border border-input bg-background px-2" value={selectedAccessTypes[item.id] ?? item.accessType ?? "paid"} onChange={(event) => setSelectedAccessTypes((current) => ({ ...current, [item.id]: event.target.value as "paid" | "free" }))}><option value="paid">付費作品</option><option value="free">免費作品</option></select>{item.status === "approved" && selectedAccessTypes[item.id] && selectedAccessTypes[item.id] !== item.accessType && <Button size="sm" variant="outline" className="h-8" disabled={updatingId === item.id} onClick={() => void updateStatus(item.id, "approved")}>儲存類型</Button>}</label>
            <details className="mt-3 rounded-md border border-border/70 p-2 text-xs"><summary className="cursor-pointer font-medium">聲演身份（{(selectedActors[item.id] ?? item.voiceActorIds ?? []).length}）</summary><div className="mt-2 flex flex-wrap gap-2">{voiceActors.map((actor) => <label key={actor.id} className="inline-flex items-center gap-1 rounded border border-border/70 px-2 py-1"><input type="checkbox" checked={(selectedActors[item.id] ?? item.voiceActorIds ?? []).includes(actor.id)} onChange={(event) => setSelectedActors((current) => { const ids = current[item.id] ?? item.voiceActorIds ?? []; return { ...current, [item.id]: event.target.checked ? [...ids, actor.id] : ids.filter((id) => id !== actor.id) }; })} />{actor.displayName}</label>)}</div>{item.status === "approved" && selectedActors[item.id] && <Button size="sm" variant="outline" className="mt-2 h-8" disabled={updatingId === item.id} onClick={() => void updateStatus(item.id, "approved")}>儲存聲演</Button>}</details>
            <label className="mt-3 flex flex-wrap items-center gap-2 text-xs">所屬組織
              <select className="h-9 min-w-40 rounded-md border border-input bg-background px-2" value={selectedOrganizations[item.id] ?? item.organizationId ?? ""} onChange={(event) => setSelectedOrganizations((current) => ({ ...current, [item.id]: event.target.value }))}>
                <option value="">尚未指定</option>
                {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
              {item.status === "approved" && (selectedOrganizations[item.id] ?? item.organizationId ?? "") !== (item.organizationId ?? "") && <Button size="sm" variant="outline" className="h-8" disabled={updatingId === item.id} onClick={() => void updateStatus(item.id, "approved")}>儲存組織</Button>}
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setCreatingFor(creatingFor === item.id ? null : item.id); setNewOrgName(item.creatorName || ""); }}>新增組織</Button>
            </label>
            {creatingFor === item.id && <div className="mt-2 grid gap-2 rounded-md border border-border/70 p-3 sm:grid-cols-3">
              <Input placeholder="組織名稱" value={newOrgName} onChange={(event) => setNewOrgName(event.target.value)} />
              <Input placeholder="官方網站（選填）" type="url" value={newOrgWebsite} onChange={(event) => setNewOrgWebsite(event.target.value)} />
              <Input placeholder="橫幅圖片網址（選填）" type="url" value={newOrgBanner} onChange={(event) => setNewOrgBanner(event.target.value)} />
              <Button size="sm" className="sm:col-span-3" disabled={updatingId === item.id || !newOrgName.trim()} onClick={() => void addOrganization(item.id)}>建立並選取組織</Button>
            </div>}
            {item.status !== "approved" && <div className="mt-3 flex gap-2">
              <Button size="sm" className="h-8" disabled={updatingId === item.id || !(selectedOrganizations[item.id] ?? item.organizationId)} onClick={() => void updateStatus(item.id, "approved")}>{updatingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}核准並公開</Button>
              {item.status === "pending" && <Button size="sm" variant="outline" className="h-8" disabled={updatingId === item.id} onClick={() => void updateStatus(item.id, "rejected")}>退回</Button>}
            </div>}
          </article>
        ))}
      </div>
    </div>
  );
}

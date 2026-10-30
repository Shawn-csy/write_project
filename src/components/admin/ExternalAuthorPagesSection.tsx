import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Pencil, RefreshCw, Search, Trash2, UserCircle, RotateCcw } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../ui/dialog";
import {
  getExternalAuthorPageProfilesAdmin,
  getExternalPublicScriptsAdmin,
  getAllPersonasAdmin,
  hideExternalAuthorPageAdmin,
  saveExternalAuthorPageProfileAdmin,
} from "../../lib/api/admin";
import type { ExternalAuthorPageProfile, ExternalPublicScript, PersonaLike } from "../../types/api";

interface ExternalAuthorGroup {
  key: string;
  name: string;
  bio: string;
  profileUrl: string;
  avatarUrl: string;
  scripts: ExternalPublicScript[];
  isHidden: boolean;
  linkedPersonaId: string;
}

interface ProfileForm {
  displayName: string;
  bio: string;
  profileUrl: string;
  avatarUrl: string;
  linkedPersonaId: string;
}

const normalizeAuthorKey = (value: string): string => value.normalize("NFKC").trim().toLowerCase();

export function ExternalAuthorPagesSection(): React.JSX.Element {
  const [items, setItems] = useState<ExternalPublicScript[]>([]);
  const [profiles, setProfiles] = useState<ExternalAuthorPageProfile[]>([]);
  const [personas, setPersonas] = useState<PersonaLike[]>([]);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<"published" | "hidden">("published");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<ExternalAuthorGroup | null>(null);
  const [form, setForm] = useState<ProfileForm>({ displayName: "", bio: "", profileUrl: "", avatarUrl: "", linkedPersonaId: "" });
  const [pendingHide, setPendingHide] = useState<ExternalAuthorGroup | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [scripts, authorProfiles, identityItems] = await Promise.all([
        getExternalPublicScriptsAdmin(),
        getExternalAuthorPageProfilesAdmin(),
        getAllPersonasAdmin({ limit: 500 }),
      ]);
      setItems(scripts);
      setProfiles(authorProfiles);
      setPersonas(identityItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "讀取外部作者頁失敗。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo<ExternalAuthorGroup[]>(() => {
    const grouped = new Map<string, ExternalAuthorGroup>();
    for (const script of items) {
      if (script.status !== "published") continue;
      const name = String(script.authorName || "").trim();
      if (!name) continue;
      const key = normalizeAuthorKey(name);
      const group = grouped.get(key) || {
        key, name, bio: "", profileUrl: "", avatarUrl: "", scripts: [], isHidden: false, linkedPersonaId: "",
      };
      group.scripts.push(script);
      if (!group.bio && script.authorBio?.trim()) group.bio = script.authorBio.trim();
      if (!group.profileUrl && script.authorUrl?.trim()) group.profileUrl = script.authorUrl.trim();
      if (!group.avatarUrl && script.authorAvatarUrl?.trim()) group.avatarUrl = script.authorAvatarUrl.trim();
      grouped.set(key, group);
    }
    const profileByKey = new Map(profiles.map((profile) => [normalizeAuthorKey(profile.authorKey), profile]));
    for (const [key, profile] of profileByKey) {
      const group = grouped.get(key);
      if (!group) continue;
      group.name = profile.displayName || group.name;
      group.bio = profile.bio;
      group.profileUrl = profile.profileUrl;
      group.avatarUrl = profile.avatarUrl;
      group.isHidden = profile.isHidden;
      group.linkedPersonaId = profile.linkedPersonaId || "";
    }
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...grouped.values()]
      .filter((group) => (visibility === "hidden") === group.isHidden)
      .filter((group) => !normalizedQuery || `${group.name} ${group.bio} ${group.profileUrl} ${group.scripts.map((script) => script.title || script.remoteTitle).join(" ")}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }, [items, profiles, query, visibility]);

  const visibleAuthorCount = useMemo(() => {
    const keys = new Set(items.filter((item) => item.status === "published" && item.authorName?.trim()).map((item) => normalizeAuthorKey(item.authorName || "")));
    return keys.size;
  }, [items]);
  const hiddenAuthorCount = useMemo(() => profiles.filter((profile) => profile.isHidden).length, [profiles]);
  const visibleScriptCount = groups.reduce((total, group) => total + group.scripts.length, 0);

  const openEditor = (group: ExternalAuthorGroup) => {
    setEditing(group);
    setForm({ displayName: group.name, bio: group.bio, profileUrl: group.profileUrl, avatarUrl: group.avatarUrl, linkedPersonaId: group.linkedPersonaId });
    setError("");
    setNotice("");
  };

  const saveProfile = async (restore = false) => {
    if (!editing) return;
    setIsSaving(true);
    setError("");
    try {
      await saveExternalAuthorPageProfileAdmin({
        authorKey: editing.key,
        ...form,
        isHidden: restore ? false : editing.isHidden,
      });
      await load();
      setEditing(null);
      setNotice(restore ? `已恢復「${form.displayName}」作者頁。` : `已儲存「${form.displayName}」作者頁。`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "儲存作者頁失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const hidePage = async () => {
    if (!pendingHide) return;
    setIsSaving(true);
    setError("");
    try {
      await hideExternalAuthorPageAdmin(pendingHide.key);
      const name = pendingHide.name;
      setPendingHide(null);
      await load();
      setVisibility("published");
      setNotice(`已撤下「${name}」作者頁，可從「已撤下」篩選還原。`);
    } catch (hideError) {
      setError(hideError instanceof Error ? hideError.message : "撤下作者頁失敗。");
      setPendingHide(null);
    } finally {
      setIsSaving(false);
    }
  };

  const restorePage = async (group: ExternalAuthorGroup) => {
    setIsSaving(true);
    setError("");
    try {
      await saveExternalAuthorPageProfileAdmin({
        authorKey: group.key,
        displayName: group.name,
        bio: group.bio,
        profileUrl: group.profileUrl,
        avatarUrl: group.avatarUrl,
        linkedPersonaId: group.linkedPersonaId,
        isHidden: false,
      });
      await load();
      setVisibility("published");
      setNotice(`已恢復「${group.name}」作者頁。`);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "還原作者頁失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">外部作者頁</h2>
          <p className="mt-1 text-xs text-muted-foreground">依作者合併已發布的外部台本；可集中編輯公開資料，或暫時撤下作者頁。</p>
        </div>
        <a href="/superadmin?section=external&resource=scripts" className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-muted/60">管理外部台本</a>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-background p-1">
        <Button type="button" size="sm" variant={visibility === "published" ? "secondary" : "ghost"} className="h-8 px-3 text-xs" onClick={() => setVisibility("published")}>已公開 <span className="ml-1 tabular-nums text-muted-foreground">{Math.max(visibleAuthorCount - hiddenAuthorCount, 0)}</span></Button>
        <Button type="button" size="sm" variant={visibility === "hidden" ? "secondary" : "ghost"} className="h-8 px-3 text-xs" onClick={() => setVisibility("hidden")}>已撤下 <span className="ml-1 tabular-nums text-muted-foreground">{hiddenAuthorCount}</span></Button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background px-3 py-3 sm:flex-row sm:items-center sm:px-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 pl-9 text-sm" placeholder="搜尋作者或台本" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={() => void load()} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}重新載入
        </Button>
        <span className="shrink-0 text-xs text-muted-foreground">{groups.length} 位作者 · {visibleScriptCount} 部台本</span>
      </div>

      {error && !editing && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {notice && <div role="status" className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">{notice}</div>}
      {isLoading ? <div className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />載入外部作者頁…</div>
        : groups.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{visibility === "hidden" ? "沒有已撤下的作者頁。" : items.length === 0 ? "尚無可公開的外部作者頁；發布外部台本並填入作者名稱後會自動建立。" : "找不到符合條件的外部作者頁。"}</div>
          : <div className="grid gap-2 xl:grid-cols-2">
            {groups.map((group) => (
              <article key={group.key} className="min-w-0 rounded-xl border border-border/70 bg-background/60 p-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground">
                    {group.avatarUrl ? <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UserCircle className="h-6 w-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><h3 className="truncate text-sm font-semibold">{group.name}</h3><Badge variant="secondary" className="text-[10px]">{group.scripts.length} 部台本</Badge>{group.linkedPersonaId && <Badge variant="outline" className="text-[10px]">已連結公開身份</Badge>}{group.isHidden && <Badge variant="outline" className="text-[10px]">已撤下</Badge>}</div>
                    {group.bio && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{group.bio}</p>}
                    {group.profileUrl && <a href={group.profileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 truncate text-xs text-primary hover:underline">作者社群 <ExternalLink className="h-3 w-3 shrink-0" /></a>}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {group.isHidden ? <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" disabled={isSaving} onClick={() => void restorePage(group)}><RotateCcw className="mr-1 h-3.5 w-3.5" />還原</Button> : <a href={group.linkedPersonaId ? `https://dev-open-scripts.shawnup.com/author/${encodeURIComponent(group.linkedPersonaId)}` : `https://dev-open-scripts.shawnup.com/author/external/${encodeURIComponent(group.name)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input px-2.5 text-xs font-medium hover:bg-muted/60"><ExternalLink className="h-3.5 w-3.5" />預覽</a>}
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => openEditor(group)}><Pencil className="mr-1 h-3.5 w-3.5" />編輯</Button>
                    {!group.isHidden && <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setPendingHide(group)}><Trash2 className="mr-1 h-3.5 w-3.5" />撤下</Button>}
                  </div>
                </div>
                <details className="group mt-3 rounded-lg border border-border/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium [&::-webkit-details-marker]:hidden">
                    <span>來源台本 <span className="text-muted-foreground">{group.scripts.length}</span></span>
                    <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                  </summary>
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {group.scripts.map((script) => <li key={script.id} className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate">{script.title || script.remoteTitle || "未命名台本"}</span>
                      <a href={script.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-primary hover:underline">原始來源</a>
                    </li>)}
                  </ul>
                </details>
              </article>
            ))}
          </div>}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !isSaving) setEditing(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>編輯外部作者頁</DialogTitle>
            <DialogDescription>這些資料會套用到此作者的公開頁與已發布外部台本，不會改動來源台本內容。</DialogDescription>
          </DialogHeader>
          {editing && <div className="grid gap-3 py-1">
            <div className="grid gap-1.5"><Label htmlFor="external-author-display-name">顯示名稱</Label><Input id="external-author-display-name" value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} maxLength={200} /></div>
            <div className="grid gap-1.5"><Label htmlFor="external-author-bio">作者介紹</Label><Textarea id="external-author-bio" value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={5} maxLength={10000} /></div>
            <div className="grid gap-1.5"><Label htmlFor="external-author-profile-url">社群／個人頁連結</Label><Input id="external-author-profile-url" type="url" placeholder="https://…" value={form.profileUrl} onChange={(event) => setForm((current) => ({ ...current, profileUrl: event.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="external-author-avatar-url">頭像連結</Label><Input id="external-author-avatar-url" type="url" placeholder="https://… 或 /media/…" value={form.avatarUrl} onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="external-author-persona">連結既有公開身份</Label><select id="external-author-persona" value={form.linkedPersonaId} onChange={(event) => setForm((current) => ({ ...current, linkedPersonaId: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">不連結，保留獨立外部作者頁</option>{personas.slice().sort((a, b) => String(a.displayName || "").localeCompare(String(b.displayName || ""), "zh-Hant")).map((persona) => <option key={persona.id} value={persona.id}>{persona.displayName || "未命名身份"}</option>)}</select><p className="text-xs text-muted-foreground">連結後，作者與聲演共用同一個公開身份頁；角色由作品與 Demo 關聯自動判定。</p></div>
            {error && <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          </div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>取消</Button>
            <Button type="button" onClick={() => void saveProfile(editing?.isHidden ?? false)} disabled={isSaving || !form.displayName.trim()}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing?.isHidden ? "儲存並還原" : "儲存變更"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingHide)} onOpenChange={(open) => { if (!open && !isSaving) setPendingHide(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤下作者頁？</AlertDialogTitle>
            <AlertDialogDescription>「{pendingHide?.name}」的公開作者頁會下架，外部台本中的作者連結也會隱藏。外部台本與來源資料會保留，可在「已撤下」中還原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={isSaving} onClick={(event) => { event.preventDefault(); void hidePage(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isSaving ? "處理中…" : "確認撤下"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

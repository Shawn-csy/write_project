import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, ImageIcon, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import {
  createExternalPublicScriptAdmin,
  deleteExternalPublicScriptAdmin,
  getAllOrganizationsAdmin,
  getAllPersonasAdmin,
  getExternalPublicScriptsAdmin,
  previewExternalPublicScriptAdmin,
  updateExternalPublicScriptAdmin,
  type ExternalPublicScriptPayload,
  type ExternalPublicScriptPreview,
} from "../../lib/api/admin";
import type { ExternalPublicScript, OrgData, PersonaLike } from "../../types/api";

interface Draft {
  id?: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourceDomain: string;
  sourceName: string;
  authorName: string;
  authorBio: string;
  authorUrl: string;
  authorAvatarUrl: string;
  organizationName: string;
  organizationBio: string;
  organizationUrl: string;
  organizationAvatarUrl: string;
  remoteTitle: string;
  remoteSummary: string;
  remoteCoverUrl: string;
  titleOverride: string;
  summaryOverride: string;
  coverUrlOverride: string;
  seriesName: string;
  seriesOrder: string;
  demoLinksText: string;
  demoLinks: Array<{ id?: string; name?: string; url: string; coverUrl?: string; cast?: string; description?: string }>;
  refreshMetadata: boolean;
  categoriesText: string;
  mountedAt: string;
  status: "draft" | "published" | "hidden";
  sortOrder: string;
}

const EMPTY_DRAFT: Draft = {
  sourceUrl: "",
  canonicalUrl: "",
  sourceDomain: "",
  sourceName: "",
  authorName: "",
  authorBio: "",
  authorUrl: "",
  authorAvatarUrl: "",
  organizationName: "",
  organizationBio: "",
  organizationUrl: "",
  organizationAvatarUrl: "",
  remoteTitle: "",
  remoteSummary: "",
  remoteCoverUrl: "",
  titleOverride: "",
  summaryOverride: "",
  coverUrlOverride: "",
  seriesName: "",
  seriesOrder: "",
  demoLinksText: "",
  demoLinks: [],
  refreshMetadata: false,
  categoriesText: "",
  mountedAt: "",
  status: "published",
  sortOrder: "0",
};

function toDraft(item: ExternalPublicScript): Draft {
  return {
    id: item.id,
    sourceUrl: item.sourceUrl || "",
    canonicalUrl: item.canonicalUrl || "",
    sourceDomain: item.sourceDomain || "",
    sourceName: item.sourceName || "",
    authorName: item.authorName || "",
    authorBio: item.authorBio || "",
    authorUrl: item.authorUrl || "",
    authorAvatarUrl: item.authorAvatarUrl || "",
    organizationName: item.organizationName || "",
    organizationBio: item.organizationBio || "",
    organizationUrl: item.organizationUrl || "",
    organizationAvatarUrl: item.organizationAvatarUrl || "",
    remoteTitle: item.remoteTitle || "",
    remoteSummary: item.remoteSummary || "",
    remoteCoverUrl: item.remoteCoverUrl || "",
    titleOverride: item.titleOverride || item.remoteTitle || "",
    summaryOverride: item.summaryOverride || item.remoteSummary || "",
    coverUrlOverride: item.coverUrlOverride || "",
    seriesName: item.seriesName || "",
    seriesOrder: item.seriesOrder == null ? "" : String(item.seriesOrder),
    demoLinksText: (item.demoLinks || []).map((link) => link.coverUrl ? `${link.url} | ${link.coverUrl}` : link.url).filter(Boolean).join("\n"),
    demoLinks: item.demoLinks || [],
    refreshMetadata: false,
    categoriesText: (item.categories || []).join(", "),
    mountedAt: toDateTimeLocal(item.mountedAt || item.createdAt),
    status: item.status || "draft",
    sortOrder: String(item.sortOrder ?? 0),
  };
}

function toDateTimeLocal(value?: number | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function makeEmptyDraft(): Draft {
  return { ...EMPTY_DRAFT };
}

interface DirectoryOption {
  name: string;
  url: string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthorGroup {
  key: string;
  name: string;
  items: ExternalPublicScript[];
}

const UNKNOWN_AUTHOR_NAME = "未指定作者";
const UNKNOWN_AUTHOR_KEY = "author:__unknown__";

function getAuthorGroupDetails(item: ExternalPublicScript): { key: string; name: string } {
  const name = item.authorName?.trim();
  return name
    ? { key: `author:${name.toLocaleLowerCase()}`, name }
    : { key: UNKNOWN_AUTHOR_KEY, name: UNKNOWN_AUTHOR_NAME };
}

function getSourceLabel(item: ExternalPublicScript): string {
  if (item.sourceName?.trim()) return item.sourceName.trim();
  if (item.sourceDomain?.trim()) return item.sourceDomain.trim();
  try {
    return new URL(item.sourceUrl).hostname;
  } catch {
    return "外部來源";
  }
}

function firstPersonaLink(persona: PersonaLike): string {
  if (persona.website?.trim()) return persona.website.trim();
  if (Array.isArray(persona.links)) {
    const link = persona.links.find((item) => item?.url?.trim());
    return link?.url?.trim() || "";
  }
  if (typeof persona.links === "string") {
    try {
      const links = JSON.parse(persona.links) as Array<{ url?: string }>;
      return links.find((item) => item?.url?.trim())?.url?.trim() || "";
    } catch {
      return "";
    }
  }
  return "";
}

function toCategories(value: string): string[] {
  return Array.from(new Set(value.split(/[,，、]/).map((item) => item.trim()).filter(Boolean)));
}

function toDemoLinks(value: string, existingLinks: Draft["demoLinks"]): Draft["demoLinks"] {
  const existingByUrl = new Map(existingLinks.map((link) => [link.url, link]));
  return Array.from(new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)))
    .map((line) => {
      const hasCoverField = line.includes("|");
      const [url = "", coverUrl = ""] = line.split("|", 2).map((part) => part.trim());
      const existing = existingByUrl.get(url);
      return {
        ...existing,
        name: existing?.name || "",
        url,
        coverUrl: hasCoverField ? coverUrl : existing?.coverUrl || "",
        cast: existing?.cast || "",
        description: existing?.description || "",
      };
    })
    .filter((link) => Boolean(link.url));
}

function formatMountedAt(value?: number): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toPayload(draft: Draft): ExternalPublicScriptPayload {
  return {
    sourceUrl: draft.sourceUrl.trim(),
    canonicalUrl: draft.canonicalUrl || undefined,
    sourceDomain: draft.sourceDomain || undefined,
    sourceName: draft.sourceName || undefined,
    authorName: draft.authorName.trim(),
    authorBio: draft.authorBio.trim(),
    authorUrl: draft.authorUrl.trim(),
    authorAvatarUrl: draft.authorAvatarUrl.trim(),
    organizationName: draft.organizationName.trim(),
    organizationBio: draft.organizationBio.trim(),
    organizationUrl: draft.organizationUrl.trim(),
    organizationAvatarUrl: draft.organizationAvatarUrl.trim(),
    remoteTitle: draft.remoteTitle,
    remoteSummary: draft.remoteSummary,
    remoteCoverUrl: draft.remoteCoverUrl,
    titleOverride: draft.titleOverride.trim(),
    summaryOverride: draft.summaryOverride.trim(),
    coverUrlOverride: draft.coverUrlOverride.trim(),
    seriesName: draft.seriesName.trim(),
    seriesOrder: draft.seriesOrder.trim() ? Number(draft.seriesOrder) : null,
    demoLinks: toDemoLinks(draft.demoLinksText, draft.demoLinks),
    refreshMetadata: draft.refreshMetadata,
    categories: toCategories(draft.categoriesText),
    mountedAt: fromDateTimeLocal(draft.mountedAt),
    status: draft.status,
    sortOrder: Number.isFinite(Number(draft.sortOrder)) ? Number(draft.sortOrder) : 0,
  };
}

export function ExternalPublicScriptSection() {
  const [items, setItems] = useState<ExternalPublicScript[]>([]);
  const [personas, setPersonas] = useState<PersonaLike[]>([]);
  const [organizations, setOrganizations] = useState<OrgData[]>([]);
  const [draft, setDraft] = useState<Draft>(makeEmptyDraft);
  const [preview, setPreview] = useState<ExternalPublicScriptPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isFetchingCover, setIsFetchingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [expandedAuthors, setExpandedAuthors] = useState<Set<string>>(new Set());

  const loadItems = async () => {
    setIsLoading(true);
    try {
      setItems(await getExternalPublicScriptsAdmin());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "載入外部公開台本失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    void (async () => {
      try {
        const [nextPersonas, nextOrganizations] = await Promise.all([
          getAllPersonasAdmin({ limit: 300 }),
          getAllOrganizationsAdmin({ limit: 300 }),
        ]);
        setPersonas(nextPersonas || []);
        setOrganizations(nextOrganizations || []);
      } catch {
        // Previous external entries still provide useful local suggestions.
      }
    })();
  }, []);

  const authorOptions = useMemo<DirectoryOption[]>(() => {
    const options = new Map<string, DirectoryOption>();
    for (const item of items) {
      const name = item.authorName?.trim();
      if (!name) continue;
      const existing = options.get(name);
      options.set(name, {
        name,
        url: existing?.url || item.authorUrl?.trim() || "",
        bio: existing?.bio || item.authorBio?.trim() || "",
        avatarUrl: existing?.avatarUrl || item.authorAvatarUrl?.trim() || "",
      });
    }
    for (const persona of personas) {
      const name = persona.displayName?.trim();
      if (!name) continue;
      const existing = options.get(name);
      options.set(name, {
        name,
        url: firstPersonaLink(persona) || existing?.url || "",
        bio: persona.bio?.trim() || existing?.bio || "",
        avatarUrl: persona.avatar?.trim() || existing?.avatarUrl || "",
      });
    }
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }, [items, personas]);

  const organizationOptions = useMemo<DirectoryOption[]>(() => {
    const options = new Map<string, DirectoryOption>();
    for (const item of items) {
      const name = item.organizationName?.trim();
      if (name) options.set(`external:${name}`, { name, url: item.organizationUrl?.trim() || "" });
    }
    for (const organization of organizations) {
      const name = organization.name?.trim();
      if (name) options.set(`organization:${organization.id}`, { name, url: organization.website?.trim() || "" });
    }
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
  }, [items, organizations]);

  const seriesOptions = useMemo(() => Array.from(new Set(
    items.map((item) => item.seriesName?.trim()).filter((name): name is string => Boolean(name))
  )).sort((a, b) => a.localeCompare(b, "zh-Hant")), [items]);

  const authorGroups = useMemo<AuthorGroup[]>(() => {
    const groups = new Map<string, AuthorGroup>();
    for (const item of items) {
      const author = getAuthorGroupDetails(item);
      const existing = groups.get(author.key);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(author.key, {
          key: author.key,
          name: author.name,
          items: [item],
        });
      }
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.key === UNKNOWN_AUTHOR_KEY) return 1;
      if (b.key === UNKNOWN_AUTHOR_KEY) return -1;
      return a.name.localeCompare(b.name, "zh-Hant");
    });
  }, [items]);

  const filteredAuthorGroups = useMemo(() => {
    const query = filterQuery.trim().toLocaleLowerCase();
    if (!query) return authorGroups;
    return authorGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => [
          item.title,
          item.authorName,
          item.sourceName,
          item.sourceDomain,
          item.sourceUrl,
          ...(item.categories || []),
        ].some((value) => String(value || "").toLocaleLowerCase().includes(query))),
      }))
      .filter((group) => group.items.length > 0);
  }, [filterQuery, authorGroups]);

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handlePreview = async (forceRefresh = false): Promise<boolean> => {
    const sourceUrl = draft.sourceUrl.trim();
    if (!sourceUrl) {
      setError("請先貼上公開台本網址。");
      return false;
    }
    setError("");
    setStatusMessage("");
    setIsPreviewing(true);
    try {
      const nextPreview = await previewExternalPublicScriptAdmin(sourceUrl, {
        authorUrl: draft.authorUrl,
        organizationUrl: draft.organizationUrl,
      });
      setPreview(nextPreview);
      setDraft((current) => ({
        ...current,
        sourceUrl: nextPreview.sourceUrl || sourceUrl,
        canonicalUrl: nextPreview.canonicalUrl || "",
        sourceDomain: nextPreview.sourceDomain || "",
        sourceName: nextPreview.sourceName || "",
        authorName: forceRefresh ? (nextPreview.authorName || current.authorName) : (current.authorName || nextPreview.authorName || ""),
        authorBio: forceRefresh ? (nextPreview.authorBio || current.authorBio) : (current.authorBio || nextPreview.authorBio || ""),
        authorUrl: forceRefresh ? (nextPreview.authorUrl || current.authorUrl) : (current.authorUrl || nextPreview.authorUrl || ""),
        authorAvatarUrl: forceRefresh ? (nextPreview.authorAvatarUrl || current.authorAvatarUrl) : (current.authorAvatarUrl || nextPreview.authorAvatarUrl || ""),
        organizationName: forceRefresh ? (nextPreview.organizationName || current.organizationName) : (current.organizationName || nextPreview.organizationName || ""),
        organizationBio: forceRefresh ? (nextPreview.organizationBio || current.organizationBio) : (current.organizationBio || nextPreview.organizationBio || ""),
        organizationUrl: forceRefresh ? (nextPreview.organizationUrl || current.organizationUrl) : (current.organizationUrl || nextPreview.organizationUrl || ""),
        organizationAvatarUrl: forceRefresh ? (nextPreview.organizationAvatarUrl || current.organizationAvatarUrl) : (current.organizationAvatarUrl || nextPreview.organizationAvatarUrl || ""),
        mountedAt: !current.id && !current.mountedAt && nextPreview.sourceCreatedAt
          ? toDateTimeLocal(nextPreview.sourceCreatedAt)
          : current.mountedAt,
        remoteTitle: nextPreview.remoteTitle || "",
        remoteSummary: nextPreview.remoteSummary || "",
        remoteCoverUrl: nextPreview.remoteCoverUrl || "",
        titleOverride: current.titleOverride || nextPreview.remoteTitle || "",
        summaryOverride: current.summaryOverride || nextPreview.remoteSummary || "",
      }));
      setStatusMessage("已取得公開台本資料，可以調整後儲存。");
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "取得公開台本資料失敗");
      return false;
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleRefreshMetadata = async () => {
    const refreshed = await handlePreview(true);
    if (refreshed) {
      updateDraft({ refreshMetadata: true });
      setStatusMessage("已重新取得作者、組織與封面照片資料；仍可手動修改後儲存。");
    }
  };

  const handleFetchCover = async () => {
    const sourceUrl = draft.sourceUrl.trim();
    if (!sourceUrl) {
      setError("請先貼上公開台本網址。");
      return;
    }
    setError("");
    setStatusMessage("");
    setIsFetchingCover(true);
    try {
      const nextPreview = await previewExternalPublicScriptAdmin(sourceUrl, {
        authorUrl: draft.authorUrl,
        organizationUrl: draft.organizationUrl,
      });
      setPreview(nextPreview);
      setDraft((current) => ({
        ...current,
        sourceUrl: nextPreview.sourceUrl || sourceUrl,
        remoteCoverUrl: nextPreview.remoteCoverUrl || "",
        refreshMetadata: true,
      }));
      setStatusMessage(nextPreview.coverPreviewDataUrl || nextPreview.remoteCoverUrl
        ? "已取得封面預覽；儲存後會自動放入外部台本封面資料夾。"
        : "這個來源沒有提供可用封面，仍可自行填入封面網址。");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "取得封面失敗");
    } finally {
      setIsFetchingCover(false);
    }
  };

  const handleSave = async () => {
    if (!draft.sourceUrl.trim()) {
      setError("請先貼上公開台本網址。");
      return;
    }
    setError("");
    setStatusMessage("");
    setIsSaving(true);
    try {
      const payload = toPayload(draft);
      if (draft.id) {
        await updateExternalPublicScriptAdmin(draft.id, payload);
      } else {
        await createExternalPublicScriptAdmin(payload);
      }
      await loadItems();
      setDraft(makeEmptyDraft());
      setPreview(null);
      setIsFormOpen(false);
      setStatusMessage(draft.id ? "外部公開台本已更新。" : "外部公開台本已加入首頁。");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "儲存外部公開台本失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: ExternalPublicScript) => {
    const authorKey = getAuthorGroupDetails(item).key;
    setExpandedAuthors((current) => {
      const next = new Set(current);
      next.add(authorKey);
      return next;
    });
    setDraft(toDraft(item));
    setIsFormOpen(true);
    setPreview({
      sourceUrl: item.sourceUrl,
      canonicalUrl: item.canonicalUrl,
      sourceDomain: item.sourceDomain,
      sourceName: item.sourceName,
      authorName: item.authorName,
      authorUrl: item.authorUrl,
      authorAvatarUrl: item.authorAvatarUrl,
      organizationName: item.organizationName,
      organizationUrl: item.organizationUrl,
      organizationAvatarUrl: item.organizationAvatarUrl,
      remoteTitle: item.remoteTitle,
      remoteSummary: item.remoteSummary,
      remoteCoverUrl: item.remoteCoverUrl,
      organizationBio: item.organizationBio,
      sourceCreatedAt: item.sourceCreatedAt,
      sourceModifiedAt: item.sourceModifiedAt,
    });
    setError("");
    setStatusMessage("");
  };

  const handleDelete = async (item: ExternalPublicScript) => {
    if (!window.confirm(`確定要移除「${item.title || item.sourceUrl}」嗎？`)) return;
    setError("");
    try {
      await deleteExternalPublicScriptAdmin(item.id);
      await loadItems();
      if (draft.id === item.id) {
        setDraft(makeEmptyDraft());
        setPreview(null);
        setIsFormOpen(false);
      }
      setStatusMessage("外部公開台本已移除。");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "移除外部公開台本失敗");
    }
  };

  const handleReset = () => {
    setDraft(makeEmptyDraft());
    setPreview(null);
    setIsFormOpen(false);
    setError("");
    setStatusMessage("");
  };

  const toggleAuthor = (authorKey: string) => {
    setExpandedAuthors((current) => {
      const next = new Set(current);
      if (next.has(authorKey)) next.delete(authorKey);
      else next.add(authorKey);
      return next;
    });
  };

  const previewImage = draft.coverUrlOverride.trim() || preview?.coverPreviewDataUrl || draft.remoteCoverUrl.trim();
  const previewTitle = draft.titleOverride.trim() || draft.remoteTitle.trim();
  const previewSummary = draft.summaryOverride.trim() || draft.remoteSummary.trim();
  const authorAvatarPreview = draft.authorAvatarUrl.trim();
  const organizationAvatarPreview = draft.organizationAvatarUrl.trim();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">外部公開台本</h2>
            <Badge variant="secondary">{items.length} 筆</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">依作者分組；台本內容由來源網站提供。</p>
        </div>
        <Button type="button" variant={isFormOpen ? "outline" : "default"} size="sm" onClick={() => setIsFormOpen((open) => !open)}>
          {isFormOpen ? <ChevronDown className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1">{isFormOpen ? "收合表單" : "新增台本來源"}</span>
        </Button>
      </div>

      {isFormOpen && (
      <div className="rounded-xl border bg-background/70 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium text-sm">{draft.id ? "編輯外部台本" : "新增外部台本"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">貼上公開網址後取得資料，再確認顯示內容。</div>
          </div>
          {draft.id && <Button type="button" variant="ghost" size="sm" onClick={() => { handleReset(); setIsFormOpen(true); }}>新增一筆</Button>}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={draft.sourceUrl}
            onChange={(event) => updateDraft({ sourceUrl: event.target.value })}
            placeholder="貼上公開台本網址（https://...）"
            aria-label="公開台本網址"
          />
          <Button type="button" variant="secondary" onClick={() => void handlePreview()} disabled={isPreviewing || !draft.sourceUrl.trim()}>
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1">取得資料</span>
          </Button>
          <Button type="button" variant="outline" onClick={handleFetchCover} disabled={isFetchingCover || !draft.sourceUrl.trim()}>
            {isFetchingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            <span className="ml-1">取得封面</span>
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleRefreshMetadata()} disabled={isPreviewing || !draft.sourceUrl.trim()}>
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1">更新資料／照片</span>
          </Button>
        </div>

        {(preview || draft.id) && (
          <div className="grid gap-4 md:grid-cols-[150px_1fr] rounded-md border bg-background p-3">
            <div className="aspect-[2/3] overflow-hidden rounded-md border bg-muted">
              {previewImage ? (
                <img src={previewImage} alt={previewTitle || "外部公開台本封面"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">沒有可用封面</div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {draft.sourceName || draft.sourceDomain || "外部來源"}
                {draft.sourceDomain && <span className="ml-1">· {draft.sourceDomain}</span>}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={draft.authorName}
                  onChange={(event) => {
                    const value = event.target.value;
                    const selected = authorOptions.find((option) => option.name === value);
                    updateDraft({
                      authorName: value,
                      ...(selected ? {
                        authorBio: selected.bio || "",
                        authorUrl: selected.url,
                        authorAvatarUrl: selected.avatarUrl || "",
                      } : {}),
                    });
                  }}
                  list="external-script-author-options"
                  placeholder="作者名稱（可從既有資料選擇）"
                  aria-label="作者名稱"
                />
                <Input value={draft.authorUrl} onChange={(event) => updateDraft({ authorUrl: event.target.value })} placeholder="作者連結（可修改）" aria-label="作者連結" />
                <Input value={draft.authorAvatarUrl} onChange={(event) => updateDraft({ authorAvatarUrl: event.target.value })} placeholder="作者頭像網址（可手動指定）" aria-label="作者頭像網址" />
                <Textarea value={draft.authorBio} onChange={(event) => updateDraft({ authorBio: event.target.value })} placeholder="作者說明（可從 X 公開介紹帶入）" aria-label="作者說明" rows={3} />
                <Input
                  value={draft.organizationName}
                  onChange={(event) => {
                    const value = event.target.value;
                    const selected = organizationOptions.find((option) => option.name === value);
                    updateDraft({ organizationName: value, ...(selected ? { organizationUrl: selected.url } : {}) });
                  }}
                  list="external-script-organization-options"
                  placeholder="所屬組織（可從既有資料選擇）"
                  aria-label="所屬組織"
                />
                <Input value={draft.organizationUrl} onChange={(event) => updateDraft({ organizationUrl: event.target.value })} placeholder="組織連結（可修改）" aria-label="組織連結" />
                <Input value={draft.organizationAvatarUrl} onChange={(event) => updateDraft({ organizationAvatarUrl: event.target.value })} placeholder="組織頭像／Logo 網址（可手動指定）" aria-label="組織頭像網址" />
                <Textarea value={draft.organizationBio} onChange={(event) => updateDraft({ organizationBio: event.target.value })} placeholder="組織說明（可從 X 公開介紹帶入）" aria-label="組織說明" rows={3} />
              </div>
              <datalist id="external-script-author-options">
                {authorOptions.map((option) => <option key={`${option.name}-${option.url}`} value={option.name} />)}
              </datalist>
              {(authorAvatarPreview || organizationAvatarPreview) && (
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  {authorAvatarPreview && <span className="inline-flex items-center gap-1.5"><img src={authorAvatarPreview} alt="作者頭像預覽" className="h-5 w-5 rounded-full object-cover" referrerPolicy="no-referrer" />作者頭像預覽</span>}
                  {organizationAvatarPreview && <span className="inline-flex items-center gap-1.5"><img src={organizationAvatarPreview} alt="組織 Logo 預覽" className="h-5 w-5 rounded object-cover" referrerPolicy="no-referrer" />組織 Logo 預覽</span>}
                </div>
              )}
              <datalist id="external-script-organization-options">
                {organizationOptions.map((option) => <option key={`${option.name}-${option.url}`} value={option.name} />)}
              </datalist>
              <Input value={draft.titleOverride} onChange={(event) => updateDraft({ titleOverride: event.target.value })} placeholder={previewTitle || "標題（可修改）"} aria-label="台本標題" />
              <Textarea value={draft.summaryOverride} onChange={(event) => updateDraft({ summaryOverride: event.target.value })} placeholder={previewSummary || "摘要（可修改）"} rows={3} aria-label="台本摘要" />
              <Input value={draft.coverUrlOverride} onChange={(event) => updateDraft({ coverUrlOverride: event.target.value })} placeholder="封面照片網址（可手動指定；第一頁封面會自動保留）" aria-label="封面照片網址" />
              <Input value={draft.categoriesText} onChange={(event) => updateDraft({ categoriesText: event.target.value })} placeholder="分類，以逗號分隔，例如：奇幻、短篇、配音" />
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <Input
                  value={draft.seriesName}
                  onChange={(event) => updateDraft({ seriesName: event.target.value })}
                  list="external-script-series-options"
                  placeholder="系列名稱（可從既有系列選擇）"
                  aria-label="系列名稱"
                />
                <Input
                  type="number"
                  min="0"
                  value={draft.seriesOrder}
                  onChange={(event) => updateDraft({ seriesOrder: event.target.value })}
                  placeholder="系列順序"
                  aria-label="系列順序"
                />
              </div>
              <datalist id="external-script-series-options">
                {seriesOptions.map((name) => <option key={name} value={name} />)}
              </datalist>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>範例／Demo 連結（可用「連結 | 封面連結」補封面）</span>
                <Textarea
                  value={draft.demoLinksText}
                  onChange={(event) => updateDraft({ demoLinksText: event.target.value })}
                  placeholder="Demo 連結 | 封面圖片連結（選填）"
                  aria-label="外部台本範例連結"
                  rows={3}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>掛載時間</span>
                <Input type="datetime-local" value={draft.mountedAt} onChange={(event) => updateDraft({ mountedAt: event.target.value })} aria-label="掛載時間" />
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.status}
                  onChange={(event) => updateDraft({ status: event.target.value as Draft["status"] })}
                  aria-label="公開狀態"
                >
                  <option value="published">立即顯示於首頁</option>
                  <option value="draft">草稿</option>
                  <option value="hidden">隱藏</option>
                </select>
                <Input className="sm:w-28" type="number" value={draft.sortOrder} onChange={(event) => updateDraft({ sortOrder: event.target.value })} placeholder="排序" aria-label="排序" />
                <Button type="button" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  <span className="ml-1">{draft.id ? "儲存修改" : "加入首頁"}</span>
                </Button>
                {draft.id && <Button type="button" variant="outline" onClick={handleReset}>取消</Button>}
              </div>
            </div>
          </div>
        )}

      </div>
      )}

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
      {statusMessage && <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{statusMessage}</div>}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="搜尋來源、台本或作者" aria-label="搜尋外部台本" />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void loadItems()} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "重新載入"}
        </Button>
        <span className="shrink-0 text-xs text-muted-foreground">顯示 {filteredAuthorGroups.reduce((total, group) => total + group.items.length, 0)} / {items.length} 筆</span>
      </div>

      {isLoading ? (
        <div className="flex min-h-32 items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />載入外部台本…
        </div>
      ) : filteredAuthorGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{items.length === 0 ? "目前沒有外部台本來源。" : "找不到符合條件的台本。"}</div>
      ) : (
        <div className="space-y-1.5">
          {filteredAuthorGroups.map((group) => {
            const isExpanded = expandedAuthors.has(group.key);
            const sourceCount = new Set(group.items.map(getSourceLabel)).size;
            return (
              <section key={group.key} className="overflow-hidden rounded-lg border border-border/70 bg-background/50">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 bg-muted/20 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                  onClick={() => toggleAuthor(group.key)}
                  aria-expanded={isExpanded}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{group.name}</span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">{group.items.length} 部台本</Badge>
                    </span>
                    {sourceCount > 1 && <span className="mt-0.5 block text-xs text-muted-foreground">{sourceCount} 個來源網站</span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="divide-y">
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2.5 p-2.5 sm:px-3">
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                          {item.coverUrl ? <img src={item.coverUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{item.title || "無標題"}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {getSourceLabel(item)}
                            {formatMountedAt(item.mountedAt || item.createdAt) && <span className="ml-2">· {formatMountedAt(item.mountedAt || item.createdAt)}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(item.categories || []).map((category) => <Badge key={category} variant="secondary" className="text-[10px]">{category}</Badge>)}
                            {item.seriesName && <Badge variant="outline" className="text-[10px]">系列：{item.seriesName}{item.seriesOrder != null ? ` #${item.seriesOrder}` : ""}</Badge>}
                            <Badge variant={item.status === "published" ? "default" : "outline"} className="text-[10px]">{item.status === "published" ? "首頁顯示" : item.status === "hidden" ? "隱藏" : "草稿"}</Badge>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="開啟原始台本" title="開啟來源" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(item)} aria-label="編輯外部台本"><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => void handleDelete(item)} aria-label="移除外部台本"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

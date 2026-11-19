import React from "react";
import { Folder, FolderPlus, Image as ImageIcon, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MEDIA_FILE_ACCEPT, formatBytes } from "../../lib/mediaLibrary";
import type { CloudMediaItem } from "../../hooks/useMediaLibrary";
import { useI18n } from "../../contexts/I18nContext";
import type { MediaLibraryOrganization } from "../../lib/api/media";

type SortBy = "newest" | "name" | "size";

interface Props {
  items: CloudMediaItem[];
  stats: { count: number; usedBytes: number; maxBytes: number; ratio: number };
  isLoading: boolean;
  isUploading: boolean;
  deletingUrl?: string;
  error?: string;
  query: string;
  setQuery: (value: string) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  selectedId: string;
  setSelectedId: (value: string) => void;
  onUploadChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (url: string) => void;
  onClearAll?: () => void;
  onPrimaryAction?: (item: CloudMediaItem) => void;
  primaryActionLabel?: string;
  rightTopActions?: React.ReactNode;
  organization?: MediaLibraryOrganization;
  onOrganizationChange?: (organization: MediaLibraryOrganization) => void;
  className?: string;
}

type MediaGroup = "externalScripts" | "creators" | "covers" | "branding" | "general";

function getMediaGroup(item: CloudMediaItem): MediaGroup {
  let url = String(item.url || "");
  try { url = decodeURIComponent(url); } catch { /* Keep the original URL if malformed. */ }
  const path = url.toLowerCase();
  if (path.includes("external-public-scripts") || path.includes("外部台本封面")) return "externalScripts";
  if (path.includes("外部台本圖片") || /\/(avatar|author|voiceactor|creator)\//i.test(url)) return "creators";
  if (/\/cover\//i.test(url)) return "covers";
  if (/\/(logo|banner)\//i.test(url)) return "branding";
  return "general";
}

function getMediaGroupLabel(group: MediaGroup, t: (key: string, fallback?: string) => string): string {
  const labels: Record<MediaGroup, [string, string]> = {
    externalScripts: ["mediaLibrary.groupExternalScripts", "外部台本"],
    creators: ["mediaLibrary.groupCreators", "作者／聲演"],
    covers: ["mediaLibrary.groupCovers", "台本封面"],
    branding: ["mediaLibrary.groupBranding", "Logo／橫幅"],
    general: ["mediaLibrary.groupGeneral", "一般素材"],
  };
  return t(...labels[group]);
}

export function MediaLibraryBrowser({
  items,
  stats,
  isLoading,
  isUploading,
  deletingUrl = "",
  error = "",
  query,
  setQuery,
  sortBy,
  setSortBy,
  selectedId,
  setSelectedId,
  onUploadChange,
  onDelete,
  onClearAll,
  onPrimaryAction,
  primaryActionLabel,
  rightTopActions,
  organization,
  onOrganizationChange,
  className = "",
}: Props) {
  const { t } = useI18n();
  const [pendingDelete, setPendingDelete] = React.useState<CloudMediaItem | null>(null);
  const [confirmClearAll, setConfirmClearAll] = React.useState(false);
  const [previewItem, setPreviewItem] = React.useState<CloudMediaItem | null>(null);
  const [activeGroup, setActiveGroup] = React.useState("all");
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null);

  const folders = organization?.folders || [];
  const assignments = organization?.assignments || {};

  const filteredItems = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const base = items.filter((item) => {
      if (!keyword) return true;
      const name = String(item.name || "").toLowerCase();
      const url = String(item.url || "").toLowerCase();
      return name.includes(keyword) || url.includes(keyword);
    });
    const grouped = base.filter((item) => {
      if (activeGroup === "all") return true;
      if (activeGroup.startsWith("folder:")) return assignments[item.url] === activeGroup.slice("folder:".length);
      return getMediaGroup(item) === activeGroup;
    });
    const sorted = [...grouped];
    if (sortBy === "name") sorted.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    if (sortBy === "size") sorted.sort((a, b) => Number(b.sizeBytes || 0) - Number(a.sizeBytes || 0));
    return sorted;
  }, [items, query, sortBy, activeGroup, assignments]);

  const addFolder = () => {
    const name = newFolderName.trim();
    if (!name || !onOrganizationChange || !organization) return;
    const folder = { id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `folder-${Date.now()}`, name };
    onOrganizationChange({ ...organization, folders: [...folders, folder] });
    setNewFolderName("");
    setCreateFolderOpen(false);
    setActiveGroup(`folder:${folder.id}`);
  };

  const assignToFolder = (item: CloudMediaItem, folderId: string) => {
    if (!onOrganizationChange || !organization) return;
    const nextAssignments = { ...assignments };
    if (folderId) nextAssignments[item.url] = folderId;
    else delete nextAssignments[item.url];
    onOrganizationChange({ ...organization, assignments: nextAssignments });
  };

  const deleteFolder = () => {
    if (!folderToDelete || !onOrganizationChange || !organization) return;
    const nextAssignments = Object.fromEntries(Object.entries(assignments).filter(([, folderId]) => folderId !== folderToDelete));
    onOrganizationChange({
      ...organization,
      folders: folders.filter((folder) => folder.id !== folderToDelete),
      assignments: nextAssignments,
    });
    if (activeGroup === `folder:${folderToDelete}`) setActiveGroup("all");
    setFolderToDelete(null);
  };

  const groups = React.useMemo(() => {
    const groupIds: MediaGroup[] = ["externalScripts", "creators", "covers", "branding", "general"];
    return groupIds.map((id) => ({ id, count: items.filter((item) => getMediaGroup(item) === id).length }));
  }, [items]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;

  React.useEffect(() => {
    if (!filteredItems.length) {
      if (selectedId) setSelectedId("");
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId, setSelectedId]);

  return (
    <div className={`flex min-h-0 flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/30 px-3 py-2">
        <span className="text-xs font-medium">{t("mediaLibrary.usage", "媒體庫使用量")}</span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(stats.usedBytes)} / {Number.isFinite(stats.maxBytes) ? formatBytes(stats.maxBytes) : "無上限"}
        </span>
        <span className="text-xs text-muted-foreground">{t("mediaLibrary.count", "{count} 個檔案").replace("{count}", String(stats.count))}</span>
        <div className="h-1.5 min-w-16 flex-1 basis-20 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((stats.ratio || 0) * 100)}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onUploadChange && (
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted">
              <ImageIcon className="h-3.5 w-3.5" />
              {isUploading ? t("mediaLibrary.uploading", "上傳中...") : t("mediaLibrary.addToLibrary", "新增到媒體庫")}
              <input type="file" accept={MEDIA_FILE_ACCEPT} multiple className="hidden" onChange={onUploadChange} disabled={isUploading || isLoading || !!deletingUrl} />
            </label>
          )}
          {onClearAll && (
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground hover:text-destructive" disabled={!items.length || isLoading || isUploading || !!deletingUrl} onClick={() => setConfirmClearAll(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />{t("mediaLibrary.clearLibrary", "清空媒體庫")}
            </Button>
          )}
          {rightTopActions}
        </div>
        {error && <span role="alert" className="text-xs text-destructive">{error}</span>}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search", "搜尋")}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="newest">{t("common.latest", "最新")}</option>
          <option value="name">{t("common.name", "名稱")}</option>
          <option value="size">{t("common.size", "大小")}</option>
        </select>
      </div>

      {organization && onOrganizationChange && (
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-2">
          <Button type="button" size="sm" variant={activeGroup === "all" ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setActiveGroup("all")}>
            {t("mediaLibrary.groupAll", "全部")} <span className="ml-1 text-muted-foreground">{items.length}</span>
          </Button>
          {groups.filter((group) => group.count > 0).map(({ id, count }) => (
            <Button key={id} type="button" size="sm" variant={activeGroup === id ? "secondary" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => setActiveGroup(id)}>
              {getMediaGroupLabel(id, t)} <span className="ml-1 text-muted-foreground">{count}</span>
            </Button>
          ))}
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center">
              <Button type="button" size="sm" variant={activeGroup === `folder:${folder.id}` ? "secondary" : "ghost"} className="h-7 rounded-r-none px-2.5 text-xs" onClick={() => setActiveGroup(`folder:${folder.id}`)}>
                <Folder className="mr-1 h-3 w-3" />{folder.name}<span className="ml-1 text-muted-foreground">{Object.values(assignments).filter((id) => id === folder.id).length}</span>
              </Button>
              {activeGroup === `folder:${folder.id}` && <Button type="button" size="icon" variant="secondary" className="h-7 w-7 rounded-l-none" aria-label={t("mediaLibrary.deleteFolder", "刪除資料夾")} onClick={() => setFolderToDelete(folder.id)}><Trash2 className="h-3 w-3" /></Button>}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="ml-auto h-7 px-2 text-xs" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="mr-1 h-3.5 w-3.5" />{t("mediaLibrary.newFolder", "新增資料夾")}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/10 p-2 sm:p-3">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm">{t("common.loading", "載入中...")}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">{t("mediaLibrary.empty", "媒體庫目前為空")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-2 sm:gap-3">
              {filteredItems.map((item) => (
                <div key={item.id} className={`group min-w-0 overflow-hidden rounded-lg border bg-background ${selectedItem?.id === item.id ? "border-primary ring-2 ring-primary/70" : "border-border/70"}`}>
                  <button
                    type="button"
                    aria-label={`${t("mediaLibrary.preview", "預覽")} ${item.name || t("mediaLibrary.unnamed", "未命名")}`}
                    onClick={() => {
                      setSelectedId(item.id);
                      if (!onPrimaryAction) setPreviewItem(item);
                    }}
                    onDoubleClick={() => {
                      if (onPrimaryAction) onPrimaryAction(item);
                    }}
                    className="block w-full text-left"
                  >
                    <div className="aspect-[4/3] bg-muted/30">
                      <img src={item.url} alt={item.name || "media"} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  </button>
                  <div className="space-y-1.5 border-t p-2">
                    <p className="truncate text-xs font-medium" title={item.name || t("mediaLibrary.unnamed", "未命名")}>{item.name || t("mediaLibrary.unnamed", "未命名")}</p>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] text-muted-foreground">{formatBytes(item.sizeBytes || 0)}</p>
                      <div className="flex items-center">
                      {organization && onOrganizationChange && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label={t("mediaLibrary.organize", "整理到資料夾")} title={t("mediaLibrary.organize", "整理到資料夾")}>
                              <FolderPlus className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t("mediaLibrary.organize", "整理到資料夾")}</DropdownMenuLabel>
                            {folders.map((folder) => <DropdownMenuItem key={folder.id} onClick={() => assignToFolder(item, folder.id)}>{folder.name}</DropdownMenuItem>)}
                            {folders.length > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuItem onClick={() => assignToFolder(item, "")}>{t("mediaLibrary.removeFromFolder", "移出自訂資料夾")}</DropdownMenuItem>
                            {folders.length === 0 && <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}><Plus className="mr-2 h-4 w-4" />{t("mediaLibrary.newFolder", "新增資料夾")}</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={`${t("common.remove", "刪除")} ${item.name || t("mediaLibrary.unnamed", "未命名")}`}
                        title={t("common.remove", "刪除")}
                        disabled={isUploading || isLoading || !!deletingUrl}
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      </div>
                    </div>
                    {onPrimaryAction && (
                      <Button type="button" size="sm" className="h-7 w-full text-xs" onClick={() => onPrimaryAction(item)}>
                        {primaryActionLabel || t("common.select", "選擇")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mediaLibrary.confirmDeleteTitle", "刪除這個媒體檔？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mediaLibrary.confirmDeleteDesc", "「{name}」會從媒體庫永久刪除。若作品仍使用這張圖片，圖片連結也會失效。此操作無法復原。")
                .replace("{name}", pendingDelete?.name || t("mediaLibrary.unnamed", "未命名"))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (pendingDelete) onDelete(pendingDelete.url);
              setPendingDelete(null);
            }}>
              {t("common.delete", "刪除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClearAll} onOpenChange={setConfirmClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mediaLibrary.confirmClearTitle", "清空整個媒體庫？")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mediaLibrary.confirmClearDesc", "將永久刪除 {count} 個媒體檔。已被作品、頭像或 Logo 使用的圖片連結也會失效。此操作無法復原。")
                .replace("{count}", String(stats.count))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              onClearAll?.();
              setConfirmClearAll(false);
            }}>
              {t("mediaLibrary.clearLibrary", "清空媒體庫")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(previewItem)} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{previewItem?.name || t("mediaLibrary.unnamed", "未命名")}</DialogTitle>
            <DialogDescription>{previewItem ? formatBytes(previewItem.sizeBytes || 0) : ""}</DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="flex max-h-[72vh] items-center justify-center overflow-hidden rounded-lg bg-muted/30 p-2">
              <img src={previewItem.url} alt={previewItem.name || t("mediaLibrary.unnamed", "未命名")} className="max-h-[68vh] max-w-full object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("mediaLibrary.newFolderTitle", "建立資料夾")}</DialogTitle>
            <DialogDescription>{t("mediaLibrary.newFolderDesc", "資料夾只會整理媒體庫，不會更動圖片網址。")}</DialogDescription>
          </DialogHeader>
          <input autoFocus maxLength={60} value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addFolder(); }} placeholder={t("mediaLibrary.folderName", "資料夾名稱")} className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateFolderOpen(false)}>{t("common.cancel", "取消")}</Button>
            <Button type="button" size="sm" disabled={!newFolderName.trim()} onClick={addFolder}>{t("common.create", "建立")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(folderToDelete)} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mediaLibrary.deleteFolderTitle", "刪除此資料夾？")}</AlertDialogTitle>
            <AlertDialogDescription>{t("mediaLibrary.deleteFolderDesc", "只會移除資料夾與分類設定，不會刪除圖片。")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFolder}>{t("common.delete", "刪除")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

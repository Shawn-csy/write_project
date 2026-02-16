import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Globe, Search, Trash2, UserRound } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import { ScrollArea } from "../../ui/scroll-area";
import { useSettings } from "../../../contexts/SettingsContext";
import { getPublicThemes } from "../../../lib/db";
import { normalizeThemeConfigs } from "../../../lib/markerThemeCodec";

function formatDate(ts) {
  if (!ts) return "未知時間";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "未知時間";
  return d.toLocaleDateString();
}

export function PublicThemeDialog() {
  const { copyPublicTheme, deleteTheme, currentUser } = useSettings();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [themes, setThemes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [copiedThemeIds, setCopiedThemeIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFeedback("");
    getPublicThemes()
      .then((data) => {
        const normalized = Array.isArray(data)
          ? data.map((theme) => ({
              ...theme,
              configs: normalizeThemeConfigs(theme.configs),
            }))
          : [];
        setThemes(normalized);
        setActiveId(normalized[0]?.id || null);
      })
      .catch(() => {
        setThemes([]);
        setFeedback("載入公開主題失敗，請稍後再試。");
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    if (!kw) return themes;
    return themes.filter((theme) => {
      const ownerName = theme.owner?.displayName || "";
      const ownerHandle = theme.owner?.handle || "";
      const source = [theme.name, theme.description, ownerName, ownerHandle].join(" ").toLowerCase();
      return source.includes(kw);
    });
  }, [themes, query]);

  useEffect(() => {
    if (!filtered.length) {
      setActiveId(null);
      return;
    }
    if (!filtered.some((t) => t.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  const activeTheme = filtered.find((t) => t.id === activeId) || null;
  const activeMarkers = activeTheme?.configs || [];
  const isOwner = Boolean(
    currentUser &&
      activeTheme &&
      (activeTheme.ownerId === currentUser.uid || activeTheme.owner?.id === currentUser.uid)
  );

  const handleCopy = async () => {
    if (!activeTheme) return;
    setFeedback("");
    try {
      await copyPublicTheme(activeTheme.id);
      setCopiedThemeIds((prev) =>
        prev.includes(activeTheme.id) ? prev : [...prev, activeTheme.id]
      );
      setFeedback("複製成功，已加入你的主題清單。");
    } catch {
      setFeedback("複製失敗，請稍後再試。");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTheme(deleteTarget.id);
      setThemes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setFeedback("已刪除該公開主題。");
    } catch {
      setFeedback("刪除失敗，請稍後再試。");
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderMarkerEffectPreview = (marker, index) => {
    const markerStyle = marker?.style && typeof marker.style === "object" ? marker.style : {};
    const markerType = marker?.type || (marker?.isBlock ? "block" : "inline");
    const label = marker?.label || marker?.id || `marker-${index + 1}`;
    const prefix = marker?.start || "";

    if (markerType === "block" || marker?.isBlock) {
      return (
        <div
          key={`${label}-${index}`}
          className="rounded-md border bg-background px-3 py-2 text-xs"
          style={markerStyle}
        >
          <p className="font-medium mb-1">{label}（區塊效果）</p>
          <p>{prefix ? `${prefix} ` : ""}這是一段示範內容，顯示此主題的區塊樣式。</p>
        </div>
      );
    }

    return (
      <div key={`${label}-${index}`} className="rounded-md border bg-background px-3 py-2 text-xs">
        <p className="font-medium mb-1">{label}（行內效果）</p>
        <p className="text-muted-foreground">
          一般文字與
          <span className="mx-1 rounded-sm px-1" style={markerStyle}>
            {prefix ? `${prefix} ` : ""}標記預覽
          </span>
          混合呈現。
        </p>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Globe className="w-3.5 h-3.5" />
            <span className="text-xs">探索公開主題</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-5xl h-[82vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b bg-muted/20">
            <DialogTitle>公開主題探索</DialogTitle>
            <DialogDescription>
              先搜尋主題，再在右側查看內容，最後一鍵複製到你的主題列表。
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pt-4 pb-3 border-b bg-background">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋主題名稱、作者或描述"
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr]">
            <div className="border-r border-border/60 bg-muted/10">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {loading && <p className="text-xs text-muted-foreground px-2 py-4">載入中...</p>}
                  {!loading && filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-4">找不到符合條件的公開主題。</p>
                  )}
                  {!loading &&
                    filtered.map((theme) => {
                      const active = theme.id === activeId;
                      const ownerName = theme.owner?.displayName || "Unknown";
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setActiveId(theme.id)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                            active
                              ? "border-primary/50 bg-primary/5"
                              : "border-border/60 bg-background hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{theme.name}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {theme.configs.length} 標記
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <UserRound className="w-3 h-3" />
                            <span className="truncate">{ownerName}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>

            <div className="min-h-0 flex flex-col">
              {!activeTheme ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  請先從左側選擇一個主題
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b bg-background/70 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-base font-semibold truncate">{activeTheme.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        作者 {activeTheme.owner?.displayName || "Unknown"} · 更新於 {formatDate(activeTheme.updatedAt)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activeTheme.description || "作者未提供描述"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(activeTheme)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          刪除
                        </Button>
                      )}
                      <Button size="sm" onClick={handleCopy} variant={copiedThemeId === activeTheme.id ? "secondary" : "default"}>
                        {copiedThemeIds.includes(activeTheme.id) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {copiedThemeIds.includes(activeTheme.id) ? "已複製" : "複製到我的主題"}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        包含標記（{activeMarkers.length}）
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeMarkers.map((marker, idx) => (
                          <div
                            key={`${marker.id || marker.label || "marker"}-${idx}`}
                            className="px-2.5 py-1 rounded-md border bg-background text-xs"
                          >
                            <span className="font-medium">{marker.label || marker.id || "未命名"}</span>
                            <span className="text-muted-foreground ml-1">
                              {marker.type || (marker.isBlock ? "block" : "inline")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">效果預覽</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {activeMarkers.slice(0, 4).map((marker, idx) =>
                            renderMarkerEffectPreview(marker, idx)
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          </div>

          <div
            className={`px-6 py-3 border-t text-xs ${
              feedback ? "bg-primary/10 border-primary/30" : "bg-muted/10"
            }`}
          >
            {feedback ? (
              <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {feedback}
              </span>
            ) : (
              <span className="text-muted-foreground">
                提示：複製後可立即在主題下拉選單切換，並再微調成自己的版本。
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>刪除公開主題</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `確定要刪除「${deleteTarget.name}」嗎？此動作不可復原。` : "確定刪除？"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="secondary" className="text-destructive" onClick={handleDelete}>
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

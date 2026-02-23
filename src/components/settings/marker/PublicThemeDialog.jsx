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
import { useI18n } from "../../../contexts/I18nContext";

function formatDate(ts, unknownText) {
  if (!ts) return unknownText;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return unknownText;
  return d.toLocaleDateString();
}

export function PublicThemeDialog() {
  const { t } = useI18n();
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
        setFeedback(t("publicThemeDialog.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [open, t]);

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
      setFeedback(t("publicThemeDialog.copySuccess"));
    } catch {
      setFeedback(t("publicThemeDialog.copyFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTheme(deleteTarget.id);
      setThemes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setFeedback(t("publicThemeDialog.deleteSuccess"));
    } catch {
      setFeedback(t("publicThemeDialog.deleteFailed"));
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
          <p className="font-medium mb-1">{label}{t("publicThemeDialog.blockEffectSuffix")}</p>
          <p>{prefix ? `${prefix} ` : ""}{t("publicThemeDialog.blockEffectPreview")}</p>
        </div>
      );
    }

    return (
      <div key={`${label}-${index}`} className="rounded-md border bg-background px-3 py-2 text-xs">
        <p className="font-medium mb-1">{label}{t("publicThemeDialog.inlineEffectSuffix")}</p>
        <p className="text-muted-foreground">
          {t("publicThemeDialog.inlinePreviewPrefix")}
          <span className="mx-1 rounded-sm px-1" style={markerStyle}>
            {prefix ? `${prefix} ` : ""}{t("publicThemeDialog.markerPreview")}
          </span>
          {t("publicThemeDialog.inlinePreviewSuffix")}
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
            <span className="text-xs">{t("publicThemeDialog.open")}</span>
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-5xl h-[82vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 border-b bg-muted/20">
            <DialogTitle>{t("publicThemeDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("publicThemeDialog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pt-4 pb-3 border-b bg-background">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("publicThemeDialog.searchPlaceholder")}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr]">
            <div className="border-r border-border/60 bg-muted/10">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-2">
                  {loading && <p className="text-xs text-muted-foreground px-2 py-4">{t("publicThemeDialog.loading")}</p>}
                  {!loading && filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2 py-4">{t("publicThemeDialog.empty")}</p>
                  )}
                  {!loading &&
                    filtered.map((theme) => {
                      const active = theme.id === activeId;
                      const ownerName = theme.owner?.displayName || t("publicThemeDialog.unknown");
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
                              {t("publicThemeDialog.markerCount").replace("{count}", String(theme.configs.length))}
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
                  {t("publicThemeDialog.selectLeftHint")}
                </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b bg-background/70 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-base font-semibold truncate">{activeTheme.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t("publicThemeDialog.authorUpdated")
                          .replace("{author}", activeTheme.owner?.displayName || t("publicThemeDialog.unknown"))
                          .replace("{date}", formatDate(activeTheme.updatedAt, t("publicThemeDialog.unknownTime")))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activeTheme.description || t("publicThemeDialog.noDescription")}
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
                          {t("common.remove")}
                        </Button>
                      )}
                      <Button size="sm" onClick={handleCopy} variant={copiedThemeIds.includes(activeTheme.id) ? "secondary" : "default"}>
                        {copiedThemeIds.includes(activeTheme.id) ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {copiedThemeIds.includes(activeTheme.id) ? t("publicThemeDialog.copied") : t("publicThemeDialog.copyToMine")}
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-6">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {t("publicThemeDialog.includedMarkers").replace("{count}", String(activeMarkers.length))}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeMarkers.map((marker, idx) => (
                          <div
                            key={`${marker.id || marker.label || "marker"}-${idx}`}
                            className="px-2.5 py-1 rounded-md border bg-background text-xs"
                          >
                            <span className="font-medium">{marker.label || marker.id || t("publicThemeDialog.unnamed")}</span>
                            <span className="text-muted-foreground ml-1">
                              {marker.type || (marker.isBlock ? "block" : "inline")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">{t("publicThemeDialog.effectPreview")}</p>
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
                {t("publicThemeDialog.footerTip")}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("publicThemeDialog.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? t("publicThemeDialog.deleteConfirmWithName").replace("{name}", deleteTarget.name)
                : t("publicThemeDialog.deleteConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="secondary" className="text-destructive" onClick={handleDelete}>
              {t("common.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

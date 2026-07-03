import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Columns3, Plus, Settings2, Share2, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { useSettings } from "../../contexts/SettingsContext";
import { useMarkerSettingsState } from "../../hooks/settings/useMarkerSettingsState";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerSettingsHeader } from "./marker/layout/MarkerSettingsHeader";
import { MarkerSettingsModeContent } from "./marker/layout/MarkerSettingsModeContent";
import { lazyWithRefreshRetry } from "../../lib/lazyWithRefreshRetry";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import type { MarkerConfig } from "../../types/script";
import type { LayoutConfig } from "../../lib/v2";

// Loaded only when the full layout editor sheet is opened.
const V2LayoutPreviewEditor = lazyWithRefreshRetry(async () => {
  const mod = await import("./marker/V2LayoutPreviewEditor");
  return { default: mod.V2LayoutPreviewEditor };
}, "marker-layout-editor");

interface FormatSaveStatusArgs {
  isSaving: boolean;
  parseError: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
  t: (key: string) => string;
}

function formatSaveStatus({ isSaving, parseError, isDirty, lastSavedAt, t }: FormatSaveStatusArgs): string {
  if (isSaving) return t("markerSettings.saving");
  if (parseError) return t("markerSettings.jsonError");
  if (isDirty) return t("markerSettings.unsaved");
  if (lastSavedAt) {
    return t("markerSettings.savedAt").replace(
      "{time}",
      lastSavedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }
  return t("markerSettings.synced");
}

interface MarkerSettingsProps {
  sectionRef?: React.Ref<HTMLDivElement>;
}

export function MarkerSettings({ sectionRef }: MarkerSettingsProps): React.JSX.Element {
  const { t } = useI18n();
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.isAdmin);
  const {
    markerConfigs,
    setMarkerConfigs,
    currentUser,
    markerThemes,
    currentThemeId,
    switchTheme,
    addTheme,
    addThemeFromCurrent,
    deleteTheme,
    renameTheme,
    updateThemeDescription,
    updateThemePublicity,
    usePresentationRenderer,
    setUsePresentationRenderer,
    presentationLayoutConfig,
    setPresentationLayoutConfig,
  } = useSettings();
  const readOnly = !isAdmin && currentThemeId === "default";

  const [viewMode, setViewMode] = useState<"ui" | "json" | "guide">("ui");
  const markerState = useMarkerSettingsState({
    markerConfigs,
    setMarkerConfigs,
    viewMode,
    readOnly,
  });

  const {
    localConfigs,
    setLocalConfigs,
    expandedId,
    setExpandedId,
    jsonText,
    setJsonText,
    parseError,
    isDirty,
    isSaving,
    lastSavedAt,
    existingIds,
    updateMarker,
    addMarker,
    removeMarker,
    applyJson,
    save: saveMarkerConfigs,
  } = markerState;

  // Layout config draft — mirrors marker configs' draft pattern.
  // Changes are local until the shared Save button is pressed.
  const [localLayoutConfig, setLocalLayoutConfig] = useState<LayoutConfig>(presentationLayoutConfig);
  const committedThemeIdRef = useRef(currentThemeId);
  useEffect(() => {
    // Reset draft whenever the active theme changes (switchTheme / initial load)
    if (committedThemeIdRef.current !== currentThemeId) {
      committedThemeIdRef.current = currentThemeId;
      setLocalLayoutConfig(presentationLayoutConfig);
    }
  }, [currentThemeId, presentationLayoutConfig]);

  const handleLayoutChange = useCallback((config: LayoutConfig) => {
    setLocalLayoutConfig(config);
  }, []);

  const layoutDirty = useMemo(
    () => JSON.stringify(localLayoutConfig) !== JSON.stringify(presentationLayoutConfig),
    [localLayoutConfig, presentationLayoutConfig]
  );

  const anyDirty = isDirty || layoutDirty;
  const canSave = anyDirty && !isSaving && !readOnly && !parseError;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    if (layoutDirty) {
      setPresentationLayoutConfig(localLayoutConfig);
    }
    if (isDirty) {
      await saveMarkerConfigs();
    }
  }, [canSave, layoutDirty, isDirty, localLayoutConfig, setPresentationLayoutConfig, saveMarkerConfigs]);

  const selectedConfig = useMemo<MarkerConfig | null>(
    () => localConfigs.find((c) => (c.id || c._tempId) === expandedId) || null,
    [localConfigs, expandedId]
  );
  const selectedIndex = useMemo(
    () => localConfigs.findIndex((c) => (c.id || c._tempId) === expandedId),
    [localConfigs, expandedId]
  );
  const hasMultiTrackMarkers = useMemo(
    () => localConfigs.some((cfg) => {
      const trackId = String(cfg?.v2TrackId || "").trim();
      return Boolean(trackId) || Boolean(cfg?.enableColumnGrouping);
    }),
    [localConfigs]
  );
  const statusText = formatSaveStatus({ isSaving, parseError, isDirty: anyDirty, lastSavedAt, t });
  const currentTheme = markerThemes.find((theme) => theme.id === currentThemeId);
  const canDeleteTheme = markerThemes.length > 1 && currentTheme?.id !== "default";
  const themeLabel = (theme: { id?: string; name?: string } | undefined) => {
    if (!theme) return "";
    if (theme.id === "default") return t("markerThemeHeader.systemDefault");
    const raw = String(theme.name || theme.id || "").trim();
    return raw || t("markerThemeHeader.theme");
  };

  // Dialog open states lifted here so V2LayoutPreviewEditor header buttons can trigger them
  const [themeCreateOpen, setThemeCreateOpen] = useState(false);
  const [themeDeleteOpen, setThemeDeleteOpen] = useState(false);
  const [themePublicityOpen, setThemePublicityOpen] = useState(false);
  const [themeMoreOpen, setThemeMoreOpen] = useState(false);
  const [layoutEditorOpen, setLayoutEditorOpen] = useState(false);

  return (
    <div ref={sectionRef} className="h-full flex flex-col">
      <Card className="flex-1 min-h-0 border border-border/60 bg-card/50 shadow-sm overflow-hidden flex flex-col">
        <MarkerSettingsHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusText={statusText}
          isDirty={canSave}
          onSave={handleSave}
          isSaving={isSaving}
          controls={
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{t("markerThemeHeader.currentTheme")}</span>
              <select
                className="h-7 min-w-[150px] max-w-[220px] rounded-md border border-input bg-background px-2 text-xs"
                value={currentThemeId}
                onChange={(event) => switchTheme(event.target.value)}
              >
                {markerThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>{themeLabel(theme)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setThemeCreateOpen(true)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                title={t("markerThemeHeader.newTheme")}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {currentUser && currentTheme && (
                <button
                  type="button"
                  onClick={() => setThemePublicityOpen(true)}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-md hover:bg-muted/70",
                    currentTheme.isPublic ? "text-sky-500" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={currentTheme.isPublic ? t("markerThemeHeader.publicTitleOn") : t("markerThemeHeader.publicTitleOff")}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setThemeMoreOpen(true)}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                title={t("markerThemeHeader.moreSettings")}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
              {canDeleteTheme && (
                <button
                  type="button"
                  onClick={() => setThemeDeleteOpen(true)}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive"
                  title={t("markerThemeHeader.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setUsePresentationRenderer(!usePresentationRenderer)}
                className={cn(
                  "ml-1 flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors",
                  usePresentationRenderer
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
                title={t("appearance.multiTrackRenderer")}
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("appearance.multiTrackRenderer")}</span>
              </button>
            </div>
          }
        />

        <MarkerThemeHeader
          markerThemes={markerThemes}
          currentThemeId={currentThemeId}
          switchTheme={switchTheme}
          addTheme={addTheme}
          addThemeFromCurrent={addThemeFromCurrent}
          deleteTheme={deleteTheme}
          renameTheme={renameTheme}
          updateThemeDescription={updateThemeDescription}
          updateThemePublicity={updateThemePublicity}
          currentUser={currentUser}
          readOnly={false}
          dialogsOnly
          createOpen={themeCreateOpen}
          setCreateOpen={setThemeCreateOpen}
          deleteOpen={themeDeleteOpen}
          setDeleteOpen={setThemeDeleteOpen}
          publicityOpen={themePublicityOpen}
          setPublicityOpen={setThemePublicityOpen}
          moreOpen={themeMoreOpen}
          setMoreOpen={setThemeMoreOpen}
        />

        {readOnly && (
          <div className="mx-3 mb-2 rounded-md border border-border/60 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {t("markerSettings.readOnlyThemeNotice")}
          </div>
        )}

        {hasMultiTrackMarkers && !usePresentationRenderer && (
          <div className="mx-3 mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <div>{t("markerSettings.presentationRendererOffWarning")}</div>
            <button
              type="button"
              onClick={() => setUsePresentationRenderer(true)}
              className="mt-1 font-medium underline decoration-destructive/70 underline-offset-2 hover:decoration-destructive"
            >
              {t("markerSettings.enablePresentationRendererNow")}
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 bg-background/40">
          <MarkerSettingsModeContent
            viewMode={viewMode}
            localConfigs={localConfigs}
            setLocalConfigs={setLocalConfigs}
            updateMarker={updateMarker}
            removeMarker={removeMarker}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            selectedConfig={selectedConfig}
            selectedIndex={selectedIndex}
            existingIds={existingIds}
            onAddMarker={addMarker}
            jsonText={jsonText}
            setJsonText={setJsonText}
            parseError={parseError}
            applyJson={applyJson}
            isDirty={isDirty}
            isSaving={isSaving}
            readOnly={readOnly}
            tracks={localLayoutConfig.tracks}
            layoutConfig={localLayoutConfig}
            onLayoutChange={handleLayoutChange}
            onOpenFullLayoutEditor={() => setLayoutEditorOpen(true)}
          />
        </div>
      </Card>

      <Sheet open={layoutEditorOpen} onOpenChange={setLayoutEditorOpen}>
        <SheetContent side="right" className="flex w-[min(96vw,1040px)] flex-col p-0 sm:max-w-none">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{t("markerSettingsHeader.viewLayout")}</SheetTitle>
            <SheetDescription>{t("markerLayoutContext.fullEditorDescription")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <React.Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">{t("common.loading", "載入中...")}</div>}>
              <V2LayoutPreviewEditor
                layoutConfig={localLayoutConfig}
                onChange={handleLayoutChange}
                markerConfigs={localConfigs}
                selectedConfig={selectedConfig}
                t={t}
              />
            </React.Suspense>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

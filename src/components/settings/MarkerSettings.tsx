import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useSettings } from "../../contexts/SettingsContext";
import { useMarkerSettingsState } from "../../hooks/settings/useMarkerSettingsState";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerSettingsHeader, type MarkerViewMode } from "./marker/layout/MarkerSettingsHeader";
import { MarkerSettingsModeContent } from "./marker/layout/MarkerSettingsModeContent";
import { lazyWithRefreshRetry } from "../../lib/lazyWithRefreshRetry";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { useI18n } from "../../contexts/I18nContext";
import { useAuth } from "../../contexts/AuthContext";
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
  /** Leading header control, e.g. the mobile navigation button on the standalone page. */
  headerLeading?: React.ReactNode;
  /** Breadcrumb above the title on the standalone page. */
  breadcrumb?: React.ReactNode;
}

export function MarkerSettings({ sectionRef, headerLeading, breadcrumb }: MarkerSettingsProps): React.JSX.Element {
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

  const [viewMode, setViewMode] = useState<MarkerViewMode>("ui");
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

  const themeBadge = readOnly
    ? t("markerStudio.badgeReadOnly", "系統預設 · 唯讀")
    : currentThemeId === "default"
      ? t("markerThemeHeader.systemDefault")
      : currentTheme?.isPublic
        ? t("markerThemeHeader.publicOn")
        : t("markerStudio.badgePrivate", "私人主題");

  return (
    <div ref={sectionRef} className="flex h-full min-h-0 flex-col bg-background">
        <MarkerSettingsHeader
          leading={headerLeading}
          breadcrumb={breadcrumb}
          viewMode={viewMode}
          setViewMode={setViewMode}
          statusText={statusText}
          canSave={canSave}
          onSave={handleSave}
          isSaving={isSaving}
          themes={markerThemes.map((theme) => ({ id: String(theme.id), label: themeLabel(theme) }))}
          currentThemeId={currentThemeId}
          currentThemeLabel={themeLabel(currentTheme)}
          themeBadge={themeBadge}
          onSwitchTheme={switchTheme}
          onCreateTheme={() => setThemeCreateOpen(true)}
          onOpenThemeDetails={() => setThemeMoreOpen(true)}
          onOpenPublicity={currentUser && currentTheme ? () => setThemePublicityOpen(true) : undefined}
          publicityLabel={currentTheme?.isPublic ? t("markerThemeHeader.setPrivateTitle") : t("markerThemeHeader.setPublicTitle")}
          onDeleteTheme={canDeleteTheme ? () => setThemeDeleteOpen(true) : undefined}
          onOpenLayout={() => setLayoutEditorOpen(true)}
          multiColumn={usePresentationRenderer}
          onToggleMultiColumn={setUsePresentationRenderer}
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
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-[10px] bg-muted px-4 py-3 text-[13px] sm:mx-6 lg:mx-8">
            <span className="min-w-[14rem] flex-1">{t("markerStudio.readOnlyNotice", "系統預設主題無法直接修改。複製一份成為自己的主題就能編輯，原本的作品不受影響。")}</span>
            <Button size="sm" onClick={() => setThemeCreateOpen(true)}>{t("markerStudio.copyToEdit", "複製成我的主題")}</Button>
          </div>
        )}

        {hasMultiTrackMarkers && !usePresentationRenderer && (
          <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-[hsl(var(--status-ready-fg))]/25 bg-[hsl(var(--status-ready-bg))] px-4 py-3 text-[13px] text-[hsl(var(--status-ready-fg))] sm:mx-6 lg:mx-8" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="min-w-[14rem] flex-1">{t("markerSettings.presentationRendererOffWarning")}</span>
            <Button size="sm" variant="outline" onClick={() => setUsePresentationRenderer(true)}>
              {t("markerSettings.enablePresentationRendererNow")}
            </Button>
          </div>
        )}

        <div className="min-h-0 flex-1">
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
            usePresentationRenderer={usePresentationRenderer}
          />
        </div>

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

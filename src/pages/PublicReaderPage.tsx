import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicReaderLayout } from "../components/reader/PublicReaderLayout";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";
import { useI18n } from "../contexts/I18nContext";
import { usePublicTerms } from "../hooks/public/usePublicTerms";
import { usePublicReaderScript } from "../hooks/public/usePublicReaderScript";
import { TermsConsentDialog } from "../components/public/TermsConsentDialog";
import type { ScriptManager } from "../hooks/useScriptManager.types";
import type { NavProps } from "../types/nav";

export default function PublicReaderPage({ scriptManager, navProps }: { scriptManager: ScriptManager; navProps: NavProps }) {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();

  const { isLoading, mockMeta, relatedSeriesScripts, publicMarkerConfigs } = usePublicReaderScript({
    id,
    scriptManager,
  });

  const {
    termsConfig, termsDialogOpen, setTermsDialogOpen,
    termsScrollRef, termsReadToBottom, termsRequireScroll,
    acceptedChecks, isSubmittingTerms, canConfirmTerms, missingRequiredCheckCount,
    handleTermsScroll, toggleRequiredCheck, confirmTermsConsent,
  } = usePublicTerms({ autoOpen: true, onAccepted: () => {} });

  const viewerDefaults = useScriptViewerDefaults({
    theme: scriptManager.activeCloudScript?.markerThemeId,
    markerConfigs: publicMarkerConfigs,
  });

  const fullScriptData = useMemo(() => {
    const merged = {
      ...scriptManager.activeCloudScript,
      content: scriptManager.rawScript,
      title: scriptManager.titleName,
      ...mockMeta,
    };
    const normalizedTags = Array.isArray(merged?.tags)
      ? merged.tags.map((tag) => (typeof tag === "string" ? tag : String(tag?.name || ""))).filter(Boolean)
      : [];
    return {
      ...merged,
      tags: normalizedTags,
    };
  }, [scriptManager.activeCloudScript, scriptManager.rawScript, scriptManager.titleName, mockMeta]);

  const structuredData = useMemo(() => {
    if (!fullScriptData?.id || !fullScriptData?.title) return null;

    const url = typeof window !== "undefined"
      ? `${window.location.origin}/read/${fullScriptData.id}`
      : `/read/${fullScriptData.id}`;

    const authorName = fullScriptData?.author?.displayName || fullScriptData?.headerAuthor || "";
    const orgName = fullScriptData?.organization?.name || "";
    const description = fullScriptData?.synopsis || fullScriptData?.description || t("publicReaderPage.descriptionFallback");
    const dateRaw = fullScriptData?.updatedAt || fullScriptData?.lastModified || fullScriptData?.date || null;

    let dateModified: string | undefined;
    if (typeof dateRaw === "number" && Number.isFinite(dateRaw)) {
      try { dateModified = new Date(dateRaw).toISOString(); } catch { dateModified = undefined; }
    } else if (typeof dateRaw === "string" && dateRaw.trim()) {
      const parsed = Date.parse(dateRaw);
      if (!Number.isNaN(parsed)) dateModified = new Date(parsed).toISOString();
    }

    const data: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: fullScriptData.title,
      headline: fullScriptData.title,
      url,
      inLanguage: "zh-Hant",
      description,
      genre: Array.isArray(fullScriptData?.tags) ? fullScriptData.tags : undefined,
      dateModified,
      isAccessibleForFree: true,
    };

    if (authorName) data["author"] = { "@type": "Person", name: authorName };
    if (orgName) data["publisher"] = { "@type": "Organization", name: orgName };
    if (fullScriptData?.coverUrl) data["image"] = fullScriptData.coverUrl;

    return data;
  }, [fullScriptData, t]);

  const surfaceProps = useMemo(() => ({
    scrollRef: navProps?.contentScrollRef,
  }), [navProps?.contentScrollRef]);

  const mergedViewerProps = useMemo(() => ({
    ...viewerDefaults,
    externalAst: scriptManager.ast,
    externalScenes: scriptManager.parsedScenes,
    externalTitleEntries: scriptManager.parsedTitleEntries,
    filterCharacter: scriptManager.filterCharacter,
    focusMode: scriptManager.focusMode,
    onCharacters: scriptManager.setCharacterList,
    onTitle: scriptManager.setTitleHtml,
    onTitleNote: scriptManager.setTitleNote,
    onSummary: scriptManager.setTitleSummary,
    onHasTitle: scriptManager.setHasTitle,
    onScenes: scriptManager.setSceneList,
    scrollToScene: scriptManager.scrollSceneId,
    hiddenMarkerIds: scriptManager.hiddenMarkerIds,
  }), [
    viewerDefaults,
    scriptManager.ast,
    scriptManager.parsedScenes,
    scriptManager.parsedTitleEntries,
    scriptManager.filterCharacter,
    scriptManager.focusMode,
    scriptManager.setCharacterList,
    scriptManager.setTitleHtml,
    scriptManager.setTitleNote,
    scriptManager.setTitleSummary,
    scriptManager.setHasTitle,
    scriptManager.setSceneList,
    scriptManager.scrollSceneId,
    scriptManager.hiddenMarkerIds,
  ]);

  return (
    <>
      {structuredData && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
          {fullScriptData?.coverUrl && (
            <>
              <meta property="og:image" content={fullScriptData.coverUrl} />
              <meta name="twitter:image" content={fullScriptData.coverUrl} />
            </>
          )}
        </Helmet>
      )}
      <PublicReaderLayout
        script={fullScriptData}
        isLoading={isLoading}
        relatedSeriesScripts={relatedSeriesScripts}
        onOpenRelatedScript={(scriptId: string) => navigate(`/read/${scriptId}`)}
        onOpenSeries={(name: string) => navigate(`/series/${encodeURIComponent(name)}`)}
        onBack={() => navigate("/")}
        onShare={async () => {
          const url = window.location.href;
          try {
            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(url);
              alert("已複製連結");
              return;
            }
          } catch (error) {
            console.error("Failed to write share url to clipboard", error);
            alert("複製連結失敗，請稍後再試");
          }
          window.prompt("請複製目前網址", url);
        }}
        validMarkerConfigs={scriptManager.effectiveMarkerConfigs as Array<{ id: string; label?: string }>}
        hiddenMarkerIds={scriptManager.hiddenMarkerIds}
        onToggleMarker={scriptManager.toggleMarkerVisibility}
        renderedHtml=""
        scriptSurfaceProps={surfaceProps}
        viewerProps={mergedViewerProps}
      />
      <TermsConsentDialog
        open={termsDialogOpen}
        onOpenChange={(open: boolean) => { if (!open && !isSubmittingTerms) { setTermsDialogOpen(false); navigate("/"); } }}
        termsConfig={termsConfig}
        termsScrollRef={termsScrollRef}
        termsReadToBottom={termsReadToBottom}
        termsRequireScroll={termsRequireScroll}
        acceptedChecks={acceptedChecks}
        isSubmittingTerms={isSubmittingTerms}
        canConfirmTerms={canConfirmTerms}
        missingRequiredCheckCount={missingRequiredCheckCount}
        handleTermsScroll={handleTermsScroll}
        toggleRequiredCheck={(checkId, checked) => toggleRequiredCheck(checkId, checked === true)}
        onConfirm={() => confirmTermsConsent(id)}
        onCancel={() => navigate("/")}
        cancelLabel="返回公開台本"
        confirmLabel="同意並進入"
      />
    </>
  );
}

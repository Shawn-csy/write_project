import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { PublicReaderLayout } from "../components/reader/PublicReaderLayout";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";
import { useI18n } from "../contexts/I18nContext";
import { usePublicTerms } from "../hooks/public/usePublicTerms";
import { usePublicReaderScript } from "../hooks/public/usePublicReaderScript";
import { TermsConsentDialog } from "../components/public/TermsConsentDialog";
import { incrementScriptView, publicToggleScriptLike, getPublicScriptLikeStatus, getPublicScriptStats, getVisitorId } from "../lib/api/scripts";
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

  const scriptId = id;
  const [likeState, setLikeState] = useState<{ liked: boolean; likes: number; likeCount: number } | null>(null);
  const [scriptStats, setScriptStats] = useState<{ estimatedMinutes: number; contentLength: number } | null>(null);
  const likeInFlight = React.useRef(false);

  // Increment view once on mount
  useEffect(() => {
    if (!scriptId) return;
    incrementScriptView(scriptId).catch(() => {});
  }, [scriptId]);

  // Fetch like status and script stats on mount
  useEffect(() => {
    if (!scriptId) return;
    getPublicScriptLikeStatus(scriptId)
      .then((res) => setLikeState({ liked: res.liked, likes: res.likes, likeCount: res.likeCount ?? 0 }))
      .catch(() => {
        const visitorId = getVisitorId();
        const stored = localStorage.getItem(`liked_script_${visitorId}_${scriptId}`);
        setLikeState({ liked: stored === "true", likes: 0, likeCount: 0 });
      });
    getPublicScriptStats(scriptId)
      .then((res) => setScriptStats({ estimatedMinutes: res.estimatedMinutes, contentLength: res.contentLength }))
      .catch(() => {});
  }, [scriptId]);

  const handleLike = useCallback(async () => {
    if (!scriptId || likeInFlight.current) return;
    likeInFlight.current = true;
    const prev = likeState;
    // Optimistic update
    setLikeState((s) => {
      if (!s) return s;
      const atCap = s.likeCount >= 10;
      return {
        liked: atCap ? s.likeCount - 1 > 0 : true,
        likes: atCap ? Math.max(0, s.likes - 1) : s.likes + 1,
        likeCount: atCap ? s.likeCount - 1 : s.likeCount + 1,
      };
    });
    try {
      const res = await publicToggleScriptLike(scriptId);
      setLikeState({ liked: res.liked, likes: res.likes, likeCount: res.likeCount ?? 0 });
      const visitorId = getVisitorId();
      localStorage.setItem(`liked_script_${visitorId}_${scriptId}`, String(res.liked));
    } catch {
      setLikeState(prev);
    } finally {
      likeInFlight.current = false;
    }
  }, [scriptId, likeState]);

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
        onOpenRelatedScript={(sid: string) => navigate(`/read/${sid}`)}
        onOpenSeries={(name: string) => navigate(`/series/${encodeURIComponent(name)}`)}
        onBack={() => navigate("/")}
        views={(fullScriptData as { views?: number })?.views}
        likes={likeState?.likes}
        isLiked={likeState?.liked}
        likeCount={likeState?.likeCount}
        onLike={handleLike}
        durationMinutes={scriptStats?.estimatedMinutes}
        dialogueChars={undefined}
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

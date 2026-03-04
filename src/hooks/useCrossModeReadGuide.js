import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useCrossModeReadGuide({ activeCloudScript, cloudScriptMode, isPublicReader, t }) {
  const [readGuideSpotlightRect, setReadGuideSpotlightRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isCloudReadMode = Boolean(activeCloudScript) && cloudScriptMode === "read";
  const guideParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isCrossModeGuideActive = guideParams.get("guide") === "1";
  const guideStep = guideParams.get("guideStep") || "";

  const navigateGuide = useCallback(
    (mode, step = "") => {
      if (!activeCloudScript?.id) return;
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (step) {
        params.set("guide", "1");
        params.set("guideStep", step);
      }
      navigate(`/edit/${activeCloudScript.id}?${params.toString()}`);
    },
    [activeCloudScript?.id, navigate]
  );

  const exitGuideToRead = useCallback(() => navigateGuide("read"), [navigateGuide]);
  const startCrossModeGuide = useCallback(() => navigateGuide("read", "readIntro"), [navigateGuide]);

  const nextReadGuideStep = useCallback(() => {
    if (guideStep === "readIntro") {
      navigateGuide("read", "readTools");
      return;
    }
    if (guideStep === "readTools") {
      navigateGuide("read", "readToEdit");
      return;
    }
    if (guideStep === "readToEdit") {
      navigateGuide("edit", "editIntro");
      return;
    }
    if (guideStep === "readFinish") {
      exitGuideToRead();
    }
  }, [exitGuideToRead, guideStep, navigateGuide]);

  const readGuideDialogOpen =
    isCloudReadMode &&
    isCrossModeGuideActive &&
    (guideStep === "readIntro" ||
      guideStep === "readTools" ||
      guideStep === "readToEdit" ||
      guideStep === "readFinish");

  const readGuideTitle = (() => {
    if (guideStep === "readTools") return t("readerActions.crossGuideReadToolsTitle");
    if (guideStep === "readToEdit") return t("readerActions.crossGuideReadToEditTitle");
    if (guideStep === "readFinish") return t("readerActions.crossGuideFinishTitle");
    return t("readerActions.crossGuideReadIntroTitle");
  })();

  const readGuideDesc = (() => {
    if (guideStep === "readTools") return t("readerActions.crossGuideReadToolsDesc");
    if (guideStep === "readToEdit") return t("readerActions.crossGuideReadToEditDesc");
    if (guideStep === "readFinish") return t("readerActions.crossGuideFinishDesc");
    return t("readerActions.crossGuideReadIntroDesc");
  })();

  const getReadGuideTargetId = useCallback(() => {
    if (guideStep === "readIntro") return "reader-guide-header";
    if (guideStep === "readTools") return "reader-guide-tools";
    if (guideStep === "readToEdit") return "reader-guide-edit-button";
    return "";
  }, [guideStep]);

  const refreshReadGuideSpotlight = useCallback(() => {
    if (!readGuideDialogOpen) {
      setReadGuideSpotlightRect(null);
      return;
    }
    const targetId = getReadGuideTargetId();
    if (!targetId) {
      setReadGuideSpotlightRect(null);
      return;
    }
    const target = document.getElementById(targetId);
    if (!target) {
      setReadGuideSpotlightRect(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const pad = 10;
    setReadGuideSpotlightRect({
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: Math.max(64, rect.width + pad * 2),
      height: Math.max(48, rect.height + pad * 2),
    });
  }, [getReadGuideTargetId, readGuideDialogOpen]);

  useEffect(() => {
    if (!readGuideDialogOpen) {
      setReadGuideSpotlightRect(null);
      return undefined;
    }
    refreshReadGuideSpotlight();
    const handleLayoutChange = () => refreshReadGuideSpotlight();
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);
    return () => {
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [readGuideDialogOpen, guideStep, refreshReadGuideSpotlight]);

  const handleReaderEdit = useCallback(() => {
    if (!activeCloudScript || isPublicReader) return;
    navigateGuide("edit");
  }, [activeCloudScript, isPublicReader, navigateGuide]);

  return {
    isCloudReadMode,
    guideStep,
    readGuideDialogOpen,
    readGuideTitle,
    readGuideDesc,
    readGuideSpotlightRect,
    startCrossModeGuide,
    exitGuideToRead,
    nextReadGuideStep,
    handleReaderEdit,
  };
}

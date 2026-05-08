import { useState, useRef, useEffect, useCallback } from "react";
import { getPublicTermsConfig, acceptPublicTerms } from "../../lib/api/public";

const TERMS_VISITOR_ID_KEY = "public_terms_visitor_id";
const TERMS_ACCEPTED_PREFIX = "public_terms_accepted_v";

export const getOrCreateTermsVisitorId = () => {
  try {
    const existing = localStorage.getItem(TERMS_VISITOR_ID_KEY);
    if (existing) return existing;
    const generated =
      (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
      `visitor_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    localStorage.setItem(TERMS_VISITOR_ID_KEY, generated);
    return generated;
  } catch {
    return "";
  }
};

export const hasAcceptedTermsVersion = (version) => {
  if (!version) return false;
  try {
    return Boolean(localStorage.getItem(`${TERMS_ACCEPTED_PREFIX}${version}`));
  } catch {
    return false;
  }
};

/**
 * usePublicTerms
 *
 * 管理公開授權條款的載入、滾動偵測、核取確認與提交邏輯。
 *
 * @param {object} options
 * @param {boolean} options.autoOpen - 載入後若未接受則自動開啟 dialog（用於 ReaderPage）
 * @param {function} options.onAccepted - 條款同意後的 callback(scriptId)
 */
export function usePublicTerms({ autoOpen = false, onAccepted } = {}) {
  const [termsConfig, setTermsConfig] = useState(null);
  const [isTermsConfigLoading, setIsTermsConfigLoading] = useState(true);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [termsReadToBottom, setTermsReadToBottom] = useState(false);
  const [termsRequireScroll, setTermsRequireScroll] = useState(false);
  const [acceptedChecks, setAcceptedChecks] = useState({});
  const [isSubmittingTerms, setIsSubmittingTerms] = useState(false);
  const termsScrollRef = useRef(null);

  // 載入條款設定
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsTermsConfigLoading(true);
      try {
        const config = await getPublicTermsConfig();
        if (cancelled) return;
        const normalized = config || null;
        setTermsConfig(normalized);
        if (autoOpen) {
          const version = normalized?.version;
          if (!version || hasAcceptedTermsVersion(version)) return;
          const initialChecks = {};
          (normalized?.requiredChecks || []).forEach((item) => {
            if (item?.id) initialChecks[item.id] = false;
          });
          setAcceptedChecks(initialChecks);
          setTermsReadToBottom(false);
          setTermsDialogOpen(true);
        }
      } catch (error) {
        console.error("Failed to load public terms config", error);
      } finally {
        if (!cancelled) setIsTermsConfigLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [autoOpen]);

  // dialog 開啟後偵測是否需要滾動
  useEffect(() => {
    if (!termsDialogOpen) return;
    let cancelled = false;
    const check = () => {
      if (cancelled) return;
      const node = termsScrollRef.current;
      if (!node) { requestAnimationFrame(check); return; }
      const scrollable = node.scrollHeight > node.clientHeight + 1;
      setTermsRequireScroll(scrollable);
      if (!scrollable) setTermsReadToBottom(true);
    };
    requestAnimationFrame(check);
    return () => { cancelled = true; };
  }, [termsDialogOpen, termsConfig]);

  const handleTermsScroll = useCallback((event) => {
    const target = event.currentTarget;
    if (!target) return;
    const buffer = 16;
    const scrollable = target.scrollHeight > target.clientHeight + 1;
    setTermsRequireScroll(scrollable);
    if (!scrollable) { setTermsReadToBottom(true); return; }
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - buffer) {
      setTermsReadToBottom(true);
    }
  }, []);

  const toggleRequiredCheck = useCallback((checkId, checked) => {
    setAcceptedChecks((prev) => ({ ...prev, [checkId]: Boolean(checked) }));
  }, []);

  const requiredChecks = Array.isArray(termsConfig?.requiredChecks) ? termsConfig.requiredChecks : [];
  const canConfirmTerms = (() => {
    if (termsRequireScroll && !termsReadToBottom) return false;
    if (requiredChecks.length === 0) return true;
    return requiredChecks.every((item) => Boolean(acceptedChecks[item.id]));
  })();
  const missingRequiredCheckCount = requiredChecks.filter((item) => !acceptedChecks[item.id]).length;

  /** 開啟 dialog 前先初始化 checks 狀態（用於 GalleryPage 手動觸發） */
  const openTermsDialog = useCallback((config) => {
    const cfg = config ?? termsConfig;
    const initialChecks = {};
    (cfg?.requiredChecks || []).forEach((item) => {
      if (item?.id) initialChecks[item.id] = false;
    });
    setAcceptedChecks(initialChecks);
    setTermsReadToBottom(false);
    setTermsDialogOpen(true);
  }, [termsConfig]);

  const confirmTermsConsent = useCallback(async (scriptId) => {
    if (!termsConfig?.version || !canConfirmTerms || isSubmittingTerms) return;
    setIsSubmittingTerms(true);
    try {
      const visitorId = getOrCreateTermsVisitorId();
      const agreedCheckIds = (termsConfig.requiredChecks || [])
        .filter((item) => item?.id && acceptedChecks[item.id])
        .map((item) => item.id);
      await acceptPublicTerms({
        termsVersion: termsConfig.version,
        scriptId,
        visitorId,
        locale: navigator.language || "",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        userAgent: navigator.userAgent || "",
        platform: navigator.platform || "",
        screen: {
          width: window.screen?.width || 0,
          height: window.screen?.height || 0,
          colorDepth: window.screen?.colorDepth || 0,
          pixelRatio: window.devicePixelRatio || 1,
        },
        viewport: { width: window.innerWidth || 0, height: window.innerHeight || 0 },
        pagePath: window.location.pathname + window.location.search,
        referrer: document.referrer || "",
        acceptedChecks: agreedCheckIds,
      });
      localStorage.setItem(`${TERMS_ACCEPTED_PREFIX}${termsConfig.version}`, String(Date.now()));
      setTermsDialogOpen(false);
      onAccepted?.(scriptId);
    } catch (error) {
      console.error("Failed to submit terms consent", error);
    } finally {
      setIsSubmittingTerms(false);
    }
  }, [termsConfig, canConfirmTerms, isSubmittingTerms, acceptedChecks, onAccepted]);

  return {
    termsConfig,
    isTermsConfigLoading,
    termsDialogOpen,
    setTermsDialogOpen,
    termsScrollRef,
    termsReadToBottom,
    termsRequireScroll,
    acceptedChecks,
    isSubmittingTerms,
    canConfirmTerms,
    missingRequiredCheckCount,
    handleTermsScroll,
    toggleRequiredCheck,
    openTermsDialog,
    confirmTermsConsent,
    hasAcceptedTermsVersion,
  };
}

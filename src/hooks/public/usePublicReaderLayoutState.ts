import { useCallback, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, FileUp, Printer } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { loadBasicScriptExport, loadXlsxScriptExport } from "../../lib/scriptExportLoader";
import { normalizeActivityDemoLinks } from "../../lib/activityDemoLinks";
import type { DownloadOption } from "../../types/routes";
import { exportScriptToGoogleDocs } from "../../lib/api/export";
import { getGoogleDocsAccessToken } from "../../lib/firebase";
import { pickGoogleDriveFolder } from "../../lib/googleDrivePicker";
import { buildGoogleDocsBlocksFromScript } from "../../lib/googleDocsExportModel";

const PUBLIC_READER_GUIDE_STORAGE_KEY = "public-reader-guide-seen-v1";
const PUBLIC_READER_TOC_OPEN_STORAGE_KEY = "public-reader-toc-open-v1";

interface RectLike {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PublicReaderScriptData {
  title?: string;
  author?: { id?: string; displayName?: string; name?: string } | null;
  organization?: { id?: string; name?: string; displayName?: string; logoUrl?: string; avatar?: string; avatarUrl?: string } | null;
  synopsis?: string;
  commercialUse?: string;
  derivativeUse?: string;
  notifyOnModify?: string;
  licenseSpecialTerms?: unknown[];
  contact?: unknown;
  seriesName?: string;
  prefaceItems?: unknown[];
  activity?: { name?: string; bannerUrl?: string; content?: string; workUrl?: string; demoUrl?: string; demoLinks?: unknown[] };
  coverUrl?: string | null;
  content?: string | null;
  showMarkerLegend?: boolean;
  disableCopy?: boolean;
}

interface ViewerProps {
  onProcessedHtml?: (html: string) => void;
  onRawHtml?: (html: string) => void;
  sceneList?: Array<{ id: string; label: string }>;
  scenes?: Array<{ id: string; label: string }>;
  activeSceneId?: string;
  scrollToScene?: ((sceneId: string) => void) | string;
  [key: string]: unknown;
}

interface Props {
  script?: PublicReaderScriptData | null;
  isLoading?: boolean;
  viewerProps?: ViewerProps;
  scriptSurfaceProps?: { scrollRef?: React.RefObject<HTMLElement | null>; [key: string]: unknown };
  renderedHtml?: string;
  exportMarkerConfigs?: Array<Record<string, unknown>>;
}

export function usePublicReaderLayoutState({ script, isLoading, viewerProps, scriptSurfaceProps, renderedHtml = "", exportMarkerConfigs = [] }: Props) {
  const { t } = useI18n();
  const { hideWhitespace } = useSettings();

  const {
    title,
    author,
    organization,
    synopsis,
    commercialUse,
    derivativeUse,
    notifyOnModify,
    licenseSpecialTerms,
    contact,
    seriesName,
    prefaceItems,
    activity,
    coverUrl,
    content: rawScript,
    disableCopy,
  } = script || {};

  const escapeHtml = useCallback((value = "") =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  , []);

  const contactLines = useMemo(() => {
    const toPairsFromObject = (obj: Record<string, unknown>) =>
      Object.entries(obj || {})
        .map(([key, value]) => ({ key: String(key || "").trim(), value: String(value ?? "").trim() }))
        .filter((entry) => entry.key && entry.value);

    if (contact && typeof contact === "object" && !Array.isArray(contact)) {
      return toPairsFromObject(contact as Record<string, unknown>);
    }

    let raw = String(contact || "").trim();
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return toPairsFromObject(parsed as Record<string, unknown>);
      }
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean).map((value) => ({ key: "", value }));
      }
      raw = String(parsed ?? "").trim();
    } catch {}

    return raw.split(/\r?\n|\/|\||；|;|，|,/).map((item) => item.trim()).filter(Boolean).map((value) => ({ key: "", value }));
  }, [contact]);

  const licenseSummary = useMemo(() => {
    const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
    const commercial = normalize(commercialUse);
    const derivative = normalize(derivativeUse);
    const notify = normalize(notifyOnModify);
    return [
      commercial ? `商業使用：${commercial === "allow" ? "可" : "不可"}` : "",
      derivative ? `改作許可：${derivative === "allow" ? "可" : derivative === "disallow" ? "不可" : "需同意"}` : "",
      notify ? `修改通知：${notify === "required" ? "需要" : "不需要"}` : "",
    ].filter(Boolean);
  }, [commercialUse, derivativeUse, notifyOnModify]);

  const exportBaseName = useMemo(() => {
    const safeTitle = String(title || "script").trim() || "script";
    const authorName = String(author?.displayName || author?.name || organization?.name || "unknown").trim() || "unknown";
    return `${safeTitle}_${authorName}`;
  }, [title, author?.displayName, author?.name, organization?.name]);

  const pdfHeaderHtml = useMemo(() => {
    const safeTitle = escapeHtml(title || "Script");
    const safeSynopsis = escapeHtml(synopsis || "");
    const safeCoverUrl = String(coverUrl || "").trim();
    const metaRows: string[] = [];
    if (organization?.name) metaRows.push(`組織：${escapeHtml(organization.name)}`);
    if (author?.displayName) metaRows.push(`作者：${escapeHtml(author.displayName)}`);
    contactLines.forEach((line) => {
      const text = line.key ? `${line.key}: ${line.value}` : line.value;
      if (String(text || "").trim()) metaRows.push(`聯絡：${escapeHtml(text)}`);
    });
    licenseSummary.forEach((item) => metaRows.push(escapeHtml(item)));
    return `
      <section style="margin-bottom:20px;">
        ${safeCoverUrl ? `
          <div style="margin-bottom:14px;">
            <img src="${escapeHtml(safeCoverUrl)}" alt="${safeTitle}" style="width:100%;max-height:360px;object-fit:cover;border-radius:10px;border:1px solid #d6d9e0;" />
          </div>
        ` : ""}
        <h1 style="margin:0 0 8px 0;font-size:28px;line-height:1.25;">${safeTitle}</h1>
        ${safeSynopsis ? `<p style="margin:0 0 12px 0;color:#4b5563;white-space:pre-wrap;">${safeSynopsis}</p>` : ""}
        ${metaRows.length > 0 ? `
          <div style="padding:10px 12px;border:1px solid #d6d9e0;border-radius:10px;background:#f8fafc;">
            ${metaRows.map((row) => `<div style="font-size:12px;line-height:1.6;color:#374151;">${row}</div>`).join("")}
          </div>
        ` : ""}
      </section>
    `.trim();
  }, [escapeHtml, title, synopsis, coverUrl, organization?.name, author?.displayName, contactLines, licenseSummary]);

  const [exportRenderedHtml, setExportRenderedHtml] = useState("");
  const [exportRawHtml, setExportRawHtml] = useState("");
  const externalOnProcessedHtml = viewerProps?.onProcessedHtml;
  const externalOnRawHtml = viewerProps?.onRawHtml;

  const mergedViewerProps = useMemo(() => ({
    ...(viewerProps || {}),
    onProcessedHtml: (html: string) => {
      const next = html || "";
      setExportRenderedHtml(next);
      externalOnProcessedHtml?.(next);
    },
    onRawHtml: (html: string) => {
      const next = html || "";
      setExportRawHtml(next);
      externalOnRawHtml?.(next);
    },
  }), [viewerProps, externalOnProcessedHtml, externalOnRawHtml]);

  const downloadOptions: DownloadOption[] = [
    {
      id: "pdf",
      label: t("publicReader.exportPdf"),
      icon: Printer,
      onClick: async () => {
        const { exportScriptAsPdf } = await loadBasicScriptExport();
        await exportScriptAsPdf(exportBaseName, {
          text: rawScript || "",
          renderedHtml: exportRenderedHtml || exportRawHtml || renderedHtml || "",
          headerHtml: pdfHeaderHtml,
        });
      },
      disabled: !rawScript && !title,
    },
    {
      id: "docx",
      label: t("publicReader.downloadDoc"),
      icon: FileText,
      onClick: async () => {
        const { exportScriptAsDocx } = await loadBasicScriptExport();
        await exportScriptAsDocx(exportBaseName, {
          text: rawScript || "",
          renderedHtml: exportRenderedHtml || exportRawHtml || renderedHtml || "",
        });
      },
      disabled: !rawScript,
    },
    {
      id: "xlsx",
      label: t("publicReader.downloadXlsx"),
      icon: FileSpreadsheet,
      onClick: async () => {
        const { exportScriptAsXlsx } = await loadXlsxScriptExport();
        await exportScriptAsXlsx(exportBaseName, {
          text: rawScript || "",
          renderedHtml: exportRenderedHtml || exportRawHtml || renderedHtml || "",
        });
      },
      disabled: !rawScript,
    },
    {
      id: "google-docs",
      label: t("publicReader.exportGoogleDocs"),
      icon: FileUp,
      onClick: async () => {
        const token = await getGoogleDocsAccessToken();
        const folderId = await pickGoogleDriveFolder(token);
        if (!folderId) return;
        const effectiveRenderedHtml = exportRenderedHtml || exportRawHtml || renderedHtml || "";
        const docsBlocks = buildGoogleDocsBlocksFromScript(rawScript || "", exportMarkerConfigs as any);
        if (docsBlocks.length === 0) {
          throw new Error("Google Docs export failed: rendered output is empty, cannot build export blocks.");
        }
        const result = await exportScriptToGoogleDocs(exportBaseName, {
          text: rawScript || "",
          renderedHtml: effectiveRenderedHtml,
          googleAccessToken: token,
          folderId,
          docsBlocks,
        });
        if (result?.documentUrl) {
          window.open(result.documentUrl, "_blank", "noopener,noreferrer");
        }
      },
      disabled: !rawScript,
    },
  ];

  // Guide state
  const [titleVisible, setTitleVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState<RectLike | null>(null);
  const [tocOpen, setTocOpen] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(PUBLIC_READER_TOC_OPEN_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const guideSteps = useMemo(() => ([
    {
      title: t("publicReader.guideTocEntryTitle", "詳細資料按鈕"),
      description: t("publicReader.guideTocEntryDesc", "先點這個按鈕可開啟詳細資料側欄。"),
      targetId: "public-guide-toc-trigger",
    },
    {
      title: t("publicReader.guideTocPanelTitle", "左側導覽面板"),
      description: t("publicReader.guideTocPanelDesc", "這裡可快速跳場景、查看更多作品資訊。"),
      targetId: "public-guide-toc-panel",
      delaySpotlight: 350,
    },
    {
      title: t("publicReader.guideHeaderTitle"),
      description: t("publicReader.guideHeaderDesc"),
      targetId: "public-guide-actions",
    },
    {
      title: t("publicReader.guideInfoTitle"),
      description: t("publicReader.guideInfoDesc"),
      targetId: null,
    },
    {
      title: t("publicReader.guideScriptTitle"),
      description: t("publicReader.guideScriptDesc"),
      targetId: null,
    },
  ]), [t]);

  const currentGuide = showGuide ? guideSteps[guideIndex] : null;

  const resolveGuideTarget = useCallback((): Element | null => {
    if (!currentGuide?.targetId) return null;
    const nodes = document.querySelectorAll(`[data-guide-id="${currentGuide.targetId}"]`);
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return node;
    }
    return null;
  }, [currentGuide]);

  const refreshGuideSpotlight = useCallback(() => {
    if (!showGuide) { setGuideSpotlightRect(null); return; }
    const node = resolveGuideTarget();
    if (!node) { setGuideSpotlightRect(null); return; }
    const rect = node.getBoundingClientRect();
    const pad = 10;
    setGuideSpotlightRect({
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: Math.max(80, rect.width + pad * 2),
      height: Math.max(52, rect.height + pad * 2),
    });
  }, [resolveGuideTarget, showGuide]);

  const jumpGuide = useCallback((index: number) => {
    if (index < 0 || index >= guideSteps.length) return;
    setGuideIndex(index);
    setShowGuide(true);
  }, [guideSteps.length]);

  const finishGuide = useCallback(() => {
    setShowGuide(false);
    setGuideIndex(0);
    setGuideSpotlightRect(null);
    setTocOpen(false);
    try { localStorage.setItem(PUBLIC_READER_GUIDE_STORAGE_KEY, "1"); }
    catch (err) { console.error("Failed to persist public reader guide state", err); }
  }, []);

  const handleGuideNext = useCallback(() => {
    if (guideIndex >= guideSteps.length - 1) { finishGuide(); return; }
    jumpGuide(guideIndex + 1);
  }, [finishGuide, guideIndex, guideSteps.length, jumpGuide]);

  const handleGuidePrev = useCallback(() => {
    if (guideIndex <= 0) return;
    jumpGuide(guideIndex - 1);
  }, [guideIndex, jumpGuide]);

  const handleStartGuide = useCallback(() => {
    setTocOpen(false);
    jumpGuide(0);
  }, [jumpGuide]);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(PUBLIC_READER_GUIDE_STORAGE_KEY) === "1";
      if (!seen) {
        jumpGuide(0);
        localStorage.setItem(PUBLIC_READER_GUIDE_STORAGE_KEY, "1");
      }
    } catch (err) {
      console.error("Failed to read public reader guide state", err);
    }
  }, [jumpGuide]);

  useEffect(() => {
    if (!showGuide) return;
    const targetId = currentGuide?.targetId || "";
    if (targetId === "public-guide-toc-panel") setTocOpen(true);
    else if (targetId) setTocOpen(false);
  }, [showGuide, currentGuide]);

  useEffect(() => {
    if (!showGuide) return;
    const delay = currentGuide?.delaySpotlight || 0;
    let raf: number | undefined;
    const run = () => { raf = window.requestAnimationFrame(refreshGuideSpotlight); };
    const timer = delay > 0 ? window.setTimeout(run, delay) : undefined;
    if (!timer) run();
    window.addEventListener("resize", refreshGuideSpotlight);
    window.addEventListener("scroll", refreshGuideSpotlight, true);
    return () => {
      if (timer) window.clearTimeout(timer);
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", refreshGuideSpotlight);
      window.removeEventListener("scroll", refreshGuideSpotlight, true);
    };
  }, [showGuide, guideIndex, tocOpen, refreshGuideSpotlight, currentGuide?.delaySpotlight]);

  useEffect(() => {
    try { localStorage.setItem(PUBLIC_READER_TOC_OPEN_STORAGE_KEY, tocOpen ? "1" : "0"); }
    catch (err) { console.error("Failed to persist reader toc state", err); }
  }, [tocOpen]);

  useEffect(() => {
    const scrollEl = scriptSurfaceProps?.scrollRef?.current;
    if (!scrollEl) return;
    const onScroll = () => setTitleVisible(scrollEl.scrollTop > 300);
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, [scriptSurfaceProps?.scrollRef]);

  // Content protection
  useEffect(() => {
    if (!disableCopy) return;
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'a' || e.key === 's' || e.key === 'x') e.preventDefault();
      }
    };
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);
    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, [disableCopy]);

  const backgroundStyle = coverUrl
    ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted)))" };

  const normalizedActivity = useMemo(() => {
    const base = activity || {};
    const name = String(base?.name || "").trim();
    const bannerUrl = String(base?.bannerUrl || "").trim();
    const content = String(base?.content || "").trim();
    const workUrl = String(base?.workUrl || "").trim();
    if (!name && !bannerUrl && !content && !workUrl) return null;
    return { name, bannerUrl, content, workUrl };
  }, [activity]);

  const normalizedDemoLinks = useMemo(() => {
    const base = activity || {};
    const demoUrl = String(base?.demoUrl || "").trim();
    const links = normalizeActivityDemoLinks(base?.demoLinks || []).filter((item) => item.url);
    if (links.length === 0 && demoUrl) {
      links.push({ id: "demo-legacy", name: "試聽範例", url: demoUrl, cast: "", description: "" });
    }
    return links;
  }, [activity]);

  const normalizedLicenseSpecialTerms = useMemo(
    () => (Array.isArray(licenseSpecialTerms) ? licenseSpecialTerms.map((item) => String(item ?? "").trim()).filter(Boolean) : []),
    [licenseSpecialTerms]
  );

  const protectionClass = disableCopy ? 'select-none' : '';

  return {
    t,
    hideWhitespace,
    // script data
    title, author, organization, synopsis,
    commercialUse, derivativeUse, notifyOnModify,
    seriesName, prefaceItems, coverUrl, rawScript, disableCopy,
    // computed
    contactLines, licenseSummary, exportBaseName, pdfHeaderHtml,
    mergedViewerProps, downloadOptions,
    backgroundStyle, protectionClass,
    normalizedActivity, normalizedDemoLinks, normalizedLicenseSpecialTerms,
    // guide
    showGuide, guideIndex, guideSteps, currentGuide, guideSpotlightRect,
    tocOpen, setTocOpen,
    titleVisible,
    handleStartGuide, handleGuideNext, handleGuidePrev, finishGuide,
  };
}

export type { RectLike, PublicReaderScriptData, ViewerProps };

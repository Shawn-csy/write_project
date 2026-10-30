import { useCallback, useEffect, useMemo, useState } from "react";
import { useSettings } from "../../contexts/SettingsContext";
import { useI18n } from "../../contexts/I18nContext";
import { normalizeActivityDemoLinks } from "../../lib/activityDemoLinks";
import { getMediaCropStyle } from "../../lib/mediaCropRef";
import type { DownloadOption } from "../../types/routes";
import type { MarkerConfig } from "../../types/script";
import type { CoverDesign } from "../../types/coverDesign";
import { buildV2TableExportFromRenderedHtml } from "../../lib/v2/exportAdapter";
import { useScriptDownloadOptions } from "../shared/useScriptDownloadOptions";
import { buildExportMetadata } from "../../lib/exportMetadata";

const PUBLIC_READER_TOC_OPEN_STORAGE_KEY = "public-reader-toc-open-v1";

interface PublicReaderScriptData {
  title?: string;
  author?: { id?: string; displayName?: string; name?: string } | null;
  organization?: { id?: string; name?: string; displayName?: string; logoUrl?: string; avatar?: string; avatarUrl?: string } | null;
  synopsis?: string;
  license?: string;
  tags?: string[];
  targetAudience?: string;
  contentRating?: string;
  customFields?: Array<{ key?: string; value?: string }>;
  commercialUse?: string;
  derivativeUse?: string;
  notifyOnModify?: string;
  licenseSpecialTerms?: unknown[];
  contact?: unknown;
  seriesName?: string;
  prefaceItems?: unknown[];
  activity?: { name?: string; bannerUrl?: string; content?: string; workUrl?: string; demoUrl?: string; demoLinks?: unknown[] };
  coverUrl?: string | null;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  coverDesign?: CoverDesign | null;
  content?: string | null;
  showMarkerLegend?: boolean;
  disableCopy?: boolean;
}

interface ViewerProps {
  onProcessedHtml?: (html: string) => void;
  onRawHtml?: (html: string) => void;
  usePresentationRenderer?: boolean;
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
    license,
    tags,
    targetAudience,
    contentRating,
    customFields,
    commercialUse,
    derivativeUse,
    notifyOnModify,
    licenseSpecialTerms,
    contact,
    seriesName,
    prefaceItems,
    activity,
    coverUrl,
    coverCrop,
    coverDesign,
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
  const exportMetadata = useMemo(() => buildExportMetadata(script, title || "Script"), [script, title]);

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

  const downloadOptions: DownloadOption[] = useScriptDownloadOptions({
    t,
    title: exportBaseName,
    content: rawScript || "",
    markerConfigs: exportMarkerConfigs as MarkerConfig[],
    getRenderedHtml: () => exportRenderedHtml || exportRawHtml || renderedHtml || "",
    pdfHeaderHtml,
    exportMetadata,
    pdfCoverUrl: coverUrl,
    disablePdf: !rawScript && !title,
    disableDocx: !rawScript,
    disableXlsx: !rawScript,
    disableGoogleDocs: !rawScript,
    showPdf: true,
    showDocx: false,
    showXlsx: false,
    showGoogleDocs: false,
    enableGoogleDocsTable: !!mergedViewerProps?.usePresentationRenderer,
    showGoogleDocsTableOption: false,
    resolveTableExport: (html) => buildV2TableExportFromRenderedHtml(html),
  });

  const [titleVisible, setTitleVisible] = useState(false);
  const [tocOpen, setTocOpen] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(PUBLIC_READER_TOC_OPEN_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

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

  const bgCover = getMediaCropStyle(String(coverUrl || ""), coverCrop);
  const backgroundStyle = coverUrl
    ? { backgroundImage: `url(${bgCover.src})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(to bottom, hsl(var(--background)), hsl(var(--muted)))" };
  const coverDisplayUrl = bgCover.src;

  const normalizedActivity = useMemo(() => {
    const base = activity || {};
    const name = String(base?.name || "").trim();
    const bannerUrl = String(base?.bannerUrl || "").trim();
    const content = String(base?.content || "").trim();
    const workUrl = String(base?.workUrl || "").trim();
    if (!name && !bannerUrl && !content && !workUrl) return null;
    const bannerCrop = (base as { bannerCrop?: { cx?: number; cy?: number; zoom?: number } | null }).bannerCrop || null;
    return { name, bannerUrl, bannerCrop, content, workUrl };
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
    title, author, organization, synopsis, license, tags, targetAudience, contentRating, customFields,
    commercialUse, derivativeUse, notifyOnModify,
    seriesName, prefaceItems, coverUrl, coverCrop, coverDesign, rawScript, disableCopy,
    // computed
    contactLines, licenseSummary, exportBaseName, pdfHeaderHtml,
    mergedViewerProps, downloadOptions,
    backgroundStyle, coverDisplayUrl, protectionClass,
    normalizedActivity, normalizedDemoLinks, normalizedLicenseSpecialTerms,
    tocOpen, setTocOpen,
    titleVisible,
  };
}

export type { PublicReaderScriptData, ViewerProps };

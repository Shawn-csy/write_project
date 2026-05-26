import React from "react";
import { parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import { customMetadataEntriesToMeta } from "../../lib/customMetadata";
import { AUDIENCE_TAG_GROUP, RATING_TAG_GROUP } from "../dashboard/tagGroupUtils";
import type { PersonaLike } from "../../types/persona";
import type { BaseScriptApi } from "../../types/api";

type PublisherScriptItem = BaseScriptApi;
export type PublishReadinessStatus = "needs_work" | "ready" | "published";

export interface PublishReadiness {
  status: PublishReadinessStatus;
  label: string;
  primaryActionLabel: string;
  missingRequired: string[];
  missingRecommended: string[];
}

const INITIAL_VISIBLE = 12;
const PREFETCH_STEP = 24;

interface Props {
  scripts: PublisherScriptItem[];
  personas?: PersonaLike[];
  isLoading: boolean;
}

export function usePublisherWorksTabState({ scripts, personas = [], isLoading }: Props) {
  const [filter, setFilter] = React.useState<"all" | PublishReadinessStatus>("all");
  const [query, setQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [sortKey, setSortKey] = React.useState<"updated_desc" | "updated_asc" | "title_asc" | "views_desc">("updated_desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState<boolean>(false);
  const [failedCoverById, setFailedCoverById] = React.useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);

  const hasCover = (value: unknown) => Boolean(String(value || "").trim());
  const isPublicScript = React.useCallback((script: PublisherScriptItem) => script?.status === "Public" || Boolean(script?.isPublic), []);
  const getTagNames = React.useCallback((script: PublisherScriptItem) =>
    (script.tags || []).map((tag) => String(tag?.name || "").trim()).filter(Boolean)
  , []);

  const parseTopLevelLicense = React.useCallback((script: PublisherScriptItem) => {
    return parseBasicLicenseFromMeta({
      licensecommercial: script?.licenseCommercial ?? script?.licensecommercial ?? "",
      licensederivative: script?.licenseDerivative ?? script?.licensederivative ?? "",
      licensenotify: script?.licenseNotify ?? script?.licensenotify ?? "",
    });
  }, []);

  const isBasicLicenseComplete = React.useCallback((basic: { commercialUse?: string; derivativeUse?: string; notifyOnModify?: string }) => {
    return Boolean(basic?.commercialUse && basic?.derivativeUse && basic?.notifyOnModify);
  }, []);

  const getPersonaFallbackLicense = React.useCallback((script: PublisherScriptItem) => {
    if (!script?.personaId) return { commercialUse: "", derivativeUse: "", notifyOnModify: "" };
    const persona = (personas || []).find((item) => item?.id === script.personaId);
    if (!persona) return { commercialUse: "", derivativeUse: "", notifyOnModify: "" };
    return parseBasicLicenseFromMeta({
      licensecommercial: persona.defaultLicenseCommercial || "",
      licensederivative: persona.defaultLicenseDerivative || "",
      licensenotify: persona.defaultLicenseNotify || "",
    });
  }, [personas]);

  const hasCompleteLicense = React.useCallback((script: PublisherScriptItem) => {
    const topLevel = parseTopLevelLicense(script);
    if (isBasicLicenseComplete(topLevel)) return true;
    const fallback = getPersonaFallbackLicense(script);
    return isBasicLicenseComplete(fallback);
  }, [getPersonaFallbackLicense, isBasicLicenseComplete, parseTopLevelLicense]);

  const getReadiness = React.useCallback((script: PublisherScriptItem): PublishReadiness => {
    const meta = customMetadataEntriesToMeta(script.customMetadata || []);
    const tagNames = getTagNames(script);
    const hasAudience = tagNames.some((tag) => AUDIENCE_TAG_GROUP.includes(tag));
    const hasRating = tagNames.some((tag) => RATING_TAG_GROUP.includes(tag));
    const hasIdentity = Boolean(script.personaId || String(meta.publishas || meta.publishAs || "").startsWith("persona:"));
    const hasSynopsis = Boolean(String(script.synopsis || "").trim());
    const missingRequired: string[] = [];
    const missingRecommended: string[] = [];

    if (!String(script.title || "").trim()) missingRequired.push("標題");
    if (!hasIdentity) missingRequired.push("發布身分");
    if (!hasAudience) missingRequired.push("觀眾取向");
    if (!hasRating) missingRequired.push("內容分級");
    if (!hasCompleteLicense(script)) missingRequired.push("授權");
    if (!hasCover(script.coverUrl)) missingRecommended.push("封面");
    if (!hasSynopsis) missingRecommended.push("簡介");
    if (tagNames.length === 0) missingRecommended.push("標籤");

    const isPublished = isPublicScript(script);
    if (isPublished) {
      return {
        status: "published",
        label: "已公開",
        primaryActionLabel: "編輯公開資訊",
        missingRequired,
        missingRecommended,
      };
    }
    if (missingRequired.length > 0) {
      return {
        status: "needs_work",
        label: "待處理",
        primaryActionLabel: "補齊發布資料",
        missingRequired,
        missingRecommended,
      };
    }
    if (missingRecommended.length > 0) {
      return {
        status: "ready",
        label: "可公開",
        primaryActionLabel: "檢查並公開",
        missingRequired,
        missingRecommended,
      };
    }
    return {
      status: "ready",
      label: "可公開",
      primaryActionLabel: "檢查並公開",
      missingRequired,
      missingRecommended,
    };
  }, [getTagNames, hasCompleteLicense, hasCover, isPublicScript]);

  const statusBadgeClass = (script: PublisherScriptItem) => {
    const isPublic = isPublicScript(script);
    return isPublic
      ? "border-primary/50 bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30 hover:bg-primary/90"
      : "border-border bg-muted text-foreground hover:bg-muted/80";
  };

  const scriptsWithReadiness = React.useMemo(() =>
    (scripts || []).map((script) => ({ script, readiness: getReadiness(script) }))
  , [getReadiness, scripts]);

  const readinessById = React.useMemo(() => {
    const next: Record<string, PublishReadiness> = {};
    for (const item of scriptsWithReadiness) next[item.script.id] = item.readiness;
    return next;
  }, [scriptsWithReadiness]);

  const stats = React.useMemo(() => {
    let needsWorkCount = 0;
    let readyCount = 0;
    let publishedCount = 0;
    (scripts || []).forEach((script) => {
      const readiness = readinessById[script.id] || getReadiness(script);
      if (readiness.status === "needs_work") needsWorkCount += 1;
      else if (readiness.status === "ready") readyCount += 1;
      else if (readiness.status === "published") publishedCount += 1;
    });
    return { total: (scripts || []).length, needsWorkCount, readyCount, publishedCount };
  }, [getReadiness, readinessById, scripts]);

  const hasAnyScripts = (scripts || []).length > 0;

  const filteredScripts = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scriptsWithReadiness.filter(({ script, readiness }) => {
      if (filter !== "all" && readiness.status !== filter) return false;
      if (!needle) return true;
      const meta = customMetadataEntriesToMeta(script.customMetadata || []);
      const haystack = [
        script.title,
        script.author,
        script.series?.name,
        meta.series,
        meta.seriesname,
        ...getTagNames(script),
      ].map((value) => String(value || "").toLowerCase()).join(" ");
      return haystack.includes(needle);
    }).map(({ script }) => script);
  }, [filter, getTagNames, query, scriptsWithReadiness]);

  const hasActiveFilters = filter !== "all" || query.trim().length > 0;
  const clearFilters = React.useCallback(() => {
    setFilter("all");
    setQuery("");
  }, []);

  const filteredStatusCounts = React.useMemo(() => {
    const counts = { all: 0, needs_work: 0, ready: 0, published: 0 };
    const needle = query.trim().toLowerCase();
    scriptsWithReadiness.forEach(({ script, readiness }) => {
      if (needle) {
        const meta = customMetadataEntriesToMeta(script.customMetadata || []);
        const haystack = [
          script.title,
          script.author,
          script.series?.name,
          meta.series,
          meta.seriesname,
          ...getTagNames(script),
        ].map((value) => String(value || "").toLowerCase()).join(" ");
        if (!haystack.includes(needle)) return;
      }
      counts.all += 1;
      counts[readiness.status] += 1;
    });
    return counts;
  }, [getTagNames, query, scriptsWithReadiness]);

  const sortedScripts = React.useMemo(() => {
    const list = [...filteredScripts];
    list.sort((a, b) => {
      const aTitle = String(a?.title || "");
      const bTitle = String(b?.title || "");
      const aUpdated = Number(a?.lastModified || a?.updatedAt || 0);
      const bUpdated = Number(b?.lastModified || b?.updatedAt || 0);
      const aViews = Number(a?.views || 0);
      const bViews = Number(b?.views || 0);
      if (sortKey === "title_asc") return aTitle.localeCompare(bTitle, "zh-Hant");
      if (sortKey === "updated_asc") return aUpdated - bUpdated;
      if (sortKey === "views_desc") return bViews - aViews;
      return bUpdated - aUpdated;
    });
    return list;
  }, [filteredScripts, sortKey]);

  React.useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [filter, query, sortKey, scripts]);
  React.useEffect(() => { setFailedCoverById({}); }, [scripts]);

  const visibleScripts = React.useMemo(
    () => sortedScripts.slice(0, visibleCount),
    [sortedScripts, visibleCount]
  );

  React.useEffect(() => {
    if (isLoading) return;
    if (visibleCount >= sortedScripts.length) return;
    let cancelled = false;
    let idleId: number | null = null;
    let timerId: number | null = null;
    const prefetchNextBatch = () => {
      if (cancelled) return;
      setVisibleCount((prev) => Math.min(prev + PREFETCH_STEP, sortedScripts.length));
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(prefetchNextBatch, { timeout: 300 });
    } else {
      timerId = globalThis.setTimeout(prefetchNextBatch, 120);
    }
    return () => {
      cancelled = true;
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [sortedScripts.length, isLoading, visibleCount]);

  const hasMore = visibleCount < sortedScripts.length;
  const loadMore = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PREFETCH_STEP, sortedScripts.length));
  }, [sortedScripts.length]);

  const onCoverError = React.useCallback((id: string) => {
    setFailedCoverById((prev) => ({ ...prev, [id]: true }));
  }, []);

  return {
    filter, setFilter,
    query, setQuery,
    viewMode, setViewMode,
    sortKey, setSortKey,
    showAdvancedFilters, setShowAdvancedFilters,
    failedCoverById, onCoverError,
    stats, filteredStatusCounts, hasAnyScripts, hasActiveFilters, clearFilters,
    filteredScripts, sortedScripts, visibleScripts,
    hasMore, loadMore,
    hasCover, hasCompleteLicense, statusBadgeClass, readinessById, getReadiness,
    PREFETCH_STEP,
  };
}

export type { PublisherScriptItem };

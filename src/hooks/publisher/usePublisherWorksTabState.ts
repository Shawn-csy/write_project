import React from "react";
import { parseBasicLicenseFromMeta } from "../../lib/licenseRights";
import type { PersonaLike } from "../../types/persona";
import type { BaseScriptApi } from "../../types/api";

type PublisherScriptItem = BaseScriptApi;

const INITIAL_VISIBLE = 12;
const PREFETCH_STEP = 24;

interface Props {
  scripts: PublisherScriptItem[];
  personas?: PersonaLike[];
  isLoading: boolean;
}

export function usePublisherWorksTabState({ scripts, personas = [], isLoading }: Props) {
  const [filter, setFilter] = React.useState<"all" | "public" | "private">("all");
  const [coverFilter, setCoverFilter] = React.useState<"all" | "with" | "without">("all");
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [sortKey, setSortKey] = React.useState<"updated_desc" | "updated_asc" | "title_asc" | "views_desc">("updated_desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState<boolean>(false);
  const [failedCoverById, setFailedCoverById] = React.useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE);

  const hasCover = (value: unknown) => Boolean(String(value || "").trim());

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

  const statusBadgeClass = (script: PublisherScriptItem) => {
    const isPublic = script?.status === "Public" || script?.isPublic;
    return isPublic
      ? "border-primary/50 bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30 hover:bg-primary/90"
      : "border-border bg-muted text-foreground hover:bg-muted/80";
  };

  const stats = React.useMemo(() => {
    let publicCount = 0;
    let privateCount = 0;
    (scripts || []).forEach((script) => {
      const isPublic = script.status === "Public" || script.isPublic;
      if (isPublic) publicCount += 1;
      else privateCount += 1;
    });
    return { total: (scripts || []).length, publicCount, privateCount };
  }, [scripts]);

  const hasAnyScripts = (scripts || []).length > 0;

  const filteredScripts = React.useMemo(() => {
    return (scripts || []).filter((script) => {
      const isPublic = script.status === "Public" || script.isPublic;
      if (filter === "public" && !isPublic) return false;
      if (filter === "private" && isPublic) return false;
      if (coverFilter === "with" && !hasCover(script.coverUrl)) return false;
      if (coverFilter === "without" && hasCover(script.coverUrl)) return false;
      return true;
    });
  }, [scripts, filter, coverFilter]);

  const hasActiveFilters = filter !== "all" || coverFilter !== "all";

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

  React.useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [filter, coverFilter, sortKey, scripts]);
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
    coverFilter, setCoverFilter,
    viewMode, setViewMode,
    sortKey, setSortKey,
    showAdvancedFilters, setShowAdvancedFilters,
    failedCoverById, onCoverError,
    stats, hasAnyScripts, hasActiveFilters,
    filteredScripts, sortedScripts, visibleScripts,
    hasMore, loadMore,
    hasCover, hasCompleteLicense, statusBadgeClass,
    PREFETCH_STEP,
  };
}

export type { PublisherScriptItem };

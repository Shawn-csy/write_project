import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, FolderPlus, Link2, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { CoverPlaceholder } from "../components/ui/CoverPlaceholder";
import { CoverRenderer } from "../components/ui/CoverRenderer";
import { StudioPage, StudioPageHeader, StudioSectionTitle } from "../components/studio/StudioPage";
import { SegmentedControl } from "../components/studio/SegmentedControl";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { useAuth } from "../contexts/AuthContext";
import { getMediaCropStyle } from "../lib/mediaCropRef";
import type { ScriptManager, CloudScript } from "../hooks/useScriptManager.types";
import { deleteScript } from "../lib/api/scripts";
import { useToast } from "../components/ui/toast";
import type { WriteScriptItem } from "../types/write";
import type { BaseScriptApi } from "../types/api";
import { lazyWithRefreshRetry } from "../lib/lazyWithRefreshRetry";

const PublisherWorksTab = lazyWithRefreshRetry(async () => {
  const module = await import("../components/dashboard/publisher/PublisherWorksTab");
  return { default: module.PublisherWorksTab };
}, "works-published-view");
const WriteTab = lazyWithRefreshRetry(async () => {
  const module = await import("../components/dashboard/WriteTab");
  return { default: module.WriteTab };
}, "works-folder-view");

type WorksView = "all" | "folders";

const isCloudScript = (value: unknown): value is CloudScript =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

interface RecentWork {
  id: string;
  title: string;
  lastModified?: number;
  coverUrl?: string;
  coverDesign?: BaseScriptApi["coverDesign"];
}

const formatRelative = (ts?: number): string => {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const hour = 60 * 60 * 1000;
  if (diff < hour) return "剛剛編輯";
  if (diff < 24 * hour) return `${Math.floor(diff / hour)} 小時前編輯`;
  if (diff < 7 * 24 * hour) return `${Math.floor(diff / (24 * hour))} 天前編輯`;
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} 編輯`;
};

const toRecentWorks = (items: Array<{ id: string; title: string; type?: string; lastModified?: number; coverUrl?: unknown; coverDesign?: unknown }>): RecentWork[] =>
  [...items]
    .filter((item) => item.id && item.type !== "folder")
    .sort((a, b) => Number(b.lastModified || 0) - Number(a.lastModified || 0))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      title: item.title || "未命名",
      lastModified: Number(item.lastModified || 0) || undefined,
      coverUrl: typeof item.coverUrl === "string" ? item.coverUrl : undefined,
      coverDesign: item.coverDesign && typeof item.coverDesign === "object" && "bg" in item.coverDesign
        ? item.coverDesign as BaseScriptApi["coverDesign"]
        : null,
    }));

export default function WorksPage({ scriptManager }: { scriptManager: ScriptManager }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const view: WorksView = new URLSearchParams(location.search).get("view") === "folders" ? "folders" : "all";
  const [visitedAll, setVisitedAll] = useState(view === "all");
  const [visitedFolders, setVisitedFolders] = useState(view === "folders");
  const s = usePublisherDashboardState({ mode: "studio", enabled: visitedAll });
  const [recent, setRecent] = useState<RecentWork[] | null>(null);
  const [requestedAction, setRequestedAction] = useState<{ id: number; type: "create-script" | "create-folder" | "import-script" } | null>(null);

  useEffect(() => {
    if (view === "all") setVisitedAll(true);
    else setVisitedFolders(true);
  }, [view]);

  const captureFolderRecent = useCallback((items: WriteScriptItem[]) => {
    setRecent((previous) => previous ?? toRecentWorks(items));
  }, []);

  const {
    setActiveCloudScript, setActivePublicScriptId,
    setRawScript, setTitleName, setCloudScriptMode,
  } = scriptManager;

  useEffect(() => {
    setActiveCloudScript(null);
    setActivePublicScriptId(null);
    setRawScript("");
    setTitleName("");
    setCloudScriptMode("read");
    document.title = "作品｜Screenplay 工作室";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The recent strip is captured from the first unfiltered load so it does not
  // jump around while the list below is being filtered.
  useEffect(() => {
    if (!visitedAll || recent !== null || s.isWorksLoading) return;
    setRecent(toRecentWorks(s.scripts || []));
  }, [visitedAll, recent, s.isWorksLoading, s.scripts]);

  const setView = (next: WorksView) => {
    if (next === "all") setVisitedAll(true);
    else setVisitedFolders(true);
    const params = new URLSearchParams(location.search);
    if (next === "folders") params.set("view", "folders");
    else {
      params.delete("view");
      params.delete("folder");
    }
    const query = params.toString();
    navigate(`/works${query ? `?${query}` : ""}`, { replace: true });
  };

  const openEditor = (script: unknown, mode: string = "edit") => {
    if (!isCloudScript(script)) return;
    const resolvedMode = mode === "read" ? "read" : "edit";
    setActiveCloudScript(script);
    if (script.content !== undefined) setRawScript(script.content || "");
    setTitleName(script.title || "");
    setCloudScriptMode(resolvedMode);
    setActivePublicScriptId(null);
    navigate(`/edit/${script.id}?mode=${resolvedMode}`);
  };

  const startCreate = (type: "create-script" | "create-folder" | "import-script") => {
    // The folder view handles creation after it mounts, including on a first visit.
    if (view !== "folders") setView("folders");
    setRequestedAction((previous) => ({ id: (previous?.id ?? 0) + 1, type }));
  };

  const handleDeleteDraft = async (script: { id: string; title?: string }) => {
    try {
      await deleteScript(script.id);
      s.setScripts((previous) => previous.filter((item) => item.id !== script.id));
      await s.refreshWorks();
      toast({ title: "草稿已刪除", description: `「${script.title || "未命名"}」已永久刪除。` });
    } catch (error) {
      console.error("Failed to delete draft", error);
      toast({ title: "刪除失敗", description: "請稍後再試一次。", variant: "destructive" });
      throw error;
    }
  };

  return (
    <StudioPage width="wide">
      <StudioPageHeader
        title="作品"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/works/external">
                <Link2 className="h-4 w-4" />
                加入外部作品
              </Link>
            </Button>
            <div className="inline-flex overflow-hidden rounded-md bg-primary text-primary-foreground shadow">
              <Button className="rounded-none shadow-none" onClick={() => startCreate("create-script")}>
                <Plus className="h-4 w-4" />
                新增台本
              </Button>
              {/* Non-modal: the folder item opens the create Dialog. A modal menu plus a modal Dialog trap focus against each other and freeze the page. */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-none border-l border-primary-foreground/25 px-2 shadow-none" aria-label="更多新增選項">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-48">
                  <DropdownMenuItem onClick={() => startCreate("create-folder")}>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    新增資料夾
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      {recent && recent.length > 0 ? (
        <section aria-labelledby="works-recent" className="mb-8">
          <StudioSectionTitle>
            <span id="works-recent">繼續寫作</span>
          </StudioSectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
            {recent.map((item) => {
              const crop = getMediaCropStyle(String(item.coverUrl || ""));
              return (
                <Link
                  key={item.id}
                  to={`/edit/${item.id}?mode=edit`}
                  className="group flex min-w-0 gap-3 rounded-[10px] border border-border bg-card p-2.5 transition-colors hover:border-foreground/20 sm:p-3"
                >
                  <span className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {crop.src ? (
                      <img src={crop.src} style={crop.style} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : item.coverDesign ? (
                      <CoverRenderer design={item.coverDesign} title={item.title} compact responsive className="h-full w-full" />
                    ) : (
                      <CoverPlaceholder title={item.title} compact />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{formatRelative(item.lastModified)}</span>
                    <span className="mt-auto text-[13px] font-medium text-primary group-hover:underline">繼續編輯 →</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-label="全部作品">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="mr-1 text-[15px] font-semibold">全部作品</h2>
          <SegmentedControl<WorksView>
            ariaLabel="檢視方式"
            value={view}
            onChange={setView}
            options={[
              { value: "all", label: "依發布狀態" },
              { value: "folders", label: "依資料夾" },
            ]}
          />
        </div>

        <div hidden={view !== "all"}>
          {visitedAll && <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">載入作品中…</div>}><PublisherWorksTab
            isLoading={s.isWorksLoading}
            scripts={s.scripts}
            personas={s.personas}
            setEditingScript={(script) => navigate(`/works/${encodeURIComponent(String(script.id))}`)}
            formatDate={s.formatDate}
            onContinueEdit={(script) => navigate(`/edit/${script.id}?mode=edit`)}
            serverCounts={s.scriptCounts}
            externalPagination
            hasMore={typeof s.scriptsNextOffset === "number"}
            isLoadingMore={s.isLoadingMoreWorks}
            onLoadMore={s.handleLoadMoreWorks}
            onQueryChange={s.handleWorksQueryChange}
            onDeleteScript={handleDeleteDraft}
            onCreateScript={() => startCreate("create-script")}
          /></Suspense>}
        </div>

        <div hidden={view !== "folders"} className="h-[calc(100dvh-14rem)] min-h-[520px]">
          {currentUser && visitedFolders ? <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">載入資料夾中…</div>}><WriteTab onSelectScript={openEditor} onScriptsLoaded={captureFolderRecent} requestedAction={requestedAction} refreshTrigger={0} /></Suspense> : null}
        </div>
      </section>

    </StudioPage>
  );
}

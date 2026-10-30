import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, FolderPlus, Link2, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { PublisherWorksTab } from "../components/dashboard/publisher/PublisherWorksTab";
import { WriteTab } from "../components/dashboard/WriteTab";
import { CoverPlaceholder } from "../components/ui/CoverPlaceholder";
import { StudioPage, StudioPageHeader, StudioSectionTitle } from "../components/studio/StudioPage";
import { SegmentedControl } from "../components/studio/SegmentedControl";
import { usePublisherDashboardState } from "../hooks/publisher/usePublisherDashboardState";
import { useAuth } from "../contexts/AuthContext";
import { getMediaCropStyle } from "../lib/mediaCropRef";
import type { ScriptManager, CloudScript } from "../hooks/useScriptManager.types";

type WorksView = "all" | "folders";

const isCloudScript = (value: unknown): value is CloudScript =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

const dispatchWriteTabAction = (type: "create-script" | "create-folder" | "import-script") => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("write-tab-action", { detail: { type } }));
};

interface RecentWork {
  id: string;
  title: string;
  lastModified?: number;
  coverUrl?: string;
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

export default function WorksPage({ scriptManager }: { scriptManager: ScriptManager }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const s = usePublisherDashboardState({ mode: "studio" });
  const view: WorksView = new URLSearchParams(location.search).get("view") === "folders" ? "folders" : "all";
  const [recent, setRecent] = useState<RecentWork[] | null>(null);

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
    if (recent !== null || s.isWorksLoading) return;
    const sorted = [...(s.scripts || [])]
      .filter((item) => typeof item.id === "string")
      .sort((a, b) => Number(b.lastModified || 0) - Number(a.lastModified || 0))
      .slice(0, 4)
      .map((item) => ({
        id: String(item.id),
        title: String(item.title || "未命名"),
        lastModified: Number(item.lastModified || 0) || undefined,
        coverUrl: typeof item.coverUrl === "string" ? item.coverUrl : undefined,
      }));
    setRecent(sorted);
  }, [recent, s.isWorksLoading, s.scripts]);

  const setView = (next: WorksView) => {
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
    // Creating and importing belong to the folder tree, so switch to it first.
    if (type !== "create-script" && view !== "folders") setView("folders");
    dispatchWriteTabAction(type);
  };

  return (
    <StudioPage width="wide">
      <StudioPageHeader
        title="作品"
        description="站內台本、外部連結作品與資料夾都在這裡管理。"
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
                  <span className="relative h-[52px] w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {crop.src ? (
                      <img src={crop.src} style={crop.style} alt="" className="h-full w-full object-cover" loading="lazy" />
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
          <PublisherWorksTab
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
          />
        </div>

        <div hidden={view !== "folders"} className="h-[calc(100dvh-14rem)] min-h-[520px]">
          {currentUser ? <WriteTab onSelectScript={openEditor} refreshTrigger={0} /> : null}
        </div>
      </section>

    </StudioPage>
  );
}

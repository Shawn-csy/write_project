import React from "react";
import {
  PublisherEntityListPane,
  PublisherEntityListItem,
  PublisherEmptyState,
} from "./PublisherEntityLayout";

interface SeriesItem {
  id: string;
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
  scriptCount?: number;
  updatedAt?: number;
  readinessLevel?: "ready" | "partial" | "empty";
}

interface SeriesDraft {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}

interface SeriesListPaneProps {
  seriesList: SeriesItem[];
  selectedSeriesId: string;
  setSelectedSeriesId: (id: string) => void;
  setSeriesDraft: React.Dispatch<React.SetStateAction<SeriesDraft>>;
  onStartCreate: () => void;
  isDirty?: boolean;
}


function ReadinessDot({ level }: { level: "ready" | "partial" | "empty" }) {
  const label =
    level === "ready" ? "可公開" : level === "partial" ? "待補齊" : "空系列";
  const cls =
    level === "ready"
      ? "border-green-500 text-green-700 bg-green-50"
      : level === "partial"
        ? "border-amber-400 text-amber-700 bg-amber-50"
        : "border-muted-foreground/30 text-muted-foreground bg-muted/30";
  return (
    <span
      className={`inline-block shrink-0 rounded border px-1 py-px text-[9px] font-medium leading-tight ${cls}`}
      aria-label={`readiness: ${label}`}
    >
      {label}
    </span>
  );
}

function formatRelativeTime(ms: number): string {
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return "剛剛";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小時前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} 天前`;
  return new Date(ms).toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
}

type PendingAction =
  | { type: "switch"; id: string }
  | { type: "create" };

export function SeriesListPane({
  seriesList,
  selectedSeriesId,
  setSelectedSeriesId,
  setSeriesDraft,
  onStartCreate,
  isDirty = false,
}: SeriesListPaneProps): React.JSX.Element {
  const [query, setQuery] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<PendingAction | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seriesList;
    return seriesList.filter((s) => (s.name || "").toLowerCase().includes(q));
  }, [seriesList, query]);

  const handleCreate = React.useCallback(() => {
    if (isDirty) {
      setPendingAction({ type: "create" });
      return;
    }
    onStartCreate();
  }, [isDirty, onStartCreate]);

  const confirmDiscard = React.useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.type === "create") {
      onStartCreate();
    } else {
      const target = seriesList.find((s) => s.id === pendingAction.id);
      if (target) {
        setSelectedSeriesId(target.id);
        setSeriesDraft({
          name: target.name || "",
          summary: target.summary || "",
          coverUrl: target.coverUrl || "",
          coverCrop: target.coverCrop || null,
        });
      }
    }
    setPendingAction(null);
  }, [pendingAction, onStartCreate, seriesList, setSelectedSeriesId, setSeriesDraft]);

  return (
    <PublisherEntityListPane
      id="publisher-series-list"
      title="系列清單"
      onCreate={handleCreate}
      createAriaLabel="新增系列"
    >
      {/* Search */}
      {seriesList.length > 0 && (
        <div className="px-2 pb-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋系列…"
            aria-label="搜尋系列"
            className="w-full rounded-md border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        query ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">無符合結果。</p>
        ) : (
          <PublisherEmptyState
            title="尚未建立系列。"
            description="建立系列後，可集中管理封面、摘要與作品順序。"
            className="mx-1"
          />
        )
      ) : null}

      {pendingAction && (
        <div className="mx-2 mb-1 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-2">
          <p className="font-medium">有未儲存的變更，確定要捨棄？</p>
          <div className="flex gap-2">
            <button
              className="rounded border border-amber-500 px-2 py-0.5 text-[11px] font-medium hover:bg-amber-100"
              onClick={confirmDiscard}
            >
              捨棄變更並繼續
            </button>
            <button
              className="rounded border px-2 py-0.5 text-[11px] hover:bg-muted"
              onClick={() => setPendingAction(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {filtered.map((series) => {
        const level = series.readinessLevel ?? "empty";
        const subtitle = [
          `${series.scriptCount || 0} 部作品`,
          series.updatedAt ? formatRelativeTime(series.updatedAt) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <PublisherEntityListItem
            key={series.id}
            selected={selectedSeriesId === series.id}
            onClick={() => {
              if (series.id === selectedSeriesId) return;
              if (isDirty) {
                setPendingAction({ type: "switch", id: series.id });
                return;
              }
              setSelectedSeriesId(series.id);
              setSeriesDraft({
                name: series.name || "",
                summary: series.summary || "",
                coverUrl: series.coverUrl || "",
                coverCrop: series.coverCrop || null,
              });
            }}
            title={
              <span className="flex items-center gap-1.5">
                <ReadinessDot level={level} />
                {series.name || "（未命名）"}
              </span>
            }
            subtitle={subtitle}
          />
        );
      })}
    </PublisherEntityListPane>
  );
}

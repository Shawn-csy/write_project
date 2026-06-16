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
}

export function SeriesListPane({
  seriesList,
  selectedSeriesId,
  setSelectedSeriesId,
  setSeriesDraft,
  onStartCreate,
}: SeriesListPaneProps): React.JSX.Element {
  return (
    <PublisherEntityListPane
      id="publisher-series-list"
      title="系列清單"
      onCreate={onStartCreate}
      createAriaLabel="新增系列"
    >
      {seriesList.length === 0 ? (
        <PublisherEmptyState
          title="尚未建立系列。"
          description="建立系列後，可集中管理封面、摘要與作品順序。"
          className="mx-1"
        />
      ) : null}
      {seriesList.map((series) => (
        <PublisherEntityListItem
          key={series.id}
          selected={selectedSeriesId === series.id}
          onClick={() => {
            setSelectedSeriesId(series.id);
            setSeriesDraft({
              name: series.name || "",
              summary: series.summary || "",
              coverUrl: series.coverUrl || "",
              coverCrop: series.coverCrop || null,
            });
          }}
          title={series.name}
          subtitle={`${series.scriptCount || 0} 部作品`}
        />
      ))}
    </PublisherEntityListPane>
  );
}

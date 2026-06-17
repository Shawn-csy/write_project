import React from "react";
import { PUBLISHER_CONTENT_STACK_CLASS } from "./PublisherEntityLayout";
import { SeriesCreateGuide } from "./SeriesCreateGuide";
import { SeriesMetadataForm } from "./SeriesMetadataForm";
import { SeriesDraftPreview } from "./SeriesDraftPreview";

interface SeriesDraft {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}

interface SeriesCreateWorkspaceProps {
  seriesDraft: SeriesDraft;
  setSeriesDraft: React.Dispatch<React.SetStateAction<SeriesDraft>>;
  isSaving: boolean;
  onCreateSeries: () => void;
}

export function SeriesCreateWorkspace({
  seriesDraft,
  setSeriesDraft,
  isSaving,
  onCreateSeries,
}: SeriesCreateWorkspaceProps): React.JSX.Element {
  return (
    <div className={PUBLISHER_CONTENT_STACK_CLASS}>
      <SeriesCreateGuide />
      <SeriesMetadataForm
        seriesDraft={seriesDraft}
        setSeriesDraft={setSeriesDraft}
        isEditing={false}
        isSaving={isSaving}
        onCreateSeries={onCreateSeries}
      />
      <SeriesDraftPreview
        name={seriesDraft.name}
        summary={seriesDraft.summary}
        coverUrl={seriesDraft.coverUrl}
        coverCrop={seriesDraft.coverCrop}
      />
    </div>
  );
}

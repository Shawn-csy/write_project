import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { MediaPicker } from "../../ui/MediaPicker";
import { CoverPlaceholder } from "../../ui/CoverPlaceholder";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import { PublisherFormRow } from "./PublisherFormRow";

interface SeriesDraft {
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}

interface SeriesMetadataFormProps {
  seriesDraft: SeriesDraft;
  setSeriesDraft: React.Dispatch<React.SetStateAction<SeriesDraft>>;
  /** True when editing an existing series; false when creating a new one. */
  isEditing: boolean;
  isSaving: boolean;
  onCreateSeries: () => void;
  onUpdateSeries: () => void;
  onDeleteSeries: () => void;
}

export function SeriesMetadataForm({
  seriesDraft,
  setSeriesDraft,
  isEditing,
  isSaving,
  onCreateSeries,
  onUpdateSeries,
  onDeleteSeries,
}: SeriesMetadataFormProps): React.JSX.Element {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState<boolean>(false);
  const [coverPreviewFailed, setCoverPreviewFailed] = React.useState<boolean>(false);
  const cropCover = getMediaCropStyle(String(seriesDraft.coverUrl || ""), seriesDraft.coverCrop);

  React.useEffect(() => {
    setCoverPreviewFailed(false);
  }, [seriesDraft.coverUrl]);

  return (
    <>
      <PublisherFormRow label="系列名稱" required hint="公開頁上顯示的系列主名稱。">
        <Input
          value={seriesDraft.name}
          onChange={(e) => setSeriesDraft((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="例如：星海遠征"
        />
      </PublisherFormRow>

      <PublisherFormRow label="系列摘要" hint="簡短說明系列核心設定。">
        <Textarea
          value={seriesDraft.summary}
          onChange={(e) => setSeriesDraft((prev) => ({ ...prev, summary: e.target.value }))}
          placeholder="簡短介紹這個系列。"
          rows={4}
        />
      </PublisherFormRow>

      <PublisherFormRow label="系列封面圖" hint="可貼網址或從媒體庫挑選。">
        <div className="space-y-2">
          <Input
            value={seriesDraft.coverUrl}
            onChange={(e) =>
              setSeriesDraft((prev) => ({ ...prev, coverUrl: e.target.value, coverCrop: null }))
            }
            placeholder="https://..."
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setIsMediaPickerOpen(true)}
            >
              從媒體庫選擇
            </Button>
          </div>
        </div>
      </PublisherFormRow>

      <PublisherFormRow label="封面預覽">
        <div className="h-36 w-24 overflow-hidden rounded-md border bg-muted/20">
          {seriesDraft.coverUrl && !coverPreviewFailed ? (
            <img
              src={cropCover.src}
              style={cropCover.style}
              alt="series cover preview"
              className="h-full w-full object-cover"
              onError={() => setCoverPreviewFailed(true)}
            />
          ) : (
            <CoverPlaceholder title={seriesDraft.name || "Series"} compact />
          )}
        </div>
      </PublisherFormRow>

      <PublisherFormRow label="操作">
        <div className="flex items-center gap-2 pt-1">
          {!isEditing ? (
            <Button disabled={isSaving || !seriesDraft.name.trim()} onClick={onCreateSeries}>
              建立系列
            </Button>
          ) : (
            <>
              <Button disabled={isSaving || !seriesDraft.name.trim()} onClick={onUpdateSeries}>
                儲存變更
              </Button>
              <Button variant="destructive" disabled={isSaving} onClick={onDeleteSeries}>
                刪除系列
              </Button>
            </>
          )}
        </div>
      </PublisherFormRow>

      <MediaPicker
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        cropPurpose="cover"
        onSelect={(url) => {
          if (!url) return;
          setSeriesDraft((prev) => ({ ...prev, coverUrl: url }));
        }}
        onSelectMedia={(selection) => {
          if (!selection?.url) return;
          setSeriesDraft((prev) => ({
            ...prev,
            coverUrl: selection.url,
            coverCrop: selection.crop || null,
          }));
        }}
      />
    </>
  );
}

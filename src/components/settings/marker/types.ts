export interface EditableMarkerConfig {
  id: string;
  type?: string;
  matchMode?: "prefix" | "range" | "regex" | "enclosure" | string;
  isBlock?: boolean;
  start?: string;
  end?: string;
  label?: string;
  priority?: number;
  regex?: string;
  fixedDuration?: number;
  pause?: string;
  pauseLabel?: string;
  keywords?: string[];
  dimIfNotKeyword?: boolean;
  showDelimiters?: boolean;
  showEndLabel?: boolean;
  smartToggle?: boolean;
  style?: Record<string, string | number | undefined>;
  renderer?: {
    template?: string;
  };
  v2EventKind?: "speech" | "sfx" | "bgm" | "stage_direction" | "narration" | "meta" | "custom" | string;
  v2TrackId?: string;
  v2SpeakerSource?: "active" | "self" | "none" | string;
  v2RangeOwnsContent?: boolean;
  v2SyncRows?: boolean;
  /** @deprecated Use v2SyncRows instead. */
  enableColumnGrouping?: boolean;
  [key: string]: unknown;
}

import type { MarkerConfig } from "../../../types/script";
import type { TrackConfig } from "../../../lib/v2";

export type MarkerFieldUpdate = string;

export type UpdateMarkerFn = (
  idx: number,
  fieldOrPatch: MarkerFieldUpdate | Partial<MarkerConfig>,
  value?: unknown
) => void;

export interface MarkerConfigEditorProps {
  config: EditableMarkerConfig;
  idx: number;
  updateMarker: UpdateMarkerFn;
  isAdvancedMode?: boolean;
  tracks?: TrackConfig[];
  showLayoutRouting?: boolean;
}

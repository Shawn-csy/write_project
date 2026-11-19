import type { MarkerConfig } from "./script";

export interface InlineNodeLike {
  type: string;
  id?: string;
  content?: string;
}

export interface MarkerConfigLike extends Partial<MarkerConfig> {
  name?: string;
  displayName?: string;
  keywords?: string[];
  dimIfNotKeyword?: boolean;
  showDelimiters?: boolean;
  parseAs?: string;
  showEndLabel?: boolean;
  rangeStyle?: Record<string, string>;
  renderer?: { template?: string };
}

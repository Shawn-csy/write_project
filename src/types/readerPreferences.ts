import type { LayoutConfig } from "../lib/v2";

export interface ReaderPreferences {
  theme: string;
  fontSize: number;
  bodyFontSize: number;
  dialogueFontSize: number;
  readingFontFamily: string;
  lineHeight: number;
  accentColor: string;
  showMarkers: boolean;
  showLineUnderline: boolean;
  useV2Renderer: boolean;
  v2LayoutConfig: LayoutConfig;
}

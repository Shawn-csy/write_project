import React, { useState } from "react";
import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import { V2TrackRoutingEditor } from "../V2TrackRoutingEditor";
import { ScriptRendererV2 } from "../../renderer/v2/ScriptRendererV2";
import type { LayoutConfig } from "../../../lib/v2";
import type { MarkerConfig } from "../../../types/script";

// Hardcoded sample AST covering speech, sfx layer, and bgm layer
const SAMPLE_AST = {
  type: "root",
  children: [
    {
      type: "speech",
      character: "角色 A",
      lineStart: 1,
      lineEnd: 1,
      children: [
        {
          type: "dialogue",
          text: "這是對白範例文字，會出現在對白欄位。",
          lineStart: 1,
          lineEnd: 1,
        },
      ],
    },
    {
      type: "layer",
      layerType: "rule-se-single",
      text: "SE: 門關上聲",
      lineStart: 2,
      lineEnd: 2,
    },
    {
      type: "speech",
      character: "角色 B",
      lineStart: 3,
      lineEnd: 3,
      children: [
        {
          type: "dialogue",
          text: "這是副對白，通常在第二對白欄位。",
          lineStart: 3,
          lineEnd: 3,
        },
      ],
    },
    {
      type: "layer",
      layerType: "rule-bg-start",
      text: "BGM: 背景音樂開始",
      lineStart: 4,
      lineEnd: 4,
    },
    {
      type: "speech",
      character: "旁白",
      lineStart: 5,
      lineEnd: 5,
      children: [
        {
          type: "dialogue",
          text: "旁白文字範例，說明場景。",
          lineStart: 5,
          lineEnd: 5,
        },
      ],
    },
  ],
};

interface V2TrackPreviewSectionProps {
  layoutConfig: LayoutConfig;
  onChange: (config: LayoutConfig) => void;
  markerConfigs: MarkerConfig[];
  t: (key: string) => string;
}

export function V2TrackPreviewSection({
  layoutConfig,
  onChange,
  markerConfigs,
  t,
}: V2TrackPreviewSectionProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border-b border-border/40 bg-background/30 shrink-0">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between px-5 py-2.5 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-primary/10 text-primary">
            <Columns3 className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-medium">{t("appearance.trackPreviewTitle")}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>{collapsed ? t("appearance.trackPreviewExpand") : t("appearance.trackPreviewCollapse")}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="grid grid-cols-1 gap-4 px-5 pb-4 md:grid-cols-[2fr_3fr]">
          {/* Left: track editor */}
          <div>
            <p className="mb-2 text-[11px] text-muted-foreground">{t("appearance.trackConfigDesc")}</p>
            <V2TrackRoutingEditor
              layoutConfig={layoutConfig}
              onChange={onChange}
              t={t}
            />
          </div>
          {/* Right: live preview */}
          <div className="overflow-auto rounded-md border border-border/40 bg-background/60 p-3 max-h-72">
            <ScriptRendererV2
              ast={SAMPLE_AST}
              layoutConfig={layoutConfig}
              markerConfigs={markerConfigs}
              fontSize={12}
              lineHeight={1.4}
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../../ui/button";
import ScriptViewer from "../../renderer/ScriptViewer";
import { useI18n } from "../../../contexts/I18nContext";
import { buildMarkerSample, findMarkerMatchLines, type MarkerMatchShape } from "../../../lib/markerMatchPreview";
import type { MarkerConfig } from "../../../types/script";
import type { LayoutConfig } from "../../../lib/v2";

const STORAGE_KEY = "marker-test-panel-text-v2";
const DEFAULT_SAMPLE = ["#C 小雨", "#D (喘氣)……末班車呢？", "#SE 列車進站聲", ">>SE 雨聲", "#C 阿哲", "#D 剛走。【回音】", "<<SE"].join("\n");

const readStoredText = (): string => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) || DEFAULT_SAMPLE;
  } catch {
    return DEFAULT_SAMPLE;
  }
};

interface MarkerTestPanelProps {
  markerConfigs: MarkerConfig[];
  selectedConfig: MarkerMatchShape | null;
  usePresentationRenderer?: boolean;
  layoutConfig?: LayoutConfig;
  className?: string;
}

/**
 * Lets the author type a few lines of script and see them rendered with the
 * unsaved draft rules, so a rule's effect is visible while editing it.
 */
export function MarkerTestPanel({ markerConfigs, selectedConfig, usePresentationRenderer = false, layoutConfig, className = "" }: MarkerTestPanelProps): React.JSX.Element {
  const { t } = useI18n();
  const [text, setText] = React.useState<string>(readStoredText);

  React.useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, text);
    } catch {
      // Storage can be unavailable (private mode); the panel still works for this visit.
    }
  }, [text]);

  const matchedLines = React.useMemo(() => findMarkerMatchLines(text, selectedConfig), [text, selectedConfig]);
  const sample = buildMarkerSample(selectedConfig);
  const ruleName = selectedConfig?.label || t("markerStudio.thisRule", "這條規則");

  return (
    <aside aria-label={t("markerStudio.testTitle", "試寫")} className={`flex min-h-0 flex-col gap-3 overflow-y-auto bg-muted/30 p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{t("markerStudio.testTitle", "試寫")}</h2>
        <div className="flex items-center gap-1">
          {sample ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setText((prev) => `${prev.trimEnd()}\n${sample}`)}>
              {t("markerStudio.insertSample", "加入範例")}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setText(DEFAULT_SAMPLE)} aria-label={t("markerStudio.resetSample", "還原範例文字")} title={t("markerStudio.resetSample", "還原範例文字")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label={t("markerStudio.testInput", "試寫原稿")}
        spellCheck={false}
        className="min-h-[150px] resize-y rounded-md border border-input bg-background p-3 font-mono text-xs leading-6 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <p className="text-xs text-muted-foreground" role="status">
        {selectedConfig
          ? matchedLines.length > 0
            ? t("markerStudio.matchedLines", "「{name}」比對到第 {lines} 行").replace("{name}", ruleName).replace("{lines}", matchedLines.join("、"))
            : t("markerStudio.noMatch", "「{name}」在這段文字裡沒有比對到，可以按「加入範例」試試。").replace("{name}", ruleName)
          : t("markerStudio.selectRuleToTest", "選擇左側規則，就能看到它比對到哪些行。")}
      </p>
      <h3 className="pt-1 text-[15px] font-semibold">{t("markerStudio.readingPreview", "閱讀時的樣子")}</h3>
      <div className="min-h-[160px] overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-sm">
        <ScriptViewer
          text={text}
          fontSize={14}
          bodyFontSize={14}
          dialogueFontSize={14}
          markerConfigs={markerConfigs as Array<{ id?: string; [key: string]: unknown }>}
          usePresentationRenderer={usePresentationRenderer}
          presentationLayoutConfig={layoutConfig}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("markerStudio.previewUsesDraft", "預覽使用尚未儲存的規則；儲存後才會套用到作品。")}</p>
    </aside>
  );
}

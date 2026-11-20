import { Button } from "../../ui/button";
import { useI18n } from "../../../contexts/I18nContext";

export type MarkerPreviewMode = "word" | "reader";

export function MarkerPreviewSwitch({ mode, onChange }: {
  mode: MarkerPreviewMode;
  onChange: (mode: MarkerPreviewMode) => void;
}) {
  const { t } = useI18n();
  return (
    <div role="group" aria-label={t("markerStudio.previewMode")} className="inline-flex flex-wrap gap-0.5">
      {(["word", "reader"] as const).map((value) => (
        <Button key={value} type="button" size="sm" variant={mode === value ? "secondary" : "ghost"}
          aria-pressed={mode === value} onClick={() => onChange(value)}>
          {t(value === "word" ? "markerStudio.wordResult" : "markerStudio.readingPreview")}
        </Button>
      ))}
    </div>
  );
}

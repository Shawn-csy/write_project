import React from "react";
import { Button } from "../../ui/button";
import { useI18n } from "../../../contexts/I18nContext";

export function MarkerJsonEditor({
  jsonText,
  setJsonText,
  parseError,
  onApplyJson,
  isSaving = false,
  isDirty = false,
  readOnly = false,
}) {
    const { t } = useI18n();
    return (
        <div className="h-full flex flex-col gap-3">
          <textarea
            className="w-full flex-1 min-h-[300px] p-4 font-mono text-xs bg-muted/30 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring custom-scrollbar"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            readOnly={readOnly}
          />
          <div className="flex items-center justify-between">
            <div className={`text-xs ${parseError ? "text-destructive" : "text-muted-foreground"}`}>
              {parseError ? t("markerJsonEditor.invalid").replace("{error}", String(parseError)) : t("markerJsonEditor.valid")}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onApplyJson}
              disabled={readOnly || Boolean(parseError) || !isDirty || isSaving}
              className="h-8 text-xs"
            >
              {isSaving ? t("markerJsonEditor.saving") : t("markerJsonEditor.applyAndSave")}
            </Button>
          </div>
        </div>
    );
}

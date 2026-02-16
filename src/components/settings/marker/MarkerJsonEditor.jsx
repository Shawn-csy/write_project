import React from "react";
import { Button } from "../../ui/button";

export function MarkerJsonEditor({
  jsonText,
  setJsonText,
  parseError,
  onApplyJson,
  isSaving = false,
  isDirty = false,
}) {
    return (
        <div className="h-full flex flex-col gap-3">
          <textarea
            className="w-full flex-1 min-h-[300px] p-4 font-mono text-xs bg-muted/30 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring custom-scrollbar"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex items-center justify-between">
            <div className={`text-xs ${parseError ? "text-destructive" : "text-muted-foreground"}`}>
              {parseError ? `JSON 格式錯誤: ${parseError}` : "JSON 格式正確"}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onApplyJson}
              disabled={Boolean(parseError) || !isDirty || isSaving}
              className="h-8 text-xs"
            >
              {isSaving ? "儲存中..." : "套用並儲存"}
            </Button>
          </div>
        </div>
    );
}

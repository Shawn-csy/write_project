import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Input } from "../../../ui/input";
import { ScrollArea } from "../../../ui/scroll-area";
import { ScriptRenderer } from "../../../renderer/ScriptRenderer";
import { useI18n } from "../../../../contexts/I18nContext";
import type { MarkerConfigLike } from "../../../../types/renderer";

interface Props {
  title: string;
  setTitle: (v: string) => void;
  cleanedText: string;
  previewAst: unknown;
  previewMarkerConfigs: MarkerConfigLike[];
}

export function ImportStageResult({ title, setTitle, cleanedText, previewAst, previewMarkerConfigs }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="text-sm text-green-600 font-medium flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        {t("importDialog.ready")}
      </div>
      <Input
        placeholder={t("importDialog.scriptTitle")}
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
      />
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="min-h-0 border rounded relative">
          <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            {t("importDialog.resultTextLabel")}
          </div>
          <ScrollArea className="h-[calc(100%-33px)] absolute inset-x-0 bottom-0 top-[33px]">
            <div className="p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap">{cleanedText}</pre>
            </div>
          </ScrollArea>
        </div>
        <div className="min-h-0 border rounded relative bg-background">
          <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            {t("importDialog.resultRenderLabel")}
          </div>
          <ScrollArea className="h-[calc(100%-33px)] absolute inset-x-0 bottom-0 top-[33px]">
            <div className="p-4">
              {previewAst ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <ScriptRenderer
                  ast={previewAst as any}
                  markerConfigs={previewMarkerConfigs}
                  colorCache={{ current: new Map() }}
                  fontSize={14}
                />
              ) : null}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

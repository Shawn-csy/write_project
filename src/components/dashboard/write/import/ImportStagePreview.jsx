import React from "react";
import { Badge } from "../../../ui/badge";
import { Textarea } from "../../../ui/textarea";
import { useI18n } from "../../../../contexts/I18nContext";

export function ImportStagePreview({ previewText, setPreviewText }) {
    const { t } = useI18n();
    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium leading-none">{t("importStagePreview.title")}</h4>
                    <p className="text-xs text-muted-foreground">
                        {t("importStagePreview.desc")}
                    </p>
                </div>
                <Badge variant="secondary">Cleaned</Badge>
            </div>
            
            <div className="flex-1 min-h-0 border rounded-md">
                <Textarea 
                    className="h-full resize-none font-mono text-sm leading-relaxed border-0 focus-visible:ring-0 p-4"
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                />
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
                {t("importStagePreview.footerHint")}
            </div>
        </div>
    );
}

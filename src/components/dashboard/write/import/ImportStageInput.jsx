import React, { useRef } from "react";
import { FileText } from "lucide-react";
import { Textarea } from "../../../ui/textarea";
import { useI18n } from "../../../../contexts/I18nContext";

export function ImportStageInput({ 
    text, 
    setText, 
}) {
    const { t } = useI18n();
    const containerRef = useRef(null);

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{t("importStageInput.tabContent")}</div>
            </div>

            <div ref={containerRef} className="flex-1 min-h-[240px] sm:min-h-[320px] relative mt-0 group">
                <Textarea 
                    className="w-full h-full min-h-[240px] sm:min-h-[320px] font-mono text-sm resize-none p-4"
                    placeholder={t("importStageInput.contentPlaceholder")}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                    <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                    <span className="text-muted-foreground font-medium">{t("importStageInput.dragHere")}</span>
                </div>
            </div>
        </div>
    );
}

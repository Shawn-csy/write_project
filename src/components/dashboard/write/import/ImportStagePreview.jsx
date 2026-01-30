import React from "react";
import { Badge } from "../../../ui/badge";
import { Textarea } from "../../../ui/textarea";

export function ImportStagePreview({ previewText, setPreviewText }) {
    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium leading-none">確認前置處理結果</h4>
                    <p className="text-xs text-muted-foreground">
                        系統已自動清理多餘空白與格式，您可以手動微調內容。
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
                確認無誤後，請點擊「下一步」設定標記規則
            </div>
        </div>
    );
}

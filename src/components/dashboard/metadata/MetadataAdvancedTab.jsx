import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";

export function MetadataAdvancedTab({
    markerThemeId, setMarkerThemeId,
    markerThemes,
    showMarkerLegend, setShowMarkerLegend,
    disableCopy, setDisableCopy,
    jsonMode, setJsonMode,
    jsonText, setJsonText,
    jsonError,
    applyJson
}) {
    return (
        <div className="space-y-4 mt-0">
            <div className="grid gap-2">
                <label className="text-sm font-medium">標記主題 (Marker Theme)</label>
                <Select value={markerThemeId} onValueChange={setMarkerThemeId}>
                    <SelectTrigger>
                        <SelectValue placeholder="選擇主題" />
                    </SelectTrigger>
                    <SelectContent>
                        {markerThemes.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                    公開劇本將使用此主題來顯示自訂標記 (如 {`>>SE`})。
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="showLegend" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={showMarkerLegend}
                        onChange={(e) => setShowMarkerLegend(e.target.checked)}
                    />
                    <label htmlFor="showLegend" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer">
                        在公開頁面顯示標記說明表 (Legend)
                    </label>
                </div>
            </div>

            {/* Content Protection */}
            <div className="pt-4 border-t">
                <label className="text-sm font-medium">內容保護</label>
                <div className="flex items-center space-x-2 pt-2">
                    <input 
                        type="checkbox" 
                        id="disableCopy" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={disableCopy}
                        onChange={(e) => setDisableCopy(e.target.checked)}
                    />
                    <label htmlFor="disableCopy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none cursor-pointer">
                        禁止複製內容
                    </label>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                    開啟後，公開閱讀頁面將禁止使用者選取或複製文字內容。
                </div>
            </div>

            <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">JSON 模式</label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
                        {jsonMode ? "關閉 JSON" : "開啟 JSON"}
                    </Button>
                </div>
                {jsonMode && (
                        <div className="mt-2 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            className="font-mono text-xs h-64"
                        />
                        {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                        <Button type="button" size="sm" onClick={applyJson}>应用 JSON</Button>
                    </div>
                )}
            </div>
        </div>
    );
}


import React from "react";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { MetadataDetailsTab } from "./MetadataDetailsTab";

export function ScriptMetadataAdvancedSection({
  sectionId = "metadata-section-advanced",
  showTitle = true,
  t,
  getRowLabelClass,
  markerThemeId,
  setMarkerThemeId,
  markerThemes,
  showMarkerLegend,
  setShowMarkerLegend,
  disableCopy,
  setDisableCopy,
  metadataDetailsCommonProps,
  jsonMode,
  setJsonMode,
  jsonText,
  setJsonText,
  jsonError,
  applyJson,
}) {
  return (
    <section id={sectionId || undefined} className="space-y-3 scroll-mt-24">
      {showTitle && <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabAdvanced", "進階設定")}</h3>}
      <div className="rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("advanced")}>標記主題</div>
          <div className="space-y-2 p-4">
            <Select value={markerThemeId} onValueChange={setMarkerThemeId}>
              <SelectTrigger>
                <SelectValue placeholder={t("metadataAdvanced.markerThemePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {markerThemes.map((mt) => (
                  <SelectItem key={mt.id} value={mt.id}>{mt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("advanced")}>閱讀控制</div>
          <div className="flex flex-wrap gap-2 p-4">
            <Button type="button" variant="outline" className={showMarkerLegend ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setShowMarkerLegend(true)}>顯示圖例</Button>
            <Button type="button" variant="outline" className={!showMarkerLegend ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setShowMarkerLegend(false)}>隱藏圖例</Button>
            <Button type="button" variant="outline" className={disableCopy ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setDisableCopy(true)}>停用複製</Button>
            <Button type="button" variant="outline" className={!disableCopy ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : ""} onClick={() => setDisableCopy(false)}>允許複製</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("advanced")}>聯絡資訊</div>
          <div className="p-4">
            <MetadataDetailsTab
              {...metadataDetailsCommonProps}
              showContact
              showCustom={false}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("advanced")}>自訂欄位</div>
          <div className="p-4">
            <MetadataDetailsTab
              {...metadataDetailsCommonProps}
              showContact={false}
              showCustom
            />
          </div>
        </div>
        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("advanced")}>JSON 模式</div>
          <div className="space-y-2 p-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setJsonMode(!jsonMode)}>
              {jsonMode ? t("metadataAdvanced.jsonClose") : t("metadataAdvanced.jsonOpen")}
            </Button>
            {jsonMode && (
              <>
                <Textarea
                  id="metadata-json-text"
                  aria-label="JSON 內容"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="h-64 font-mono text-xs"
                />
                {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                <Button type="button" size="sm" onClick={applyJson}>{t("metadataAdvanced.jsonApply")}</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Button } from "../../ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "../../../contexts/I18nContext";
import { useHeroChapterEntries } from "../../../hooks/dashboard/useHeroChapterEntries";

type RowTone = "required" | "recommended" | "advanced";

interface Props {
  layout?: "cards" | "rows";
  outline?: string;
  setOutline: (value: string) => void;
  roleSetting?: string;
  setRoleSetting?: (value: string) => void;
  performanceInstruction?: string;
  setPerformanceInstruction?: (value: string) => void;
  backgroundInfo?: string;
  setBackgroundInfo: (value: string) => void;
  openingIntro?: string;
  setOpeningIntro: (value: string) => void;
  chapterSettings?: string;
  setChapterSettings?: (value: string) => void;
  rowLabelTones?: Record<string, RowTone | undefined>;
  getRowLabelClass: (tone?: RowTone, missing?: boolean) => string;
}

export function MetadataExtendedFields({
  layout, outline = "", setOutline,
  roleSetting, setRoleSetting, performanceInstruction, setPerformanceInstruction,
  backgroundInfo = "", setBackgroundInfo, openingIntro = "", setOpeningIntro,
  chapterSettings, setChapterSettings, rowLabelTones = {}, getRowLabelClass,
}: Props) {
  const { t } = useI18n();
  const isRowLayout = layout === "rows";
  const [showExtendedFields, setShowExtendedFields] = React.useState(false);

  const {
    heroEntries, addHeroEntry, updateHeroEntry, removeHeroEntry,
    chapterEntries, addChapterEntry, updateChapterEntry, removeChapterEntry,
  } = useHeroChapterEntries({ roleSetting, performanceInstruction, chapterSettings, setRoleSetting, setPerformanceInstruction, setChapterSettings });

  return (
    <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">進階內容欄位</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("metadataBasic.advancedIntroHint", "這些欄位為選填，用來補充作品世界觀、角色與章節脈絡。")}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowExtendedFields(p => !p)}>
          {showExtendedFields ? (<>收合 <ChevronUp className="ml-1 h-4 w-4" /></>) : (<>展開 <ChevronDown className="ml-1 h-4 w-4" /></>)}
        </Button>
      </div>

      {showExtendedFields && (
        <>
          {isRowLayout ? (
            <div className="mt-3 rounded-lg border border-border/70 bg-background">
              {/* Outline */}
              <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                <div className={getRowLabelClass(rowLabelTones.outline || "advanced")}>{t("metadataBasic.outline", "大綱")}</div>
                <div className="p-4">
                  <Textarea id="metadata-outline" name="metadataOutline" value={outline} onChange={e => setOutline(e.target.value)} placeholder={t("metadataBasic.outlinePlaceholder", "作品核心內容大綱")} className="h-28" />
                </div>
              </div>
              {/* Hero entries */}
              <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                <div className={getRowLabelClass(rowLabelTones.roleSetting || "advanced")}>角色設定</div>
                <div className="space-y-3 p-4">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addHeroEntry}>新增主角</Button>
                  </div>
                  {heroEntries.map((entry, idx) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">角色設定 角色{idx + 1}</div>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeHeroEntry(idx)}>移除</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                          <label className="text-xs text-muted-foreground">角色名稱</label>
                          <Input value={entry.name} onChange={e => updateHeroEntry(idx, "name", e.target.value)} placeholder="例如：林默、陳安" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">角色設定</label>
                          <Textarea value={entry.role} onChange={e => updateHeroEntry(idx, "role", e.target.value)} placeholder={t("metadataBasic.roleSettingPlaceholder", "角色關係、定位與演出重點")} className="h-24" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">演繹指示</label>
                          <Textarea value={entry.performance} onChange={e => updateHeroEntry(idx, "performance", e.target.value)} placeholder={t("metadataBasic.performanceInstructionPlaceholder", "節奏、口氣、情緒與鏡位指示")} className="h-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Background info */}
              <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                <div className={getRowLabelClass(rowLabelTones.backgroundInfo || "advanced")}>{t("metadataBasic.backgroundInfo", "背景資訊")}</div>
                <div className="p-4">
                  <Textarea id="metadata-background-info" name="metadataBackgroundInfo" value={backgroundInfo} onChange={e => setBackgroundInfo(e.target.value)} placeholder={t("metadataBasic.backgroundInfoPlaceholder", "時代、前情提要、世界觀背景")} className="h-28" />
                </div>
              </div>
              {/* Opening intro */}
              <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                <div className={getRowLabelClass(rowLabelTones.openingIntro || "advanced")}>{t("metadataBasic.openingIntro", "作品的開頭引言")}</div>
                <div className="p-4">
                  <Textarea id="metadata-opening-intro" name="metadataOpeningIntro" value={openingIntro} onChange={e => setOpeningIntro(e.target.value)} placeholder={t("metadataBasic.openingIntroPlaceholder", "給讀者的開場引言")} className="h-28" />
                </div>
              </div>
              {/* Chapter entries */}
              <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
                <div className={getRowLabelClass(rowLabelTones.chapterSettings || "advanced")}>章節環境與狀況</div>
                <div className="space-y-3 p-4">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addChapterEntry}>新增章節</Button>
                  </div>
                  {chapterEntries.map((entry, idx) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">章節 {idx + 1}</div>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeChapterEntry(idx)}>移除</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                          <label className="text-xs text-muted-foreground">章節名稱</label>
                          <Input value={entry.chapter} onChange={e => updateChapterEntry(idx, "chapter", e.target.value)} placeholder={`例如：第${idx + 1}章`} />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">{t("metadataBasic.environmentInfo", "環境")}</label>
                          <Textarea value={entry.environment} onChange={e => updateChapterEntry(idx, "environment", e.target.value)} placeholder={t("metadataBasic.environmentInfoPlaceholder", "場景空間、氣候、聲音、光線")} className="h-24" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">{t("metadataBasic.situationInfo", "狀況")}</label>
                          <Textarea value={entry.situation} onChange={e => updateChapterEntry(idx, "situation", e.target.value)} placeholder={t("metadataBasic.situationInfoPlaceholder", "開場時角色所處的當前狀況")} className="h-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-outline">{t("metadataBasic.outline", "大綱")}</label>
                <Textarea id="metadata-outline" name="metadataOutline" value={outline} onChange={e => setOutline(e.target.value)} placeholder={t("metadataBasic.outlinePlaceholder", "作品核心內容大綱")} className="h-28" />
              </div>
              <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/10 p-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">角色設定</label>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addHeroEntry}>新增主角</Button>
                </div>
                <div className="space-y-3">
                  {heroEntries.map((entry, idx) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">角色設定 角色{idx + 1}</div>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeHeroEntry(idx)}>移除</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                          <label className="text-xs text-muted-foreground">角色名稱</label>
                          <Input value={entry.name} onChange={e => updateHeroEntry(idx, "name", e.target.value)} placeholder="例如：林默、陳安" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">角色設定</label>
                          <Textarea value={entry.role} onChange={e => updateHeroEntry(idx, "role", e.target.value)} placeholder={t("metadataBasic.roleSettingPlaceholder", "角色關係、定位與演出重點")} className="h-24" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">演繹指示</label>
                          <Textarea value={entry.performance} onChange={e => updateHeroEntry(idx, "performance", e.target.value)} placeholder={t("metadataBasic.performanceInstructionPlaceholder", "節奏、口氣、情緒與鏡位指示")} className="h-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-background-info">{t("metadataBasic.backgroundInfo", "背景資訊")}</label>
                <Textarea id="metadata-background-info" name="metadataBackgroundInfo" value={backgroundInfo} onChange={e => setBackgroundInfo(e.target.value)} placeholder={t("metadataBasic.backgroundInfoPlaceholder", "時代、前情提要、世界觀背景")} className="h-28" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="metadata-opening-intro">{t("metadataBasic.openingIntro", "作品的開頭引言")}</label>
                <Textarea id="metadata-opening-intro" name="metadataOpeningIntro" value={openingIntro} onChange={e => setOpeningIntro(e.target.value)} placeholder={t("metadataBasic.openingIntroPlaceholder", "給讀者的開場引言")} className="h-28" />
              </div>
              <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/10 p-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">章節環境與狀況</label>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addChapterEntry}>新增章節</Button>
                </div>
                <div className="space-y-3">
                  {chapterEntries.map((entry, idx) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-medium">章節 {idx + 1}</div>
                        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeChapterEntry(idx)}>移除</Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid gap-2 sm:col-span-2">
                          <label className="text-xs text-muted-foreground">章節名稱</label>
                          <Input value={entry.chapter} onChange={e => updateChapterEntry(idx, "chapter", e.target.value)} placeholder={`例如：第${idx + 1}章`} />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">{t("metadataBasic.environmentInfo", "環境")}</label>
                          <Textarea value={entry.environment} onChange={e => updateChapterEntry(idx, "environment", e.target.value)} placeholder={t("metadataBasic.environmentInfoPlaceholder", "場景空間、氣候、聲音、光線")} className="h-24" />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs text-muted-foreground">{t("metadataBasic.situationInfo", "狀況")}</label>
                          <Textarea value={entry.situation} onChange={e => updateChapterEntry(idx, "situation", e.target.value)} placeholder={t("metadataBasic.situationInfoPlaceholder", "開場時角色所處的當前狀況")} className="h-24" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

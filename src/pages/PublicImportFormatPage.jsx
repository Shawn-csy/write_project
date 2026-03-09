import React from "react";
import { useNavigate } from "react-router-dom";
import { BookMarked, FileCode2, ArrowRight } from "lucide-react";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useI18n } from "../contexts/I18nContext";
import { DEFAULT_MARKER_RULES, DEFAULT_MARKER_RULES_NAME } from "../constants/defaultMarkerRules";
import { parseScreenplay } from "../lib/screenplayAST";
import { ScriptRenderer } from "../components/renderer/ScriptRenderer";

export default function PublicImportFormatPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const allRules = React.useMemo(() => DEFAULT_MARKER_RULES || [], []);
  const colorCacheRef = React.useRef(new Map());
  const usageById = React.useMemo(() => ({
    "rule-numbered-chapter-title": t("importFormat.usageChapter"),
    "rule-se-performer": t("importFormat.usageSePerformer"),
    "rule-tone-general": t("importFormat.usageTone"),
    "rule-post-effect": t("importFormat.usagePostFx"),
    "rule-se-single": t("importFormat.usageSeSingle"),
    "rule-position": t("importFormat.usagePosition"),
    "se-continuous": t("importFormat.usageSeRange"),
    "rule-bg-start": t("importFormat.usageBg"),
    "character": t("importFormat.usageCharacter"),
    "action": t("importFormat.usageAction"),
  }), [t]);
  const exampleById = React.useMemo(() => ({
    "rule-numbered-chapter-title": "1. 第一章",
    "rule-se-performer": "(*吸氣)",
    "rule-tone-general": "(低聲)",
    "rule-post-effect": "【殘響】",
    "rule-se-single": "#SE 關門聲",
    "rule-position": "@舞台左側",
    "se-continuous": ">>SE 雨聲持續... <<SE",
    "rule-bg-start": "//BG 夜晚街景",
    "character": "#C 小雨",
    "action": "我們到了，先觀察四周。",
  }), []);
  const renderTextById = React.useMemo(() => ({
    "rule-numbered-chapter-title": "1. 第一章",
    "rule-se-performer": "旁白(*吸氣)今天要開始錄製。",
    "rule-tone-general": "（低聲）先不要被發現。",
    "rule-post-effect": "【殘響】這句有後製。",
    "rule-se-single": "#SE 關門聲",
    "rule-position": "@舞台左側",
    "se-continuous": ">>SE 雨聲持續\n雨越下越大\n><SE 轉小聲\n雨聲回到背景\n<<SE",
    "rule-bg-start": "//BG 夜晚街景",
    "character": "#C 小雨",
    "action": "我們到了，先觀察四周。",
  }), []);
  const astById = React.useMemo(() => {
    const entries = {};
    allRules.forEach((rule) => {
      const sample = renderTextById[rule.id] || exampleById[rule.id] || "";
      if (!sample) return;
      entries[rule.id] = parseScreenplay(sample, DEFAULT_MARKER_RULES).ast;
    });
    return entries;
  }, [allRules, renderTextById, exampleById]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar title={t("importFormat.topbarTitle")} showBack={true} onBack={() => navigate(-1)} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-primary/20">
            <BookMarked className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{t("importFormat.title")}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{t("importFormat.subtitle")}</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileCode2 className="w-5 h-5 text-primary" />
                {t("importFormat.detailRulesTitle").replace("{name}", DEFAULT_MARKER_RULES_NAME)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("importFormat.detailRulesDesc")}</p>
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[140px_1fr_160px_1fr] bg-muted/40 text-xs font-medium">
                  <div className="px-3 py-2 border-r">{t("importFormat.nameCol")}</div>
                  <div className="px-3 py-2 border-r">{t("importFormat.descCol")}</div>
                  <div className="px-3 py-2 border-r">{t("importFormat.sampleCol")}</div>
                  <div className="px-3 py-2">{t("importFormat.renderCol")}</div>
                </div>
                {allRules.map((rule) => (
                  <div key={rule.id} className="grid grid-cols-[140px_1fr_160px_1fr] border-t text-sm">
                    <div className="px-3 py-2 border-r">
                      <div className="font-medium">{rule.label || rule.id}</div>
                    </div>
                    <div className="px-3 py-2 border-r text-muted-foreground">{usageById[rule.id] || t("importFormat.usageGeneric")}</div>
                    <div className="px-3 py-2 border-r font-mono text-xs break-all">{exampleById[rule.id] || "-"}</div>
                    <div className="px-3 py-2">
                      {astById[rule.id] ? (
                        <div className="rounded border bg-background p-2 text-xs">
                          <ScriptRenderer
                            ast={astById[rule.id]}
                            markerConfigs={DEFAULT_MARKER_RULES}
                            colorCache={colorCacheRef}
                            fontSize={13}
                          />
                        </div>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} size="lg" className="rounded-full px-8">
            {t("importFormat.backHelp")}
          </Button>
          <Button onClick={() => navigate("/")} size="lg" className="rounded-full px-8">
            {t("importFormat.backPublic")}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </main>
    </div>
  );
}

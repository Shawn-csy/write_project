import React from "react";
import {
  CircleHelp,
  UploadCloud,
  LayoutTemplate,
  FileCode2,
  Search,
  X,
  ChevronDown,
  Compass,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { useI18n } from "../../../contexts/I18nContext";
import { MORANDI_STUDIO_TONE_VARS } from "../../../constants/morandiPanelTones";

export function HelpView() {
  const { t } = useI18n();
  const [showImportQuickInfo, setShowImportQuickInfo] = React.useState(false);
  const [showImportDetails, setShowImportDetails] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [expandedId, setExpandedId] = React.useState(null);

  const markerRows = [
    { marker: "1. 第一章", meaning: t("importFormat.markerChapter") },
    { marker: "#C 小雨", meaning: t("importFormat.markerCharacter") },
    { marker: "(低聲)", meaning: t("importFormat.markerTone") },
    { marker: "【殘響】", meaning: t("importFormat.markerPostFx") },
    { marker: "#SE 關門聲", meaning: t("importFormat.markerSeSingle") },
    { marker: "//BG 夜晚街景", meaning: t("importFormat.markerBg") },
    { marker: "@舞台左側", meaning: t("importFormat.markerPosition") },
  ];

  const detailRows = [
    { name: t("importFormat.markerChapter"), desc: t("importFormat.usageChapter"), sample: "1. 第一章", render: t("importFormat.markerChapter") },
    { name: t("importFormat.markerCharacter"), desc: t("importFormat.usageCharacter"), sample: "#C 小雨", render: "小雨：" },
    { name: t("importFormat.markerTone"), desc: t("importFormat.usageTone"), sample: "(低聲)", render: "語氣/動作樣式" },
    { name: t("importFormat.markerPostFx"), desc: t("importFormat.usagePostFx"), sample: "【殘響】", render: "後製註記樣式" },
    { name: t("importFormat.markerSeSingle"), desc: t("importFormat.usageSeSingle"), sample: "#SE 關門聲", render: "單行音效樣式" },
    { name: t("importFormat.markerBg"), desc: t("importFormat.usageBg"), sample: "//BG 夜晚街景", render: "背景音樣式" },
    { name: t("importFormat.markerPosition"), desc: t("importFormat.usagePosition"), sample: "@舞台左側", render: "位置指示樣式" },
  ];

  const categoryMeta = React.useMemo(() => ({
    publish: { label: "發佈流程", icon: Rocket, toneKey: "works" },
    layout: { label: "頁面導覽", icon: Compass, toneKey: "series" },
    import: { label: "匯入格式", icon: FileCode2, toneKey: "org" },
    license: { label: "授權與條款", icon: ShieldCheck, toneKey: "profile" },
  }), []);

  const faqItems = React.useMemo(() => ([
    {
      id: "publish-1",
      category: "publish",
      question: "我要怎麼把作品公開到公開台本？",
      answer: "到發佈工作室開啟作品，點選「編輯資訊」，完成公開狀態、授權、封面與必要欄位後儲存，即可在公開台本被搜尋與閱讀。",
      keywords: ["公開", "發佈", "工作室", "編輯資訊"],
    },
    {
      id: "publish-2",
      category: "publish",
      question: "為什麼我的作品在公開台本找不到？",
      answer: "常見原因是仍為私人狀態、缺少必要授權欄位、或剛儲存尚未刷新。請先確認狀態為公開，再回公開台本重新整理。",
      keywords: ["找不到", "私人", "授權", "公開狀態"],
    },
    {
      id: "layout-1",
      category: "layout",
      question: "公開台本頁面有哪些區塊？",
      answer: "上方是導覽與主要操作，中間是篩選與搜尋，下方是作品/作者/組織內容列表。可透過篩選標籤與顯示模式快速調整瀏覽方式。",
      keywords: ["區塊", "導覽", "篩選", "顯示模式"],
    },
    {
      id: "layout-2",
      category: "layout",
      question: "教學在哪裡重新開啟？",
      answer: "在寫作工作室與發佈工作室頂部右側可用「教學」按鈕重新開啟；公開台本可從右上角「說明」進入。匯入規則則在匯入對話框查看格式說明。",
      keywords: ["教學", "重新開啟", "格式說明"],
    },
    {
      id: "import-1",
      category: "import",
      question: "目前支援哪些匯入格式？",
      answer: "目前支援特定風格文字格式，建議使用預設 marker。你可以在匯入對話框內查看精簡規則與完整規則。",
      keywords: ["匯入", "格式", "marker"],
    },
    {
      id: "import-2",
      category: "import",
      question: "角色行要怎麼寫才會正確解析？",
      answer: "建議使用「#C 角色名」格式。若你原稿是純角色名單行，也可在匯入時啟用角色整行自動標記並提供角色名單。",
      keywords: ["角色", "#C", "解析", "自動標記"],
    },
    {
      id: "license-1",
      category: "license",
      question: "商用與二次創作權限怎麼設定？",
      answer: "請在作品的授權欄位中設定商用、改作與通知條件。公開頁的篩選會依照這些設定顯示，請確認內容與你實際授權一致。",
      keywords: ["授權", "商用", "二創", "篩選"],
    },
    {
      id: "license-2",
      category: "license",
      question: "第一次使用條款同意是怎麼運作？",
      answer: "當使用者首次進入或開啟目標內容時，系統會要求閱讀條款並確認；完成後才可繼續操作，並留下簽署紀錄。",
      keywords: ["條款", "同意", "簽署", "紀錄"],
    },
  ]), []);

  const quickTags = React.useMemo(() => (["公開", "發佈", "匯入", "授權", "角色", "教學"]), []);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredFaq = React.useMemo(() => {
    if (!normalizedQuery) return faqItems;
    return faqItems.filter((item) => {
      const haystack = [item.question, item.answer, ...(item.keywords || [])].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [faqItems, normalizedQuery]);

  const groupedFaq = React.useMemo(() => {
    return filteredFaq.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [filteredFaq]);

  const categories = Object.keys(categoryMeta).filter((key) => (groupedFaq[key] || []).length > 0);
  const featuredQuestions = filteredFaq.slice(0, 3);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <Card
        style={MORANDI_STUDIO_TONE_VARS.works}
        className="border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-br from-[var(--morandi-tone-helper-bg)]/45 via-background to-[var(--morandi-tone-panel-bg)]"
      >
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-start gap-4">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm border border-primary/20">
              <CircleHelp className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-serif font-bold text-foreground">{t("publicHelp.title")}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">{t("publicHelp.subtitle")}</p>
            </div>
            <div className="w-full relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋問題，例如：如何公開、匯入格式、授權條款"
                className="h-11 pl-9 pr-9 bg-background/90"
              />
              {query ? (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                  aria-label="clear-search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="rounded-full border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-helper-bg)]/20 px-3 py-1 text-xs text-[color:var(--morandi-tone-helper-fg)] hover:bg-[color:var(--morandi-tone-helper-bg)]/40"
                >
                  #{tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">找到 {filteredFaq.length} 筆相關問題</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {featuredQuestions.map((item) => {
          const category = categoryMeta[item.category];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              className="text-left rounded-xl border bg-background p-4 hover:border-primary/40 transition-colors"
            >
              <div className="mb-2">
                <Badge variant="secondary">{category?.label || item.category}</Badge>
              </div>
              <div className="font-medium text-sm">{item.question}</div>
            </button>
          );
        })}
      </div>

      <div className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="w-5 h-5 text-primary" />
              {t("publicHelp.publishFlowTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm sm:text-base">
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>{t("publicHelp.publishStep1")}</li>
              <li>{t("publicHelp.publishStep2")}</li>
              <li>{t("publicHelp.publishStep3")}</li>
              <li>{t("publicHelp.publishStep4")}</li>
            </ol>
          </CardContent>
        </Card>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              找不到符合「{query}」的問題，請換個關鍵字試試。
            </CardContent>
          </Card>
        ) : categories.map((categoryKey) => {
          const meta = categoryMeta[categoryKey];
          const Icon = meta?.icon || CircleHelp;
          const items = groupedFaq[categoryKey] || [];
          return (
            <Card
              key={categoryKey}
              style={MORANDI_STUDIO_TONE_VARS[meta?.toneKey] || MORANDI_STUDIO_TONE_VARS.works}
              className="border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)]/65"
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-[color:var(--morandi-tone-helper-fg)]">
                    <Icon className="w-4 h-4" />
                    {meta?.label || categoryKey}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-helper-bg)]/35 text-[color:var(--morandi-tone-helper-fg)]"
                  >
                    {items.length} 題
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((item) => {
                  const isOpen = expandedId === item.id;
                  return (
                    <div key={item.id} className="rounded-lg border border-[color:var(--morandi-tone-panel-border)] bg-background/80">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                        onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
                      >
                        <span className="text-sm font-semibold text-[color:var(--morandi-tone-helper-fg)]">{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen ? (
                        <div className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">
                          {item.answer}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <LayoutTemplate className="w-5 h-5 text-primary" />
              {t("publicHelp.layoutTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm sm:text-base text-muted-foreground">
            <p>{t("publicHelp.layoutDesc")}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t("publicHelp.layoutItemHeader")}</li>
              <li>{t("publicHelp.layoutItemInfo")}</li>
              <li>{t("publicHelp.layoutItemContent")}</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileCode2 className="w-5 h-5 text-primary" />
              {t("publicHelp.importFormatTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm sm:text-base text-muted-foreground">
            <p>{t("publicHelp.importFormatDesc")}</p>
            <Button variant="outline" onClick={() => setShowImportQuickInfo(true)}>
              {t("publicHelp.importFormatCta")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={showImportQuickInfo}
        onOpenChange={(nextOpen) => {
          setShowImportQuickInfo(nextOpen);
          if (!nextOpen) setShowImportDetails(false);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("publicHelp.importQuickTitle")}</DialogTitle>
            <DialogDescription>{t("publicHelp.importQuickDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t("publicHelp.importQuickItem1")}</p>
            <p>{t("publicHelp.importQuickItem2")}</p>
            <p>{t("publicHelp.importQuickItem3")}</p>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <div className="grid grid-cols-[145px_1fr] bg-muted/40 text-xs font-medium">
              <div className="px-3 py-2 border-r">{t("importFormat.markerCol")}</div>
              <div className="px-3 py-2">{t("importFormat.meaningCol")}</div>
            </div>
            {markerRows.map((row) => (
              <div key={row.marker} className="grid grid-cols-[145px_1fr] text-sm border-t">
                <div className="px-3 py-2 border-r font-mono">{row.marker}</div>
                <div className="px-3 py-2 text-muted-foreground">{row.meaning}</div>
              </div>
            ))}
          </div>
          {showImportDetails ? (
            <div className="rounded-lg border overflow-hidden max-h-[40vh] overflow-y-auto">
              <div className="grid grid-cols-[120px_1fr_140px_120px] bg-muted/40 text-xs font-medium">
                <div className="px-3 py-2 border-r">{t("importFormat.nameCol")}</div>
                <div className="px-3 py-2 border-r">{t("importFormat.descCol")}</div>
                <div className="px-3 py-2 border-r">{t("importFormat.sampleCol")}</div>
                <div className="px-3 py-2">{t("importFormat.renderCol")}</div>
              </div>
              {detailRows.map((row) => (
                <div key={row.name} className="grid grid-cols-[120px_1fr_140px_120px] text-xs border-t">
                  <div className="px-3 py-2 border-r font-medium">{row.name}</div>
                  <div className="px-3 py-2 border-r text-muted-foreground">{row.desc}</div>
                  <div className="px-3 py-2 border-r font-mono">{row.sample}</div>
                  <div className="px-3 py-2 text-muted-foreground">{row.render}</div>
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowImportDetails((prev) => !prev)}>
              {showImportDetails ? t("common.hide", "收合") : t("publicHelp.importFormatDetailCta")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportQuickInfo(false);
                setShowImportDetails(false);
              }}
            >
              {t("common.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React from "react";
import { Menu, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useI18n } from "../../contexts/I18nContext";

export function ReaderTOC({
  sceneList = [],
  currentSceneId,
  onSelectScene,
  metaItems = [],
  open,
  onOpenChange,
  triggerGuideId = "public-guide-toc-trigger",
  panelGuideId = "public-guide-toc-panel",
  hideHeaderTrigger = false,
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const resolvedOpen = isControlled ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const { t } = useI18n();
  const hasScenes = Array.isArray(sceneList) && sceneList.length > 0;
  const hasMeta = Array.isArray(metaItems) && metaItems.length > 0;

  const handleSelect = (id) => {
      onSelectScene(id);
      setOpen(false);
  };

  if (!hasScenes && !hasMeta) return null;

  return (
    <>
      {!resolvedOpen && hideHeaderTrigger && (
        <button
          type="button"
          data-guide-id={triggerGuideId}
          className="md:hidden inline-flex items-center justify-center rounded-full bg-background/20 p-2 text-foreground backdrop-blur-md hover:bg-background/40"
          onClick={() => setOpen(true)}
          aria-label={t("publicReader.openToc", "開啟詳細資料側欄")}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      {!resolvedOpen && (
        <button
          type="button"
          data-guide-id={triggerGuideId}
          className="hidden md:inline-flex fixed left-0 top-1/2 -translate-y-1/2 z-40 items-center gap-1 rounded-r-lg border border-l-0 border-border/70 bg-background/85 px-2 py-3 text-xs text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground"
          onClick={() => setOpen(true)}
          aria-label={t("publicReader.openToc", "開啟詳細資料側欄")}
        >
          <Menu className="h-3.5 w-3.5" />
          <span className="[writing-mode:vertical-rl] tracking-wider">{t("publicReader.toc", "詳細資料")}</span>
        </button>
      )}
      <Sheet open={resolvedOpen} onOpenChange={setOpen} modal={false}>
        {!hideHeaderTrigger ? (
          <SheetTrigger asChild>
            <Button
              data-guide-id={triggerGuideId}
              variant="ghost"
              size="icon"
              className="rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
              aria-label={t("publicReader.toc", "詳細資料")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        ) : null}
        <SheetContent
          data-guide-id={panelGuideId}
          side="left"
          className="w-[300px] sm:w-[400px] p-0 flex flex-col h-full bg-background/95 backdrop-blur-md"
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="font-serif">{t("publicReader.toc", "詳細資料")}</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1">
              <div className="flex flex-col py-2">
                  {hasScenes ? (
                      <>
                      <div className="px-6 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("publicReader.sceneNav", "場景導覽")}
                      </div>
                      {sceneList.map((scene, i) => (
                          <button
                              key={scene.id}
                              onClick={() => handleSelect(scene.id)}
                              className={`
                                  flex items-center justify-between w-full px-6 py-3 text-left transition-colors
                                  ${currentSceneId === scene.id 
                                      ? "bg-primary/10 text-primary font-medium" 
                                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                  }
                              `}
                          >
                              <div className="flex items-start gap-3 overflow-hidden">
                                  <span className="text-xs opacity-50 font-mono mt-0.5 min-w-[1.5rem]">{i+1}.</span>
                                  <span className="truncate leading-tight text-sm">{scene.label}</span>
                              </div>
                              {currentSceneId === scene.id && <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />}
                          </button>
                      ))}
                      </>
                  ) : null}
                  {hasMeta && (
                    <div className="mt-2 border-t border-border/60 px-6 py-4">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("publicReader.metaInfo", "作品資訊")}
                      </div>
                      <div className="space-y-2">
                        {metaItems.map((item, idx) => (
                          <div key={`${item.label}-${idx}`} className="rounded-md border border-border/50 bg-background/70 px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">{item.label}</div>
                            <div className="mt-1 break-words text-sm text-foreground">
                              {item.render ? item.render : item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

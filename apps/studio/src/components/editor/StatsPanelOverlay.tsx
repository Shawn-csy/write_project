import React, { Suspense } from "react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "../ui/drawer";
import { useI18n } from "../../contexts/I18nContext";
import type { AstNode } from "../../lib/statistics/ScriptAnalyzer";

// Stats suite (~25KB + hooks) stays out of the eager editor bundle.
const StatisticsPanel = React.lazy(async () => {
  const mod = await import("../statistics/StatisticsPanel");
  return { default: mod.StatisticsPanel };
});

const panelFallback = <div className="p-8 text-center text-muted-foreground">Loading...</div>;

interface Props {
  show: boolean;
  isMobile: boolean;
  onClose: () => void;
  rawScript: string;
  scriptAst: AstNode | null | undefined;
  onLocateText: (text: string) => void;
  scriptId: string;
}

export function StatsPanelOverlay({ show, isMobile, onClose, rawScript, scriptAst, onLocateText, scriptId }: Props): React.JSX.Element {
  const { t } = useI18n();

  const header = (
    <div className="h-12 border-b flex items-center px-4 shrink-0 bg-muted/20 gap-3">
      <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-sm">✕</button>
      <h3 className="font-semibold text-sm">{t("liveEditor.statsPanel")}</h3>
    </div>
  );

  return (
    <>
      {/* Desktop side panel */}
      {show && (
        <>
          <div className="hidden sm:block absolute inset-0 z-10" onClick={onClose} />
          <div className="hidden sm:flex absolute right-0 top-0 bottom-0 w-[400px] border-l border-border bg-background flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200">
            {header}
            <div className="flex-1 min-h-0 overflow-hidden">
              <Suspense fallback={panelFallback}>
                <StatisticsPanel rawScript={rawScript} scriptAst={scriptAst} onLocateText={onLocateText} scriptId={scriptId} />
              </Suspense>
            </div>
          </div>
        </>
      )}

      {/* Mobile drawer */}
      <Drawer open={show && isMobile} onOpenChange={onClose} direction="bottom">
        <DrawerContent className="sm:hidden flex flex-col h-[80dvh] outline-none">
          <DrawerTitle className="sr-only">{t("liveEditor.statsPanel")}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("liveEditor.statsPanel")}</DrawerDescription>
          {header}
          <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4">
            <Suspense fallback={panelFallback}>
              <StatisticsPanel rawScript={rawScript} scriptAst={scriptAst} onLocateText={onLocateText} scriptId={scriptId} />
            </Suspense>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

import React from "react";
import { Loader2, ClipboardPaste, FileText, Eye, CheckCircle2, CircleHelp } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../ui/dialog";
import { SpotlightGuideOverlay } from "../../common/SpotlightGuideOverlay";

import { ImportStageInput } from "./import/ImportStageInput";
import { ImportStagePreview } from "./import/ImportStagePreview";
import { ImportStageResult } from "./import/ImportStageResult";
import { ImportFormatGuideDialog } from "./import/ImportFormatGuideDialog";
import type { ControlledMetadataField } from "./import/ImportStagePreview";

import { useImportScriptDialogState, STEPS, type ImportPayload } from "../../../hooks/dashboard/useImportScriptDialogState";

export { metadataToCustomEntries } from "../../../hooks/dashboard/useImportScriptDialogState";

const CONTROLLED_METADATA_FIELDS: ControlledMetadataField[] = [
  { key: "Title", label: "標題", multiline: false },
  { key: "Author", label: "作者", multiline: false },
  { key: "Draft date", label: "日期", multiline: false },
  { key: "Rating", label: "分級", multiline: false },
  { key: "Duration", label: "時長", multiline: false },
  { key: "Source", label: "來源", multiline: false },
  { key: "Tags", label: "標籤", multiline: true },
  { key: "Description", label: "作品描述", multiline: true },
  { key: "RoleSetting", label: "角色設定", type: "role_group" },
  { key: "ChapterSettings", label: "章節", type: "chapter_group" },
];

interface ImportScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (payload: ImportPayload) => Promise<void>;
  currentPath: string;
}

export function ImportScriptDialog({ open, onOpenChange, onImport, currentPath }: ImportScriptDialogProps): React.JSX.Element {
  const s = useImportScriptDialogState({ open, onOpenChange, onImport, currentPath });

  return (
    <>
      <Dialog open={open} onOpenChange={s.handleOpenChange}>
        <DialogContent
          className="max-w-5xl h-[85vh] flex flex-col"
          onInteractOutside={(e) => { if (s.showGuide) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (s.showGuide) e.preventDefault(); }}
        >
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {s.t("importDialog.title")}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => s.setShowFormatQuickInfo(true)}>
                  {s.t("importDialog.formatGuide")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={s.handleGuideStart}>
                  <CircleHelp className="w-4 h-4 mr-1" />
                  {s.t("importDialog.help")}
                </Button>
              </div>
            </div>
            <DialogDescription>{s.t("importDialog.descDefault")}</DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm border-b pb-4">
            {[
              { key: STEPS.INPUT, label: s.t("importDialog.stepInput"), icon: ClipboardPaste },
              { key: STEPS.PREVIEW, label: s.t("importDialog.stepPreprocess"), icon: Eye },
              { key: STEPS.RESULT, label: s.t("importDialog.stepConfirm"), icon: CheckCircle2 },
            ].map((st, i) => (
              <React.Fragment key={st.key}>
                {i > 0 && <div className="w-8 h-px bg-border" />}
                <div className={`flex items-center gap-1 px-2 py-1 rounded ${s.step === st.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  <st.icon className="w-4 h-4" />
                  <span>{st.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="flex-1 overflow-hidden min-h-0 pt-4">
            {/* Step 1 */}
            {s.step === STEPS.INPUT && (
              <div className="flex flex-col gap-4 h-full min-h-0 overflow-y-auto pr-1 pb-1">
                <div ref={s.guidePasteRef} className="flex flex-col gap-4 min-h-0">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={s.t("importDialog.scriptTitle")}
                      value={s.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => s.setTitle(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={s.handlePaste}>
                      <ClipboardPaste className="w-4 h-4 mr-1" />
                      {s.t("importDialog.paste")}
                    </Button>
                  </div>
                  <ImportStageInput text={s.rawInput} setText={s.setRawInput} />
                </div>
                <div ref={s.guideCharacterRef} className="border rounded-md p-3 space-y-2 bg-muted/20 shrink-0">
                  <div className="space-y-0.5">
                    <Label htmlFor="character-whole-line-input">{s.t("importDialog.characterAutoLabel")}</Label>
                    <p className="text-xs text-muted-foreground">{s.t("importDialog.characterAutoDesc")}</p>
                  </div>
                  <Textarea
                    id="character-whole-line-input"
                    className="min-h-[88px] font-mono text-xs"
                    placeholder={s.t("importDialog.characterListPlaceholder")}
                    value={s.characterNamesInput}
                    onChange={(e) => s.setCharacterNamesInput(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {s.step === STEPS.PREVIEW && s.preprocessResult && (
              <div ref={s.guidePreviewRef} className="h-full">
                <ImportStagePreview
                  previewText={s.preprocessResult.cleanedText}
                  setPreviewText={s.handleSetPreviewText}
                  onAutoRemoveWhitespace={s.handleAutoRemoveWhitespace}
                  metadataPreview={s.metadata}
                  controlledMetadataFields={CONTROLLED_METADATA_FIELDS}
                  onMetadataChange={(key, value) => s.setMetadata(prev => ({ ...prev, [key]: String(value ?? "") }))}
                  onApplyParsedMetadataRemoval={s.handleApplyParsedMetadataRemoval}
                  canApplyParsedMetadataRemoval={
                    Boolean(s.metadataParseResult?.autoCleanedText) &&
                    s.metadataParseResult.autoCleanedText !== s.preprocessResult.cleanedText
                  }
                />
              </div>
            )}

            {/* Step 3 */}
            {s.step === STEPS.RESULT && s.preprocessResult?.cleanedText && (
              <div ref={s.guideResultRef} className="h-full">
                <ImportStageResult
                  title={s.title}
                  setTitle={s.setTitle}
                  cleanedText={s.preprocessResult.cleanedText}
                  previewAst={s.previewAst}
                  previewMarkerConfigs={s.previewMarkerConfigs}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t mt-auto">
            {s.step !== STEPS.INPUT && (
              <Button variant="outline" onClick={() => {
                const steps = [STEPS.INPUT, STEPS.PREVIEW, STEPS.RESULT] as const;
                const idx = steps.indexOf(s.step as typeof steps[number]);
                if (idx > 0) s.setStep(steps[idx - 1]);
              }}>
                {s.t("importDialog.prevStep")}
              </Button>
            )}
            <Button variant="outline" onClick={() => s.handleOpenChange(false)}>{s.t("common.cancel")}</Button>
            {s.step === STEPS.INPUT && (
              <Button onClick={s.handlePreprocess} disabled={!s.rawInput.trim()}>{s.t("importDialog.nextPreprocess")}</Button>
            )}
            {s.step === STEPS.PREVIEW && (
              <Button onClick={s.handleToResult}>{s.t("importDialog.nextConfirm")}</Button>
            )}
            {s.step === STEPS.RESULT && (
              <Button onClick={s.handleConfirmImport} disabled={s.importing}>
                {s.importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {s.t("importDialog.confirmImport")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SpotlightGuideOverlay
        open={s.showGuide && Boolean(s.currentGuide)}
        zIndex={200}
        spotlightRect={s.spotlightRect}
        currentStep={s.guideIndex + 1}
        totalSteps={s.guideSteps.length}
        title={s.currentGuide?.title}
        description={s.currentGuide?.description}
        onSkip={s.finishGuide}
        skipLabel={s.t("importDialog.guideSkip")}
        onPrev={s.handleGuidePrev}
        prevLabel={s.t("importDialog.guidePrev")}
        prevDisabled={s.guideIndex === 0}
        onNext={s.handleGuideNext}
        nextLabel={s.guideIndex === s.guideSteps.length - 1 ? s.t("importDialog.guideDone") : s.t("importDialog.guideNext")}
      />

      <ImportFormatGuideDialog
        open={s.showFormatQuickInfo}
        onOpenChange={s.setShowFormatQuickInfo}
        markerRows={s.markerRows}
        detailRows={s.detailRows}
        showFormatDetails={s.showFormatDetails}
        setShowFormatDetails={s.setShowFormatDetails}
      />
    </>
  );
}

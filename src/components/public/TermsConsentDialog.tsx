import React from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import type { PublicTermsConfig } from "../../types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

/**
 * TermsConsentDialog
 *
 * 公開授權條款同意對話框，供 PublicGalleryPage 與 PublicReaderPage 共用。
 */
interface TermsConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termsConfig: PublicTermsConfig | null;
  termsScrollRef: React.RefObject<HTMLDivElement | null>;
  termsReadToBottom: boolean;
  termsRequireScroll: boolean;
  acceptedChecks: Record<string, boolean>;
  isSubmittingTerms: boolean;
  canConfirmTerms: boolean;
  missingRequiredCheckCount: number;
  handleTermsScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  toggleRequiredCheck: (id: string, checked: boolean | "indeterminate") => void;
  onConfirm: () => void;
  onCancel: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
}

export function TermsConsentDialog({
  open,
  onOpenChange,
  termsConfig,
  termsScrollRef,
  termsReadToBottom,
  termsRequireScroll,
  acceptedChecks,
  isSubmittingTerms,
  canConfirmTerms,
  missingRequiredCheckCount,
  handleTermsScroll,
  toggleRequiredCheck,
  onConfirm,
  onCancel,
  cancelLabel = "稍後再看",
  confirmLabel,
}: TermsConsentDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[94vw] max-w-2xl p-0 overflow-hidden border"
        style={{
          backgroundColor: "var(--license-overlay-bg)",
          borderColor: "var(--license-overlay-border)",
          color: "var(--license-overlay-fg)",
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-left">
            {termsConfig?.title || "授權條款與使用聲明"}
          </DialogTitle>
          <DialogDescription className="text-left">
            {termsConfig?.intro || "請先閱讀並同意以下條款，完成後才能進入劇本閱讀頁。"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-2">
          <div className="relative">
            <div
              ref={termsScrollRef}
              onScroll={handleTermsScroll}
              className="max-h-[46vh] overflow-y-auto touch-pan-y rounded-md border p-4 text-sm leading-6"
              style={{
                backgroundColor: "var(--license-term-bg)",
                borderColor: "var(--license-term-border)",
                color: "var(--license-term-fg)",
              }}
            >
              {(termsConfig?.sections || []).map((section) => (
                <section key={section.id || section.title} className="mb-4 last:mb-0">
                  <h4 className="font-semibold text-foreground">{section.title}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{section.body}</p>
                </section>
              ))}
              {(termsConfig?.sections || []).length === 0 && (
                <p className="text-muted-foreground">條款內容尚未設定。</p>
              )}
            </div>
            {termsRequireScroll && !termsReadToBottom && (
              <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded-b-md bg-gradient-to-t from-background via-background/80 to-transparent px-3 pb-2 pt-10 text-center">
                <div className="mx-auto w-fit rounded-full border border-border/60 bg-background/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                  <span className="mr-1 inline-block animate-bounce">↓</span>
                  向下滑動閱讀完整條款
                </div>
              </div>
            )}
          </div>
          <p
            className="mt-2 text-xs"
            style={{
              color:
                termsReadToBottom || !termsRequireScroll
                  ? "var(--license-selected-fg)"
                  : "hsl(var(--muted-foreground))",
            }}
          >
            {termsRequireScroll
              ? termsReadToBottom
                ? "已讀到最下方，可進行確認。"
                : "請先將條款內容滑到最下方。"
              : "確認已閱條款後，可勾選確認。"}
          </p>
        </div>

        <div className="px-5 pb-2 space-y-2">
          {missingRequiredCheckCount > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              尚有 {missingRequiredCheckCount} 項必須同意。
            </div>
          )}
          {(termsConfig?.requiredChecks || []).map((item) => (
            <label
              key={item.id}
              className={`flex items-start gap-2 rounded-md border px-2 py-2 text-sm ${
                acceptedChecks[item.id]
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <Checkbox
                className="mt-0.5"
                checked={Boolean(acceptedChecks[item.id])}
                onCheckedChange={(checked) => toggleRequiredCheck(item.id, checked)}
                disabled={(termsRequireScroll && !termsReadToBottom) || isSubmittingTerms}
              />
              <span className={acceptedChecks[item.id] ? "text-foreground/90" : "text-amber-800 dark:text-amber-300"}>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        <DialogFooter className="px-5 pb-5 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmittingTerms}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={!canConfirmTerms || isSubmittingTerms}>
            {isSubmittingTerms ? "送出中..." : (confirmLabel || "同意並進入")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

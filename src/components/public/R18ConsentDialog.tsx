import React from "react";
import { AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

interface R18ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function R18ConsentDialog({ open, onOpenChange, onConfirm }: R18ConsentDialogProps): React.JSX.Element {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[92vw] max-w-[92vw] sm:max-w-lg rounded-xl p-4 sm:p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive font-bold flex items-center gap-2 text-base sm:text-lg leading-snug break-words">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            <span>內容分級警告 (Adult Content Warning)</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left break-words">
            <p className="text-[13px] sm:text-sm text-foreground/80 leading-relaxed">
              您即將進入受限制的內容頁面。此作品含有 <strong>成人向(R-18)</strong> 的標籤，可能包含不適合未成年人觀看的成人題材、暴力或過度裸露內容。
            </p>
            <p className="text-sm sm:text-[15px] font-medium text-destructive">
              請問您是否已滿 18 歲，並願意觀看此內容？
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs sm:text-sm text-foreground/80">
          進入即代表您已確認年齡符合規範，並願意自行承擔閱覽責任。
        </div>

        <AlertDialogFooter className="mt-1 sm:mt-2 grid grid-cols-1 gap-2">
          <AlertDialogAction
            onClick={onConfirm}
            className="order-1 w-full h-auto min-h-11 whitespace-normal leading-snug px-3 py-2 text-sm font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            已滿 18 歲，進入
          </AlertDialogAction>
          <AlertDialogCancel className="order-2 w-full h-auto min-h-10 whitespace-normal leading-snug px-3 py-2 text-sm">
            返回
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

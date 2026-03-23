import React from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";

export function R18ConsentDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[92vw] max-w-[92vw] sm:max-w-lg rounded-xl p-4 sm:p-6 gap-3 max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive font-bold flex items-center gap-2 text-base sm:text-lg leading-snug break-words">
            <span className="text-xl sm:text-2xl">🔞</span>
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
        <AlertDialogFooter className="mt-2 sm:mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AlertDialogCancel className="w-full h-auto min-h-10 whitespace-normal leading-snug px-3 py-2">
            返回 (Go Back)
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full h-auto min-h-10 whitespace-normal leading-snug px-3 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            已滿 18 歲，進入觀看 (I am 18+, Enter)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

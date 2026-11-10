"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { PublicFeedbackDialogProps } from "@/components/PublicFeedbackDialog";
import { PublicFeedbackTrigger } from "@/components/PublicFeedbackTrigger";

const Dialog = lazy(() => import("@/components/PublicFeedbackDialog").then((module) => ({ default: module.PublicFeedbackDialog })));

export function LazyPublicFeedbackDialog({
  mode = "choice",
  compactAtMobile = false,
  showLabel = false,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
}: PublicFeedbackDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const open = controlledOpen ?? internalOpen;

  useEffect(() => {
    if (open) setActivated(true);
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <>
      {!hideTrigger && <PublicFeedbackTrigger
        mode={mode}
        compactAtMobile={compactAtMobile}
        showLabel={showLabel}
        onClick={() => { setActivated(true); handleOpenChange(true); }}
      />}
      {(activated || open) && <Suspense fallback={null}>
        <Dialog mode={mode} compactAtMobile={compactAtMobile} showLabel={showLabel} hideTrigger open={open} onOpenChange={handleOpenChange} />
      </Suspense>}
    </>
  );
}

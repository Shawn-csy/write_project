import React from "react";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ReadGuideOverlayProps {
  open: boolean;
  spotlightRect?: SpotlightRect | null;
  title?: string;
  description?: string;
  onExit: () => void;
  onNext: () => void;
  nextLabel?: string;
  exitLabel?: string;
}

export function ReadGuideOverlay({
  open,
  spotlightRect,
  title,
  description,
  onExit,
  onNext,
  nextLabel,
  exitLabel,
}: ReadGuideOverlayProps) {
  if (!open || typeof document === "undefined") return null;

  return (
    <SpotlightGuideOverlay
      open={open}
      zIndex={260}
      spotlightRect={spotlightRect}
      title={title}
      description={description}
      onSkip={onExit}
      skipLabel={exitLabel}
      onPrev={() => {}}
      prevLabel=""
      onNext={onNext}
      nextLabel={nextLabel}
      showProgress={false}
      showPrev={false}
    />
  );
}

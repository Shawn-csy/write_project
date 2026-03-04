import React from "react";
import { SpotlightGuideOverlay } from "../common/SpotlightGuideOverlay";

export function ReadGuideOverlay({
  open,
  spotlightRect,
  title,
  description,
  onExit,
  onNext,
  nextLabel,
  exitLabel,
}) {
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
      onNext={onNext}
      nextLabel={nextLabel}
      showProgress={false}
      showPrev={false}
    />
  );
}

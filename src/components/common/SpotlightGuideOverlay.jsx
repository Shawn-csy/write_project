import React from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/button";

export function SpotlightGuideOverlay({
  open,
  zIndex = 240,
  spotlightRect,
  currentStep = 0,
  totalSteps = 0,
  title,
  description,
  onSkip,
  skipLabel,
  onPrev,
  prevLabel,
  prevDisabled = false,
  onNext,
  nextLabel,
  showProgress = true,
  showSkip = true,
  showPrev = true,
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex }}>
      {spotlightRect ? (
        <>
          <div className="absolute left-0 top-0 bg-black/75 pointer-events-none" style={{ width: "100%", height: spotlightRect.top }} />
          <div className="absolute left-0 bg-black/75 pointer-events-none" style={{ top: spotlightRect.top, width: spotlightRect.left, height: spotlightRect.height }} />
          <div
            className="absolute right-0 bg-black/75 pointer-events-none"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left + spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
          <div className="absolute left-0 bg-black/75 pointer-events-none" style={{ top: spotlightRect.top + spotlightRect.height, width: "100%", bottom: 0 }} />
          <div
            className="absolute rounded-xl border-2 border-primary shadow-[0_0_40px_rgba(255,255,255,0.12)] pointer-events-none"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/75 pointer-events-none" />
      )}
      <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 bottom-6 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border bg-background p-4 shadow-2xl pointer-events-auto">
        {showProgress ? (
          <div className="text-xs text-muted-foreground">
            {currentStep}/{totalSteps}
          </div>
        ) : null}
        <div className="mt-1 text-base font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          {showSkip ? (
            <Button type="button" size="sm" variant="ghost" onClick={onSkip}>
              {skipLabel}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {showPrev ? (
              <Button type="button" size="sm" variant="outline" onClick={onPrev} disabled={prevDisabled}>
                {prevLabel}
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onNext}>
              {nextLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

import React from "react";
import { BookOpen, CircleHelp } from "lucide-react";
import { Button } from "../ui/button";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import {
  STUDIO_TOPBAR_ICON_BUTTON_CLASS,
  STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS,
} from "./studioTopbarTokens";

export function StudioTopbarQuickActions({
  onOpenGuide,
  onOpenGallery,
  guideLabel,
  galleryLabel,
  languageLabel,
}) {
  return (
    <>
      <LanguageSwitcher
        compact
        buttonClassName={STUDIO_TOPBAR_ICON_BUTTON_CLASS}
        ariaLabel={languageLabel}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS} w-10 px-0 sm:w-auto sm:px-3`}
        onClick={onOpenGuide}
        title={guideLabel}
        aria-label={guideLabel}
      >
        <CircleHelp className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">{guideLabel}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS} w-10 px-0 sm:w-auto sm:px-3`}
        onClick={onOpenGallery}
        title={galleryLabel}
        aria-label={galleryLabel}
      >
        <BookOpen className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">{galleryLabel}</span>
      </Button>
    </>
  );
}

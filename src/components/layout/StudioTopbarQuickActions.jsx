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
        className={STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS}
        onClick={onOpenGuide}
        title={guideLabel}
        aria-label={guideLabel}
      >
        <CircleHelp className="mr-1.5 h-4 w-4" />
        <span>{guideLabel}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS}
        onClick={onOpenGallery}
        title={galleryLabel}
        aria-label={galleryLabel}
      >
        <BookOpen className="mr-1.5 h-4 w-4" />
        <span>{galleryLabel}</span>
      </Button>
    </>
  );
}

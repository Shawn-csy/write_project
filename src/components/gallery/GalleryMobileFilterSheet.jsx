import React from "react";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { GalleryFilterBar } from "./GalleryFilterBar";
import { useI18n } from "../../contexts/I18nContext";

export function GalleryMobileFilterSheet({
  open,
  onOpenChange,
  view,
  searchTerm,
  onSearchChange,
  selectedTags,
  selectedAuthorTags,
  selectedOrgTags,
  onSelectScriptTags,
  onSelectAuthorTags,
  onSelectOrgTags,
  allTags,
  authorTags,
  orgTags,
  topTags,
  licenseTagShortcuts,
  usageFilter,
  usageOptions,
  onSetUsageFilter,
  viewMode,
  onViewModeChange,
  hasScriptFilters,
  onResetScriptFilters,
}) {
  const { t } = useI18n();

  const activeTags = view === "scripts" ? selectedTags : view === "authors" ? selectedAuthorTags : selectedOrgTags;
  const onSelectTags = view === "scripts" ? onSelectScriptTags : view === "authors" ? onSelectAuthorTags : onSelectOrgTags;
  const tags = view === "scripts" ? allTags : view === "authors" ? authorTags : orgTags;
  const placeholder =
    view === "scripts" ? t("publicGallery.searchScripts", "搜尋劇本...") :
    view === "authors" ? t("publicGallery.searchAuthors", "搜尋作者...") :
    t("publicGallery.searchOrgs", "搜尋組織...");

  const btnActive = "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35";
  const btnInactive = "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[92vw] max-w-none p-0 sm:max-w-sm">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
          <SheetTitle>{t("publicGallery.mobileFilterTitle", "篩選與搜尋")}</SheetTitle>
          <SheetDescription>{t("publicGallery.mobileFilterDesc", "調整搜尋關鍵字與標籤條件。")}</SheetDescription>
        </SheetHeader>
        <div className="h-[calc(100vh-96px)] overflow-y-auto px-4 pb-6">
          {view === "scripts" && (
            <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="space-y-2">
                <p className="mb-2 text-xs font-medium text-foreground">{t("galleryFilterBar.usageRights", "使用權限")}</p>
                <div className="flex flex-wrap gap-2">
                  {usageOptions.map((opt) => (
                    <Button
                      key={`mobile-usage-${opt.value}`}
                      type="button"
                      size="sm"
                      variant={usageFilter === opt.value ? "default" : "outline"}
                      className={`h-7 rounded-full px-3 text-xs transition-colors ${usageFilter === opt.value ? btnActive : btnInactive}`}
                      onClick={() => onSetUsageFilter(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="h-px bg-border/70" aria-hidden="true" />
              <div className="space-y-2">
                <p className="mb-2 text-xs font-medium text-foreground">{t("publicGallery.viewMode", "顯示模式")}</p>
                <div className="flex items-center gap-2">
                  {["standard", "compact"].map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      size="sm"
                      variant={viewMode === mode ? "default" : "outline"}
                      className={`h-7 rounded-full px-3 text-xs transition-colors ${viewMode === mode ? btnActive : btnInactive}`}
                      onClick={() => onViewModeChange(mode)}
                    >
                      {mode === "standard" ? t("publicGallery.viewStandard", "圖文排版") : t("publicGallery.viewCompact", "緊湊排版")}
                    </Button>
                  ))}
                </div>
              </div>
              {hasScriptFilters && (
                <div className="pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={onResetScriptFilters}
                  >
                    {t("publicGallery.clearFilters")}
                  </Button>
                </div>
              )}
            </div>
          )}
          <GalleryFilterBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            selectedTags={activeTags}
            onSelectTags={onSelectTags}
            featuredTags={view === "scripts" ? topTags : []}
            tags={tags}
            placeholder={placeholder}
            showViewToggle={false}
            viewValue={viewMode}
            onViewChange={onViewModeChange}
            viewOptions={[
              { value: "standard", label: t("publicGallery.viewStandard", "圖文排版") },
              { value: "compact", label: t("publicGallery.viewCompact", "緊湊排版") },
            ]}
            quickFilters={[]}
            quickTagFilters={view === "scripts" ? licenseTagShortcuts.map((tag) => ({
              value: tag,
              label: tag.replace(/^授權:/, "").replace(/^License:/, ""),
            })) : []}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

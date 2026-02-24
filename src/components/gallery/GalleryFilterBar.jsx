import React, { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Search, ChevronDown, Check } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useI18n } from "../../contexts/I18nContext";

export function GalleryFilterBar({ 
    selectedTags = [], 
    onSelectTags, 
    searchTerm, 
    onSearchChange,
    featuredTags = [],
    tags = [], 
    placeholder = "",
    sortOptions = [],
    sortValue,
    onSortChange,
    showSort = false,
    viewOptions = [],
    viewValue,
    onViewChange,
    showViewToggle = false
    ,
    quickFilters = [],
    quickFilterValue = "all",
    onQuickFilterChange,
    quickTagFilters = []
}) {
  const { t } = useI18n();
  const [tagOpen, setTagOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const searchPlaceholder = placeholder || t("galleryFilterBar.search");
  const filteredTags = useMemo(() => {
      const needle = tagQuery.trim().toLowerCase();
      if (!needle) return tags;
      return tags.filter(tag => String(tag).toLowerCase().includes(needle));
  }, [tags, tagQuery]);

  const toggleTag = (tag) => {
      if (!onSelectTags) return;
      if (selectedTags.includes(tag)) {
          onSelectTags(selectedTags.filter(t => t !== tag));
      } else {
          onSelectTags([...selectedTags, tag]);
      }
  };

  const clearTags = () => onSelectTags && onSelectTags([]);
  const selectedSet = useMemo(() => new Set(selectedTags), [selectedTags]);
  const featuredOnly = useMemo(
    () => featuredTags.filter((tag) => !selectedSet.has(tag)),
    [featuredTags, selectedSet]
  );
  const quickTagOnly = useMemo(
    () => quickTagFilters.filter((opt) => !selectedSet.has(opt.value)),
    [quickTagFilters, selectedSet]
  );
  const quickTagSet = useMemo(
    () => new Set(quickTagFilters.map((opt) => opt.value)),
    [quickTagFilters]
  );

  return (
    <div className="flex flex-col gap-5 py-4 w-full">
      
      {/* Search + Sort */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 bg-muted/30 border-transparent focus:bg-background transition-all"
          />
        </div>

        {showViewToggle && viewOptions.length > 0 && (
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1 w-full mt-2">
              {viewOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={viewValue === opt.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange?.(opt.value)}
                  className="flex-1 rounded-md text-xs h-8 px-3"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
        )}
      </div>

      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
          <span className="text-xs font-medium text-foreground">{t("galleryFilterBar.usageRights", "使用權限")}</span>
          <div className="flex flex-wrap items-center gap-2">
            {quickFilters.map((opt) => (
            <Button
              key={opt.value}
              variant={quickFilterValue === opt.value ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-7 min-w-[92px] justify-center shrink-0 sm:shrink sm:max-w-full max-w-[180px]"
              onClick={() => onQuickFilterChange?.(opt.value)}
                title={opt.label}
              >
                <span className="truncate">{opt.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Available Tags Area */}
      <div className="flex flex-col gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{t("galleryFilterBar.filterByTags", "分類與標籤")}</span>
          </div>

          {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-muted/20 border rounded-md">
                  {selectedTags.map(tag => {
                      const isLicense = quickTagSet.has(tag);
                      const isAdult = String(tag).toLowerCase() === "r-18" || String(tag).toLowerCase() === "r18" || String(tag).toLowerCase() === "成人向";
                      const label = quickTagFilters.find(q => q.value === tag)?.label || tag;
                      return (
                          <Button
                              key={`selected-${tag}`}
                              variant={isAdult ? "destructive" : "secondary"}
                              size="sm"
                              className={`rounded-full text-[11px] h-6 px-2 flex items-center gap-1 focus:outline-none ${isAdult ? "bg-red-600/90 text-white hover:bg-red-700" : ""}`}
                              onClick={() => toggleTag(tag)}
                              title={t("galleryFilterBar.clickToRemove", "點擊移除")}
                              style={isLicense && !isAdult ? {
                                  backgroundColor: "var(--license-selected-bg)",
                                  borderColor: "var(--license-selected-border)",
                                  color: "var(--license-selected-fg)",
                              } : undefined}
                          >
                              <span className="truncate max-w-[150px]">{label}</span>
                              <span className="text-muted-foreground hover:text-destructive shrink-0">×</span>
                          </Button>
                      );
                  })}
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearTags}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive ml-auto"
                  >
                      {t("galleryFilterBar.clearTags", "清除全部")}
                  </Button>
              </div>
          )}

          <div className="relative w-full">
              <Input 
                  value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      placeholder={t("galleryFilterBar.searchTags", "搜尋標籤...")}
                  className="h-8 text-xs bg-muted/30 border-transparent focus:bg-background transition-all"
              />
          </div>
          
          <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {tagQuery.trim() === "" && quickTagOnly.length > 0 && (
                  quickTagOnly.map(opt => {
                      const isAdult = String(opt.value).toLowerCase() === "r-18" || String(opt.value).toLowerCase() === "r18" || String(opt.value).toLowerCase() === "成人向";
                      return (
                          <button
                              key={`license-${opt.value}`}
                              type="button"
                              className={`flex items-center w-full min-h-8 px-2 py-1.5 text-xs rounded-md text-left transition-colors ${isAdult ? "text-red-500 font-bold hover:bg-red-500/10" : "hover:bg-muted/50"}`}
                              onClick={() => toggleTag(opt.value)}
                          >
                              <span className="flex-1 truncate">{opt.label}</span>
                          </button>
                      );
                  })
              )}
              {tagQuery.trim() === "" && featuredOnly.length > 0 && (
                  featuredOnly.map(tag => (
                      <button
                          key={`hot-${tag}`}
                          type="button"
                          className="flex items-center w-full min-h-8 px-2 py-1.5 text-xs rounded-md text-left font-medium transition-colors hover:bg-muted/80 bg-muted/30"
                          onClick={() => toggleTag(tag)}
                      >
                          <span className="flex-1 truncate">{tag}</span>
                      </button>
                  ))
              )}
              
              {filteredTags
                  .filter(t => !selectedSet.has(t) && (tagQuery.trim() !== "" || (!featuredOnly.includes(t) && !quickTagSet.has(t))))
                  .map(tag => (
                      <button
                          key={tag}
                          type="button"
                          className="flex items-center w-full min-h-8 px-2 py-1.5 text-xs rounded-md text-left transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                          onClick={() => toggleTag(tag)}
                      >
                          <span className="flex-1 truncate">{tag}</span>
                      </button>
                  ))}
                  
              {filteredTags.filter(t => !selectedSet.has(t)).length === 0 && (
                  <div className="text-[11px] text-muted-foreground w-full text-center py-2 opacity-70">
                      {t("galleryFilterBar.noTagsMatched", "無可用標籤或找不到符合的標籤")}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}

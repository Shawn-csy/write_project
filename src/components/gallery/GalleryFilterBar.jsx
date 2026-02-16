import React, { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Search, ChevronDown, Check } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export function GalleryFilterBar({ 
    selectedTags = [], 
    onSelectTags, 
    searchTerm, 
    onSearchChange,
    featuredTags = [],
    tags = [], 
    placeholder = "搜尋...",
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
  const [tagOpen, setTagOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
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
    <div className="flex flex-col gap-4 py-6 border-b border-border/50 mb-6">
      
      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder} 
              className="pl-9 bg-muted/30 border-transparent focus:bg-background transition-all"
          />
        </div>
        <div className="flex w-full sm:w-auto gap-2 items-center">
          {showSort && sortOptions.length > 0 && (
            <div className="w-full sm:w-[200px]">
              <Select value={sortValue} onValueChange={onSortChange}>
                <SelectTrigger>
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showViewToggle && viewOptions.length > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
              {viewOptions.map(opt => (
                <Button
                  key={opt.value}
                  variant={viewValue === opt.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewChange?.(opt.value)}
                  className="rounded-full text-xs h-8 px-3"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {quickFilters.length > 0 && (
        <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-hide">
          {quickFilters.map((opt) => (
            <Button
              key={opt.value}
              variant={quickFilterValue === opt.value ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-7 shrink-0 sm:shrink sm:max-w-full max-w-[180px]"
              onClick={() => onQuickFilterChange?.(opt.value)}
              title={opt.label}
            >
              <span className="truncate">{opt.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Tag Filters */}
      <div className="w-full flex flex-col gap-2">
        {(selectedTags.length > 0 || quickTagOnly.length > 0 || featuredOnly.length > 0) && (
          <div className="flex flex-col gap-2">
            {selectedTags.length > 0 && (
              <div className="flex flex-nowrap sm:flex-wrap items-center justify-start gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-hide">
                <span className="text-[11px] text-muted-foreground shrink-0">已選</span>
                {selectedTags.map(tag => (
                  <Button
                    key={`selected-${tag}`}
                    variant="secondary"
                    size="sm"
                    className={`rounded-full text-xs h-7 shrink-0 sm:shrink sm:max-w-none max-w-[220px] ${
                      quickTagSet.has(tag) ? "border" : ""
                    }`}
                    onClick={() => toggleTag(tag)}
                    title="點擊移除"
                    style={quickTagSet.has(tag) ? {
                      backgroundColor: "var(--license-selected-bg)",
                      borderColor: "var(--license-selected-border)",
                      color: "var(--license-selected-fg)",
                    } : undefined}
                  >
                    <span className="truncate sm:whitespace-normal">{tag}</span>
                  </Button>
                ))}
              </div>
            )}
            {quickTagOnly.length > 0 && (
              <div className="flex flex-nowrap sm:flex-wrap items-center justify-start gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-hide">
                <span className="text-[11px] text-muted-foreground shrink-0">授權</span>
                {quickTagOnly.map((opt) => (
                  <Button
                    key={`license-${opt.value}`}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-7 shrink-0 sm:shrink sm:max-w-none max-w-[200px]"
                    onClick={() => toggleTag(opt.value)}
                    title={opt.value}
                    style={{
                      backgroundColor: "var(--license-filter-bg)",
                      borderColor: "var(--license-filter-border)",
                      color: "var(--license-filter-fg)",
                    }}
                  >
                    <span className="truncate sm:whitespace-normal">{opt.label}</span>
                  </Button>
                ))}
              </div>
            )}
            {featuredOnly.length > 0 && (
              <div className="flex flex-nowrap sm:flex-wrap items-center justify-start gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-hide">
                <span className="text-[11px] text-muted-foreground shrink-0">熱門</span>
                {featuredOnly.map(tag => (
                  <Button
                    key={`hot-${tag}`}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-7 shrink-0 sm:shrink sm:max-w-none max-w-[180px]"
                    onClick={() => toggleTag(tag)}
                    title={tag}
                  >
                    <span className="truncate sm:whitespace-normal">{tag}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Popover open={tagOpen} onOpenChange={setTagOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-between">
              <span className="truncate">
                {selectedTags.length > 0 ? `標籤：已選 ${selectedTags.length}` : "標籤：全部"}
              </span>
              <ChevronDown className="w-4 h-4 opacity-60 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[90vw] sm:w-72 p-2" align="start">
            <div className="p-2">
              <Input
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="搜尋標籤..."
                className="h-8"
              />
            </div>
            <div className="max-h-56 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  clearTags();
                  setTagOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent"
              >
                全部
                {selectedTags.length === 0 && <Check className="w-4 h-4 text-primary" />}
              </button>
              {filteredTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    toggleTag(tag);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent"
                >
                  <span className="truncate">{tag}</span>
                  {selectedTags.includes(tag) && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
              {filteredTags.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">沒有符合的標籤</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearTags}>
            清除標籤
          </Button>
        )}
        </div>
      </div>
    </div>
  );
}

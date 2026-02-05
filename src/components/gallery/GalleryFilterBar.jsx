import React from "react";
import { Button } from "../ui/button";
import { Search } from "lucide-react";
import { Input } from "../ui/input";

export function GalleryFilterBar({ 
    selectedTag, 
    onSelectTag, 
    searchTerm, 
    onSearchChange,
    tags = [], 
    placeholder = "搜尋..." 
}) {
  return (
    <div className="flex flex-col gap-4 py-6 border-b border-border/50 mb-6">
      
      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder} 
            className="pl-9 bg-muted/30 border-transparent focus:bg-background transition-all"
        />
      </div>

      {/* Tag Filters */}
      <div className="w-full overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mask-linear-fade">
            <Button 
                variant={selectedTag === null ? "default" : "ghost"} 
                size="sm"
                onClick={() => onSelectTag(null)}
                className="rounded-full text-xs h-8 shrink-0"
            >
                全部
            </Button>
            {tags.map(tag => (
                 <Button 
                    key={tag}
                    variant={selectedTag === tag ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => onSelectTag(tag)}
                    className="rounded-full text-xs h-8 whitespace-nowrap shrink-0"
                >
                    {tag}
                </Button>
            ))}
        </div>
      </div>
    </div>
  );
}

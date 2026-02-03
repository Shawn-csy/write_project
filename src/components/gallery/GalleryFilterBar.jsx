import React from "react";
import { Button } from "../ui/button";
import { Search } from "lucide-react";
import { Input } from "../ui/input";

export function GalleryFilterBar({ 
    selectedTag, 
    onSelectTag, 
    searchTerm, 
    onSearchChange,
    tags = [] 
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-6 border-b border-border/50 mb-6">
      
      {/* Search Input */}
      <div className="relative w-full md:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜尋劇本..." 
            className="pl-9 bg-muted/30 border-transparent focus:bg-background transition-all"
        />
      </div>

      {/* Tag Filters */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
        <Button 
            variant={selectedTag === null ? "default" : "ghost"} 
            size="sm"
            onClick={() => onSelectTag(null)}
            className="rounded-full text-xs h-8"
        >
            全部
        </Button>
        {tags.map(tag => (
             <Button 
                key={tag}
                variant={selectedTag === tag ? "default" : "ghost"} 
                size="sm"
                onClick={() => onSelectTag(tag)}
                className="rounded-full text-xs h-8 whitespace-nowrap"
            >
                {tag}
            </Button>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

export function OrgGalleryCard({ org, onClick, onTagClick }) {
  const { id, name, logoUrl, description, tags = [] } = org;
  
  return (
    <Card 
      onClick={onClick}
      className="group relative flex flex-col p-4 border-muted hover:border-primary/50 bg-card hover:shadow-md transition-all duration-300 cursor-pointer h-full"
    >
      <div className="flex items-start gap-4 mb-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
            {logoUrl ? (
                <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="text-[10px] text-muted-foreground">LOGO</span>
            )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {description || "尚未填寫描述"}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="mt-auto pt-2 border-t border-border/40">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 5).map((tag, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="px-1.5 py-0 h-5 text-[10px] font-normal border-primary/20 text-muted-foreground hover:bg-secondary cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onTagClick && onTagClick(tag);
                }}
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 5 && (
                <span className="text-[10px] text-muted-foreground self-center">+{tags.length - 5}</span>
            )}
          </div>
        ) : (
            <span className="text-[10px] text-muted-foreground italic">無標籤</span>
        )}
      </div>
    </Card>
  );
}

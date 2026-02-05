import React from "react";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

export function AuthorGalleryCard({ author, onClick, onTagClick }) {
  const { id, displayName, avatar, bio, tags = [], organizations = [] } = author;
  
  return (
    <Card 
      onClick={onClick}
      className="group relative flex flex-col p-4 border-muted hover:border-primary/50 bg-card hover:shadow-md transition-all duration-300 cursor-pointer h-full"
    >
      <div className="flex items-start gap-4 mb-3">
        <Avatar className="w-12 h-12 border border-border">
          <AvatarImage src={avatar} />
          <AvatarFallback>{displayName?.[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {displayName}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {bio || "尚未填寫簡介"}
          </p>
        </div>
      </div>

      {/* Orgs */}
      {organizations.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {organizations.map(org => (
                <Badge key={org.id} variant="secondary" className="px-1.5 py-0 text-[10px] h-5 font-normal">
                    {org.name}
                </Badge>
            ))}
          </div>
      )}

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

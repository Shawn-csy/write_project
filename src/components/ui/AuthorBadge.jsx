import React from "react";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";

export function AuthorBadge({ author, className, showAvatar = true }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation();
    if (author?.id) {
      navigate(`/author/${author.id}`);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-muted/40 hover:bg-muted px-2 py-1 rounded-full",
        className
      )}
      onClick={handleClick}
      title="前往作者頁面"
    >
      {showAvatar && (
        <>
            {author?.avatarUrl || author?.avatar ? (
                <img src={author?.avatarUrl || author?.avatar} alt={author.displayName} className="w-4 h-4 rounded-full object-cover" />
            ) : (
                <User className="w-3.5 h-3.5" />
            )}
        </>
      )}
      <span className="font-medium">{author?.displayName || "未知作者"}</span>
    </div>
  );
}

import React from "react";
import { User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";

export function AuthorBadge({ author, className, showAvatar = true, link, clickable = true }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (!clickable) return;
    e.stopPropagation();
    if (link) {
        navigate(link);
    } else if (author?.id) {
      navigate(`/author/${author.id}`);
    }
  };

  return (
    <div 
      className={cn(
        `flex items-center gap-1.5 text-xs text-muted-foreground transition-colors bg-muted/40 px-2 py-1 rounded-full ${
          clickable
            ? "cursor-pointer hover:text-foreground hover:bg-muted"
            : "cursor-default"
        }`,
        className
      )}
      onClick={handleClick}
      title={clickable ? t("authorBadge.goAuthor") : undefined}
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
      <span className="font-medium">{author?.displayName || t("authorBadge.unknownAuthor")}</span>
    </div>
  );
}

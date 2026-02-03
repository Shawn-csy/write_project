import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { AuthorBadge } from "../ui/AuthorBadge";

export function PublicScriptInfoOverlay({
  title,
  author, // { displayName, avatarUrl }
  tags = [],
  synopsis,
  date,
  contact,
  source,
  credit,
  authors,
  headerAuthor,
  customFields = [],
  coverUrl,
}) {
  const navigate = useNavigate();
  const hasTags = tags && tags.length > 0;
  
  const renderAuthorValue = () => {
      if (!headerAuthor) return null;
      if (author?.id) {
          return (
              <span 
                  className="cursor-pointer hover:underline hover:text-primary transition-colors"
                  onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/author/${author.id}`);
                  }}
                  title="前往作者頁面"
              >
                  {headerAuthor}
              </span>
          );
      }
      return headerAuthor;
  };

  const metaItems = [
    { label: "作者", value: renderAuthorValue() },
    { label: "日期", value: date },
    { label: "聯絡", value: contact },
    { label: "來源", value: source, isLink: true },
    { label: "Credit", value: credit },
    { label: "Authors", value: authors },
  ].filter((item) => item.value);
  const hasSynopsis = !!synopsis;
  const hasCustom = customFields && customFields.length > 0;
  const hasMeta = metaItems.length > 0;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      


      {/* 2. Main Title */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground drop-shadow-sm leading-tight">
        {title}
      </h1>

      {/* 3. Author Info */}
      {author && (
         <AuthorBadge 
          author={author} 
          className="bg-background/30 backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/10 shadow-sm hover:bg-background/40"
         />
      )}

      {/* 4. Synopsis */}
      {hasSynopsis && (
        <div className="max-w-2xl text-lg md:text-xl text-foreground/80 leading-relaxed font-serif italic opacity-90">
          {synopsis}
        </div>
      )}

      {/* 5. Tags Pill Row (Moved) */}
      {hasTags ? (
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {tags.map((tag, i) => (
            <Badge 
                key={i} 
                variant="secondary" 
                className="bg-background/40 hover:bg-background/60 backdrop-blur-sm text-foreground/90 border-transparent px-3 py-1 text-xs md:text-sm font-normal tracking-wide cursor-pointer hover:underline"
                onClick={() => navigate(`/?tag=${encodeURIComponent(tag)}`)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2 opacity-60 mt-2">
          <Badge variant="secondary" className="bg-background/30 text-foreground/60 border-transparent px-3 py-1 text-xs md:text-sm font-normal tracking-wide">
            尚未設定標籤
          </Badge>
        </div>
      )}

      {/* 5. Metadata Card */}
      {hasMeta && (
        <div className="w-full max-w-2xl mt-8">

          {hasMeta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {metaItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-background/60 backdrop-blur-md px-4 py-3 text-left shadow-sm">
                  <div className="text-[11px] text-muted-foreground">{item.label}</div>
                  {item.label === "聯絡" && typeof item.value === "object" ? (
                    <div className="text-sm text-foreground/90 space-y-1">
                      {Object.entries(item.value).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-2">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="break-words">{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : item.isLink ? (
                    <a
                      href={item.value}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      原始來源
                    </a>
                  ) : (
                    <div className="text-sm text-foreground/90 break-words">{item.value}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {hasCustom && (
            <div className="mt-4 rounded-xl border border-white/10 bg-background/60 backdrop-blur-md px-4 py-3 text-left shadow-sm">
              <div className="space-y-3">
                {customFields.map((field, idx) => (
                  <div key={`meta-${field.key}-${idx}`} className="text-sm">
                    <div className="font-medium text-foreground">{field.key}</div>
                    <div className="text-foreground/70 whitespace-pre-wrap">{field.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Decorative Divider */}
      <div className="w-16 h-1 rounded-full bg-primary/50 mt-8 mb-4" />
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { AuthorBadge } from "../ui/AuthorBadge";
import { LICENSES } from "../../constants/licenses";
import { HelpCircle, Check } from "lucide-react";

export function PublicScriptInfoOverlay({
  title,
  author, // { displayName, avatarUrl }
  organization,
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
  children,
  license,
  licenseUrl,
  licenseTerms = [],
  licenseTags = [],
  copyright
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
    { label: "版權", value: copyright },
  ].filter((item) => item.value);
  const hasSynopsis = !!synopsis;
  const hasCustom = customFields && customFields.length > 0;
  const hasMeta = metaItems.length > 0;

  // Resolve License Description
  const licenseObj = license ? LICENSES.find(l => l.short === license) : null;
  const licenseDescription = licenseObj?.description;

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      


      {/* 2. Main Title */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-foreground drop-shadow-sm leading-tight">
        {title}
      </h1>

      {/* 3. Author Info */}
      {/* 3. Author Info */}
      <div className="flex flex-wrap items-center justify-center gap-4">
          {organization && (
             <AuthorBadge 
              author={{
                    displayName: organization.name,
                    avatarUrl: organization.logoUrl
                }}
                link={`/org/${organization.id}`}
                className="bg-background/30 backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/10 shadow-sm hover:bg-background/40"
             />
          )}
          {author && (
             <AuthorBadge 
              author={author} 
              className="bg-background/30 backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/10 shadow-sm hover:bg-background/40"
             />
          )}
      </div>

      {/* 4. Synopsis */}
      {hasSynopsis && (
        <div className="max-w-2xl text-lg md:text-xl text-foreground/80 leading-relaxed font-serif italic opacity-90">
          {synopsis}
        </div>
      )}

      {/* 5. Tags & License */}
      {(hasTags || license) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 px-4">
          {/* License Tag */}
          {license && (
              licenseUrl ? (
                <a href={licenseUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                    <Badge variant="outline" className="px-3 py-1 text-sm bg-background/50 backdrop-blur-sm border-primary/30 text-primary">
                        {license}
                    </Badge>
                </a>
              ) : (
                <Badge variant="outline" className="px-3 py-1 text-sm bg-background/50 backdrop-blur-sm border-primary/30 text-primary">
                    {license}
                </Badge>
              )
          )}
          
          {/* Script Tags */}
          {tags.map((tag, i) => (
            <Badge 
              key={i} 
              variant="secondary" 
              className="px-3 py-1 text-sm bg-secondary/50 backdrop-blur-sm hover:bg-secondary/70 transition-colors cursor-pointer hover:underline"
              onClick={() => navigate(`/?tag=${encodeURIComponent(tag)}`)}
            >
              {tag}
            </Badge>
          ))}

          {/* License Description - Full Width */}
          {licenseDescription && (
             <div className="w-full text-center mt-3 animate-in fade-in zoom-in-95 duration-500">
                <span className="text-xs text-muted-foreground/80 bg-background/40 px-3 py-1.5 rounded-full backdrop-blur-sm inline-flex items-center gap-1.5 border border-white/5">
                    <HelpCircle className="w-3 h-3 opacity-70" />
                    {licenseDescription}
                </span>
             </div>
          )}

          {licenseTags && licenseTags.length > 0 && (
             <div className="w-full mt-2 flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-500">
                {licenseTags.map((tag, i) => (
                  <Badge
                    key={`${tag}-${i}`}
                    variant="secondary"
                    className="shrink-0 sm:shrink max-w-[70vw] sm:max-w-[220px] px-2.5 py-1 text-xs border"
                    title={tag}
                    style={{
                      backgroundColor: "var(--license-overlay-bg)",
                      borderColor: "var(--license-overlay-border)",
                      color: "var(--license-overlay-fg)",
                    }}
                  >
                    <span className="truncate">{tag}</span>
                  </Badge>
                ))}
             </div>
          )}

          {/* Additional License Terms */}
          {licenseTerms && licenseTerms.length > 0 && (
             <div className="w-full mt-2 flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 overflow-x-auto sm:overflow-visible pb-1 scrollbar-hide animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
                {licenseTerms.map((term, i) => (
                    <span key={i} className="shrink-0 sm:shrink max-w-[75vw] sm:max-w-[260px] text-xs px-3 py-1 rounded-md backdrop-blur-sm inline-flex items-center border" title={term} style={{
                        backgroundColor: "var(--license-term-bg)",
                        borderColor: "var(--license-term-border)",
                        color: "var(--license-term-fg)",
                    }}>
                        <Check className="w-3 h-3 mr-1.5" />
                        <span className="truncate">{term}</span>
                    </span>
                ))}
             </div>
          )}
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
                {customFields.map((field, idx) => {
                  if (field.key.startsWith('_sep_')) {
                      return (
                          <div key={idx} className="flex items-center gap-2 py-1 opacity-50">
                              <div className="h-px bg-foreground/20 flex-1"></div>
                              <span className="text-[10px] uppercase tracking-widest text-foreground/50 font-mono">
                                  {field.value === '---' ? 'SECTION' : field.value}
                              </span>
                              <div className="h-px bg-foreground/20 flex-1"></div>
                          </div>
                      );
                  }
                  return (
                    <div key={`meta-${field.key}-${idx}`} className="text-sm">
                      <div className="font-medium text-foreground">{field.key}</div>
                        {field.customRender ? (
                            field.customRender
                        ) : field.isLink || (field.key === '來源' || field.key === 'Source') ? (
                           <a href={field.linkUrl || field.value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all block">
                               {field.value}
                           </a>
                        ) : (
                           <div className="text-foreground/70 whitespace-pre-wrap">{field.value}</div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      


      {/* 6. Children (e.g. Legend) */}
      {children && (
        <div className="w-full max-w-2xl mt-4">
             {children}
        </div>
      )}
      
      {/* Decorative Divider */}
      <div className="w-16 h-1 rounded-full bg-primary/50 mt-8 mb-4" />
    </div>
  );
}

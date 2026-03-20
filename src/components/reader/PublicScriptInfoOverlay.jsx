import React from "react";
import { AuthorBadge } from "../ui/AuthorBadge";
import { Badge } from "../ui/badge";

export function PublicScriptInfoOverlay({
  title,
  synopsis,
  coverUrl,
  author = null,
  organization = null,
  prefaceItems = [],
  demoLinks = [],
  commercialUse = "",
  derivativeUse = "",
  notifyOnModify = "",
}) {
  const [coverLoadFailed, setCoverLoadFailed] = React.useState(false);
  const [prefaceExpanded, setPrefaceExpanded] = React.useState(false);
  const hasCover = Boolean(String(coverUrl || "").trim()) && !coverLoadFailed;
  const placeholderTheme = React.useMemo(() => {
    const seed = String(title || "Script").trim() || "Script";
    const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const hue = hash % 360;
    return {
      hash,
      bgA: `hsl(${hue} 24% 66%)`,
      bgB: `hsl(${(hue + 32) % 360} 20% 58%)`,
      bgC: `hsl(${(hue + 76) % 360} 18% 50%)`,
      accent: `hsl(${(hue + 150) % 360} 24% 82%)`,
    };
  }, [title]);
  const itemById = React.useMemo(() => {
    const map = new Map();
    (prefaceItems || []).forEach((item) => {
      const id = String(item?.id || "").toLowerCase();
      const value = String(item?.value || "").trim();
      if (!id || !value) return;
      if (!map.has(id)) map.set(id, { ...item, value });
    });
    return map;
  }, [prefaceItems]);

  const parseMultiTemplate = (rawValue) => {
    try {
      const parsed = JSON.parse(String(rawValue || ""));
      if (parsed?.mode !== "multi" || !Array.isArray(parsed?.items)) return null;
      return parsed.items.map((entry) => ({
        name: String(entry?.name || "").trim(),
        text: String(entry?.text || "").trim(),
      }));
    } catch {
      return null;
    }
  };
  const parseChapterTemplate = (rawValue) => {
    try {
      const parsed = JSON.parse(String(rawValue || ""));
      if (parsed?.mode !== "chapter_multi" || !Array.isArray(parsed?.items)) return [];
      return parsed.items.map((entry, idx) => ({
        chapter: String(entry?.chapter || `第${idx + 1}章`).trim() || `第${idx + 1}章`,
        environment: String(entry?.environment || "").trim(),
        situation: String(entry?.situation || "").trim(),
      }));
    } catch {
      return [];
    }
  };

  const roleSettingItem = itemById.get("rolesetting");
  const performanceItem = itemById.get("performanceinstruction");
  const chapterSettingsItem = itemById.get("chaptersettings");
  const roleMulti = parseMultiTemplate(roleSettingItem?.value);
  const performanceMulti = parseMultiTemplate(performanceItem?.value);
  const chapterMulti = parseChapterTemplate(chapterSettingsItem?.value);
  const hasCharacterTemplate = Array.isArray(roleMulti) || Array.isArray(performanceMulti);
  const isNonLinkAuthorId = (id) => {
    const value = String(id || "").trim();
    return value === "override-author" || value === "header-author-fallback";
  };
  const isAuthorClickable = Boolean(author?.id) && !isNonLinkAuthorId(author?.id);

  const characterTemplateItems = React.useMemo(() => {
    if (!hasCharacterTemplate) return [];
    const roleList = Array.isArray(roleMulti) ? roleMulti : [];
    const performanceList = Array.isArray(performanceMulti) ? performanceMulti : [];
    const maxLen = Math.max(roleList.length, performanceList.length, 1);
    const roleFallback = !Array.isArray(roleMulti) ? String(roleSettingItem?.value || "").trim() : "";
    const performanceFallback = !Array.isArray(performanceMulti) ? String(performanceItem?.value || "").trim() : "";
    return Array.from({ length: maxLen }).map((_, idx) => ({
      name: roleList[idx]?.name || performanceList[idx]?.name || `角色${idx + 1}`,
      roleText: roleList[idx]?.text || roleFallback || "—",
      performanceText: performanceList[idx]?.text || performanceFallback || "—",
    }));
  }, [hasCharacterTemplate, roleMulti, performanceMulti, roleSettingItem?.value, performanceItem?.value]);

  const renderCharacterTemplate = () => {
    if (!hasCharacterTemplate || characterTemplateItems.length === 0) return null;
    return (
      <div key="character-template">
        <div className="text-xs font-semibold text-muted-foreground">角色設定</div>
        <div className="mt-1 grid gap-2">
          {characterTemplateItems.map((entry, idx) => (
            <div key={`char-${idx}`} className="rounded-md border border-primary/25 bg-background/75 px-3 py-2.5 shadow-sm">
              <div className="mb-1 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                角色 {idx + 1}
              </div>
              <div className="text-base font-bold leading-tight text-foreground md:text-lg">{entry.name}</div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">設定</div>
              <div className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">{entry.roleText}</div>
              <div className="mt-2 text-xs font-medium text-muted-foreground">演繹</div>
              <div className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">{entry.performanceText}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderItem = (id) => {
    const item = itemById.get(id);
    if (!item) return null;

    if (id === "rolesetting" && hasCharacterTemplate) {
      return renderCharacterTemplate();
    }
    if (id === "performanceinstruction" && hasCharacterTemplate) {
      return null;
    }
    if (id === "chaptersettings" && chapterMulti.length > 0) {
      return (
        <div key="chapter-settings">
          <div className="text-xs font-semibold text-muted-foreground">章節</div>
          <div className="mt-1 grid gap-2">
            {chapterMulti.map((entry, idx) => (
              <div key={`chapter-${idx}`} className="rounded-md border border-border/70 bg-background/70 px-3 py-2.5 shadow-sm text-left">
                <div className="text-sm font-semibold text-foreground">{entry.chapter}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">環境</div>
                <div className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">{entry.environment || "—"}</div>
                <div className="mt-1 text-xs font-medium text-muted-foreground">狀況</div>
                <div className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap">{entry.situation || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={id}>
        <div className="text-xs font-semibold text-muted-foreground">{item.title}</div>
        <div className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap line-clamp-3">{item.value}</div>
      </div>
    );
  };
  const compactIds = ["outline", "openingintro", "chaptersettings"];
  const expandedTopIds = ["outline", "rolesetting", "backgroundinfo", "performanceinstruction"];
  const expandedBottomIds = ["openingintro", "chaptersettings"];
  const compactItems = compactIds.map(renderItem).filter(Boolean);
  const expandedTopItems = expandedTopIds.map(renderItem).filter(Boolean);
  const expandedBottomItems = expandedBottomIds.map(renderItem).filter(Boolean);
  const hasPrefaceItems = compactItems.length > 0 || expandedTopItems.length > 0 || expandedBottomItems.length > 0;
  const hasDemoLinks = Array.isArray(demoLinks) && demoLinks.length > 0;
  const demoLinksBlock = hasDemoLinks ? (
    <div key="demo-links">
      <div className="text-xs font-semibold text-muted-foreground">試聽範例</div>
      <div className="mt-1 space-y-2">
        {demoLinks.map((item, idx) => (
          <div key={item.id || `preface-demo-link-${idx + 1}`} className="rounded-md border border-border/60 bg-background/75 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-muted"
              >
                {item.name || `試聽連結 ${idx + 1}`}
              </a>
              {item.cast && (
                <span className="text-xs text-muted-foreground">聲演：{item.cast}</span>
              )}
            </div>
            {item.description && (
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground/80">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const usageBadges = React.useMemo(() => {
    const toneStyle = {
      positive: {
        borderColor: "color-mix(in srgb, var(--marker-color-green) 42%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--marker-color-green) 14%, transparent)",
        color: "var(--marker-color-green)",
      },
      negative: {
        borderColor: "color-mix(in srgb, var(--marker-color-red) 44%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--marker-color-red) 14%, transparent)",
        color: "var(--marker-color-red)",
      },
      caution: {
        borderColor: "color-mix(in srgb, var(--marker-color-amber) 46%, transparent)",
        backgroundColor: "color-mix(in srgb, var(--marker-color-amber) 16%, transparent)",
        color: "var(--marker-color-amber)",
      },
    };
    const normalize = (value) => String(value || "").trim().toLowerCase();
    const commercial = normalize(commercialUse);
    const derivative = normalize(derivativeUse);
    const notify = normalize(notifyOnModify);

    const items = [];
    if (commercial) {
      items.push({
        key: "commercial",
        label: "商業使用",
        value: commercial === "allow" ? "可" : "不可",
        style: commercial === "allow" ? toneStyle.positive : toneStyle.negative,
      });
    }
    if (derivative) {
      const isAllow = derivative === "allow";
      const isDisallow = derivative === "disallow";
      items.push({
        key: "derivative",
        label: "改作許可",
        value: isAllow ? "可" : isDisallow ? "不可" : "需同意",
        style: isAllow
          ? toneStyle.positive
          : isDisallow
            ? toneStyle.negative
            : toneStyle.caution,
      });
    }
    if (notify) {
      const required = notify === "required";
      items.push({
        key: "notify",
        label: "修改須通知作者",
        value: required ? "需要" : "不需要",
        style: required ? toneStyle.positive : toneStyle.negative,
      });
    }
    return items;
  }, [commercialUse, derivativeUse, notifyOnModify]);

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center space-y-6 px-6 py-12 text-center md:py-20">
      <div className={`w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 shadow-xl backdrop-blur-sm ${hasCover ? "bg-transparent" : "bg-background/40"}`}>
        {hasCover ? (
          <img
            src={coverUrl}
            alt={title || "cover"}
            className="max-h-[460px] w-full object-cover"
            loading="eager"
            onError={() => setCoverLoadFailed(true)}
          />
        ) : (
          <div
            className="relative flex min-h-[260px] w-full items-center justify-center px-6 py-10 text-center md:min-h-[320px]"
            style={{
              background: `linear-gradient(130deg, ${placeholderTheme.bgA}, ${placeholderTheme.bgB} 48%, ${placeholderTheme.bgC})`,
            }}
          >
            {placeholderTheme.hash % 3 === 0 && (
              <>
                <div className="absolute -left-8 -top-10 h-40 w-40 rounded-full border border-white/35 bg-white/10" />
                <div className="absolute right-8 top-12 h-24 w-24 rotate-12 border border-white/40 bg-white/10" />
                <div className="absolute bottom-10 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full border border-white/30 bg-black/10" />
              </>
            )}
            {placeholderTheme.hash % 3 === 1 && (
              <>
                <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(0deg, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.24) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
                <div className="absolute -right-10 top-8 h-44 w-44 rotate-45 border border-white/40 bg-white/10" />
                <div className="absolute left-10 bottom-8 h-20 w-20 rounded-full border border-white/35 bg-black/10" />
              </>
            )}
            {placeholderTheme.hash % 3 === 2 && (
              <>
                <div className="absolute -left-12 bottom-6 h-52 w-52 rounded-full border border-white/35 bg-white/10" />
                <div className="absolute right-4 top-6 h-28 w-56 -skew-x-12 border border-white/35 bg-black/10" />
                <div className="absolute bottom-3 right-10 h-28 w-28 rotate-12 rounded-2xl border border-white/30 bg-white/10" />
              </>
            )}
            <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 45%)" }} />
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 85%, rgba(0,0,0,0.35), transparent 40%)" }} />
            <div className="relative max-w-[85%] rounded-xl border border-white/25 bg-black/25 px-5 py-4 backdrop-blur-sm shadow-lg">
              <div className="absolute -right-6 -top-6 h-12 w-12 rounded-full border border-white/40" style={{ backgroundColor: placeholderTheme.accent }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">No Cover</div>
              <div className="mt-2 line-clamp-3 text-2xl font-extrabold leading-tight text-primary-foreground drop-shadow md:text-3xl">
                {title || "Untitled"}
              </div>
            </div>
          </div>
        )}
      </div>

      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground drop-shadow-sm md:text-6xl lg:text-7xl">
        {title}
      </h1>

      {usageBadges.length > 0 && (
        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {usageBadges.map((item) => (
            <Badge key={item.key} variant="outline" className="px-2.5 py-1 text-xs font-semibold" style={item.style}>
              {item.label}：{item.value}
            </Badge>
          ))}
        </div>
      )}

      {synopsis && (
        <div className="max-w-2xl font-serif text-lg leading-relaxed text-foreground/80 opacity-90 md:text-xl italic">
          {synopsis}
        </div>
      )}

      {(organization || author) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {organization && (
            <AuthorBadge
              author={{
                displayName: organization.name,
                avatarUrl: organization.logoUrl,
              }}
              link={organization.id ? `/org/${organization.id}` : undefined}
              className="bg-background/30 backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/10 shadow-sm hover:bg-background/40"
            />
          )}
          {author && (
            <AuthorBadge
              author={author}
              clickable={isAuthorClickable}
              className={`bg-background/30 backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/10 shadow-sm ${
                isAuthorClickable ? "hover:bg-background/40" : ""
              }`}
            />
          )}
        </div>
      )}

      {(hasPrefaceItems || hasDemoLinks) && (
        <section className="w-full max-w-2xl rounded-xl border border-border/60 bg-background/55 px-4 py-3 text-left backdrop-blur-sm">
          {!prefaceExpanded && (
            <div className="space-y-2">
              {compactItems}
              {compactItems.length === 0 && hasDemoLinks && (
                <div className="text-xs text-muted-foreground">包含試聽範例內容，展開後可查看。</div>
              )}
            </div>
          )}
          {prefaceExpanded && (
            <>
              <div className="space-y-2">{expandedTopItems}</div>
              {expandedTopItems.length > 0 && (expandedBottomItems.length > 0 || demoLinksBlock) && (
                <div className="my-3 h-px w-full bg-border/60" />
              )}
              <div className="space-y-2">{expandedBottomItems}</div>
              {demoLinksBlock && (
                <>
                  {expandedBottomItems.length > 0 && <div className="my-3 h-px w-full bg-border/60" />}
                  {demoLinksBlock}
                </>
              )}
            </>
          )}
          {(expandedTopItems.length + expandedBottomItems.length + (demoLinksBlock ? 1 : 0)) > compactItems.length && (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-primary hover:underline"
              onClick={() => setPrefaceExpanded((prev) => !prev)}
            >
              {prefaceExpanded ? "收起前置資訊" : "展開完整前置資訊"}
            </button>
          )}
        </section>
      )}

    </div>
  );
}

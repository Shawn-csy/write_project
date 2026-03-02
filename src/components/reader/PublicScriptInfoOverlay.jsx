import React from "react";
import { AuthorBadge } from "../ui/AuthorBadge";

export function PublicScriptInfoOverlay({
  title,
  synopsis,
  coverUrl,
  author = null,
  organization = null,
  prefaceItems = [],
}) {
  const [coverLoadFailed, setCoverLoadFailed] = React.useState(false);
  const [prefaceExpanded, setPrefaceExpanded] = React.useState(false);
  const hasCover = Boolean(String(coverUrl || "").trim()) && !coverLoadFailed;
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

  const roleSettingItem = itemById.get("rolesetting");
  const performanceItem = itemById.get("performanceinstruction");
  const roleMulti = parseMultiTemplate(roleSettingItem?.value);
  const performanceMulti = parseMultiTemplate(performanceItem?.value);
  const hasCharacterTemplate = Array.isArray(roleMulti) || Array.isArray(performanceMulti);

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

    return (
      <div key={id}>
        <div className="text-xs font-semibold text-muted-foreground">{item.title}</div>
        <div className="text-sm leading-6 text-foreground/90 whitespace-pre-wrap line-clamp-3">{item.value}</div>
      </div>
    );
  };
  const compactIds = ["outline", "openingintro", "environmentinfo", "situationinfo"];
  const expandedTopIds = ["outline", "rolesetting", "backgroundinfo", "performanceinstruction"];
  const expandedBottomIds = ["openingintro", "environmentinfo", "situationinfo"];
  const compactItems = compactIds.map(renderItem).filter(Boolean);
  const expandedTopItems = expandedTopIds.map(renderItem).filter(Boolean);
  const expandedBottomItems = expandedBottomIds.map(renderItem).filter(Boolean);
  const hasPrefaceItems = compactItems.length > 0 || expandedTopItems.length > 0 || expandedBottomItems.length > 0;

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center space-y-6 px-6 py-12 text-center md:py-20">
      {hasCover && (
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-background/40 shadow-xl backdrop-blur-sm">
          <img
            src={coverUrl}
            alt={title || "cover"}
            className="max-h-[460px] w-full object-cover"
            loading="eager"
            onError={() => setCoverLoadFailed(true)}
          />
        </div>
      )}

      <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-foreground drop-shadow-sm md:text-6xl lg:text-7xl">
        {title}
      </h1>

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
              className="bg-background/30 backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/10 shadow-sm hover:bg-background/40"
            />
          )}
        </div>
      )}

      {hasPrefaceItems && (
        <section className="w-full max-w-2xl rounded-xl border border-border/60 bg-background/55 px-4 py-3 text-left backdrop-blur-sm">
          {!prefaceExpanded && (
            <div className="space-y-2">{compactItems}</div>
          )}
          {prefaceExpanded && (
            <>
              <div className="space-y-2">{expandedTopItems}</div>
              {expandedTopItems.length > 0 && expandedBottomItems.length > 0 && (
                <div className="my-3 h-px w-full bg-border/60" />
              )}
              <div className="space-y-2">{expandedBottomItems}</div>
            </>
          )}
          {(expandedTopItems.length + expandedBottomItems.length) > compactItems.length && (
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

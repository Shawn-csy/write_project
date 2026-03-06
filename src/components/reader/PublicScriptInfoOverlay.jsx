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

  const usageBadges = React.useMemo(() => {
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
        className: commercial === "allow"
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
      });
    }
    if (derivative) {
      const isAllow = derivative === "allow";
      const isDisallow = derivative === "disallow";
      items.push({
        key: "derivative",
        label: "改作許可",
        value: isAllow ? "可" : isDisallow ? "不可" : "需同意",
        className: isAllow
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : isDisallow
            ? "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
            : "border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300",
      });
    }
    if (notify) {
      const required = notify === "required";
      items.push({
        key: "notify",
        label: "修改須通知作者",
        value: required ? "需要" : "不需要",
        className: required
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300",
      });
    }
    return items;
  }, [commercialUse, derivativeUse, notifyOnModify]);

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center space-y-6 px-6 py-12 text-center md:py-20">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-background/40 shadow-xl backdrop-blur-sm">
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
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">No Cover</div>
              <div className="mt-2 line-clamp-3 text-2xl font-extrabold leading-tight text-white drop-shadow md:text-3xl">
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
            <Badge key={item.key} variant="outline" className={`px-2.5 py-1 text-xs font-semibold ${item.className}`}>
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

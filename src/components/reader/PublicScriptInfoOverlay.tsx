import React from "react";
import { Heart, Eye } from "lucide-react";
import { AuthorBadge } from "../ui/AuthorBadge";
import { Badge } from "../ui/badge";

interface PrefaceItem {
  id?: string;
  title?: string;
  value?: string;
  [key: string]: unknown;
}

interface DemoLinkItem {
  id?: string;
  name?: string;
  url: string;
  cast?: string;
  description?: string;
}

interface AuthorInfo {
  id?: string;
  displayName?: string;
  name?: string;
}

interface OrganizationInfo {
  id?: string;
  name?: string;
  logoUrl?: string;
}

interface PublicScriptInfoOverlayProps {
  title?: string;
  synopsis?: string;
  coverUrl?: string;
  author?: AuthorInfo | null;
  organization?: OrganizationInfo | null;
  license?: string;
  tags?: string[];
  targetAudience?: string;
  contentRating?: string;
  customFields?: Array<{ key?: string; value?: string }>;
  prefaceItems?: PrefaceItem[];
  demoLinks?: DemoLinkItem[];
  commercialUse?: string;
  derivativeUse?: string;
  notifyOnModify?: string;
  licenseSpecialTerms?: string[];
  views?: number;
  likes?: number;
  isLiked?: boolean;
  onLike?: () => void;
  durationMinutes?: number;
  dialogueChars?: number;
}

function parseMultiTemplate(rawValue: string | undefined) {
  try {
    const parsed = JSON.parse(String(rawValue || "")) as { mode?: string; items?: Array<{ name?: unknown; text?: unknown }> };
    if (parsed?.mode !== "multi" || !Array.isArray(parsed?.items)) return null;
    return parsed.items.map((entry: { name?: unknown; text?: unknown }) => ({
      name: String(entry?.name || "").trim(),
      text: String(entry?.text || "").trim(),
    }));
  } catch {
    return null;
  }
}

function parseChapterTemplate(rawValue: string | undefined) {
  try {
    const parsed = JSON.parse(String(rawValue || "")) as { mode?: string; items?: Array<{ chapter?: unknown; environment?: unknown; situation?: unknown }> };
    if (parsed?.mode !== "chapter_multi" || !Array.isArray(parsed?.items)) return [];
    return parsed.items.map((entry: { chapter?: unknown; environment?: unknown; situation?: unknown }, idx: number) => ({
      chapter: String(entry?.chapter || `第${idx + 1}章`).trim() || `第${idx + 1}章`,
      environment: String(entry?.environment || "").trim(),
      situation: String(entry?.situation || "").trim(),
    }));
  } catch {
    return [];
  }
}

export function PublicScriptInfoOverlay({
  title,
  synopsis,
  coverUrl,
  author = null,
  organization = null,
  license = "",
  tags = [],
  targetAudience = "",
  contentRating = "",
  customFields = [],
  prefaceItems = [],
  demoLinks = [],
  commercialUse = "",
  derivativeUse = "",
  notifyOnModify = "",
  licenseSpecialTerms = [],
  views,
  likes,
  isLiked = false,
  onLike,
  durationMinutes,
  dialogueChars,
}: PublicScriptInfoOverlayProps) {
  const [coverLoadFailed, setCoverLoadFailed] = React.useState(false);
  const [prefaceExpanded, setPrefaceExpanded] = React.useState(false);
  const hasCover = Boolean(String(coverUrl || "").trim()) && !coverLoadFailed;
  const itemById = React.useMemo(() => {
    const map = new Map<string, PrefaceItem & { value: string }>();
    (prefaceItems || []).forEach((item) => {
      const id = String(item?.id || "").toLowerCase();
      const value = String(item?.value || "").trim();
      if (!id || !value) return;
      if (!map.has(id)) map.set(id, { ...item, value });
    });
    return map;
  }, [prefaceItems]);

  const roleSettingItem = itemById.get("rolesetting");
  const performanceItem = itemById.get("performanceinstruction");
  const chapterSettingsItem = itemById.get("chaptersettings");
  const roleMulti = parseMultiTemplate(roleSettingItem?.value);
  const performanceMulti = parseMultiTemplate(performanceItem?.value);
  const chapterMulti = parseChapterTemplate(chapterSettingsItem?.value);
  const hasCharacterTemplate = Array.isArray(roleMulti) || Array.isArray(performanceMulti);
  const isNonLinkAuthorId = (id: string | undefined) => {
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
              <div className="mb-1 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold tracking-wide text-primary">
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

  const renderItem = (id: string) => {
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
            {chapterMulti.map((entry: { chapter: string; environment: string; situation: string }, idx: number) => (
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
  const compactIds = ["openingintro", "chaptersettings"];
  const expandedTopIds = ["outline", "rolesetting", "backgroundinfo", "performanceinstruction"];
  const expandedBottomIds = ["openingintro", "chaptersettings"];
  const compactItems = compactIds.map(renderItem).filter(Boolean);
  const expandedTopItems = expandedTopIds.map(renderItem).filter(Boolean);
  const expandedBottomItems = expandedBottomIds.map(renderItem).filter(Boolean);
  const hasPrefaceItems = compactItems.length > 0 || expandedTopItems.length > 0 || expandedBottomItems.length > 0;
  const hasDemoLinks = Array.isArray(demoLinks) && demoLinks.length > 0;
  const hasSpecialTerms = Array.isArray(licenseSpecialTerms) && licenseSpecialTerms.length > 0;
  const normalizedTags = React.useMemo(
    () => (Array.isArray(tags) ? tags.map((tag) => String(tag || "").trim()).filter(Boolean) : []),
    [tags]
  );
  const normalizedCustomFields = React.useMemo(
    () => (Array.isArray(customFields) ? customFields
      .map((field) => ({
        key: String(field?.key || "").trim(),
        value: String(field?.value || "").trim(),
      }))
      .filter((field) => field.key && field.value) : []),
    [customFields]
  );
  const hasMetaSummary = Boolean(String(targetAudience || "").trim())
    || Boolean(String(contentRating || "").trim())
    || Boolean(String(license || "").trim())
    || normalizedTags.length > 0
    || normalizedCustomFields.length > 0;
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
    const toneClass = {
      positive: "border-emerald-500/55 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      negative: "border-rose-500/55 bg-rose-500/15 text-rose-700 dark:text-rose-300",
      caution: "border-amber-500/55 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    };
    const normalize = (value: unknown) => String(value || "").trim().toLowerCase();
    const commercial = normalize(commercialUse);
    const derivative = normalize(derivativeUse);
    const notify = normalize(notifyOnModify);

    const items: Array<{
      key: string;
      label: string;
      value: string;
      toneClass: string;
    }> = [];
    if (commercial) {
      items.push({
        key: "commercial",
        label: "商業使用",
        value: commercial === "allow" ? "可" : "不可",
        toneClass: commercial === "allow" ? toneClass.positive : toneClass.negative,
      });
    }
    if (derivative) {
      const isAllow = derivative === "allow";
      const isDisallow = derivative === "disallow";
      items.push({
        key: "derivative",
        label: "改作許可",
        value: isAllow ? "可" : isDisallow ? "不可" : "需同意",
        toneClass: isAllow
          ? toneClass.positive
          : isDisallow
            ? toneClass.negative
            : toneClass.caution,
      });
    }
    if (notify) {
      const required = notify === "required";
      items.push({
        key: "notify",
        label: "修改須通知作者",
        value: required ? "需要" : "不需要",
        toneClass: required ? toneClass.positive : toneClass.negative,
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
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_80%_85%,rgba(0,0,0,0.35),transparent_40%)]" />
            <div className="absolute -left-8 -top-10 h-40 w-40 rounded-full border border-white/35 bg-white/10" />
            <div className="absolute right-8 top-12 h-24 w-24 rotate-12 border border-white/40 bg-white/10" />
            <div className="absolute bottom-10 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full border border-white/30 bg-black/10" />
            <div className="relative max-w-[85%] rounded-xl border border-white/25 bg-black/25 px-5 py-4 backdrop-blur-sm shadow-lg">
              <div className="absolute -right-6 -top-6 h-12 w-12 rounded-full border border-white/40 bg-amber-200/80" />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">No Cover</div>
            </div>
          </div>
        )}
      </div>

      <h1
        className="font-serif font-bold leading-tight tracking-tight text-foreground drop-shadow-sm"
        style={{ fontSize: "clamp(1.5rem, 5vw + 0.5rem, 4.5rem)" }}
      >
        {title}
      </h1>

      {usageBadges.length > 0 && (
        <div className="flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {usageBadges.map((item) => (
            <Badge key={item.key} variant="outline" className={`px-2.5 py-1 text-xs font-semibold ${item.toneClass}`}>
              {item.label}：{item.value}
            </Badge>
          ))}
        </div>
      )}

      {synopsis && (
        <div className="max-w-2xl font-serif text-lg leading-relaxed text-foreground/80 md:text-xl italic">
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

      {(typeof views === "number" || typeof likes === "number" || onLike || typeof durationMinutes === "number" || typeof dialogueChars === "number") && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          {typeof durationMinutes === "number" && durationMinutes > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              ⏱ {durationMinutes < 1 ? "< 1 分鐘" : `約 ${Math.round(durationMinutes)} 分鐘`}
            </span>
          )}
          {typeof dialogueChars === "number" && dialogueChars > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              📝 {dialogueChars.toLocaleString()} 字
            </span>
          )}
          {typeof views === "number" && (
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {views.toLocaleString()}
            </span>
          )}
          <button
            type="button"
            onClick={onLike}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 transition-colors ${
              isLiked
                ? "text-rose-500 hover:text-rose-400"
                : "hover:text-rose-400"
            }`}
            aria-label={isLiked ? "取消喜歡" : "喜歡"}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} />
            {typeof likes === "number" && likes.toLocaleString()}
          </button>
        </div>
      )}

      {hasMetaSummary && (
        <section className="w-full max-w-2xl rounded-xl border border-border/60 bg-background/55 px-4 py-3 text-left backdrop-blur-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border/60 bg-background/70 px-3 py-2">
              <div className="text-xs text-muted-foreground">觀眾取向</div>
              <div className="text-sm font-medium text-foreground">{String(targetAudience || "").trim() || "未設定"}</div>
            </div>
            <div className="rounded-md border border-border/60 bg-background/70 px-3 py-2">
              <div className="text-xs text-muted-foreground">內容分級</div>
              <div className="text-sm font-medium text-foreground">{String(contentRating || "").trim() || "未設定"}</div>
            </div>
          </div>
          {String(license || "").trim() && (
            <div className="mt-2 rounded-md border border-border/60 bg-background/70 px-3 py-2">
              <div className="text-xs text-muted-foreground">授權名稱</div>
              <div className="text-sm font-medium text-foreground whitespace-pre-wrap">{String(license || "").trim()}</div>
            </div>
          )}
          {normalizedTags.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-muted-foreground">標籤</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {normalizedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          {normalizedCustomFields.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {normalizedCustomFields.map((field, idx) => (
                <div key={`${field.key}-${idx}`} className="text-sm leading-6 text-foreground/90">
                  <span className="font-medium">{field.key}：</span>
                  <span className="whitespace-pre-wrap">{field.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(hasPrefaceItems || hasDemoLinks || hasSpecialTerms) && (
        <section className="w-full max-w-2xl rounded-xl border border-border/60 bg-background/55 px-4 py-3 text-left backdrop-blur-sm">
          {hasSpecialTerms && (
            <>
              <div className="text-xs font-semibold text-muted-foreground">附加條款</div>
              <ul className="mt-1 space-y-1">
                {licenseSpecialTerms.map((term, idx) => (
                  <li key={idx} className="text-sm leading-6 text-foreground/90">{term}</li>
                ))}
              </ul>
              {(hasPrefaceItems || hasDemoLinks) && <div className="my-3 h-px w-full bg-border/60" />}
            </>
          )}
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
              className="mt-2 block w-full py-2 text-xs font-medium text-primary hover:underline"
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

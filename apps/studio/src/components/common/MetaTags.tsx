import { useHeadTags, type HeadTag } from '@/lib/useHeadTags';

const SITE_BRAND_NAME = "泛用型產品作坊";

interface ActiveFileLike {
  name?: string;
}

interface MetaTagsProps {
  titleName?: string;
  titleSummary?: string;
  titleNote?: string;
  activeFile?: string | ActiveFileLike | null;
  currentSceneId?: string;
  indexable?: boolean;
  canonicalPath?: string;
  forceArticle?: boolean;
}

export function MetaTags({
  titleName,
  titleSummary,
  titleNote,
  activeFile,
  currentSceneId,
  indexable = true,
  canonicalPath = "",
  forceArticle = false,
}: MetaTagsProps) {
  const cleanText = (text = "") => text.replace(/\s+/g, " ").trim();
  
  const summary =
    cleanText(titleSummary) ||
    (!forceArticle ? cleanText(titleNote) : "") ||
    (titleName ? `${titleName} 劇本摘要` : "");
    
  const description =
    summary.slice(0, 200) ||
    "泛用型產品作坊提供免費台本線上閱讀、發布與分享，探索公開作品、配音台本與作者頁面。";
    
  const shareTitle = titleName || (typeof activeFile === 'string' ? activeFile : activeFile?.name) || `免費台本 · 劇本線上閱讀｜${SITE_BRAND_NAME}`;
  const fullTitle = titleName ? `${titleName}｜${SITE_BRAND_NAME}` : shareTitle;
  const rawUrl = typeof window !== "undefined" ? window.location.href : "";
  const resolvedCanonicalUrl = (() => {
    if (typeof window === "undefined") return "";
    try {
      const origin = window.location.origin;
      if (canonicalPath) {
        if (/^https?:\/\//i.test(canonicalPath)) return canonicalPath;
        return `${origin}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
      }
      const current = new URL(window.location.href);
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach((key) => {
        current.searchParams.delete(key);
      });
      return current.toString();
    } catch {
      return rawUrl;
    }
  })();
  const shareUrl = resolvedCanonicalUrl || rawUrl;
  const robotsValue = indexable
    ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    : "noindex,nofollow,noarchive";
  const isArticle = forceArticle || Boolean(activeFile);

  const tags: HeadTag[] = [
    { kind: 'meta', attr: 'name', key: 'description', content: description },
    { kind: 'meta', attr: 'name', key: 'robots', content: robotsValue },
    { kind: 'link', rel: 'canonical', href: shareUrl },

    // Open Graph
    { kind: 'meta', attr: 'property', key: 'og:title', content: shareTitle },
    { kind: 'meta', attr: 'property', key: 'og:description', content: description },
    { kind: 'meta', attr: 'property', key: 'og:url', content: shareUrl },
    { kind: 'meta', attr: 'property', key: 'og:type', content: isArticle ? 'article' : 'website' },
    { kind: 'meta', attr: 'property', key: 'og:site_name', content: SITE_BRAND_NAME },
    { kind: 'meta', attr: 'property', key: 'og:locale', content: 'zh_TW' },

    // Twitter Card
    { kind: 'meta', attr: 'name', key: 'twitter:card', content: 'summary_large_image' },
    { kind: 'meta', attr: 'name', key: 'twitter:title', content: shareTitle },
    { kind: 'meta', attr: 'name', key: 'twitter:description', content: description },
  ];

  useHeadTags(fullTitle, tags);

  return null;
}

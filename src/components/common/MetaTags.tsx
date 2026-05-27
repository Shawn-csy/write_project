import React from 'react';
import { Helmet } from 'react-helmet-async';

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
    "免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。";
    
  const shareTitle = titleName || (typeof activeFile === 'string' ? activeFile : activeFile?.name) || "免費台本 · 劇本線上閱讀｜Screenplay Reader";
  const fullTitle = titleName ? `${titleName}｜Screenplay Reader` : shareTitle;
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

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsValue} />
      <link rel="canonical" href={shareUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={shareTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={shareUrl} />
      <meta property="og:type" content={isArticle ? "article" : "website"} />
      <meta property="og:site_name" content="Screenplay Reader" />
      <meta property="og:locale" content="zh_TW" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={shareTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}

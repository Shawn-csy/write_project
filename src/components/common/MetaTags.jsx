import React from 'react';
import { Helmet } from 'react-helmet-async';

export function MetaTags({
  titleName,
  titleSummary,
  titleNote,
  activeFile,
  currentSceneId,
  indexable = true,
  canonicalPath = "",
  forceArticle = false,
}) {
  const cleanText = (text = "") => text.replace(/\s+/g, " ").trim();
  
  const summary =
    cleanText(titleSummary) ||
    cleanText(titleNote) ||
    (titleName ? `${titleName} 劇本摘要` : "");
    
  const description =
    summary.slice(0, 200) ||
    "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。";
    
  const shareTitle = titleName || (typeof activeFile === 'string' ? activeFile : activeFile?.name) || "Screenplay Reader";
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

import React from 'react';
import { Helmet } from 'react-helmet-async';

export function MetaTags({ titleName, titleSummary, titleNote, activeFile, currentSceneId }) {
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
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const isArticle = Boolean(activeFile);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:title" content={shareTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={shareUrl} />
      <meta property="og:type" content={isArticle ? "article" : "website"} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={shareTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}

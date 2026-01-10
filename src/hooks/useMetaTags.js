import { useEffect } from "react";

export function useMetaTags({ titleName, titleSummary, titleNote, activeFile, filterCharacter, currentSceneId }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const setMetaTag = (attr, key, content) => {
      if (!key) return;
      const selector = `meta[${attr}="${key}"]`;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content || "");
    };

    const cleanText = (text = "") => text.replace(/\s+/g, " ").trim();
    const summary =
      cleanText(titleSummary) ||
      cleanText(titleNote) ||
      (titleName ? `${titleName} 劇本摘要` : "");
    const description =
      summary.slice(0, 200) ||
      "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。";
    const shareTitle = titleName || activeFile || "Screenplay Reader";
    const fullTitle = titleName ? `${titleName}｜Screenplay Reader` : shareTitle;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    document.title = fullTitle;
    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", shareTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", shareUrl);
    setMetaTag("property", "og:type", activeFile ? "article" : "website");
  }, [titleName, titleSummary, titleNote, activeFile, filterCharacter, currentSceneId]);
}

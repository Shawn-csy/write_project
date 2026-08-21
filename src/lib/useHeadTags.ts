import { useEffect } from "react";

/**
 * 以命令式方式套用 document title 與 head 內的 meta / link 標籤。
 *
 * 取代 react-helmet-async。該套件的 peer dependency 只到 React 18，是整個
 * monorepo 統一到 React 19 的唯一阻擋項目 —— 而 root（Vite SPA / React 18）
 * 與 apps/public（Next 16 / React 19）版本不一致，正是測試中出現兩份 React、
 * next/link 拋 "Cannot read properties of null (reading 'useContext')" 的根因。
 *
 * 這裡不重造 helmet 的完整功能（巢狀覆寫、SSR 收集、優先序合併）—— 本專案
 * 只有 EditorShell 一個使用處，且是純 client、登入後的工作區路由，用不到那些。
 *
 * 卸載時會還原被覆寫的既有標籤，並移除自己新增的，避免路由切換後殘留。
 */

export type HeadTag =
  | { kind: "meta"; attr: "name" | "property"; key: string; content: string }
  | { kind: "link"; rel: string; href: string };

const OWNED_ATTR = "data-head-tags";

function applyTag(tag: HeadTag): () => void {
  const selector =
    tag.kind === "meta"
      ? `meta[${tag.attr}="${CSS.escape(tag.key)}"]`
      : `link[rel="${CSS.escape(tag.rel)}"]`;

  const existing = document.head.querySelector<HTMLElement>(selector);

  if (existing) {
    // 既有標籤（例如 index.html 內建的）：覆寫值，卸載時還原。
    const valueAttr = tag.kind === "meta" ? "content" : "href";
    const nextValue = tag.kind === "meta" ? tag.content : tag.href;
    const previous = existing.getAttribute(valueAttr);
    existing.setAttribute(valueAttr, nextValue);
    return () => {
      if (previous === null) existing.removeAttribute(valueAttr);
      else existing.setAttribute(valueAttr, previous);
    };
  }

  const el = document.createElement(tag.kind);
  el.setAttribute(OWNED_ATTR, "");
  if (tag.kind === "meta") {
    el.setAttribute(tag.attr, tag.key);
    el.setAttribute("content", tag.content);
  } else {
    el.setAttribute("rel", tag.rel);
    el.setAttribute("href", tag.href);
  }
  document.head.appendChild(el);
  return () => {
    el.remove();
  };
}

export function useHeadTags(title: string, tags: HeadTag[]): void {
  // tags 由呼叫端在 render 中就地建構，identity 每次都會變 —— 以序列化後的
  // 內容當作依賴，避免每次 render 都重跑 DOM 操作。
  const serialized = JSON.stringify([title, tags]);

  useEffect(() => {
    const [nextTitle, nextTags] = JSON.parse(serialized) as [string, HeadTag[]];

    const previousTitle = document.title;
    if (nextTitle) document.title = nextTitle;

    const cleanups = nextTags
      .filter((tag) =>
        tag.kind === "meta" ? Boolean(tag.content) : Boolean(tag.href),
      )
      .map(applyTag);

    return () => {
      document.title = previousTitle;
      for (const cleanup of cleanups) cleanup();
    };
  }, [serialized]);
}

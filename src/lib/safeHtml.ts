import React from "react";

const ALLOWED_TAGS = new Set(["DIV", "H1", "P", "BR", "STRONG", "SPAN"]);
const ALLOWED_CLASSES = new Set([
  "title-page",
  "title-field",
  "bold",
  "italic",
  "underline",
]);

const parseSafeStyle = (styleText: string | null): Record<string, string> | undefined => {
  if (!styleText) return undefined;
  const style: Record<string, string> = {};
  const parts = styleText.split(";").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const [rawKey, rawValue] = part.split(":").map((p) => p.trim());
    if (!rawKey || !rawValue) continue;
    if (rawKey === "margin-left") {
      style.marginLeft = rawValue;
    }
  }
  return Object.keys(style).length ? style : undefined;
};

const sanitizeElement = (node: Node, key: string) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tag = el.tagName;
  if (!ALLOWED_TAGS.has(tag)) {
    return node.textContent;
  }

  const props: Record<string, unknown> = { key };
  const className = el.getAttribute("class");
  if (className) {
    const safeClasses = className
      .split(/\s+/)
      .filter((c) => ALLOWED_CLASSES.has(c));
    if (safeClasses.length) {
      props.className = safeClasses.join(" ");
    }
  }

  const styleAttr = el.getAttribute("style");
  const safeStyle = parseSafeStyle(styleAttr);
  if (safeStyle) {
    props.style = safeStyle;
  }

  const children: (string | React.ReactElement | null)[] = [];
  node.childNodes.forEach((child, idx) => {
    const sanitized = sanitizeElement(child, `${key}-${idx}`);
    if (sanitized !== null && sanitized !== undefined) {
      children.push(sanitized);
    }
  });

  return React.createElement(el.tagName.toLowerCase(), props, children.length ? children : null);
};

export const renderSafeHtml = (html: string | null | undefined) => {
  if (!html) return null;
  if (typeof DOMParser === "undefined") {
    const text = html.replace(/<[^>]*>/g, "");
    return text;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes: (string | React.ReactElement | null)[] = [];
  doc.body.childNodes.forEach((child, idx) => {
    const sanitized = sanitizeElement(child, `safe-${idx}`);
    if (sanitized !== null && sanitized !== undefined) {
      nodes.push(sanitized);
    }
  });
  return nodes;
};

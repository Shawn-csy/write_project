import React from "react";

const ALLOWED_TAGS = new Set(["DIV", "H1", "P", "BR", "STRONG", "SPAN"]);
const ALLOWED_CLASSES = new Set([
  "title-page",
  "title-field",
  "bold",
  "italic",
  "underline",
]);

const parseSafeStyle = (styleText) => {
  if (!styleText) return undefined;
  const style = {};
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

const sanitizeElement = (node, key) => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const tag = node.tagName;
  if (!ALLOWED_TAGS.has(tag)) {
    return node.textContent;
  }

  const props = { key };
  const className = node.getAttribute("class");
  if (className) {
    const safeClasses = className
      .split(/\s+/)
      .filter((c) => ALLOWED_CLASSES.has(c));
    if (safeClasses.length) {
      props.className = safeClasses.join(" ");
    }
  }

  const styleAttr = node.getAttribute("style");
  const safeStyle = parseSafeStyle(styleAttr);
  if (safeStyle) {
    props.style = safeStyle;
  }

  const children = [];
  node.childNodes.forEach((child, idx) => {
    const sanitized = sanitizeElement(child, `${key}-${idx}`);
    if (sanitized !== null && sanitized !== undefined) {
      children.push(sanitized);
    }
  });

  return React.createElement(tag.toLowerCase(), props, children.length ? children : null);
};

export const renderSafeHtml = (html) => {
  if (!html) return null;
  if (typeof DOMParser === "undefined") {
    const text = html.replace(/<[^>]*>/g, "");
    return text;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = [];
  doc.body.childNodes.forEach((child, idx) => {
    const sanitized = sanitizeElement(child, `safe-${idx}`);
    if (sanitized !== null && sanitized !== undefined) {
      nodes.push(sanitized);
    }
  });
  return nodes;
};

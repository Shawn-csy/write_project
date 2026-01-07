import {
  BLANK_LONG,
  BLANK_MID,
  BLANK_PURE,
  BLANK_SHORT,
  DIR_TOKEN,
  SFX_TOKEN,
  whitespaceLabels,
} from "./screenplayTokens.js";

export const replaceWhitespacePlaceholders = (doc) => {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    targets.push(walker.currentNode);
  }

  const buildGap = (kind) => {
    const wrap = doc.createElement("div");
    wrap.className = `whitespace-block whitespace-${kind}`;
    const top = doc.createElement("div");
    top.className = "whitespace-line";
    const mid = doc.createElement("div");
    mid.className = "whitespace-line whitespace-label";
    const bottom = doc.createElement("div");
    bottom.className = "whitespace-line";
    mid.textContent = whitespaceLabels[kind] || "";
    if (!mid.textContent) mid.classList.add("whitespace-label-empty");
    wrap.appendChild(top);
    wrap.appendChild(mid);
    wrap.appendChild(bottom);
    return wrap;
  };

  const consumeTextNode = (textNode) => {
    const raw = textNode.textContent || "";
    if (
      !raw.includes(BLANK_SHORT) &&
      !raw.includes(BLANK_LONG) &&
      !raw.includes(BLANK_MID) &&
      !raw.includes(BLANK_PURE) &&
      !raw.includes("__SCREENPLAY_BLANK_LONG__") &&
      !raw.includes("__SCREENPLAY_BLANK_SHORT__") &&
      !raw.includes("_SCREENPLAY_BLANK_LONG_") &&
      !raw.includes("_SCREENPLAY_BLANK_SHORT_")
    )
      return;
    const frag = doc.createDocumentFragment();
    let rest = raw;
    const findNext = () => {
      const indices = [
        { idx: rest.indexOf(BLANK_SHORT), kind: "short", token: BLANK_SHORT },
        { idx: rest.indexOf(BLANK_MID), kind: "mid", token: BLANK_MID },
        { idx: rest.indexOf(BLANK_LONG), kind: "long", token: BLANK_LONG },
        { idx: rest.indexOf(BLANK_PURE), kind: "pure", token: BLANK_PURE },
        { idx: rest.indexOf("__SCREENPLAY_BLANK_LONG__"), kind: "long", token: "__SCREENPLAY_BLANK_LONG__" },
        { idx: rest.indexOf("__SCREENPLAY_BLANK_SHORT__"), kind: "short", token: "__SCREENPLAY_BLANK_SHORT__" },
        { idx: rest.indexOf("_SCREENPLAY_BLANK_LONG_"), kind: "long", token: "_SCREENPLAY_BLANK_LONG_" },
        { idx: rest.indexOf("_SCREENPLAY_BLANK_SHORT_"), kind: "short", token: "_SCREENPLAY_BLANK_SHORT_" },
      ].filter((e) => e.idx !== -1);
      if (!indices.length) return null;
      return indices.sort((a, b) => a.idx - b.idx)[0];
    };
    while (rest.length) {
      const next = findNext();
      if (!next) {
        frag.appendChild(doc.createTextNode(rest));
        break;
      }
      if (next.idx > 0) {
        frag.appendChild(doc.createTextNode(rest.slice(0, next.idx)));
      }
      frag.appendChild(buildGap(next.kind));
      rest = rest.slice(next.idx + next.token.length);
    }
    textNode.replaceWith(frag);
  };

  targets.forEach(consumeTextNode);
};

export const markSfxAndDirections = (doc, { highlightSfx = true } = {}) => {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const raw = node.textContent || "";
    const dirInline = raw.includes(DIR_TOKEN);
    const sfxInline = raw.includes(SFX_TOKEN);
    const parenSfx = raw.match(/^\s*\(sfx[:：]\s*(.+?)\)\s*$/i); // 相容舊寫法
    if (dirInline) {
      const cleaned = raw.replace(DIR_TOKEN, "").replace(/^!/, "").trim();
      targets.push({ node, content: cleaned, kind: "dir" });
    } else if (sfxInline) {
      const cleaned = raw.replace(SFX_TOKEN, "").replace(/^!/, "").trim();
      targets.push({ node, content: cleaned, kind: "sfx" });
    } else if (parenSfx) {
      targets.push({ node, content: parenSfx[1], kind: "sfx" });
    }
  }
  targets.forEach(({ node, content, kind }) => {
    if (kind === "dir") {
      const wrap = doc.createElement("div");
      wrap.className = "dir-cue";
      const text = doc.createElement("span");
      text.className = "dir-text";
      text.textContent = `[${content.trim()}]`;
      wrap.appendChild(text);
      node.parentNode.replaceChild(wrap, node);
    } else {
      if (highlightSfx) {
        const wrap = doc.createElement("div");
        wrap.className = "sfx-cue";
        const text = doc.createElement("span");
        text.className = "sfx-text";
        text.textContent = `(SFX) ${content.trim()}`;
        wrap.appendChild(text);
        node.parentNode.replaceChild(wrap, node);
      } else {
        const plain = doc.createElement("span");
        plain.className = "sfx-text";
        plain.textContent = `(SFX) ${content.trim()}`;
        node.parentNode.replaceChild(plain, node);
      }
    }
  });
};

export const injectWhitespaceBlocks = (html = "") =>
  html
    .replaceAll(BLANK_LONG, renderWhitespace("long"))
    .replaceAll(BLANK_MID, renderWhitespace("mid"))
    .replaceAll(BLANK_SHORT, renderWhitespace("short"))
    .replaceAll(BLANK_PURE, renderWhitespace("pure"))
    // 舊版相容
    .replaceAll("__SCREENPLAY_BLANK_LONG__", renderWhitespace("long"))
    .replaceAll("__SCREENPLAY_BLANK_SHORT__", renderWhitespace("short"))
    .replaceAll("_SCREENPLAY_BLANK_LONG_", renderWhitespace("long"))
    .replaceAll("_SCREENPLAY_BLANK_SHORT_", renderWhitespace("short"));


const renderWhitespace = (kind) => {
  const label = whitespaceLabels[kind] || "";
  return `
      <div class="whitespace-block whitespace-${kind}">
        <div class="whitespace-line"></div>
        <div class="whitespace-line whitespace-label${label ? "" : " whitespace-label-empty"}">${label}</div>
        <div class="whitespace-line"></div>
      </div>
    `;
};

export const highlightParentheses = (doc) => {
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent && (node.textContent.includes('(') || node.textContent.includes(')'))) {
      targets.push(node);
    }
  }

  targets.forEach((node) => {
    const raw = node.textContent;
    const frag = doc.createDocumentFragment();
    let lastIndex = 0;
    
    // Regex matches:
    // 1. (...) -> Parentheses content
    // 2. {...} -> Curly braces content
    // 3. |...  -> Pipe followed by rest of text (or until newline if we had multi-line, but text nodes usually split? assume rest of node)
    //    Actually, we'll assume | and following chars until another special char or end?
    //    User said "|開頭", implies "starts with |".
    //    Let's assume it captures `|` and everything after it in the node, OR distinct `|...`.
    //    Let's try to match segments:
    //    \([^)]*\)|[()]   (Parentheses)
    //    \{[^}]*\}        (Braces)
    //    \|.*             (Pipe to end)
    
    const regex = /(\([^)]*\)|[()])|(\{[^}]*\})|(\|.*)/g;
    let match;
    
    while ((match = regex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        frag.appendChild(doc.createTextNode(raw.slice(lastIndex, match.index)));
      }
      
      const text = match[0];
      const span = doc.createElement('span');
      
      if (text.startsWith('{')) {
        // Curly braces -> Orange (Distance color)
        span.className = 'script-paren-distance';
        span.textContent = text;
      } else if (text.startsWith('|')) {
        // Pipe -> Red (Special note)
        span.className = 'script-note-red';
        span.textContent = text;
      } else {
        // Parentheses -> Check for distance
        const content = text.replace(/^[(（]/, '').replace(/[)）]$/, '').trim().toUpperCase();
        const isDistance = /^(V\.?O\.?|O\.?S\.?|O\.?C\.?|畫外音|旁白|電話|話筒)$/.test(content);
        span.className = isDistance ? 'script-paren-distance' : 'script-paren';
        span.textContent = text;
      }
      
      frag.appendChild(span);
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < raw.length) {
      frag.appendChild(doc.createTextNode(raw.slice(lastIndex)));
    }
    
    node.replaceWith(frag);
  });
};


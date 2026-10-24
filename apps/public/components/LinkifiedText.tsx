import React from "react";

// Match the ASCII URL character set so a URL followed immediately by Chinese
// punctuation or prose does not swallow the rest of the biography.
const URL_PATTERN = /https?:\/\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?，。；：！？、）》】」』]+$/;

function splitTrailingPunctuation(value: string): { url: string; trailing: string } {
  const match = value.match(TRAILING_PUNCTUATION);
  if (!match || match.index == null) return { url: value, trailing: "" };
  return { url: value.slice(0, match.index), trailing: match[0] };
}

export function LinkifiedText({ text, className = "" }: { text: string; className?: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  URL_PATTERN.lastIndex = 0;
  while ((match = URL_PATTERN.exec(text)) !== null) {
    const { url, trailing } = splitTrailingPunctuation(match[0]);
    if (!url) continue;
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <a
        key={`url-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
      >
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <p className={className}>{nodes}</p>;
}

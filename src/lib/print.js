import {
  BLANK_LONG,
  BLANK_MID,
  BLANK_PURE,
  BLANK_SHORT,
  DIR_TOKEN,
  SFX_TOKEN,
  renderWhitespaceBlock,
} from "./screenplayTokens.js";

export function buildPrintHtml({
  titleName,
  activeFile,
  titleHtml,
  rawScriptHtml,
  accent,
  accentForeground,
  accentMuted,
}) {
  const accentValue = accent ? `hsl(${accent})` : '#10b981';
  const accentFgValue = accentForeground ? `hsl(${accentForeground})` : '#0f172a';
  const accentMutedValue = accentMuted ? `hsl(${accentMuted})` : '#e3f4ec';

  const replaceTokens = (html = '') =>
    html
      .replace(
        new RegExp(`!?${SFX_TOKEN.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*([^<\\n]+)`, "g"),
        (_, content) =>
          `<span class="sfx-cue"><span class="sfx-text">[SFX: ${content.trim()}]</span></span>`
      )
      .replace(
        new RegExp(`!?${DIR_TOKEN.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*([^<\\n]+)`, "g"),
        (_, content) =>
          `<span class="dir-cue"><span class="dir-text">[${content.trim()}]</span></span>`
      );

  const replacePlaceholders = (html = '') =>
    html
      .replaceAll(BLANK_LONG, renderWhitespaceBlock('long'))
      .replaceAll(BLANK_MID, renderWhitespaceBlock('mid'))
      .replaceAll(BLANK_SHORT, renderWhitespaceBlock('short'))
      .replaceAll(BLANK_PURE, renderWhitespaceBlock('pure'))
      // 舊版相容
      .replaceAll('__SCREENPLAY_BLANK_LONG__', renderWhitespaceBlock('long'))
      .replaceAll('__SCREENPLAY_BLANK_SHORT__', renderWhitespaceBlock('short'))
      .replaceAll('_SCREENPLAY_BLANK_LONG_', renderWhitespaceBlock('long'))
      .replaceAll('_SCREENPLAY_BLANK_SHORT_', renderWhitespaceBlock('short'));

  const finalScriptHtml = replacePlaceholders(replaceTokens(rawScriptHtml || ""));
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${titleName || activeFile || "Screenplay"}</title>
  <style>
    :root {
      --foreground: #0f172a;
      --muted-foreground: #475569;
      --paper-bg: #ffffff;
      --paper-border: #e2e8f0;
      --accent: ${accentValue};
      --accent-foreground: ${accentFgValue};
      --accent-muted: ${accentMutedValue};
      --note-bg: color-mix(in srgb, var(--accent) 16%, #ffffff 84%);
      --note-border: color-mix(in srgb, var(--accent) 32%, transparent);
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: var(--foreground);
      background: var(--paper-bg);
      padding: 48px;
    }
    @media print {
      body {
        background: #ffffff;
        color: #0f172a;
      }
    }
    .screenplay {
      font-size: 14px;
      line-height: 1.6;
      max-width: 720px;
      margin: 0 auto;
    }
    .scene-heading { font-weight: 700; text-transform: uppercase; margin-top: 24px; margin-bottom: 12px; }
    .action { margin-bottom: 12px; }
    .character { font-weight: 700; text-align: center; margin: 0 auto 4px; width: 50%; }
    .dialogue { margin: 0 auto 12px; width: 70%; }
    .parenthetical { font-style: italic; text-align: center; margin: 0 auto 8px; width: 60%; font-size: 13px; }
    .centered { text-align: center; margin: 24px auto; font-weight: 700; letter-spacing: 0.08em; }
    .transition { text-align: right; margin: 16px 0; font-weight: 700; }
    .lyrics { margin-left: 40px; margin-bottom: 12px; font-style: italic; }
    .section { font-weight: 700; margin: 12px 0; }
    .synopsis { font-style: italic; color: var(--muted-foreground); margin: 8px 0; }
    .note { color: var(--foreground); background: var(--note-bg); padding: 6px 10px; border-radius: 8px; margin: 10px 0; border: 1px solid var(--note-border); }
    .character-block { border-left: 6px solid var(--accent); background: color-mix(in srgb, var(--accent) 14%, transparent); padding: 4px 8px; border-radius: 8px; }
    .highlight { background: color-mix(in srgb, var(--accent) 10%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent); }
    .title-page { max-width: 720px; margin: 0 auto 32px; }
    .title-page h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .title-page p { margin: 2px 0; }
    .whitespace-block { margin: 12px 0; display: grid; gap: 2px; }
    .whitespace-line { min-height: 12px; }
    .whitespace-label { text-align: left; padding-left: 6px; font-size: 12px; color: var(--muted-foreground); font-style: italic; }
    .whitespace-label-empty { min-height: 12px; }
    .sfx-cue, .dir-cue {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 6px;
      margin: 2px 0;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }
    .dir-cue {
      border-color: color-mix(in srgb, var(--muted-foreground) 28%, transparent);
      background: color-mix(in srgb, var(--muted-foreground) 10%, transparent);
    }
    .sfx-text, .dir-text { font-size: 12px; font-style: italic; }
  </style>
</head>
<body>
  ${titleHtml || ""}
  <article class="screenplay">${finalScriptHtml}</article>
</body>
</html>
`.trim();
}

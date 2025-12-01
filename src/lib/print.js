export function buildPrintHtml({ titleName, activeFile, titleHtml, rawScriptHtml }) {
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
    .note { color: var(--foreground); background: #fef9c3; padding: 6px 10px; border-radius: 8px; margin: 10px 0; border: 1px solid #fcd34d; }
    .title-page { max-width: 720px; margin: 0 auto 32px; }
    .title-page h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
    .title-page p { margin: 2px 0; }
  </style>
</head>
<body>
  ${titleHtml || ""}
  <article class="screenplay">${rawScriptHtml || ""}</article>
</body>
</html>
`.trim();
}

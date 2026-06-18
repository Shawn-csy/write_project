

export function buildPrintHtml({
  titleName,
  activeFile,
  titleHtml,
  rawScriptHtml,
}: {
  titleName?: string;
  activeFile?: string;
  titleHtml?: string;
  rawScriptHtml?: string;
}) {
  // ScriptRenderer generates HTML with classes that match our Tailwind/Global CSS.
  // Since we clone all styles into the print iframe, we don't need to redefine them here.
  const finalScriptHtml = rawScriptHtml || "";

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${titleName || activeFile || "Screenplay"}</title>
  <style>
    /* Print-specific Overrides */
    @media print {
      @page {
        margin: 20mm;
      }
      body {
        background: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Force plain text background in PDF export */
      .script-renderer,
      .script-renderer * {
        background: transparent !important;
        background-color: transparent !important;
      }
      /* Ensure container spans full width without scrollbars */
      .script-renderer {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border: none !important;
      }
      /* Hide UI elements if any slipped in (though we export raw html) */
      .no-print {
        display: none !important;
      }
      /* V2 multi-column print overrides */
      [data-v2-presentation="columns"] {
        font-size: 9pt !important;
      }
      [data-v2-presentation="columns"] p {
        font-size: 9pt !important;
        line-height: 1.3 !important;
      }
      /* Hide line-number gutter */
      [data-v2-presentation="columns"] .grid > div:first-child:not([data-track-id]) {
        display: none !important;
      }
      /* Collapse gutter column from grid template */
      [data-v2-presentation="columns"] .grid {
        grid-template-columns: var(--v2-track-columns) !important;
      }
      /* Shrink cell padding */
      [data-v2-presentation="columns"] article {
        padding: 2pt 4pt !important;
      }
      /* Hide sticky header backdrop blur (print doesn't need it) */
      [data-v2-presentation="columns"] .sticky {
        position: static !important;
        backdrop-filter: none !important;
      }
    }

    /* Base Layout for the Print View (before printing) */
    :root {
      color-scheme: light;
    }
    body {
      background: white;
      color: black;
      padding: 24px; /* Visible padding in the iframe preview if inspected */
    }
  </style>
</head>
<body>
  ${titleHtml || ""}
  <article class="script-renderer">${finalScriptHtml}</article>
</body>
</html>
`.trim();
}

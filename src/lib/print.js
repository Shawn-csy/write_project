

export function buildPrintHtml({
  titleName,
  activeFile,
  titleHtml,
  rawScriptHtml,
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
      /* Ensure container spans full width without scrollbars */
      .screenplay {
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
    }

    /* Base Layout for the Print View (before printing) */
    body {
      background: white;
      padding: 24px; /* Visible padding in the iframe preview if inspected */
    }
  </style>
</head>
<body>
  ${titleHtml || ""}
  <article class="screenplay">${finalScriptHtml}</article>
</body>
</html>
`.trim();
}

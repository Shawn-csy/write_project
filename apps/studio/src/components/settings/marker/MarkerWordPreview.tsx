import type { CSSProperties } from "react";
import type { ProductionScriptExport, ProductionWordStyle } from "../../../lib/productionScriptExport";
import { previewColor } from "./markerPreviewColors";
import "./markerWordPaper.css";

type WordRow = ProductionScriptExport["chapters"][number]["rows"][number];

// Match the Word exporter's run formatting, including inline directions within dialogue.
const inlineCues = /([（(][@＠][^（）()、，,\n]+[）)]|(?<=[（(])[@＠][^（）()、，,\n]+|【[^【】\n]+】)/g;
const continuousLabels = new Set([">>SE", "><SE", "<<SE"]);
const backgroundLabels = new Set(["//BG", "/\\BG", "\\\\BG"]);

function wordStyle(style?: ProductionWordStyle, base?: ProductionWordStyle): CSSProperties {
  const bold = style?.bold ?? base?.bold;
  return {
    color: previewColor(style?.color ?? base?.color, "ink"),
    fontFamily: style?.font ?? base?.font,
    fontWeight: bold === undefined ? undefined : bold ? "bold" : "normal",
  };
}

function rowAppearance(row: WordRow) {
  if (row.cueTarget) return row.cueTarget;
  if (row.kind === "position" || row.label === "@") return "position";
  if (continuousLabels.has(row.label)) return "continuousEffect";
  if (backgroundLabels.has(row.label)) return "background";
  if (row.kind === "speech" && !row.label && row.text === "END") return "end";
  if (row.label === "#SE") return "cue";
  return row.kind;
}

function renderText(text: string, style?: ProductionWordStyle, base?: ProductionWordStyle) {
  return text.split(inlineCues).map((part, index) => {
    if (!part) return null;
    const cueType = index % 2 === 0 ? undefined : part.startsWith("【") ? "post" : "position";
    return <span key={index} data-inline-cue={cueType} style={wordStyle(style, base)}>{part}</span>;
  });
}

export function MarkerWordPreview({ document, compact = false }: { document: ProductionScriptExport; compact?: boolean }) {
  return (
    <div className="marker-word-paper" data-compact={compact || undefined}>
      {document.chapters.map((chapter, index) => (
        <section key={index}>
          {chapter.heading && <div className="marker-word-heading" style={wordStyle(chapter.style)}>{chapter.heading}</div>}
          {chapter.rows.map((row, rowIndex) => (
            <div className="marker-word-row" data-appearance={rowAppearance(row)} key={rowIndex}>
              <span className="marker-word-label" style={wordStyle(row.labelStyle ?? row.style)}>{row.label}</span>
              <span className="marker-word-body">
                {row.runs?.map((run, runIndex) => (
                  <span key={runIndex}>{renderText(run.text, run.style, row.style)}</span>
                )) ?? renderText(row.text, row.style)}
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

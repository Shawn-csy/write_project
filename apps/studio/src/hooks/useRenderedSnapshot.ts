import { useEffect, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ScriptDocAstNode } from "./useScriptDocument";

interface UseRenderedSnapshotInput {
  ast: { children?: ScriptDocAstNode[] } | null;
  onRawHtml?: (html: string) => void;
  onProcessedHtml?: (html: string) => void;
  filterCharacter?: string | null;
  focusMode?: boolean;
  renderScriptNode: (
    currentAst: { children?: ScriptDocAstNode[] } | null,
    options?: { filterCharacterValue?: string | null; focusModeValue?: boolean }
  ) => React.ReactNode;
}

export function useRenderedSnapshot({
  ast,
  onRawHtml,
  onProcessedHtml,
  filterCharacter,
  focusMode,
  renderScriptNode,
}: UseRenderedSnapshotInput) {
  const filteredHtml = useMemo(() => {
    if (!onProcessedHtml || !ast) return "";
    const rendered = renderScriptNode(ast);
    return rendered ? renderToStaticMarkup(rendered) : "";
  }, [ast, onProcessedHtml, renderScriptNode]);

  const rawHtml = useMemo(() => {
    if (!onRawHtml) return "";
    if (!ast) return "";
    if (!filterCharacter && !focusMode && filterCharacter !== "__ALL__") return filteredHtml;
    const rendered = renderScriptNode(ast, { filterCharacterValue: null, focusModeValue: false });
    return rendered ? renderToStaticMarkup(rendered) : "";
  }, [ast, onRawHtml, filterCharacter, focusMode, filteredHtml, renderScriptNode]);

  useEffect(() => {
    onProcessedHtml?.(filteredHtml || "");
  }, [filteredHtml, onProcessedHtml]);

  useEffect(() => {
    onRawHtml?.(rawHtml || "");
  }, [rawHtml, onRawHtml]);

  return { filteredHtml, rawHtml };
}


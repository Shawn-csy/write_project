import { useMemo } from "react";
import { parseScreenplay } from "../lib/screenplayAST";

export interface ScriptDocTitleEntry {
  key: string;
  values?: string[];
  indent?: number;
}

export interface ScriptDocSceneItem {
  id?: string;
  [key: string]: unknown;
}

export interface ScriptDocAstNode {
  type: string;
  text?: string;
  layerType?: string;
  character?: string;
  children?: ScriptDocAstNode[];
  left?: ScriptDocAstNode[];
  right?: ScriptDocAstNode[];
  [key: string]: unknown;
}

interface UseScriptDocumentInput {
  text: string;
  markerConfigs?: Array<{ id?: string; [key: string]: unknown }>;
  externalAst?: { children?: ScriptDocAstNode[] } | null;
  externalScenes?: ScriptDocSceneItem[] | null;
  externalTitleEntries?: ScriptDocTitleEntry[] | null;
  t: (key: string, fallback?: string) => string;
}

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const formatInline = (str = "") => {
  let html = escapeHtml(str);
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="bold">$1</span>');
  html = html.replace(/\*(.+?)\*/g, '<span class="italic">$1</span>');
  html = html.replace(/_(.+?)_/g, '<span class="underline">$1</span>');
  return html;
};

const renderTitlePageHtml = (entries: ScriptDocTitleEntry[]) => {
  if (!entries.length) return "";
  return entries
    .map((e) => {
      const indentValue = Number(e.indent || 0);
      const margin = indentValue > 0 ? ` style="margin-left:${Math.min(indentValue / 2, 8)}rem"` : "";
      const values = e.values && e.values.length > 0 ? e.values.map(formatInline) : [];
      const isTitle = e.key.toLowerCase() === "title";
      const value = values.length > 0 ? values.join(isTitle ? " " : "<br />") : "";
      if (isTitle) return `<h1>${value}</h1>`;
      return `<p class="title-field"${margin}><strong>${escapeHtml(e.key)}:</strong> ${value}</p>`;
    })
    .join("");
};

export function useScriptDocument({
  text,
  markerConfigs = [],
  externalAst = null,
  externalScenes = null,
  externalTitleEntries = null,
  t,
}: UseScriptDocumentInput) {
  const internalParse = useMemo<{ ast?: { children?: ScriptDocAstNode[] }; scenes?: ScriptDocSceneItem[]; titleEntries?: ScriptDocTitleEntry[] } | null>(
    () => (externalAst ? null : parseScreenplay(text || "", markerConfigs)),
    [externalAst, text, markerConfigs]
  );

  const ast = externalAst ?? internalParse?.ast ?? null;
  const sceneList = externalScenes ?? internalParse?.scenes ?? [];
  const titleEntries = externalTitleEntries ?? internalParse?.titleEntries ?? [];

  const titlePage = useMemo(() => {
    if (!titleEntries || !titleEntries.length) return { html: "", title: "", note: "", has: false };

    const html = `<div class="title-page">${renderTitlePageHtml(titleEntries)}</div>`;
    const getValue = (keyName: string) => {
      const entry = titleEntries.find((e) => e.key.toLowerCase() === keyName);
      return (entry?.values || []).join(" ");
    };

    return {
      html,
      title: getValue("title"),
      note: getValue("note"),
      has: Boolean(html.trim()),
    };
  }, [titleEntries]);

  const titleSummary = useMemo(() => {
    if (!titleEntries || !titleEntries.length) return "";
    const summaryKeys = [
      "summary",
      "synopsis",
      "logline",
      "description",
      t("scriptViewer.summaryZh1"),
      t("scriptViewer.summaryZh2"),
      t("scriptViewer.summaryZh3"),
      t("scriptViewer.summaryZh4"),
    ];
    const match = titleEntries.find((e) => {
      const key = e.key.toLowerCase();
      return summaryKeys.some((k) => key === k || key.includes(k));
    });
    return match?.values?.length ? match.values.join(" ") : "";
  }, [titleEntries, t]);

  const bodySummary = useMemo(() => {
    if (!ast?.children?.length) return "";
    const allowedTypes = new Set(["action", "dialogue", "centered", "parenthetical", "transition"]);
    const chunks: string[] = [];

    const walk = (node: ScriptDocAstNode) => {
      if (!node || chunks.join(" ").length >= 320) return;
      if (allowedTypes.has(node.type) && typeof node.text === "string") {
        const normalized = node.text.replace(/\s+/g, " ").trim();
        if (normalized) chunks.push(normalized);
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
      if (Array.isArray(node.left)) node.left.forEach(walk);
      if (Array.isArray(node.right)) node.right.forEach(walk);
    };

    ast.children.forEach(walk);
    return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, 180);
  }, [ast]);

  const characterList = useMemo(() => {
    if (!ast) return [];
    const chars = new Set<string>();
    (ast.children || []).forEach((node) => {
      if (node.type === "speech" && node.character) {
        chars.add(String(node.character).trim().toUpperCase());
      } else if (node.type === "character" && node.text) {
        chars.add(String(node.text).trim().toUpperCase());
      } else if (node.type === "layer" && node.layerType === "character" && node.text) {
        chars.add(String(node.text).trim().toUpperCase());
      }
    });
    return Array.from(chars).sort();
  }, [ast]);

  return { ast, sceneList, titleEntries, titlePage, titleSummary, bodySummary, characterList };
}


import { useState, useCallback } from "react";
import { useToast } from "../../components/ui/toast";
import { useI18n } from "../../contexts/I18nContext";
import { preprocess } from "../../lib/importPipeline/textPreprocessor";
import { extractMetadata } from "../../lib/importPipeline/metadataExtractor";
import { stripMarkerGuideBlocks } from "../../lib/importPipeline/markerGuideStripper";
import { parseScreenplay } from "../../lib/screenplayAST";
import { getDefaultMarkerRules } from "../../constants/defaultMarkerRules";

export const STEPS = { INPUT: "input", PREVIEW: "preview", RESULT: "result" } as const;
export type ImportStep = "input" | "preview" | "result";

export interface EditableMetadata { [key: string]: string; }

export interface PreprocessResultLike {
  cleanedText: string;
  [key: string]: unknown;
}

interface MetadataParseResult {
  metadata: EditableMetadata;
  strippedText: string;
  autoCleanedText: string;
}


export interface ImportPayload {
  title: string;
  content: string;
  folder: string;
  metadata: EditableMetadata;
  customMetadata: Array<{ key: string; value: string; type: string }>;
  author: string;
  draftDate: string;
}

const MAX_IMPORT_FILE_MB = 5;
const PREVIEW_MARKER_CONFIGS = getDefaultMarkerRules();
const SCRIPT_INFO_FIELDS = ["Title", "Author", "Draft date", "Description", "Tags", "Rating", "Duration", "Source", "RoleSetting", "PerformanceInstruction", "ChapterSettings"];

const buildEditableMetadata = (input: Record<string, unknown> = {}): EditableMetadata => {
  const next: EditableMetadata = {};
  SCRIPT_INFO_FIELDS.forEach(key => { next[key] = String(input?.[key] ?? ""); });
  return next;
};

const pickDefaultScriptInfo = (input: Record<string, unknown> = {}): EditableMetadata => {
  const next = buildEditableMetadata();
  for (const key of SCRIPT_INFO_FIELDS) {
    const value = input?.[key];
    if (typeof value === "string" && value.trim()) next[key] = value.trim();
  }
  return next;
};

const normalizeMetaKey = (key = "") => String(key || "").trim().toLowerCase().replace(/\s+/g, "");
const CONTROLLED_META_KEYS = new Set(["title", "author", "authors", "draftdate", "date", "tag", "tags", "標籤"]);
const EXCLUDED_META_KEYS = new Set(["environmentinfo", "situationinfo", "chapterinfo"]);

export const metadataToCustomEntries = (meta = {}) =>
  Object.entries(meta || {})
    .map(([key, value]) => ({ key: String(key || "").trim(), value: String(value ?? "") }))
    .filter(item => item.key && item.value)
    .filter(item => !CONTROLLED_META_KEYS.has(normalizeMetaKey(item.key)))
    .filter(item => !EXCLUDED_META_KEYS.has(normalizeMetaKey(item.key)))
    .map(item => ({ ...item, type: "text" }));

const normalizeNameKey = (name = "") => name.trim().toLowerCase();
const parseCharacterNames = (raw = ""): string[] =>
  String(raw).split(/\r?\n|,|，|、/).map(v => v.trim()).filter(Boolean);

const applyWholeLineCharacterTagging = (text = "", characterNames: string[] = []) => {
  if (!text || !characterNames.length) return text;
  const nameMap = new Map<string, string>();
  characterNames.forEach(name => { const k = normalizeNameKey(name); if (k && !nameMap.has(k)) nameMap.set(k, name); });
  if (!nameMap.size) return text;
  return String(text).split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed || /^#C\b/i.test(trimmed)) return line;
    const hit = nameMap.get(normalizeNameKey(trimmed));
    return hit ? `#C ${hit}` : line;
  }).join("\n");
};

export const autoRemoveWhitespace = (text = "") =>
  String(text || "").split("\n").map(line => line.replace(/\s+$/g, "")).filter(line => line.trim().length > 0).join("\n").trim();

interface Props {
  onOpenChange: (open: boolean) => void;
  onImport: (payload: ImportPayload) => Promise<void>;
  currentPath: string;
}

export function useImportScriptDialogState({ onOpenChange, onImport, currentPath }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>(STEPS.INPUT);
  const [rawInput, setRawInput] = useState("");
  const [title, setTitle] = useState("");
  const [characterNamesInput, setCharacterNamesInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [preprocessResult, setPreprocessResult] = useState<PreprocessResultLike | null>(null);
  const [metadataParseResult, setMetadataParseResult] = useState<MetadataParseResult>({ metadata: {}, strippedText: "", autoCleanedText: "" });
  const [metadata, setMetadata] = useState<EditableMetadata>(buildEditableMetadata());

  const previewMarkerConfigs = PREVIEW_MARKER_CONFIGS;
  const [previewAst, setPreviewAst] = useState<ReturnType<typeof parseScreenplay>["ast"] | null>(null);

  const resetState = useCallback(() => {
    setStep(STEPS.INPUT); setRawInput(""); setTitle(""); setCharacterNamesInput("");
    setPreprocessResult(null); setMetadataParseResult({ metadata: {}, strippedText: "", autoCleanedText: "" });
    setMetadata(buildEditableMetadata()); setPreviewAst(null);
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  }, [onOpenChange, resetState]);

  const handlePaste = useCallback(async () => {
    try { const text = await navigator.clipboard.readText(); setRawInput(text); }
    catch (err) { console.error(t("importDialog.clipboardReadFailed"), err); }
  }, [t]);

  const runPreprocess = useCallback((sourceInput: string): boolean => {
    const inputText = String(sourceInput || "");
    if (!inputText.trim()) return false;

    const characterNames = parseCharacterNames(characterNamesInput);
    const sourceText = characterNames.length > 0 ? applyWholeLineCharacterTagging(inputText, characterNames) : inputText;
    const result = preprocess(sourceText) as PreprocessResultLike;
    setPreprocessResult(result);

    const extracted = extractMetadata(result.cleanedText);
    const extractedMeta = extracted?.metadata || {};
    const parsedInfo = pickDefaultScriptInfo(extractedMeta);
    setMetadata(buildEditableMetadata(parsedInfo));
    const strippedText = String(extracted?.strippedText || "");
    const autoCleanedText = stripMarkerGuideBlocks(strippedText || result.cleanedText);
    setMetadataParseResult({ metadata: parsedInfo, strippedText, autoCleanedText });

    if (!title) {
      if (parsedInfo?.Title) {
        setTitle(parsedInfo.Title);
      } else {
        const lines = result.cleanedText.split("\n");
        const firstContentLine = lines.find(l => l.trim() && !l.startsWith("#"));
        if (firstContentLine) {
          const chapterMatch = firstContentLine.match(/^\d+\.\s*(.+)$/);
          if (chapterMatch) setTitle(chapterMatch[1].substring(0, 30));
        }
      }
    }
    setStep(STEPS.PREVIEW);
    return true;
  }, [title, characterNamesInput, t]);

  const handleApplyParsedMetadataRemoval = useCallback(() => {
    if (!preprocessResult?.cleanedText) return;
    const extracted = extractMetadata(preprocessResult.cleanedText);
    const strippedText = String(extracted?.strippedText || "");
    const autoCleanedText = stripMarkerGuideBlocks(strippedText || preprocessResult.cleanedText);
    setMetadataParseResult({ metadata: pickDefaultScriptInfo(extracted?.metadata || {}), strippedText, autoCleanedText });
    setMetadata(buildEditableMetadata(pickDefaultScriptInfo(extracted?.metadata || {})));
    if (typeof autoCleanedText === "string" && autoCleanedText.length > 0)
      setPreprocessResult(prev => ({ ...prev, cleanedText: autoCleanedText }));
  }, [preprocessResult]);

  const handleSetPreviewText = useCallback((val: string) => {
    setPreprocessResult(prev => prev ? { ...prev, cleanedText: val } : prev);
  }, []);

  const handleAutoRemoveWhitespace = useCallback(() => {
    setPreprocessResult(prev => prev ? { ...prev, cleanedText: autoRemoveWhitespace(prev.cleanedText || "") } : prev);
  }, []);

  const handlePreprocess = useCallback(() => { runPreprocess(rawInput); }, [rawInput, runPreprocess]);
  const handleToResult = useCallback(() => {
    if (!preprocessResult?.cleanedText) return;
    const ast = parseScreenplay(preprocessResult.cleanedText, PREVIEW_MARKER_CONFIGS).ast;
    setPreviewAst(ast);
    setStep(STEPS.RESULT);
  }, [preprocessResult]);

  const handleConfirmImport = useCallback(async () => {
    if (!preprocessResult?.cleanedText) return;
    setImporting(true);
    try {
      const resolvedTitle = title.trim() || metadata?.Title?.trim() || "未命名劇本";
      const normalizedMetadata = pickDefaultScriptInfo({ ...metadata, Title: resolvedTitle });
      const customMetadata = metadataToCustomEntries(normalizedMetadata);
      await onImport({ title: resolvedTitle, content: preprocessResult.cleanedText, folder: currentPath, metadata: normalizedMetadata, customMetadata, author: String(normalizedMetadata?.Author || "").trim(), draftDate: String(normalizedMetadata?.["Draft date"] || normalizedMetadata?.Date || "").trim() });
      handleOpenChange(false);
    } catch (err) {
      console.error(t("importDialog.importFailedLog"), err);
      const message = String(err instanceof Error ? err.message : "");
      const payloadTooLarge = /payload too large|413/i.test(message);
      toast({ title: t("importDialog.importFailed"), description: payloadTooLarge ? t("importDialog.payloadTooLarge").replace("{maxMb}", String(MAX_IMPORT_FILE_MB)) : t("importDialog.importTrySmaller"), variant: "destructive" });
    } finally { setImporting(false); }
  }, [preprocessResult, title, currentPath, onImport, handleOpenChange, metadata, toast, t]);

  return {
    t, step, setStep, rawInput, setRawInput, title, setTitle,
    characterNamesInput, setCharacterNamesInput, importing,
    preprocessResult, setPreprocessResult, metadata, setMetadata,
    metadataParseResult, previewMarkerConfigs, previewAst,
    handleOpenChange, handlePaste, handlePreprocess, handleToResult,
    handleSetPreviewText, handleAutoRemoveWhitespace,
    handleApplyParsedMetadataRemoval, handleConfirmImport,
  };
}

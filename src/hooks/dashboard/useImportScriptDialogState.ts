import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToast } from "../../components/ui/toast";
import { useI18n } from "../../contexts/I18nContext";
import { preprocess } from "../../lib/importPipeline/textPreprocessor";
import { extractMetadata } from "../../lib/importPipeline/metadataExtractor";
import { stripMarkerGuideBlocks } from "../../lib/importPipeline/markerGuideStripper";
import { parseScreenplay } from "../../lib/screenplayAST";
import { getDefaultMarkerRules } from "../../constants/defaultMarkerRules";

export const STEPS = { INPUT: "input", PREVIEW: "preview", RESULT: "result" } as const;
const GUIDE_STORAGE_KEY = "import-guide-seen-v1";
export type ImportStep = "input" | "preview" | "result";

interface ImportGuideStep {
  title: string;
  description: string;
  step: ImportStep;
  focus: "paste" | "character" | "preview" | "result";
}

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

interface SpotlightRect { top: number; left: number; width: number; height: number; }

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (payload: ImportPayload) => Promise<void>;
  currentPath: string;
}

export function useImportScriptDialogState({ open, onOpenChange, onImport, currentPath }: Props) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [step, setStep] = useState<ImportStep>(STEPS.INPUT);
  const [rawInput, setRawInput] = useState("");
  const [title, setTitle] = useState("");
  const [characterNamesInput, setCharacterNamesInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showFormatQuickInfo, setShowFormatQuickInfo] = useState(false);
  const [showFormatDetails, setShowFormatDetails] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [preprocessResult, setPreprocessResult] = useState<PreprocessResultLike | null>(null);
  const [metadataParseResult, setMetadataParseResult] = useState<MetadataParseResult>({ metadata: {}, strippedText: "", autoCleanedText: "" });
  const [metadata, setMetadata] = useState<EditableMetadata>(buildEditableMetadata());

  const guidePasteRef = useRef<HTMLDivElement | null>(null);
  const guideCharacterRef = useRef<HTMLDivElement | null>(null);
  const guidePreviewRef = useRef<HTMLDivElement | null>(null);
  const guideResultRef = useRef<HTMLDivElement | null>(null);

  const previewMarkerConfigs = PREVIEW_MARKER_CONFIGS;
  const [previewAst, setPreviewAst] = useState<ReturnType<typeof parseScreenplay>["ast"] | null>(null);

  const guideSteps: ImportGuideStep[] = [
    { title: t("importDialog.guideStepPasteTitle"), description: t("importDialog.guideStepPasteDesc"), step: STEPS.INPUT, focus: "paste" },
    { title: t("importDialog.guideStepCharacterTitle"), description: t("importDialog.guideStepCharacterDesc"), step: STEPS.INPUT, focus: "character" },
    { title: t("importDialog.guideStepPreviewTitle"), description: t("importDialog.guideStepPreviewDesc"), step: STEPS.PREVIEW, focus: "preview" },
    { title: t("importDialog.guideStepConfirmTitle"), description: t("importDialog.guideStepConfirmDesc"), step: STEPS.RESULT, focus: "result" },
  ];
  const currentGuide = showGuide ? guideSteps[guideIndex] : null;

  const currentGuideTargetRef = useMemo<React.RefObject<HTMLDivElement | null> | null>(() => {
    if (!currentGuide) return null;
    if (currentGuide.focus === "paste") return guidePasteRef;
    if (currentGuide.focus === "character") return guideCharacterRef;
    if (currentGuide.focus === "preview") return guidePreviewRef;
    if (currentGuide.focus === "result") return guideResultRef;
    return null;
  }, [currentGuide]);

  const markerRows = useMemo(() => ([
    { marker: "1. 第一章", meaning: t("importFormat.markerChapter") },
    { marker: "#C 小雨", meaning: t("importFormat.markerCharacter") },
    { marker: "(低聲)", meaning: t("importFormat.markerTone") },
    { marker: "【殘響】", meaning: t("importFormat.markerPostFx") },
    { marker: "#SE 關門聲", meaning: t("importFormat.markerSeSingle") },
    { marker: "//BG 夜晚街景", meaning: t("importFormat.markerBg") },
    { marker: "@舞台左側", meaning: t("importFormat.markerPosition") },
  ]), [t]);

  const detailRows = useMemo(() => ([
    { name: t("importFormat.markerChapter"), desc: t("importFormat.usageChapter"), sample: "1. 第一章", render: t("importFormat.markerChapter") },
    { name: t("importFormat.markerCharacter"), desc: t("importFormat.usageCharacter"), sample: "#C 小雨", render: "小雨：" },
    { name: t("importFormat.markerTone"), desc: t("importFormat.usageTone"), sample: "(低聲)", render: "語氣/動作樣式" },
    { name: t("importFormat.markerPostFx"), desc: t("importFormat.usagePostFx"), sample: "【殘響】", render: "後製註記樣式" },
    { name: t("importFormat.markerSeSingle"), desc: t("importFormat.usageSeSingle"), sample: "#SE 關門聲", render: "單行音效樣式" },
    { name: t("importFormat.markerBg"), desc: t("importFormat.usageBg"), sample: "//BG 夜晚街景", render: "背景音樣式" },
    { name: t("importFormat.markerPosition"), desc: t("importFormat.usagePosition"), sample: "@舞台左側", render: "位置指示樣式" },
  ]), [t]);

  const resetState = useCallback(() => {
    setStep(STEPS.INPUT); setRawInput(""); setTitle(""); setCharacterNamesInput("");
    setPreprocessResult(null); setMetadataParseResult({ metadata: {}, strippedText: "", autoCleanedText: "" });
    setMetadata(buildEditableMetadata()); setShowGuide(false); setShowFormatQuickInfo(false);
    setShowFormatDetails(false); setGuideIndex(0); setSpotlightRect(null); setPreviewAst(null);
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  }, [onOpenChange, resetState]);

  const handlePaste = useCallback(async () => {
    try { const text = await navigator.clipboard.readText(); setRawInput(text); }
    catch (err) { console.error(t("importDialog.clipboardReadFailed"), err); }
  }, [t]);

  const runPreprocess = useCallback((sourceInput: string, { allowSample = false } = {}): boolean => {
    const hasInput = Boolean(sourceInput?.trim());
    const fallbackSample = t("importDialog.guideSampleScript");
    const inputText = hasInput ? sourceInput : (allowSample ? fallbackSample : "");
    if (!inputText.trim()) return false;
    if (!hasInput && allowSample) setRawInput(inputText);

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

  const finishGuide = useCallback(() => {
    setShowGuide(false); setSpotlightRect(null);
    try { localStorage.setItem(GUIDE_STORAGE_KEY, "1"); } catch (err) { console.error("Failed to save guide state", err); }
  }, []);

  const jumpGuide = useCallback((index: number) => {
    const next = guideSteps[index];
    if (!next) return;
    if (next.step === STEPS.INPUT) setStep(STEPS.INPUT);
    else if (next.step === STEPS.PREVIEW) { if (!runPreprocess(rawInput, { allowSample: true })) return; }
    else if (next.step === STEPS.RESULT) {
      const ok = preprocessResult?.cleanedText ? true : runPreprocess(rawInput, { allowSample: true });
      if (!ok) return;
      setStep(STEPS.RESULT);
    }
    setGuideIndex(index); setShowGuide(true);
  }, [guideSteps, preprocessResult, rawInput, runPreprocess]);

  const handleGuideNext = useCallback(() => {
    if (guideIndex >= guideSteps.length - 1) { finishGuide(); return; }
    jumpGuide(guideIndex + 1);
  }, [finishGuide, guideIndex, guideSteps.length, jumpGuide]);

  const handleGuidePrev = useCallback(() => { if (guideIndex > 0) jumpGuide(guideIndex - 1); }, [guideIndex, jumpGuide]);
  const handleGuideStart = useCallback(() => { jumpGuide(0); }, [jumpGuide]);

  const refreshSpotlight = useCallback(() => {
    if (!showGuide) { setSpotlightRect(null); return; }
    const target = currentGuideTargetRef?.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const pad = 8;
    setSpotlightRect({ top: Math.max(8, rect.top - pad), left: Math.max(8, rect.left - pad), width: Math.max(48, rect.width + pad * 2), height: Math.max(48, rect.height + pad * 2) });
  }, [currentGuideTargetRef, showGuide]);

  useEffect(() => {
    if (!showGuide) return;
    const raf = window.requestAnimationFrame(refreshSpotlight);
    window.addEventListener("resize", refreshSpotlight);
    window.addEventListener("scroll", refreshSpotlight, true);
    return () => { window.cancelAnimationFrame(raf); window.removeEventListener("resize", refreshSpotlight); window.removeEventListener("scroll", refreshSpotlight, true); };
  }, [showGuide, step, guideIndex, refreshSpotlight]);

  useEffect(() => {
    if (!open) return;
    try { if (localStorage.getItem(GUIDE_STORAGE_KEY) !== "1") jumpGuide(0); }
    catch (err) { console.error("Failed to read guide state", err); }
  }, [open, jumpGuide]);

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
    showGuide, showFormatQuickInfo, setShowFormatQuickInfo,
    showFormatDetails, setShowFormatDetails,
    guideIndex, guideSteps, currentGuide, spotlightRect,
    preprocessResult, setPreprocessResult, metadata, setMetadata,
    metadataParseResult, previewMarkerConfigs, previewAst,
    guidePasteRef, guideCharacterRef, guidePreviewRef, guideResultRef,
    handleOpenChange, handlePaste, handlePreprocess, handleToResult,
    handleSetPreviewText, handleAutoRemoveWhitespace,
    handleApplyParsedMetadataRemoval, handleConfirmImport,
    handleGuideStart, handleGuideNext, handleGuidePrev, finishGuide,
    markerRows, detailRows,
  };
}

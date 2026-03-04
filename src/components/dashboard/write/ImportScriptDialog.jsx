import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Loader2, ClipboardPaste, FileText, Eye, CheckCircle2, CircleHelp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { Switch } from "../../ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../ui/dialog";
import { ScrollArea } from "../../ui/scroll-area";
import { useToast } from "../../ui/toast";
import { useI18n } from "../../../contexts/I18nContext";
import { ScriptRenderer } from "../../renderer/ScriptRenderer";
import { SpotlightGuideOverlay } from "../../common/SpotlightGuideOverlay";

// Sub-components
import { ImportStageInput } from "./import/ImportStageInput";
import { ImportStagePreview } from "./import/ImportStagePreview";

// 三階段處理流程 (純 Marker 模式)
import { preprocess } from "../../../lib/importPipeline/textPreprocessor.js";
import { extractMetadata } from "../../../lib/importPipeline/metadataExtractor.js";
import { parseScreenplay } from "../../../lib/screenplayAST";
import { getDefaultMarkerRules } from "../../../constants/defaultMarkerRules";

const STEPS = {
    INPUT: 'input',       // 貼入文本
    PREVIEW: 'preview',   // 預處理預覽
    RESULT: 'result'      // 結果確認
};
const GUIDE_STORAGE_KEY = "import-guide-seen-v1";

const MAX_IMPORT_FILE_MB = 5;
const SCRIPT_INFO_FIELDS = ["Title", "Author", "Description", "Tags", "Rating", "Duration", "Source"];

const pickDefaultScriptInfo = (input = {}) => {
    const next = {};
    for (const key of SCRIPT_INFO_FIELDS) {
        const value = input?.[key];
        if (typeof value === "string" && value.trim()) {
            next[key] = value.trim();
        }
    }
    return next;
};

const normalizeNameKey = (name = "") => name.trim().toLowerCase();

const parseCharacterNames = (raw = "") => {
    return String(raw)
        .split(/\r?\n|,|，|、/)
        .map((v) => v.trim())
        .filter(Boolean);
};

const applyWholeLineCharacterTagging = (text = "", characterNames = []) => {
    if (!text) return text;
    if (!Array.isArray(characterNames) || characterNames.length === 0) return text;

    const nameMap = new Map();
    characterNames.forEach((name) => {
        const key = normalizeNameKey(name);
        if (key && !nameMap.has(key)) nameMap.set(key, name);
    });
    if (nameMap.size === 0) return text;

    return String(text)
        .split("\n")
        .map((line) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (/^#C\b/i.test(trimmed)) return line;
            const hit = nameMap.get(normalizeNameKey(trimmed));
            if (!hit) return line;
            return `#C ${hit}`;
        })
        .join("\n");
};

const autoRemoveWhitespace = (text = "") => {
    return String(text || "")
        .split("\n")
        .map((line) => line.replace(/\s+$/g, ""))
        .filter((line) => line.trim().length > 0)
        .join("\n")
        .trim();
};

export function ImportScriptDialog({
    open,
    onOpenChange,
    onImport,
    currentPath
}) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [step, setStep] = useState(STEPS.INPUT);
    const [rawInput, setRawInput] = useState("");
    const [title, setTitle] = useState("");
    const [autoCharacterWholeLine, setAutoCharacterWholeLine] = useState(false);
    const [characterNamesInput, setCharacterNamesInput] = useState("");
    const [importing, setImporting] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [showFormatQuickInfo, setShowFormatQuickInfo] = useState(false);
    const [guideIndex, setGuideIndex] = useState(0);
    const [spotlightRect, setSpotlightRect] = useState(null);
    const { toast } = useToast();
    const guidePasteRef = useRef(null);
    const guideCharacterRef = useRef(null);
    const guidePreviewRef = useRef(null);
    const guideResultRef = useRef(null);
    
    // 處理結果
    const [preprocessResult, setPreprocessResult] = useState(null);
    const [metadata, setMetadata] = useState({});
    const previewMarkerConfigs = getDefaultMarkerRules();
    const previewAst = preprocessResult?.cleanedText
        ? parseScreenplay(preprocessResult.cleanedText, previewMarkerConfigs).ast
        : null;
    const guideSteps = [
        {
            title: t("importDialog.guideStepPasteTitle"),
            description: t("importDialog.guideStepPasteDesc"),
            step: STEPS.INPUT,
            focus: "paste",
        },
        {
            title: t("importDialog.guideStepCharacterTitle"),
            description: t("importDialog.guideStepCharacterDesc"),
            step: STEPS.INPUT,
            focus: "character",
        },
        {
            title: t("importDialog.guideStepPreviewTitle"),
            description: t("importDialog.guideStepPreviewDesc"),
            step: STEPS.PREVIEW,
            focus: "preview",
        },
        {
            title: t("importDialog.guideStepConfirmTitle"),
            description: t("importDialog.guideStepConfirmDesc"),
            step: STEPS.RESULT,
            focus: "result",
        },
    ];
    const currentGuide = showGuide ? guideSteps[guideIndex] : null;
    const currentGuideTargetRef = useMemo(() => {
        if (!currentGuide) return null;
        if (currentGuide.focus === "paste") return guidePasteRef;
        if (currentGuide.focus === "character") return guideCharacterRef;
        if (currentGuide.focus === "preview") return guidePreviewRef;
        if (currentGuide.focus === "result") return guideResultRef;
        return null;
    }, [currentGuide]);
    const markerRows = useMemo(
        () => ([
            { marker: "1. 第一章", meaning: t("importFormat.markerChapter") },
            { marker: "#C 小雨", meaning: t("importFormat.markerCharacter") },
            { marker: "(低聲)", meaning: t("importFormat.markerTone") },
            { marker: "【殘響】", meaning: t("importFormat.markerPostFx") },
            { marker: "#SE 關門聲", meaning: t("importFormat.markerSeSingle") },
            { marker: "//BG 夜晚街景", meaning: t("importFormat.markerBg") },
            { marker: "@舞台左側", meaning: t("importFormat.markerPosition") },
        ]),
        [t]
    );
    
    // 重置狀態
    const resetState = useCallback(() => {
        setStep(STEPS.INPUT);
        setRawInput("");
        setTitle("");
        setAutoCharacterWholeLine(false);
        setCharacterNamesInput("");
        setPreprocessResult(null);
        setMetadata({});
        setShowGuide(false);
        setShowFormatQuickInfo(false);
        setGuideIndex(0);
        setSpotlightRect(null);
    }, []);
    
    // 處理對話框關閉
    const handleOpenChange = useCallback((isOpen) => {
        if (!isOpen) {
            resetState();
        }
        onOpenChange(isOpen);
    }, [onOpenChange, resetState]);
    
    // 從剪貼簿貼上
    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setRawInput(text);
        } catch (err) {
            console.error(t("importDialog.clipboardReadFailed"), err);
        }
    }, [t]);

    const runPreprocess = useCallback((sourceInput, { allowSample = false } = {}) => {
        const hasInput = Boolean(sourceInput?.trim());
        const fallbackSample = t("importDialog.guideSampleScript");
        const inputText = hasInput
            ? sourceInput
            : (allowSample ? fallbackSample : "");
        if (!inputText.trim()) return false;
        if (!hasInput && allowSample) {
            setRawInput(inputText);
        }
        const characterNames = parseCharacterNames(characterNamesInput);
        const sourceText = autoCharacterWholeLine
            ? applyWholeLineCharacterTagging(inputText, characterNames)
            : inputText;

        // 1. 基本清理
        const result = preprocess(sourceText);
        setPreprocessResult(result);
        
        // 2. Metadata 提取
        const { metadata: extractedMeta } = extractMetadata(result.cleanedText);
        const parsedInfo = pickDefaultScriptInfo(extractedMeta);
        setMetadata(parsedInfo);
        
        // 自動偵測標題 (優先使用 Metadata Title, 否則嘗試 Regex)
        if (!title) {
            if (parsedInfo?.Title) {
                setTitle(parsedInfo.Title);
            } else {
                // Fallback logic
                const lines = result.cleanedText.split('\n');
                const firstContentLine = lines.find(l => l.trim() && !l.startsWith('#'));
                if (firstContentLine) {
                     const chapterMatch = firstContentLine.match(/^\d+\.\s*(.+)$/);
                     if (chapterMatch) {
                         setTitle(chapterMatch[1].substring(0, 30));
                     }
                }
            }
        }
        
        setStep(STEPS.PREVIEW);
        return true;
    }, [title, autoCharacterWholeLine, characterNamesInput, t]);

    // Stage 1: 預處理
    const handlePreprocess = useCallback(() => {
        runPreprocess(rawInput);
    }, [rawInput, runPreprocess]);

    // Stage 2: 預覽後直接進入確認
    const handleToResult = useCallback(() => {
        if (!preprocessResult) return;
        setStep(STEPS.RESULT);
    }, [preprocessResult]);

    const finishGuide = useCallback(() => {
        resetState();
        try {
            localStorage.setItem(GUIDE_STORAGE_KEY, "1");
        } catch (err) {
            console.error("Failed to save guide state", err);
        }
    }, [resetState]);

    const jumpGuide = useCallback((index) => {
        const next = guideSteps[index];
        if (!next) return;
        if (next.step === STEPS.INPUT) {
            setStep(STEPS.INPUT);
        } else if (next.step === STEPS.PREVIEW) {
            const ok = runPreprocess(rawInput, { allowSample: true });
            if (!ok) return;
        } else if (next.step === STEPS.RESULT) {
            const ok = preprocessResult?.cleanedText
                ? true
                : runPreprocess(rawInput, { allowSample: true });
            if (!ok) return;
            setStep(STEPS.RESULT);
        }
        setGuideIndex(index);
        setShowGuide(true);
    }, [guideSteps, preprocessResult, rawInput, runPreprocess]);

    const handleGuideNext = useCallback(() => {
        if (guideIndex >= guideSteps.length - 1) {
            finishGuide();
            return;
        }
        jumpGuide(guideIndex + 1);
    }, [finishGuide, guideIndex, guideSteps.length, jumpGuide]);

    const handleGuidePrev = useCallback(() => {
        if (guideIndex <= 0) return;
        jumpGuide(guideIndex - 1);
    }, [guideIndex, jumpGuide]);

    const handleGuideStart = useCallback(() => {
        jumpGuide(0);
    }, [jumpGuide]);

    const refreshSpotlight = useCallback(() => {
        if (!showGuide) {
            setSpotlightRect(null);
            return;
        }
        const target = currentGuideTargetRef?.current;
        if (!target) {
            return;
        }
        const rect = target.getBoundingClientRect();
        const pad = 8;
        setSpotlightRect({
            top: Math.max(8, rect.top - pad),
            left: Math.max(8, rect.left - pad),
            width: Math.max(48, rect.width + pad * 2),
            height: Math.max(48, rect.height + pad * 2),
        });
    }, [currentGuideTargetRef, showGuide]);

    useEffect(() => {
        if (!showGuide) return;
        const raf = window.requestAnimationFrame(refreshSpotlight);
        window.addEventListener("resize", refreshSpotlight);
        window.addEventListener("scroll", refreshSpotlight, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener("resize", refreshSpotlight);
            window.removeEventListener("scroll", refreshSpotlight, true);
        };
    }, [showGuide, step, guideIndex, refreshSpotlight]);

    useEffect(() => {
        if (!open) return;
        try {
            const seen = localStorage.getItem(GUIDE_STORAGE_KEY) === "1";
            if (!seen) {
                jumpGuide(0);
                localStorage.setItem(GUIDE_STORAGE_KEY, "1");
            }
        } catch (err) {
            console.error("Failed to read guide state", err);
        }
    }, [open, jumpGuide]);

    // 生成 Fountain Metadata Header
    const generateMetadataHeader = useCallback((meta) => {
        const lines = [];
        for (const key of SCRIPT_INFO_FIELDS) {
            if (meta[key]) {
                lines.push(`${key}: ${meta[key]}`);
            }
        }
        return lines.length > 0 ? lines.join('\n') + '\n\n' : '';
    }, []);

    // 確認匯入（純 Marker 模式：儲存原始 cleanedText）
    const handleConfirmImport = useCallback(async () => {
        if (!preprocessResult?.cleanedText) return;
        
        setImporting(true);
        try {
            const resolvedTitle = title.trim() || metadata?.Title?.trim() || "未命名劇本";
            const normalizedMetadata = pickDefaultScriptInfo({
                ...metadata,
                Title: resolvedTitle,
            });
            // 將 Metadata 加入到內容開頭
            const metadataHeader = generateMetadataHeader(normalizedMetadata);
            const contentWithMeta = metadataHeader + preprocessResult.cleanedText;
            
            await onImport({
                title: resolvedTitle,
                content: contentWithMeta,
                folder: currentPath,
                metadata: normalizedMetadata
            });
            handleOpenChange(false);
        } catch (err) {
            console.error(t("importDialog.importFailedLog"), err);
            const message = String(err?.message || "");
            const payloadTooLarge = /payload too large|413/i.test(message);
            toast({
                title: t("importDialog.importFailed"),
                description: payloadTooLarge
                    ? t("importDialog.payloadTooLarge").replace("{maxMb}", String(MAX_IMPORT_FILE_MB))
                    : t("importDialog.importTrySmaller"),
                variant: "destructive",
            });
        } finally {
            setImporting(false);
        }
    }, [preprocessResult, title, currentPath, onImport, handleOpenChange, metadata, generateMetadataHeader, toast, t]);

    // ... (return JSX)

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-w-5xl h-[85vh] flex flex-col"
                onInteractOutside={(e) => {
                    if (showGuide) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (showGuide) e.preventDefault();
                }}
            >
                <DialogHeader>
                    <div className="flex items-center justify-between gap-2">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {t("importDialog.title")}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowFormatQuickInfo(true)}>
                                {t("importDialog.formatGuide")}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={handleGuideStart}>
                                <CircleHelp className="w-4 h-4 mr-1" />
                                {t("importDialog.help")}
                            </Button>
                        </div>
                    </div>
                    <DialogDescription>
                         {t("importDialog.descDefault")}
                    </DialogDescription>
                </DialogHeader>
                
                {/* 步驟指示器 */}
                <div className="flex items-center gap-2 text-sm border-b pb-4">
                     {[
                        { key: STEPS.INPUT, label: t("importDialog.stepInput"), icon: ClipboardPaste },
                        { key: STEPS.PREVIEW, label: t("importDialog.stepPreprocess"), icon: Eye },
                        { key: STEPS.RESULT, label: t("importDialog.stepConfirm"), icon: CheckCircle2 }
                    ].map((s, i) => (
                        <React.Fragment key={s.key}>
                            {i > 0 && <div className="w-8 h-px bg-border" />}
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                                step === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                            }`}>
                                <s.icon className="w-4 h-4" />
                                <span>{s.label}</span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex-1 overflow-hidden min-h-0 pt-4">
                    {/* Step 1: 輸入內容 */}
                    {step === STEPS.INPUT && (
                        <div className="flex flex-col gap-4 h-full">
                            <div ref={guidePasteRef} className="flex flex-col gap-4">
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder={t("importDialog.scriptTitle")}
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="outline" size="sm" onClick={handlePaste}>
                                    <ClipboardPaste className="w-4 h-4 mr-1" />
                                    {t("importDialog.paste")}
                                </Button>
                            </div>
                            <ImportStageInput 
                                    text={rawInput}
                                    setText={setRawInput}
                                />
                            </div>
                            <div ref={guideCharacterRef} className="border rounded-md p-3 space-y-2 bg-muted/20">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="auto-character-whole-line">{t("importDialog.characterAutoLabel")}</Label>
                                        <p className="text-xs text-muted-foreground">{t("importDialog.characterAutoDesc")}</p>
                                    </div>
                                    <Switch
                                        id="auto-character-whole-line"
                                        checked={autoCharacterWholeLine}
                                        onCheckedChange={(checked) => setAutoCharacterWholeLine(Boolean(checked))}
                                    />
                                </div>
                                {autoCharacterWholeLine && (
                                    <Textarea
                                        className="min-h-[88px] font-mono text-xs"
                                        placeholder={t("importDialog.characterListPlaceholder")}
                                        value={characterNamesInput}
                                        onChange={(e) => setCharacterNamesInput(e.target.value)}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: 預覽與清理 */}
                    {step === STEPS.PREVIEW && preprocessResult && (
                        <div ref={guidePreviewRef} className="h-full">
                            <ImportStagePreview 
                                previewText={preprocessResult.cleanedText}
                                setPreviewText={(val) => setPreprocessResult(prev => ({...prev, cleanedText: val}))}
                                onAutoRemoveWhitespace={() =>
                                    setPreprocessResult((prev) => ({
                                        ...prev,
                                        cleanedText: autoRemoveWhitespace(prev?.cleanedText || ""),
                                    }))
                                }
                            />
                        </div>
                    )}

                     {/* Step 3: Final Confirmation */}
                     {step === STEPS.RESULT && preprocessResult?.cleanedText && (
                        <div ref={guideResultRef} className="flex flex-col gap-4 h-full">
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {t("importDialog.ready")}
                            </div>
                             <Input 
                                placeholder={t("importDialog.scriptTitle")}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="min-h-0 border rounded relative">
                                    <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
                                        {t("importDialog.resultTextLabel")}
                                    </div>
                                    <ScrollArea className="h-[calc(100%-33px)] absolute inset-x-0 bottom-0 top-[33px]">
                                        <div className="p-4">
                                            <pre className="text-xs font-mono whitespace-pre-wrap">{preprocessResult.cleanedText}</pre>
                                        </div>
                                    </ScrollArea>
                                </div>
                                <div className="min-h-0 border rounded relative bg-background">
                                    <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
                                        {t("importDialog.resultRenderLabel")}
                                    </div>
                                    <ScrollArea className="h-[calc(100%-33px)] absolute inset-x-0 bottom-0 top-[33px]">
                                        <div className="p-4">
                                            {previewAst ? (
                                                <ScriptRenderer
                                                    ast={previewAst}
                                                    markerConfigs={previewMarkerConfigs}
                                                    colorCache={{ current: new Map() }}
                                                    fontSize={14}
                                                />
                                            ) : null}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </div>
                        </div>
                     )}
                </div>

                <DialogFooter className="gap-2 pt-2 border-t mt-auto">
                    {step !== STEPS.INPUT && (
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                const steps = [STEPS.INPUT, STEPS.PREVIEW, STEPS.RESULT];
                                const currentIndex = steps.indexOf(step);
                                if (currentIndex > 0) setStep(steps[currentIndex - 1]);
                            }}
                        >
                            {t("importDialog.prevStep")}
                        </Button>
                    )}
                    
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>{t("common.cancel")}</Button>
                    
                    {step === STEPS.INPUT && (
                        <Button onClick={handlePreprocess} disabled={!rawInput.trim()}>{t("importDialog.nextPreprocess")}</Button>
                    )}
                    
                    {step === STEPS.PREVIEW && (
                        <Button onClick={handleToResult}>{t("importDialog.nextConfirm")}</Button>
                    )}
                    
                    {step === STEPS.RESULT && (
                        <Button onClick={handleConfirmImport} disabled={importing}>
                            {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {t("importDialog.confirmImport")}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <SpotlightGuideOverlay
            open={showGuide && Boolean(currentGuide)}
            zIndex={200}
            spotlightRect={spotlightRect}
            currentStep={guideIndex + 1}
            totalSteps={guideSteps.length}
            title={currentGuide?.title}
            description={currentGuide?.description}
            onSkip={finishGuide}
            skipLabel={t("importDialog.guideSkip")}
            onPrev={handleGuidePrev}
            prevLabel={t("importDialog.guidePrev")}
            prevDisabled={guideIndex === 0}
            onNext={handleGuideNext}
            nextLabel={guideIndex === guideSteps.length - 1 ? t("importDialog.guideDone") : t("importDialog.guideNext")}
        />
        <Dialog open={showFormatQuickInfo} onOpenChange={setShowFormatQuickInfo}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("importDialog.formatQuickTitle")}</DialogTitle>
                    <DialogDescription>{t("importDialog.formatQuickDesc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>{t("publicHelp.importQuickItem1")}</p>
                    <p>{t("publicHelp.importQuickItem2")}</p>
                    <p>{t("publicHelp.importQuickItem3")}</p>
                </div>
                <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-[145px_1fr] bg-muted/40 text-xs font-medium">
                        <div className="px-3 py-2 border-r">{t("importFormat.markerCol")}</div>
                        <div className="px-3 py-2">{t("importFormat.meaningCol")}</div>
                    </div>
                    {markerRows.map((row) => (
                        <div key={row.marker} className="grid grid-cols-[145px_1fr] text-sm border-t">
                            <div className="px-3 py-2 border-r font-mono">{row.marker}</div>
                            <div className="px-3 py-2 text-muted-foreground">{row.meaning}</div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowFormatQuickInfo(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        onClick={() => {
                            setShowFormatQuickInfo(false);
                            navigate("/help/import-format");
                        }}
                    >
                        {t("importDialog.formatGuideDetail")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        </>
    );
}

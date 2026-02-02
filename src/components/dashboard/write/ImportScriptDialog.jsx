import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2, ClipboardPaste, FileText, Eye, Wand2, CheckCircle2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../ui/dialog";
import { ScrollArea } from "../../ui/scroll-area";
import { parseScreenplay } from "../../../lib/screenplayAST.js";
import { useSettings } from "../../../contexts/SettingsContext";

// Sub-components
import { ImportStageInput } from "./import/ImportStageInput";
import { ImportStagePreview } from "./import/ImportStagePreview";
import { ImportStageConfigure } from "./import/ImportStageConfigure";

// 三階段處理流程 (純 Marker 模式)
import { preprocess, TextPreprocessor } from "../../../lib/importPipeline/textPreprocessor.js";
import { discoverMarkers, MarkerDiscoverer } from "../../../lib/importPipeline/markerDiscoverer.js";
import { buildAST } from "../../../lib/importPipeline/directASTBuilder.js";
import { extractMetadata } from "../../../lib/importPipeline/metadataExtractor.js";

const STEPS = {
    INPUT: 'input',       // 貼入文本
    PREVIEW: 'preview',   // 預處理預覽
    CONFIGURE: 'configure', // 設定選擇 (New)
    RESULT: 'result'      // 結果確認
};

export function ImportScriptDialog({
    open,
    onOpenChange,
    onImport,
    currentPath,
    existingMarkerConfigs = [],
    cloudConfigs = []
}) {
    const [step, setStep] = useState(STEPS.INPUT);
    const [rawInput, setRawInput] = useState("");
    const [title, setTitle] = useState("");
    const [metadataInput, setMetadataInput] = useState(""); // Metadata 貼上區
    const [importing, setImporting] = useState(false);
    
    // 處理結果
    const [preprocessResult, setPreprocessResult] = useState(null);
    const [discoveryResult, setDiscoveryResult] = useState(null);
    const [metadata, setMetadata] = useState({}); // New State
    
    // Config State
    const [selectedConfigId, setSelectedConfigId] = useState('auto');
    const [activeRules, setActiveRules] = useState([]);
    const [showSaveAlert, setShowSaveAlert] = useState(false); // Save Prompt
    
    // Result State
    const [ast, setAst] = useState(null);
    
    // 重置狀態
    const resetState = useCallback(() => {
        setStep(STEPS.INPUT);
        setRawInput("");
        setTitle("");
        setPreprocessResult(null);
        setDiscoveryResult(null);
        setSelectedConfigId('auto');
        setActiveRules([]);
        setAst(null);
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
            console.error("無法讀取剪貼簿:", err);
        }
    }, []);

    // 處理檔案上傳
    const handleFileUpload = useCallback((e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 簡單處理文字檔
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            setRawInput(content);
        };
        reader.readAsText(file);
    }, []);
    
    // Stage 1: 預處理
    const handlePreprocess = useCallback(() => {
        if (!rawInput.trim() && !metadataInput.trim()) return;
        
        // 合併 Metadata 與 本文
        const fullText = (metadataInput.trim() ? metadataInput.trim() + '\n\n' : '') + rawInput;

        // 1. 基本清理
        const result = preprocess(fullText);
        setPreprocessResult(result);
        
        // 2. Metadata 提取
        const { metadata: extractedMeta } = extractMetadata(result.cleanedText);
        setMetadata(extractedMeta);
        
        // 自動偵測標題 (優先使用 Metadata Title, 否則嘗試 Regex)
        if (!title) {
            if (extractedMeta && extractedMeta.Title) {
                setTitle(extractedMeta.Title);
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
    }, [rawInput, title, metadataInput]);

    // Stage 2: 標記發現 & 進入設定階段
    const handleDiscoverMarkers = useCallback(() => {
        if (!preprocessResult) return;
        
        // 1. 執行自動偵測
        const result = discoverMarkers(preprocessResult.cleanedText, existingMarkerConfigs);
        setDiscoveryResult(result);
        
        // 2. 決定預設 Config
        // 如果有雲端設定，預設使用第一個；否則使用自動偵測
        if (cloudConfigs && cloudConfigs.length > 0) {
            setSelectedConfigId(cloudConfigs[0].id);
            // 修正：使用 configs 屬性，並增加容錯
            setActiveRules(cloudConfigs[0].configs || cloudConfigs[0].markers || []);
        } else {
            setSelectedConfigId('auto');
            // 自動偵測預設選取高信心度的
            const autoRules = result.discoveredMarkers
                .filter(m => m._discovery.confidence >= 0.6)
                .map(m => MarkerDiscoverer.toMarkerConfig(m));
            setActiveRules([...existingMarkerConfigs, ...autoRules]);
        }
        
        setStep(STEPS.CONFIGURE);
    }, [preprocessResult, existingMarkerConfigs, cloudConfigs]);
    
    // 切換 Config
    const handleConfigChange = useCallback((configId) => {
        setSelectedConfigId(configId);
        
        if (configId === 'auto') {
            // 回到自動偵測
             const autoRules = discoveryResult.discoveredMarkers
                .filter(m => m._discovery.confidence >= 0.6)
                .map(m => MarkerDiscoverer.toMarkerConfig(m));
            setActiveRules([...existingMarkerConfigs, ...autoRules]);
        } else {
            // 使用選定的雲端設定
            const config = cloudConfigs.find(c => c.id === configId);
            if (config) {
                 // 修正：使用 configs 屬性
                 setActiveRules(config.configs || config.markers || []);
            }
        }
    }, [cloudConfigs, discoveryResult, existingMarkerConfigs]);

    // Context & Save Logic
    const { addTheme } = useSettings();

    // 儲存設定 (Passed down to child)
    // const [newConfigName, setNewConfigName] = useState("");
    // const [savePopoverOpen, setSavePopoverOpen] = useState(false);
    // ... replaced by direct arrow function props or moved logic

    // 純 Marker 模式：直接使用 buildAST 產生的 AST
    const renderAst = useMemo(() => {
        if (!preprocessResult || !activeRules) return null;
        try {
            // 直接使用 DirectASTBuilder 產生 AST，不再經過 fountain-js
            return buildAST(preprocessResult.cleanedText, activeRules);
        } catch (e) {
            console.error("AST Building Failed:", e);
            return null;
        }
    }, [preprocessResult, activeRules]);

    // Stage 3: 確認設定並進入最終結果
    const handleConfirmConfig = useCallback(() => {
        // 如果是自動偵測，且尚未儲存，提示儲存
        if (selectedConfigId === 'auto') {
            setShowSaveAlert(true);
            return;
        }
        
        setAst(renderAst); 
        setStep(STEPS.RESULT);
    }, [renderAst, selectedConfigId]);

    const handleProceedWithoutSave = useCallback(() => {
        setShowSaveAlert(false);
        setAst(renderAst);
        setStep(STEPS.RESULT);
    }, [renderAst]);



    // 生成 Fountain Metadata Header
    const generateMetadataHeader = useCallback((meta) => {
        const lines = [];
        const order = ['Title', 'Author', 'Source', 'Description', 'Rating', 'Duration', 'Tags'];
        for (const key of order) {
            if (meta[key]) {
                lines.push(`${key}: ${meta[key]}`);
            }
        }
        // 其他自訂欄位
        for (const [key, value] of Object.entries(meta)) {
            if (!order.includes(key) && value) {
                lines.push(`${key}: ${value}`);
            }
        }
        return lines.length > 0 ? lines.join('\n') + '\n\n' : '';
    }, []);

    // 確認匯入（純 Marker 模式：儲存原始 cleanedText）
    const handleConfirmImport = useCallback(async () => {
        if (!preprocessResult?.cleanedText || !title.trim()) return;
        
        setImporting(true);
        try {
            // 將 Metadata 加入到內容開頭
            const metadataHeader = generateMetadataHeader(metadata);
            const contentWithMeta = metadataHeader + preprocessResult.cleanedText;
            
            await onImport({
                title: title.trim(),
                content: contentWithMeta,
                folder: currentPath,
                metadata: metadata
            });
            handleOpenChange(false);
        } catch (err) {
            console.error("匯入失敗:", err);
        } finally {
            setImporting(false);
        }
    }, [preprocessResult, title, currentPath, onImport, handleOpenChange, metadata, generateMetadataHeader]);

    // ... (return JSX)

    return (
        <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        匯入台本
                    </DialogTitle>
                    <DialogDescription>
                         {step === STEPS.CONFIGURE ? "選擇解析設定並預覽結果" : "貼入台本文字，系統將自動偵測格式並轉換"}
                    </DialogDescription>
                </DialogHeader>
                
                {/* 步驟指示器 */}
                <div className="flex items-center gap-2 text-sm border-b pb-4">
                     {[
                        { key: STEPS.INPUT, label: '貼入', icon: ClipboardPaste },
                        { key: STEPS.PREVIEW, label: '預處理', icon: Eye },
                        { key: STEPS.CONFIGURE, label: '設定與預覽', icon: Wand2 },
                        { key: STEPS.RESULT, label: '確認', icon: CheckCircle2 }
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
                            <div className="flex items-center gap-2">
                                <Input 
                                    placeholder="劇本標題"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="outline" size="sm" onClick={handlePaste}>
                                    <ClipboardPaste className="w-4 h-4 mr-1" />
                                    貼上
                                </Button>
                            </div>
                            <ImportStageInput 
                                    text={rawInput}
                                    setText={setRawInput}
                                    metadataText={metadataInput}
                                    setMetadataText={setMetadataInput}
                                    onFileUpload={handleFileUpload}
                                    isUploading={importing}
                                /> 
                        </div>
                    )}

                    {/* Step 2: 預覽與清理 */}
                    {step === STEPS.PREVIEW && preprocessResult && (
                        <ImportStagePreview 
                            previewText={preprocessResult.cleanedText}
                            setPreviewText={(val) => setPreprocessResult(prev => ({...prev, cleanedText: val}))}
                        />
                    )}

                     {/* Step 3: 設定與預覽 (New UI) */}
                     {step === STEPS.CONFIGURE && (
                        <ImportStageConfigure 
                            activeRules={activeRules}
                            setActiveRules={setActiveRules}
                            cloudConfigs={cloudConfigs}
                            selectedConfigId={selectedConfigId}
                            onConfigChange={handleConfigChange}
                            onSaveConfig={(name) => addTheme(name, activeRules)}
                            renderAst={renderAst}
                            metadata={metadata}
                            setMetadata={setMetadata}
                        />
                     )}

                     {/* Step 4: Final Confirmation */}
                     {step === STEPS.RESULT && preprocessResult?.cleanedText && (
                        <div className="flex flex-col gap-4 h-full">
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                準備完成！請確認標題與最終內容。
                            </div>
                             <Input 
                                placeholder="劇本標題"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                            <div className="flex-1 min-h-0 border rounded relative">
                                <ScrollArea className="h-full absolute inset-0">
                                    <div className="p-4">
                                        <pre className="text-xs font-mono whitespace-pre-wrap">{preprocessResult.cleanedText}</pre>
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                     )}
                </div>

                <DialogFooter className="gap-2 pt-2 border-t mt-auto">
                    {step !== STEPS.INPUT && (
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                const steps = [STEPS.INPUT, STEPS.PREVIEW, STEPS.CONFIGURE, STEPS.RESULT];
                                const currentIndex = steps.indexOf(step);
                                if (currentIndex > 0) setStep(steps[currentIndex - 1]);
                            }}
                        >
                            上一步
                        </Button>
                    )}
                    
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>取消</Button>
                    
                    {step === STEPS.INPUT && (
                        <Button onClick={handlePreprocess} disabled={!rawInput.trim()}>下一步：預處理</Button>
                    )}
                    
                    {step === STEPS.PREVIEW && (
                        <Button onClick={handleDiscoverMarkers}>下一步：設定與預覽</Button>
                    )}
                    
                    {step === STEPS.CONFIGURE && (
                        <Button onClick={handleConfirmConfig}>下一步：確認</Button>
                    )}
                    
                    {step === STEPS.RESULT && (
                        <Button onClick={handleConfirmImport} disabled={importing || !title.trim()}>
                            {importing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            確認匯入
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={showSaveAlert} onOpenChange={setShowSaveAlert}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>建議儲存解析規則</DialogTitle>
                    <DialogDescription>
                        您目前使用的是自動偵測的規則。建立專屬的設定檔可以確保未來匯入類似劇本時的準確性。
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setShowSaveAlert(false)}>返回儲存</Button>
                    <Button onClick={handleProceedWithoutSave}>不儲存，直接繼續</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

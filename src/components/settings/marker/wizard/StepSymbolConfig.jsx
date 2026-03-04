import React from 'react';
import { cn } from '../../../../lib/utils';
import { Input } from '../../../ui/input';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useI18n } from "../../../../contexts/I18nContext";
import { usePublicThemes } from "../../../../hooks/usePublicThemes";

export function evaluateMarkerSampleMatch({ markerType, config, sampleText, i18n = {} }) {
    const msg = {
        enterTestText: i18n.enterTestText || "Please enter test text first",
        setStartSymbol: i18n.setStartSymbol || "Please set a start symbol first",
        prefixMatched: i18n.prefixMatched || "Prefix match detected",
        prefixNotFound: i18n.prefixNotFound || "No line starts with \"{start}\"",
        needsEndSymbol: i18n.needsEndSymbol || "This mode requires an end symbol",
        pairMatched: i18n.pairMatched || "Paired symbols match detected",
        pairNotFound: i18n.pairNotFound || "No complete pair \"{start} ... {end}\" found",
        unsupportedMode: i18n.unsupportedMode || "This matching mode is not supported yet",
    };
    const text = String(sampleText || "");
    if (!text.trim()) {
        return { matched: false, reason: msg.enterTestText };
    }

    const start = String(config?.start || "").trim();
    const end = String(config?.end || "").trim();
    const mode = config?.matchMode || (markerType === "range" ? "range" : markerType === "inline" ? "enclosure" : "prefix");

    if (!start) {
        return { matched: false, reason: msg.setStartSymbol };
    }

    if (mode === "prefix") {
        const lines = text.split("\n");
        const matched = lines.some((line) => line.trimStart().startsWith(start));
        return {
            matched,
            reason: matched ? msg.prefixMatched : msg.prefixNotFound.replace("{start}", start),
        };
    }

    if (mode === "range" || mode === "enclosure") {
        if (!end) {
            return { matched: false, reason: msg.needsEndSymbol };
        }
        const startIndex = text.indexOf(start);
        const endIndex = text.indexOf(end, startIndex + start.length);
        const matched = startIndex >= 0 && endIndex > startIndex;
        return {
            matched,
            reason: matched
                ? msg.pairMatched
                : msg.pairNotFound.replace("{start}", start).replace("{end}", end),
        };
    }

    return { matched: false, reason: msg.unsupportedMode };
}

/**
 * Step 2: 符號設定
 * 根據選擇的類型顯示對應的符號輸入欄位
 */
export function StepSymbolConfig({ markerType, config, onChange }) {
    const { t } = useI18n();
    const [sampleText, setSampleText] = React.useState("");
    const [showPublicImport, setShowPublicImport] = React.useState(false);
    const [publicQuery, setPublicQuery] = React.useState("");
    const [selectedThemeId, setSelectedThemeId] = React.useState("");
    const [selectedPublicMarkerId, setSelectedPublicMarkerId] = React.useState("");
    const [copyMode, setCopyMode] = React.useState("all"); // all | logic | style
    const {
        themes: publicThemes,
        loading: publicLoading,
        error: publicError,
        refresh: refreshPublicThemes
    } = usePublicThemes({ t, errorKey: "stepSymbolConfig.loadPublicThemeFailed" });
    const updateField = (field, value) => {
        onChange({ ...config, [field]: value });
    };

    const isRange = markerType === 'range';
    const isInline = markerType === 'inline';
    const isSingle = markerType === 'single';

    // 驗證必填欄位
    const hasStartSymbol = config.start && config.start.trim() !== '';
    const hasEndSymbol = config.end && config.end.trim() !== '';
    const hasLabel = config.label && config.label.trim() !== '';
    const sampleResult = evaluateMarkerSampleMatch({
        markerType,
        config,
        sampleText,
        i18n: {
            enterTestText: t("stepSymbolConfig.reasonEnterTestText"),
            setStartSymbol: t("stepSymbolConfig.reasonSetStartSymbol"),
            prefixMatched: t("stepSymbolConfig.reasonPrefixMatched"),
            prefixNotFound: t("stepSymbolConfig.reasonPrefixNotFound"),
            needsEndSymbol: t("stepSymbolConfig.reasonNeedsEndSymbol"),
            pairMatched: t("stepSymbolConfig.reasonPairMatched"),
            pairNotFound: t("stepSymbolConfig.reasonPairNotFound"),
            unsupportedMode: t("stepSymbolConfig.reasonUnsupportedMode"),
        },
    });
    const filteredPublicThemes = React.useMemo(() => {
        const q = publicQuery.trim().toLowerCase();
        if (!q) return publicThemes;
        return publicThemes.filter((theme) => {
            const themeText = `${theme.name || ""} ${theme.description || ""}`.toLowerCase();
            if (themeText.includes(q)) return true;
            return (theme.configs || []).some((marker) =>
                `${marker.label || ""} ${marker.id || ""} ${marker.start || ""} ${marker.end || ""}`.toLowerCase().includes(q)
            );
        });
    }, [publicThemes, publicQuery]);

    const selectedTheme = filteredPublicThemes.find((theme) => theme.id === selectedThemeId) || null;
    const selectedThemeMarkers = selectedTheme?.configs || [];
    const filteredThemeMarkers = React.useMemo(() => {
        const q = publicQuery.trim().toLowerCase();
        if (!q) return selectedThemeMarkers;
        return selectedThemeMarkers.filter((marker) =>
            `${marker.label || ""} ${marker.id || ""} ${marker.start || ""} ${marker.end || ""}`.toLowerCase().includes(q)
        );
    }, [selectedThemeMarkers, publicQuery]);
    const selectedPublicMarker =
        filteredThemeMarkers.find((marker) => (marker.id || marker.label) === selectedPublicMarkerId) || null;

    const buildSampleFromPublicMarker = (marker) => {
        if (!marker) return "";
        const start = marker.start || "#MARK";
        const end = marker.end || "";
        const label = marker.label || marker.id || t("stepSymbolConfig.sampleMarkerContent");
        const mode = marker.matchMode || "prefix";
        if (mode === "prefix") return `${start} ${label} ${t("stepSymbolConfig.sampleWord")}`;
        if (mode === "range") {
            return `${start} ${label} ${t("stepSymbolConfig.sampleStart")}\n${t("stepSymbolConfig.sampleRangeBody")}\n${end || start} ${label} ${t("stepSymbolConfig.sampleEnd")}`;
        }
        return `${start}${label}${end || ""}`;
    };

    const loadPublicMarkerThemes = async () => {
        const normalized = await refreshPublicThemes();
        const firstThemeId = normalized[0]?.id || "";
        setSelectedThemeId(firstThemeId);
        const firstMarker = normalized[0]?.configs?.[0];
        setSelectedPublicMarkerId(firstMarker ? (firstMarker.id || firstMarker.label) : "");
    };

    React.useEffect(() => {
        if (!selectedTheme) return;
        if (filteredThemeMarkers.length === 0) {
            setSelectedPublicMarkerId("");
            return;
        }
        const exists = filteredThemeMarkers.some((marker) => (marker.id || marker.label) === selectedPublicMarkerId);
        if (!exists) {
            const first = filteredThemeMarkers[0];
            setSelectedPublicMarkerId(first.id || first.label);
        }
    }, [selectedThemeId, selectedTheme, filteredThemeMarkers, selectedPublicMarkerId]);

    const applyPublicMarkerToDraft = () => {
        if (!selectedPublicMarker) return;
        const logicPart = {
            label: selectedPublicMarker.label || config.label,
            matchMode: selectedPublicMarker.matchMode || config.matchMode,
            isBlock: selectedPublicMarker.isBlock ?? (selectedPublicMarker.type === "block"),
            type: selectedPublicMarker.type || config.type,
            start: selectedPublicMarker.start || config.start,
            end: selectedPublicMarker.end || "",
            pause: selectedPublicMarker.pause || "",
            pauseLabel: selectedPublicMarker.pauseLabel || "",
            keywords: selectedPublicMarker.keywords || [],
            dimIfNotKeyword: Boolean(selectedPublicMarker.dimIfNotKeyword),
            showDelimiters: selectedPublicMarker.showDelimiters,
        };
        const stylePart = { style: selectedPublicMarker.style || {} };

        if (copyMode === "logic") {
            onChange({ ...config, ...logicPart });
            return;
        }
        if (copyMode === "style") {
            onChange({ ...config, ...stylePart });
            return;
        }
        onChange({ ...config, ...logicPart, ...stylePart });
    };

    return (
        <div className="space-y-6">
            {/* 視覺化預覽 */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">{t("stepSymbolConfig.previewTitle")}</p>
                <div className="font-mono text-sm bg-background/50 p-3 rounded border border-border/30">
                    {isRange ? (
                        <div className="space-y-1">
                            <div className="text-primary">{config.start || '>>SE'} {config.label || t("stepSymbolConfig.rangeStart")}</div>
                            <div className="pl-4 border-l-2 border-primary/50 text-muted-foreground">{t("stepSymbolConfig.contentHere")}</div>
                            {config.pause && (
                                <>
                                    <div className="text-orange-500">{config.pause} {config.pauseLabel || t("stepSymbolConfig.pause")}</div>
                                    <div className="text-muted-foreground">{t("stepSymbolConfig.interruptedContent")}</div>
                                    <div className="text-orange-500">{config.pause} {t("stepSymbolConfig.resume")}</div>
                                    <div className="pl-4 border-l-2 border-primary/50 text-muted-foreground">{t("stepSymbolConfig.moreContent")}</div>
                                </>
                            )}
                            <div className="text-primary">{config.end || '<<SE'} {t("stepSymbolConfig.rangeEnd")}</div>
                        </div>
                    ) : isInline ? (
                        <div>
                            <span className="text-muted-foreground">{t("stepSymbolConfig.characterName")} </span>
                            <span className="text-primary">
                                {config.start || '('}{config.label || 'V.O.'}{config.end || ')'}
                            </span>
                        </div>
                    ) : (
                        <div className="text-primary">
                            {config.start || '#SE'} {config.label || t("stepSymbolConfig.sfxDescription")}
                            {config.end && <span> {config.end}</span>}
                        </div>
                    )}
                </div>
            </div>

            {/* 基本資訊 */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    {t("stepSymbolConfig.basicInfo")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">
                            {t("stepSymbolConfig.markerName")} <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={config.label || ''}
                            onChange={(e) => updateField('label', e.target.value)}
                            placeholder={t("stepSymbolConfig.markerNamePlaceholder")}
                            className={cn(
                                "h-9",
                                !hasLabel && "border-red-500/50 focus-visible:ring-red-500"
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* 符號設定 */}
            <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    {t("stepSymbolConfig.symbolConfig")}
                    <span className="text-[10px] text-muted-foreground font-normal">
                        {t("stepSymbolConfig.fullWidthSupported")}
                    </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 開始符號 */}
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                            {isRange ? t("stepSymbolConfig.startSymbol") : isInline ? t("stepSymbolConfig.leftBracket") : t("stepSymbolConfig.prefixSymbol")}
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={config.start || ''}
                            onChange={(e) => updateField('start', e.target.value)}
                            placeholder={isRange ? '>>SE' : isInline ? '(' : '#SE'}
                            className={cn(
                                "h-9 font-mono text-center",
                                !hasStartSymbol && "border-red-500/50 focus-visible:ring-red-500"
                            )}
                        />
                    </div>

                    {/* 結束符號 */}
                    {(isRange || isInline || (isSingle && config.matchMode === 'enclosure')) && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                            {isRange ? t("stepSymbolConfig.endSymbol") : t("stepSymbolConfig.rightBracket")}
                            <span className="text-red-500">*</span>
                            </label>
                            <Input
                                value={config.end || ''}
                                onChange={(e) => updateField('end', e.target.value)}
                                placeholder={isRange ? '<<SE' : ')'}
                                className={cn(
                                    "h-9 font-mono text-center",
                                    !hasEndSymbol && "border-red-500/50 focus-visible:ring-red-500"
                                )}
                            />
                        </div>
                    )}

                    {/* 單行標記 - 結束符號可選 */}
                    {isSingle && config.matchMode !== 'enclosure' && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                                {t("stepSymbolConfig.endSymbol")} <span className="text-muted-foreground/50">{t("stepSymbolConfig.optional")}</span>
                            </label>
                            <Input
                                value={config.end || ''}
                                onChange={(e) => {
                                    updateField('end', e.target.value);
                                    // 若有結束符號，切換為 enclosure 模式
                                    if (e.target.value) {
                                        updateField('matchMode', 'enclosure');
                                    } else {
                                        updateField('matchMode', 'prefix');
                                    }
                                }}
                                placeholder={t("stepSymbolConfig.emptyAsPrefix")}
                                className="h-9 font-mono text-center border-dashed"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 區間模式 - 暫停設定 */}
            {isRange && (
                <div className="space-y-3 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-orange-600">
                        <Info className="w-3.5 h-3.5" />
                        {t("stepSymbolConfig.pauseFeature")}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                        {t("stepSymbolConfig.pauseFeatureTip")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.pauseSymbol")}</label>
                            <Input
                                value={config.pause || ''}
                                onChange={(e) => updateField('pause', e.target.value)}
                                placeholder="><SE"
                                className="h-9 font-mono text-center border-dashed"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.displayText")}</label>
                            <Input
                                value={config.pauseLabel !== undefined ? config.pauseLabel : ''}
                                onChange={(e) => updateField('pauseLabel', e.target.value)}
                                placeholder={t("stepSymbolConfig.leaveEmptyToHide")}
                                className="h-9 text-center border-dashed"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 行內模式 - 關鍵字設定 */}
            {isInline && (
                <div className="space-y-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <h4 className="text-sm font-medium flex items-center gap-2 text-purple-600">
                        <Info className="w-3.5 h-3.5" />
                        {t("stepSymbolConfig.keywordFilter")}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                        {t("stepSymbolConfig.keywordFilterTip")}
                    </p>
                    <div className="space-y-2">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.keywordList")}</label>
                            <Input
                                value={config.keywords?.join(', ') || ''}
                                onChange={(e) => {
                                    const keywords = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                    updateField('keywords', keywords);
                                }}
                                placeholder={t("stepSymbolConfig.keywordPlaceholder")}
                                className="h-9 text-xs"
                            />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!config.dimIfNotKeyword}
                                onChange={(e) => updateField('dimIfNotKeyword', e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <span className="text-xs text-muted-foreground">{t("stepSymbolConfig.dimIfNotKeyword")}</span>
                        </label>
                    </div>
                </div>
            )}

            {/* 驗證提示 */}
            {(!hasLabel || !hasStartSymbol || (isRange && !hasEndSymbol)) && (
                <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 text-red-600 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{t("stepSymbolConfig.fillRequiredFields")}</span>
                </div>
            )}

            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{t("stepSymbolConfig.liveMatchTest")}</h4>
                    <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                        sampleResult.matched ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                    )}>
                        {sampleResult.matched ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {sampleResult.matched ? t("stepSymbolConfig.matched") : t("stepSymbolConfig.notMatched")}
                    </span>
                </div>
                <textarea
                    value={sampleText}
                    onChange={(e) => setSampleText(e.target.value)}
                    placeholder={isRange ? t("stepSymbolConfig.samplePlaceholderRange") : isInline ? t("stepSymbolConfig.samplePlaceholderInline") : t("stepSymbolConfig.samplePlaceholderSingle")}
                    className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className={cn("text-xs", sampleResult.matched ? "text-emerald-600" : "text-muted-foreground")}>
                    {sampleResult.reason}
                </p>
            </div>

            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-medium">{t("stepSymbolConfig.importFromPublicTitle")}</h4>
                        <p className="text-[11px] text-muted-foreground">{t("stepSymbolConfig.importFromPublicTip")}</p>
                    </div>
                    <button
                        type="button"
                        className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-muted"
                        onClick={() => setShowPublicImport((prev) => !prev)}
                    >
                        {showPublicImport ? t("stepSymbolConfig.collapseAdvanced") : t("stepSymbolConfig.expandAdvanced")}
                    </button>
                </div>

                {showPublicImport && (
                    <>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                className="rounded border border-input bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                onClick={loadPublicMarkerThemes}
                                disabled={publicLoading}
                            >
                                {publicLoading ? t("stepSymbolConfig.loading") : t("stepSymbolConfig.loadPublicThemes")}
                            </button>
                        </div>

                        {publicError && <p className="text-xs text-destructive">{publicError}</p>}

                        {publicThemes.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.searchPublicThemeOrMarker")}</label>
                                    <Input
                                        value={publicQuery}
                                        onChange={(e) => setPublicQuery(e.target.value)}
                                        placeholder={t("stepSymbolConfig.searchPlaceholder")}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.publicTheme")}</label>
                                    <select
                                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                                        value={selectedThemeId}
                                        onChange={(e) => setSelectedThemeId(e.target.value)}
                                    >
                                        {filteredPublicThemes.map((theme) => (
                                            <option key={theme.id} value={theme.id}>
                                                {theme.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted-foreground">{t("stepSymbolConfig.markerInTheme")}</label>
                                    <select
                                        className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                                        value={selectedPublicMarkerId}
                                        onChange={(e) => setSelectedPublicMarkerId(e.target.value)}
                                    >
                                        {filteredThemeMarkers.map((marker, index) => {
                                            const itemValue = marker.id || marker.label || `marker-${index}`;
                                            return (
                                                <option key={itemValue} value={itemValue}>
                                                    {marker.label || marker.id || t("stepSymbolConfig.markerWithIndex").replace("{index}", String(index + 1))}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        )}

                        {selectedPublicMarker && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="rounded border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/15"
                                    onClick={() => setSampleText(buildSampleFromPublicMarker(selectedPublicMarker))}
                                >
                                    {t("stepSymbolConfig.applyToSample")}
                                </button>
                                <button
                                    type="button"
                                    className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                                    onClick={applyPublicMarkerToDraft}
                                >
                                    {t("stepSymbolConfig.applyToDraft")}
                                </button>
                                <div className="inline-flex rounded-md border border-input overflow-hidden">
                                    <button
                                        type="button"
                                        className={cn(
                                            "px-2 py-1 text-xs",
                                            copyMode === "all" ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:bg-muted/40"
                                        )}
                                        onClick={() => setCopyMode("all")}
                                    >
                                        {t("stepSymbolConfig.copyModeAll")}
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            "px-2 py-1 text-xs border-l border-input",
                                            copyMode === "logic" ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:bg-muted/40"
                                        )}
                                        onClick={() => setCopyMode("logic")}
                                    >
                                        {t("stepSymbolConfig.copyModeLogic")}
                                    </button>
                                    <button
                                        type="button"
                                        className={cn(
                                            "px-2 py-1 text-xs border-l border-input",
                                            copyMode === "style" ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:bg-muted/40"
                                        )}
                                        onClick={() => setCopyMode("style")}
                                    >
                                        {t("stepSymbolConfig.copyModeStyle")}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {!showPublicImport && (
                    <p className="text-xs text-muted-foreground">
                        {t("stepSymbolConfig.publicImportCollapsedTip")}
                    </p>
                )}
            </div>
        </div>
    );
}

import React from "react";
import { Badge } from "../../../ui/badge";
import { Textarea } from "../../../ui/textarea";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { useI18n } from "../../../../contexts/I18nContext";

const parseChapterSettings = (raw) => {
    try {
        const parsed = JSON.parse(String(raw || ""));
        if (parsed?.mode !== "chapter_multi" || !Array.isArray(parsed.items)) return [];
        return parsed.items.map((item, idx) => ({
            id: `chapter-${idx + 1}`,
            chapter: String(item?.chapter || ""),
            environment: String(item?.environment || ""),
            situation: String(item?.situation || ""),
        }));
    } catch {
        return [];
    }
};

const serializeChapterSettings = (items = []) => {
    return JSON.stringify({
        mode: "chapter_multi",
        items: (items || []).map((item) => ({
            chapter: String(item?.chapter || ""),
            environment: String(item?.environment || ""),
            situation: String(item?.situation || ""),
        })),
    });
};

const parseMultiTemplate = (raw) => {
    try {
        const parsed = JSON.parse(String(raw || ""));
        if (parsed?.mode !== "multi" || !Array.isArray(parsed.items)) return null;
        return parsed.items.map((item, idx) => ({
            id: `role-${idx + 1}`,
            name: String(item?.name || ""),
            text: String(item?.text || ""),
        }));
    } catch {
        return null;
    }
};

const serializeMultiTemplate = (items = []) => JSON.stringify({
    mode: "multi",
    items: (items || []).map((item) => ({
        name: String(item?.name || "").trim(),
        text: String(item?.text || ""),
    })),
});

export function ImportStagePreview({
    previewText,
    setPreviewText,
    onAutoRemoveWhitespace,
    metadataPreview = {},
    controlledMetadataFields = [],
    onMetadataChange,
    onApplyParsedMetadataRemoval,
    canApplyParsedMetadataRemoval = false,
}) {
    const { t } = useI18n();
    const chapterEntries = React.useMemo(() => {
        const fromSettings = parseChapterSettings(metadataPreview?.ChapterSettings || "");
        if (fromSettings.length > 0) return fromSettings;
        return [{ id: "chapter-1", chapter: "", environment: "", situation: "" }];
    }, [metadataPreview]);

    const commitChapterEntries = React.useCallback((nextEntries) => {
        const normalized = Array.isArray(nextEntries) && nextEntries.length > 0
            ? nextEntries
            : [{ id: "chapter-1", chapter: "", environment: "", situation: "" }];
        onMetadataChange?.("ChapterSettings", serializeChapterSettings(normalized));
    }, [onMetadataChange]);

    const roleEntries = React.useMemo(() => {
        const roleItems = parseMultiTemplate(metadataPreview?.RoleSetting || "");
        const performanceItems = parseMultiTemplate(metadataPreview?.PerformanceInstruction || "");
        if (roleItems || performanceItems) {
            const maxLen = Math.max(roleItems?.length || 0, performanceItems?.length || 0, 1);
            return Array.from({ length: maxLen }).map((_, idx) => ({
                id: `role-${idx + 1}`,
                name: roleItems?.[idx]?.name || performanceItems?.[idx]?.name || "",
                role: roleItems?.[idx]?.text || "",
                performance: performanceItems?.[idx]?.text || "",
            }));
        }
        const fallbackRole = String(metadataPreview?.RoleSetting || "");
        const fallbackPerformance = String(metadataPreview?.PerformanceInstruction || "");
        return [{
            id: "role-1",
            name: "",
            role: fallbackRole,
            performance: fallbackPerformance,
        }];
    }, [metadataPreview]);

    const commitRoleEntries = React.useCallback((nextEntries) => {
        const normalized = Array.isArray(nextEntries) && nextEntries.length > 0
            ? nextEntries
            : [{ id: "role-1", name: "", role: "", performance: "" }];

        if (normalized.length === 1 && !String(normalized[0]?.name || "").trim()) {
            onMetadataChange?.("RoleSetting", String(normalized[0]?.role || ""));
            onMetadataChange?.("PerformanceInstruction", String(normalized[0]?.performance || ""));
            return;
        }

        onMetadataChange?.("RoleSetting", serializeMultiTemplate(
            normalized.map((item) => ({ name: item.name, text: item.role }))
        ));
        onMetadataChange?.("PerformanceInstruction", serializeMultiTemplate(
            normalized.map((item) => ({ name: item.name, text: item.performance }))
        ));
    }, [onMetadataChange]);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-medium leading-none">{t("importStagePreview.title")}</h4>
                    <p className="text-xs text-muted-foreground">
                        {t("importStagePreview.desc")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onAutoRemoveWhitespace}
                    >
                        自動移除空白
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onApplyParsedMetadataRemoval}
                        disabled={!canApplyParsedMetadataRemoval}
                    >
                        解析並移除 Metadata/標記區塊
                    </Button>
                    <Badge variant="secondary">Cleaned</Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0 flex-1">
                <div className="border rounded-md p-3 overflow-y-auto lg:col-span-1">
                    
                    <div className="space-y-3">
                        {(controlledMetadataFields || []).map((field) => {
                            const key = field?.key;
                            if (!key) return null;
                            if (field?.type === "role_group") {
                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-[11px] font-medium text-muted-foreground">{field?.label || key}</label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-[11px]"
                                                onClick={() =>
                                                    commitRoleEntries([
                                                        ...roleEntries,
                                                        {
                                                            id: `role-${Date.now()}-${roleEntries.length + 1}`,
                                                            name: "",
                                                            role: "",
                                                            performance: "",
                                                        },
                                                    ])
                                                }
                                            >
                                                新增角色
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {roleEntries.map((entry, idx) => (
                                                <div key={entry.id} className="rounded border border-border/70 bg-muted/20 p-2 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-[11px] text-muted-foreground">角色 {idx + 1}</div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 px-2 text-[11px]"
                                                            onClick={() => commitRoleEntries(roleEntries.filter((_, i) => i !== idx))}
                                                            disabled={roleEntries.length <= 1}
                                                        >
                                                            移除
                                                        </Button>
                                                    </div>
                                                    <Input
                                                        className="h-8 text-xs"
                                                        value={entry.name}
                                                        placeholder="角色名稱"
                                                        onChange={(e) => {
                                                            const next = roleEntries.map((item, i) =>
                                                                i === idx ? { ...item, name: e.target.value } : item
                                                            );
                                                            commitRoleEntries(next);
                                                        }}
                                                    />
                                                    <Textarea
                                                        className="min-h-[62px] text-xs"
                                                        value={entry.role}
                                                        placeholder="角色設定"
                                                        onChange={(e) => {
                                                            const next = roleEntries.map((item, i) =>
                                                                i === idx ? { ...item, role: e.target.value } : item
                                                            );
                                                            commitRoleEntries(next);
                                                        }}
                                                    />
                                                    <Textarea
                                                        className="min-h-[62px] text-xs"
                                                        value={entry.performance}
                                                        placeholder="演繹指示"
                                                        onChange={(e) => {
                                                            const next = roleEntries.map((item, i) =>
                                                                i === idx ? { ...item, performance: e.target.value } : item
                                                            );
                                                            commitRoleEntries(next);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            if (field?.type === "chapter_group") {
                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <label className="text-[11px] font-medium text-muted-foreground">{field?.label || key}</label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-[11px]"
                                                onClick={() =>
                                                    commitChapterEntries([
                                                        ...chapterEntries,
                                                        {
                                                            id: `chapter-${Date.now()}-${chapterEntries.length + 1}`,
                                                            chapter: "",
                                                            environment: "",
                                                            situation: "",
                                                        },
                                                    ])
                                                }
                                            >
                                                新增章節
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {chapterEntries.map((entry, idx) => (
                                                <div key={entry.id} className="rounded border border-border/70 bg-muted/20 p-2 space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="text-[11px] text-muted-foreground">章節 {idx + 1}</div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 px-2 text-[11px]"
                                                            onClick={() => commitChapterEntries(chapterEntries.filter((_, i) => i !== idx))}
                                                            disabled={chapterEntries.length <= 1}
                                                        >
                                                            移除
                                                        </Button>
                                                    </div>
                                                    <Input
                                                        className="h-8 text-xs"
                                                        value={entry.chapter}
                                                        placeholder={`例如：第${idx + 1}章`}
                                                        onChange={(e) => {
                                                            const next = chapterEntries.map((item, i) =>
                                                                i === idx ? { ...item, chapter: e.target.value } : item
                                                            );
                                                            commitChapterEntries(next);
                                                        }}
                                                    />
                                                    <Textarea
                                                        className="min-h-[62px] text-xs"
                                                        value={entry.environment}
                                                        placeholder="環境"
                                                        onChange={(e) => {
                                                            const next = chapterEntries.map((item, i) =>
                                                                i === idx ? { ...item, environment: e.target.value } : item
                                                            );
                                                            commitChapterEntries(next);
                                                        }}
                                                    />
                                                    <Textarea
                                                        className="min-h-[62px] text-xs"
                                                        value={entry.situation}
                                                        placeholder="狀況"
                                                        onChange={(e) => {
                                                            const next = chapterEntries.map((item, i) =>
                                                                i === idx ? { ...item, situation: e.target.value } : item
                                                            );
                                                            commitChapterEntries(next);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            const value = String(metadataPreview?.[key] ?? "");
                            return (
                                <div key={key} className="space-y-1">
                                    <label className="text-[11px] font-medium text-muted-foreground">{field?.label || key}</label>
                                    {field?.multiline ? (
                                        <Textarea
                                            className="min-h-[72px] text-xs"
                                            value={value}
                                            onChange={(e) => onMetadataChange?.(key, e.target.value)}
                                        />
                                    ) : (
                                        <Input
                                            className="h-8 text-xs"
                                            value={value}
                                            onChange={(e) => onMetadataChange?.(key, e.target.value)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="border rounded-md lg:col-span-2 min-h-0">
                    <Textarea
                        className="h-full resize-none font-mono text-sm leading-relaxed border-0 focus-visible:ring-0 p-4"
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
                {t("importStagePreview.footerHint")}
            </div>
        </div>
    );
}

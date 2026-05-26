import React from "react";
import { usePublicThemes } from "./usePublicThemes";
import type { MarkerConfig } from "../types/script";

type MarkerType = "single" | "range" | "inline" | null;
export type WizardMarkerConfig = MarkerConfig & {
    pause?: string;
    pauseLabel?: string;
    keywords?: string[];
    dimIfNotKeyword?: boolean;
    showDelimiters?: boolean;
};

interface PublicThemeItem {
    id: string;
    name?: string;
    description?: string;
    configs?: MarkerConfig[];
}

interface Props {
    config: WizardMarkerConfig;
    onChange: (config: WizardMarkerConfig) => void;
    t: (key: string) => string;
}

export function useStepSymbolConfigState({ config, onChange, t }: Props) {
    const [sampleText, setSampleText] = React.useState<string>("");
    const [showPublicImport, setShowPublicImport] = React.useState<boolean>(false);
    const [publicQuery, setPublicQuery] = React.useState<string>("");
    const [selectedThemeId, setSelectedThemeId] = React.useState<string>("");
    const [selectedPublicMarkerId, setSelectedPublicMarkerId] = React.useState<string>("");
    const [copyMode, setCopyMode] = React.useState<"all" | "logic" | "style">("all");

    const { themes: publicThemes, loading: publicLoading, error: publicError, refresh: refreshPublicThemes } =
        usePublicThemes({ t, errorKey: "stepSymbolConfig.loadPublicThemeFailed" });
    const typedPublicThemes = publicThemes as PublicThemeItem[];

    const updateField = (field: string, value: unknown) => {
        onChange({ ...config, [field]: value });
    };

    const filteredPublicThemes = React.useMemo(() => {
        const q = publicQuery.trim().toLowerCase();
        if (!q) return typedPublicThemes;
        return typedPublicThemes.filter((theme) => {
            const themeText = `${theme.name || ""} ${theme.description || ""}`.toLowerCase();
            if (themeText.includes(q)) return true;
            return (theme.configs || []).some((marker) =>
                `${marker.label || ""} ${marker.id || ""} ${marker.start || ""} ${marker.end || ""}`.toLowerCase().includes(q)
            );
        });
    }, [typedPublicThemes, publicQuery]);

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

    React.useEffect(() => {
        if (!selectedTheme) return;
        if (filteredThemeMarkers.length === 0) { setSelectedPublicMarkerId(""); return; }
        const exists = filteredThemeMarkers.some((marker) => (marker.id || marker.label) === selectedPublicMarkerId);
        if (!exists) {
            const first = filteredThemeMarkers[0];
            setSelectedPublicMarkerId(String(first.id || first.label || ""));
        }
    }, [selectedThemeId, selectedTheme, filteredThemeMarkers, selectedPublicMarkerId]);

    const buildSampleFromPublicMarker = (marker: MarkerConfig | null) => {
        if (!marker) return "";
        const start = marker.start || "#MARK";
        const end = marker.end || "";
        const label = marker.label || marker.id || t("stepSymbolConfig.sampleMarkerContent");
        const mode = String(marker.matchMode || "prefix");
        if (mode === "prefix") return `${start} ${label} ${t("stepSymbolConfig.sampleWord")}`;
        if (mode === "range") {
            return `${start} ${label} ${t("stepSymbolConfig.sampleStart")}\n${t("stepSymbolConfig.sampleRangeBody")}\n${end || start} ${label} ${t("stepSymbolConfig.sampleEnd")}`;
        }
        return `${start}${label}${end || ""}`;
    };

    const loadPublicMarkerThemes = async () => {
        const normalized = await refreshPublicThemes();
        const firstThemeId = (normalized[0] as PublicThemeItem | undefined)?.id || "";
        setSelectedThemeId(firstThemeId);
        const firstMarker = (normalized[0] as PublicThemeItem | undefined)?.configs?.[0];
        setSelectedPublicMarkerId(firstMarker ? String(firstMarker.id || firstMarker.label || "") : "");
    };

    const applyPublicMarkerToDraft = () => {
        if (!selectedPublicMarker) return;
        const logicPart = {
            label: String(selectedPublicMarker.label || config.label || ""),
            matchMode: String(selectedPublicMarker.matchMode || config.matchMode || "prefix"),
            isBlock: Boolean(selectedPublicMarker.isBlock ?? (selectedPublicMarker.type === "block")),
            type: String(selectedPublicMarker.type || config.type || "block"),
            start: String(selectedPublicMarker.start || config.start || ""),
            end: String(selectedPublicMarker.end || ""),
            pause: String((selectedPublicMarker as WizardMarkerConfig).pause || ""),
            pauseLabel: String((selectedPublicMarker as WizardMarkerConfig).pauseLabel || ""),
            keywords: Array.isArray((selectedPublicMarker as WizardMarkerConfig).keywords)
                ? (selectedPublicMarker as WizardMarkerConfig).keywords
                : [],
            dimIfNotKeyword: Boolean((selectedPublicMarker as WizardMarkerConfig).dimIfNotKeyword),
            showDelimiters: Boolean((selectedPublicMarker as WizardMarkerConfig).showDelimiters),
        };
        const stylePart = { style: (selectedPublicMarker.style as Record<string, string>) || {} };
        if (copyMode === "logic") { onChange({ ...config, ...logicPart }); return; }
        if (copyMode === "style") { onChange({ ...config, ...stylePart }); return; }
        onChange({ ...config, ...logicPart, ...stylePart });
    };

    return {
        sampleText, setSampleText,
        showPublicImport, setShowPublicImport,
        publicQuery, setPublicQuery,
        selectedThemeId, setSelectedThemeId,
        selectedPublicMarkerId, setSelectedPublicMarkerId,
        copyMode, setCopyMode,
        publicThemes, publicLoading, publicError,
        filteredPublicThemes, filteredThemeMarkers,
        selectedPublicMarker,
        updateField,
        buildSampleFromPublicMarker,
        loadPublicMarkerThemes,
        applyPublicMarkerToDraft,
    };
}

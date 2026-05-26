import type { WizardMarkerConfig } from "../../../../hooks/useStepSymbolConfigState";

type MarkerType = "single" | "range" | "inline" | null;

export function evaluateMarkerSampleMatch({ markerType, config, sampleText, i18n = {} }: {
    markerType: MarkerType;
    config: WizardMarkerConfig;
    sampleText: string;
    i18n?: Record<string, string>;
}) {
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
    if (!text.trim()) return { matched: false, reason: msg.enterTestText };

    const start = String(config?.start || "").trim();
    const end = String(config?.end || "").trim();
    const mode = config?.matchMode || (markerType === "range" ? "range" : markerType === "inline" ? "enclosure" : "prefix");

    if (!start) return { matched: false, reason: msg.setStartSymbol };

    if (mode === "prefix") {
        const lines = text.split("\n");
        const matched = lines.some((line) => line.trimStart().startsWith(start));
        return { matched, reason: matched ? msg.prefixMatched : msg.prefixNotFound.replace("{start}", start) };
    }

    if (mode === "range" || mode === "enclosure") {
        if (!end) return { matched: false, reason: msg.needsEndSymbol };
        const startIndex = text.indexOf(start);
        const endIndex = text.indexOf(end, startIndex + start.length);
        const matched = startIndex >= 0 && endIndex > startIndex;
        return {
            matched,
            reason: matched ? msg.pairMatched : msg.pairNotFound.replace("{start}", start).replace("{end}", end),
        };
    }

    return { matched: false, reason: msg.unsupportedMode };
}

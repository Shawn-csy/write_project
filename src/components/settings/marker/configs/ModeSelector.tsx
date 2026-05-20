import React from "react";
import { useI18n } from "../../../../contexts/I18nContext";

interface ModeSelectorProps {
  value?: string;
  onChange: (mode: "enclosure" | "prefix" | "range" | "regex") => void;
}

export function ModeSelector({ value, onChange }: ModeSelectorProps): React.JSX.Element {
    const { t } = useI18n();
    const modes = [
        { id: "enclosure", label: t("modeSelector.enclosure"), example: "[...]", desc: t("modeSelector.enclosureDesc") },
        { id: "prefix",    label: t("modeSelector.prefix"),    example: "#...", desc: t("modeSelector.prefixDesc") },
        { id: "range",     label: t("modeSelector.range"),     example: ">>...<<", desc: t("modeSelector.rangeDesc") },
        { id: "regex",     label: t("modeSelector.regex"),     example: "/^.+$/", desc: t("modeSelector.regexDesc") },
    ] as const;

    return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {modes.map((mode) => (
                <button
                    key={mode.id}
                    type="button"
                    onClick={() => onChange(mode.id)}
                    className={`rounded-md border p-2 text-left transition-colors ${
                        (value || "enclosure") === mode.id
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/50 bg-background/60 text-foreground/75 hover:border-border hover:bg-muted/25"
                    }`}
                >
                    <span className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{mode.label}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{mode.example}</span>
                    </span>
                    <span className="mt-1 block text-[10px] leading-snug text-muted-foreground/70">{mode.desc}</span>
                </button>
            ))}
        </div>
    );
}

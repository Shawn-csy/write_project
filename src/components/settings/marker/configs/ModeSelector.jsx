import React from "react";
import { Brackets, Hash, ArrowLeftRight, Regex } from "lucide-react";
import { useI18n } from "../../../../contexts/I18nContext";

/**
 * Visual selector for marker matching modes.
 */
export function ModeSelector({ value, onChange }) {
    const { t } = useI18n();
    const modes = [
        { id: "enclosure", label: t("modeSelector.enclosure"), icon: Brackets, example: "[...]" },
        { id: "prefix", label: t("modeSelector.prefix"), icon: Hash, example: "#..." },
        { id: "range", label: t("modeSelector.range"), icon: ArrowLeftRight, example: ">>...<<" },
        { id: "regex", label: t("modeSelector.regex"), icon: Regex, example: "/^.+$/" },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {modes.map(mode => {
                const Icon = mode.icon;
                const isActive = value === mode.id;
                
                return (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => onChange(mode.id)}
                        className={`
                            flex flex-col items-center p-2 rounded-md border transition-all
                            ${isActive 
                                ? 'border-primary bg-primary/10 text-primary' 
                                : 'border-border/50 hover:border-border hover:bg-muted/30 text-muted-foreground'
                            }
                        `}
                    >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-medium">{mode.label}</span>
                        <span className="text-[8px] opacity-60 font-mono">{mode.example}</span>
                    </button>
                );
            })}
        </div>
    );
}

import React from "react";
import { Brackets, Hash, ArrowLeftRight, Regex } from "lucide-react";

const MODES = [
    { 
        id: 'enclosure', 
        label: '包圍', 
        icon: Brackets, 
        example: '[...]',
        desc: '開始與結束符號'
    },
    { 
        id: 'prefix', 
        label: '前綴', 
        icon: Hash, 
        example: '#...',
        desc: '只有開始符號'
    },
    { 
        id: 'range', 
        label: '區間', 
        icon: ArrowLeftRight, 
        example: '>>...<<',
        desc: '跨行範圍'
    },
    { 
        id: 'regex', 
        label: '正規式', 
        icon: Regex, 
        example: '/^.+$/',
        desc: '進階匹配'
    }
];

/**
 * 模式視覺化選擇器
 */
export function ModeSelector({ value, onChange }) {
    return (
        <div className="grid grid-cols-4 gap-2">
            {MODES.map(mode => {
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

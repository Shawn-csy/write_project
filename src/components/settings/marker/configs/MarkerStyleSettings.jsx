import React from "react";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "../../../ui/button";

export function MarkerStyleSettings({ config, idx, updateMarker }) {
    
    // Helper to update specific style fields
    const updateStyle = (styleField, value) => {
        const currentStyle = config.style || {};
        const newStyle = { ...currentStyle, [styleField]: value };
        updateMarker(idx, 'style', newStyle);
    };

    // Helper for Font Button Variants
    const getFontVariant = (field, checkValue) => {
        return config.style?.[field] === checkValue ? "secondary" : "ghost";
    };

    // Helper to toggle Font Style
    const toggleFontStyle = (field, onValue, offValue = 'normal') => {
        const current = config.style?.[field];
        updateStyle(field, current === onValue ? offValue : onValue);
    };

    const toggleTextAlign = () => {
        const currentAlign = config.style?.textAlign || 'left';
        const next = { left: 'center', center: 'right', right: 'left' };
        updateStyle('textAlign', next[currentAlign]);
    };

    return (
        <div className="space-y-2">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">外觀樣式 (Appearance)</span>
            <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-md border border-border/50">
                {/* Font Style Toggles */}
                <div className="flex gap-1 border-r border-border/50 pr-2">
                    <Button size="icon" variant={getFontVariant('fontWeight', 'bold')} className="h-7 w-7" onClick={() => toggleFontStyle('fontWeight', 'bold')}>
                        <Bold className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant={getFontVariant('fontStyle', 'italic')} className="h-7 w-7" onClick={() => toggleFontStyle('fontStyle', 'italic')}>
                        <Italic className="w-3.5 h-3.5" />
                    </Button>
                </div>

                {/* Alignment */}
                <div className="border-r border-border/50 pr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTextAlign} title="對齊 (Align)">
                        {(!config.style?.textAlign || config.style.textAlign === 'left') && <AlignLeft className="w-3.5 h-3.5" />}
                        {config.style?.textAlign === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                        {config.style?.textAlign === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                    </Button>
                </div>

                {/* Font Controls */}
                <select 
                    className="h-7 w-20 rounded-md border border-input bg-background/50 px-1 text-[10px]"
                    value={config.style?.fontFamily || ''} 
                    onChange={(e) => updateStyle('fontFamily', e.target.value)}
                >
                    <option value="">字體 (預設)</option>
                    <option value="serif">Serif</option>
                    <option value="sans-serif">Sans</option>
                    <option value="monospace">Mono</option>
                    <option value="cursive">手寫</option>
                </select>

                <select 
                    className="h-7 w-16 rounded-md border border-input bg-background/50 px-1 text-[10px]"
                    value={config.style?.fontSize || ''} 
                    onChange={(e) => updateStyle('fontSize', e.target.value)}
                >
                    <option value="">大小</option>
                    <option value="0.8em">0.8x</option>
                    <option value="0.9em">0.9x</option>
                    <option value="1em">1.0x</option>
                    <option value="1.2em">1.2x</option>
                    <option value="1.5em">1.5x</option>
                    <option value="2em">2.0x</option>
                </select>

                 <select 
                    className="h-7 w-14 rounded-md border border-input bg-background/50 px-1 text-[10px]"
                    value={config.style?.lineHeight || ''} 
                    onChange={(e) => updateStyle('lineHeight', e.target.value)}
                >
                    <option value="">行高</option>
                    <option value="1">1.0</option>
                    <option value="1.2">1.2</option>
                    <option value="1.5">1.5</option>
                    <option value="2">2.0</option>
                </select>

                {/* Color Pickers */}
                <div className="flex items-center gap-2 ml-auto">
                    <div className="flex items-center gap-1 cursor-pointer group relative" title="文字顏色">
                        <div className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: config.style?.color || '#000000' }} />
                        <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={config.style?.color || '#000000'} onChange={(e) => updateStyle('color', e.target.value)} />
                    </div>
                    <div className="flex items-center gap-1 cursor-pointer group relative" title="背景顏色">
                        <div className="w-5 h-5 rounded border shadow-sm flex items-center justify-center text-[8px] text-muted-foreground/50 bg-checkboard" style={{ backgroundColor: config.style?.backgroundColor || 'transparent' }}>
                            {!config.style?.backgroundColor && 'BG'}
                        </div>
                        <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={config.style?.backgroundColor || '#ffffff'} onChange={(e) => updateStyle('backgroundColor', e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );
}

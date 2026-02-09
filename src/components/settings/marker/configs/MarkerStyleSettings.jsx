import React, { useState } from "react";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Check } from "lucide-react";
import { Button } from "../../../ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../ui/tabs";
import { MARKER_COLORS } from "../../../../constants/markerColors";
import { cn } from "../../../../lib/utils";

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
        const currentAlign = config.style?.textAlign;
        // Cycle: undefined -> left -> center -> right -> undefined
        let next;
        if (!currentAlign) next = 'left';
        else if (currentAlign === 'left') next = 'center';
        else if (currentAlign === 'center') next = 'right';
        else next = undefined; // Reset to none (inline)
        
        updateStyle('textAlign', next);
    };

    // Determine active tab based on current color value
    const isCustomColor = (color) => {
        if (!color) return false;
        return !color.startsWith('var(--marker-color-');
    };

    const [activeColorTab, setActiveColorTab] = useState(isCustomColor(config.style?.color) ? 'custom' : 'preset');

    return (
        <div className="space-y-2">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">外觀樣式 (Appearance)</span>
            <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-md border border-border/50">
                
                {/* Top Row: Font Controls & Alignment */}
                <div className="flex items-center gap-2 flex-wrap">
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
                            {!config.style?.textAlign && <span className="opacity-30">無</span>}
                            {config.style?.textAlign === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                            {config.style?.textAlign === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                            {config.style?.textAlign === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                        </Button>
                    </div>

                    {/* Font Family & Size */}
                     <select 
                        className="h-7 w-20 rounded-md border border-input bg-background/50 px-1 text-[10px]"
                        value={config.style?.fontFamily || ''} 
                        onChange={(e) => updateStyle('fontFamily', e.target.value)}
                    >
                        <option value="">字體 (預設)</option>
                        <option value="'Courier New', 'Songti TC', 'SimSun', serif">劇本標準 (Courier/宋體)</option>
                        <option value="serif">明體 (Serif)</option>
                        <option value="sans-serif">黑體 (Sans)</option>
                        <option value="monospace">等寬 (Mono)</option>
                        <option value="cursive">手寫 (Cursive)</option>
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

                </div>

                {/* Color Selection Section */}
                <div className="pt-2 border-t border-border/40">
                    <Tabs value={activeColorTab} onValueChange={setActiveColorTab} className="w-full">
                        <div className="flex items-center justify-between mb-2">
                             <span className="text-[10px] font-medium text-muted-foreground">顏色選擇 (Color)</span>
                             <TabsList className="h-6 p-0 bg-muted/40">
                                <TabsTrigger value="preset" className="h-full px-3 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">預設 (Presets)</TabsTrigger>
                                <TabsTrigger value="custom" className="h-full px-3 text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">自訂 (Custom)</TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <TabsContent value="preset" className="mt-0">
                            <div className="grid grid-cols-2 gap-2 p-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                                {MARKER_COLORS.map((color) => {
                                    const variable = `var(--marker-color-${color.id})`;
                                    const isSelected = config.style?.color === variable;
                                    
                                    return (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => updateStyle('color', variable)}
                                            className={cn(
                                                "relative flex flex-col h-14 rounded-lg overflow-hidden border transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 text-left group",
                                                isSelected 
                                                    ? "ring-2 ring-primary ring-offset-2 border-primary/50 shadow-md transform scale-[1.02]" 
                                                    : "border-border/40 hover:border-border"
                                            )}
                                        >
                                            {/* Color Swaych Area */}
                                            <div 
                                                className="flex-1 w-full relative transition-all"
                                                style={{ backgroundColor: variable }}
                                            >
                                                {isSelected && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                       <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Label Area */}
                                            <div className="h-6 w-full bg-card flex items-center px-2 text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
                                                <span className="truncate w-full">{color.name}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="custom" className="mt-0">
                            <div className="flex items-center gap-4 p-1">
                                {/* Text Color */}
                                <div className="flex items-center gap-2 group">
                                    <div className="relative w-8 h-8 rounded-full border shadow-sm overflow-hidden">
                                        <div className="w-full h-full" style={{ backgroundColor: config.style?.color || '#000000' }} />
                                        <input 
                                            type="color" 
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                            value={config.style?.color && !config.style.color.startsWith('var--') ? config.style.color : '#000000'}
                                            onChange={(e) => updateStyle('color', e.target.value)} 
                                        />
                                    </div>
                                    <div className="text-xs font-mono text-muted-foreground">
                                        文字顏色
                                    </div>
                                </div>

                                <div className="w-px h-6 bg-border/50 mx-2" />

                                {/* Background Color */}
                                <div className="flex items-center gap-2 group">
                                     <div className="relative w-8 h-8 rounded border shadow-sm overflow-hidden bg-checkboard">
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground/50" style={{ backgroundColor: config.style?.backgroundColor || 'transparent' }}>
                                            {!config.style?.backgroundColor && 'BG'}
                                        </div>
                                        <input 
                                            type="color" 
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                            value={config.style?.backgroundColor || '#ffffff'} 
                                            onChange={(e) => updateStyle('backgroundColor', e.target.value)} 
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-xs font-mono text-muted-foreground">
                                            背景顏色
                                        </div>
                                        <button 
                                            type="button"
                                            className="text-[10px] text-muted-foreground/60 hover:text-destructive text-left underline decoration-dotted transition-colors"
                                            onClick={() => updateStyle('backgroundColor', 'transparent')}
                                            title="移除背景色 (Remove Background)"
                                        >
                                            設為透明
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

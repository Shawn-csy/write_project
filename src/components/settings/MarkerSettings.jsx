import React, { useState, useEffect } from "react";
import { 
    Plus, Trash2, Bold, Italic, 
    AlignLeft, AlignCenter, AlignRight, 
    FileText, GripVertical, ChevronDown, ChevronRight, Settings 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useSettings } from "../../contexts/SettingsContext";
import { cn } from "../../lib/utils";

// Dnd Kit Imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Simple Input Component if ui/input missing or for custom styling
const Input = ({ className, ...props }) => (
  <input 
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);

const Button = ({ className, variant = "default", size = "default", ...props }) => {
    const variants = {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
    };
    const sizes = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9",
    };
    return (
        <button 
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
};

// --- Sortable Item Component ---
function SortableItem({ id, config, idx, updateMarker, removeMarker, expandedId, setExpandedId }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: config.id || `marker-${idx}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    };

    const isExpanded = expandedId === (config.id || idx);
    const isBlock = config.type === 'block' || config.isBlock; 
    const isInline = !isBlock;

    const toggleExpand = () => {
        setExpandedId(isExpanded ? null : (config.id || idx));
    };

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

    const updateArrayField = (field, valueStr) => {
        const arr = valueStr.split(',').map(s => s.trim()).filter(Boolean);
        updateMarker(idx, field, arr);
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("mb-2 group", isDragging && "opacity-50")}>
            <div className={cn(
                "border rounded-lg bg-card transition-all overflow-hidden shadow-sm",
                isExpanded ? "border-primary/40 ring-1 ring-primary/10" : "border-border/40 hover:border-border"
            )}>
                {/* Header Row (Always Visible) */}
                <div className="flex items-center gap-2 p-2 bg-muted/20">
                    <div 
                        {...attributes} 
                        {...listeners} 
                        className="cursor-grab hover:text-foreground text-muted-foreground p-1 rounded hover:bg-muted active:cursor-grabbing"
                        title="拖動以重新排序 (改變優先權)"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <button className="flex-1 flex items-center gap-2 text-left" onClick={toggleExpand}>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold truncate max-w-[150px]">{config.label || '未命名'}</span>
                            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                {config.matchMode === 'regex' ? 'Regex' : (isBlock ? 'Block' : 'Inline')}
                                <span className="bg-muted px-1 rounded text-[9px]">{config.id}</span>
                            </span>
                        </div>
                    </button>

                    {/* Quick Preview Badge */}
                    <div 
                        className="hidden sm:block px-2 py-0.5 text-xs rounded border max-w-[100px] truncate"
                        style={{
                            ...config.style,
                            borderColor: 'transparent',
                            backgroundColor: config.style?.backgroundColor || 'transparent'
                        }}
                    >
                        {config.start}預覽{config.end}
                    </div>

                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive" onClick={() => removeMarker(idx)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="p-3 bg-background/50 space-y-4 border-t border-border/10">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-end">
                            <div className="col-span-1 space-y-1">
                                <label className="text-[10px] uppercase text-muted-foreground font-semibold">標記名稱</label>
                                <Input 
                                    value={config.label || ''} 
                                    onChange={(e) => updateMarker(idx, 'label', e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="col-span-1 space-y-1">
                                <label className="text-[10px] uppercase text-muted-foreground font-semibold">代碼 (ID)</label>
                                <Input 
                                    defaultValue={config.id || ''} 
                                    onBlur={(e) => {
                                         const newId = e.target.value;
                                         if (newId && newId !== config.id) {
                                            updateMarker(idx, 'id', newId);
                                            setExpandedId(newId);
                                         }
                                    }}
                                    className="h-8 text-xs font-mono"
                                    placeholder="unique-id"
                                />
                            </div>
                             <div className="col-span-1 space-y-1">
                                <label className="text-[10px] uppercase text-muted-foreground font-semibold">類型</label>
                                <select 
                                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                    value={config.type || (config.isBlock ? 'block' : 'inline')}
                                    onChange={(e) => {
                                        const nextType = e.target.value;
                                        updateMarker(idx, { type: nextType, isBlock: nextType === 'block' });
                                    }}
                                >
                                    <option value="inline">行內 (Inline)</option>
                                    <option value="block">區塊 (Block)</option>
                                </select>
                             </div>
                             <div className="col-span-1 space-y-1">
                                <label className="text-[10px] uppercase text-muted-foreground font-semibold">優先權</label>
                                <Input 
                                    type="number"
                                    value={config.priority || 0} 
                                    onChange={(e) => updateMarker(idx, 'priority', parseInt(e.target.value) || 0)}
                                    className="h-8 text-xs text-center font-mono bg-muted/20"
                                    title="數字越大越優先 (由拖動排序自動決定)"
                                />
                             </div>
                        </div>

                        {/* 2. Logic Settings */}
                        <div className="p-3 rounded-md bg-muted/20 space-y-3">
                             <div className="flex items-center gap-2 mb-2">
                                <Settings className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[11px] font-bold text-muted-foreground">匹配規則 (Matching Logic)</span>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-muted-foreground block mb-1">模式</label>
                                    <select 
                                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                        value={config.matchMode || 'enclosure'}
                                        onChange={(e) => updateMarker(idx, 'matchMode', e.target.value)}
                                        disabled={isBlock}
                                    >
                                        <option value="enclosure">包圍 (Start...End)</option>
                                        <option value="prefix">前綴 (Prefix)</option>
                                        <option value="regex">正規式 (Regex)</option>
                                    </select>
                                </div>
                                {config.matchMode === 'regex' ? (
                                    <div className="sm:col-span-2">
                                        <label className="text-[10px] text-muted-foreground block mb-1">Regex Pattern</label>
                                        <Input 
                                            value={config.regex || ''}
                                            onChange={(e) => updateMarker(idx, 'regex', e.target.value)}
                                            className="h-8 font-mono text-xs"
                                            placeholder="Example: ^\\[sfx:(.*?)\\]"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className="text-[10px] text-muted-foreground block mb-1">開始符號 (Start)</label>
                                                <Input 
                                                    value={config.start || ''} 
                                                    onChange={(e) => updateMarker(idx, 'start', e.target.value)}
                                                    className="h-8 font-mono text-xs text-center"
                                                />
                                            </div>
                                            {(isBlock || config.matchMode !== 'prefix') && (
                                                <div className="flex-1">
                                                    <label className="text-[10px] text-muted-foreground block mb-1">結束符號 (End)</label>
                                                    <Input 
                                                        value={config.end || ''} 
                                                        onChange={(e) => updateMarker(idx, 'end', e.target.value)}
                                                        className="h-8 font-mono text-xs text-center"
                                                    />
                                                </div>
                                           )}

                                        {isBlock && (
                                             <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-dashed border-border/30">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={config.showEndLabel !== false} // Default true
                                                        onChange={(e) => updateMarker(idx, 'showEndLabel', e.target.checked)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-semibold text-foreground">顯示結尾內容 (Show End Label)</span>
                                                        <p className="text-[9px] text-muted-foreground">在區塊底部顯示結束標記的內容 (如 <code>End</code>)。若關閉則只顯示邊框。</p>
                                                    </div>
                                                </label>
                                             </div>
                                        )}
                                        </div>
                                        
                                        {isBlock && config.matchMode === 'enclosure' && (
                                             <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-dashed border-border/30">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={!!config.smartToggle} 
                                                        onChange={(e) => updateMarker(idx, 'smartToggle', e.target.checked)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-semibold text-foreground">允許作為區塊開關 (Smart Toggle)</span>
                                                        <p className="text-[9px] text-muted-foreground">當內容同時符合開始與結束規則時 (如 <code>{`{{...}}`}</code>)，將其視為切換開關而非單行內容。</p>
                                                    </div>
                                                </label>
                                             </div>
                                        )}
                                    </>
                                )}
                             </div>

                            <div className="space-y-2 pt-2 border-t border-dashed border-border/30">
                                <label className="text-[10px] text-muted-foreground block">顯示樣板 (Display Template, 選填)</label>
                                <Input 
                                        value={config.renderer?.template || ''}
                                        onChange={(e) => {
                                            const renderer = config.renderer || {};
                                            updateMarker(idx, 'renderer', { ...renderer, template: e.target.value });
                                        }}
                                        className="h-8 text-xs font-mono"
                                        placeholder="例如: [SFX: {{content}}]"
                                />
                                <p className="text-[9px] text-muted-foreground">
                                    使用 <code className="bg-muted px-1 rounded">{'{{content}}'}</code> 代表被標記的文字內容 (或是區塊的標籤)。
                                </p>
                            </div>

                             {isInline && config.matchMode !== 'regex' && (
                                <div className="space-y-2 pt-2 border-t border-dashed border-border/30">
                                    <label className="text-[10px] text-muted-foreground block">特定關鍵字 (Keywords, 選填)</label>
                                    <Input 
                                         value={config.keywords ? config.keywords.join(', ') : ''}
                                         onChange={(e) => updateArrayField('keywords', e.target.value)}
                                         className="h-8 text-xs font-mono"
                                         placeholder="例如: V.O., O.S. (用逗號分隔)"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={!!config.dimIfNotKeyword} 
                                            onChange={(e) => updateMarker(idx, 'dimIfNotKeyword', e.target.checked)}
                                            className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                        />
                                        <span className="text-xs text-muted-foreground">非關鍵字時淡化顯示</span>
                                    </label>
                                </div>
                             )}
                        </div>

                        {/* 3. Appearance Toolbar */}
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

                         {/* Options */}
                         {config.matchMode !== 'regex' && (
                             <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={!!config.showDelimiters} 
                                        onChange={(e) => updateMarker(idx, 'showDelimiters', e.target.checked)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5"
                                    />
                                    <span className="text-xs text-muted-foreground">顯示括號符號 (Show Delimiters)</span>
                                </label>
                             </div>
                         )}

                    </div>
                )}
            </div>
        </div>
    );
}

export function MarkerSettings({ sectionRef }) {
  const { markerConfigs, setMarkerConfigs } = useSettings();
  const [localConfigs, setLocalConfigs] = useState(markerConfigs);
  const [viewMode, setViewMode] = useState('ui'); // 'ui' | 'json'
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!localConfigs || localConfigs.length === 0) {
         setLocalConfigs(markerConfigs || []);
    }
  }, [markerConfigs]);
  
  // Debounced Save
  useEffect(() => {
      const timer = setTimeout(() => {
          if (viewMode === 'ui') {
            if (JSON.stringify(markerConfigs) !== JSON.stringify(localConfigs)) {
                setMarkerConfigs(localConfigs);
            }
          }
      }, 500);
      return () => clearTimeout(timer);
  }, [localConfigs, setMarkerConfigs, markerConfigs, viewMode]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
        setLocalConfigs((items) => {
            const oldIndex = items.findIndex((item) => (item.id || item._tempId) === active.id);
            const newIndex = items.findIndex((item) => (item.id || item._tempId) === over.id);
            
            const newItems = arrayMove(items, oldIndex, newIndex);
            
            // Auto Update Priorities
            return newItems.map((item, index) => ({
                ...item,
                priority: 1000 - (index * 10)
            }));
        });
    }
  };

    const updateMarker = (index, field, value) => {
    setLocalConfigs(prev => {
        const newConfigs = [...prev];
        if (typeof field === 'object' && field !== null) {
            newConfigs[index] = { ...newConfigs[index], ...field };
        } else if (field === 'style') { 
             newConfigs[index] = { ...newConfigs[index], style: value };
        } else {
             newConfigs[index] = { ...newConfigs[index], [field]: value };
        }
        return newConfigs;
    });
  };

  const addMarker = () => {
      const newId = `custom-${Date.now()}`;
      const newMarker = {
          id: newId,
          label: '新標記',
          type: 'inline',
          matchMode: 'enclosure',
          start: '★',
          end: '★',
          isBlock: false,
          priority: 500,
          style: { color: '#000000', fontWeight: 'bold' }
      };
      
      const newConfigs = [newMarker, ...localConfigs].map((item, index) => ({
           ...item,
           priority: 1000 - (index * 10)
      }));
      setLocalConfigs(newConfigs);
      setExpandedId(newId);
  };

  const removeMarker = (index) => {
      const newConfigs = [...localConfigs];
      newConfigs.splice(index, 1);
      setLocalConfigs(newConfigs);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <Card className="border border-border/60 bg-card/50 shadow-sm transition-all hover:bg-card/80" ref={sectionRef}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
            </div>
            <div>
                <CardTitle className="text-base">自訂標記 (Markers)</CardTitle>
                <CardDescription className="text-xs mt-0.5">拖曳列表以改變優先權 (越上方越優先)</CardDescription>
            </div>
           </div>
           <Button 
                variant={viewMode === 'ui' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setViewMode(viewMode === 'ui' ? 'json' : 'ui')}
                className="h-7 text-xs"
           >
                {viewMode === 'ui' ? 'JSON 模式' : 'UI 模式'}
           </Button>
        </div>
      </CardHeader>
      
      <CardContent>
       {viewMode === 'json' ? (
           <textarea 
             className="w-full h-96 p-4 font-mono text-xs bg-muted/30 rounded-md border border-input focus:outline-none focus:ring-1 focus:ring-ring"
             defaultValue={JSON.stringify(localConfigs, null, 2)}
             onChange={(e) => {
                 try {
                     setLocalConfigs(JSON.parse(e.target.value));
                 } catch(err) {}
             }}
           />
       ) : (
           <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
           >
            <SortableContext 
                items={localConfigs.map((c, i) => c.id || `marker-${i}`)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {localConfigs.map((config, idx) => (
                        <SortableItem 
                            key={config.id || `marker-${idx}`}
                            id={config.id || `marker-${idx}`}
                            idx={idx}
                            config={config}
                            updateMarker={updateMarker}
                            removeMarker={removeMarker}
                            expandedId={expandedId}
                            setExpandedId={setExpandedId}
                        />
                    ))}
                </div>
            </SortableContext>
           </DndContext>
       )}

       {viewMode === 'ui' && (
        <Button onClick={addMarker} variant="outline" className="w-full mt-4 border-dashed">
            <Plus className="w-4 h-4 mr-2" /> 新增標記 (Add New)
        </Button>
       )}
      </CardContent>
    </Card>
  );
}

import React, { useState } from "react";
import { MarkerGeneralSettings } from "../settings/marker/configs/MarkerGeneralSettings";
import { MarkerLogicSettings } from "../settings/marker/configs/MarkerLogicSettings";
import { MarkerStyleSettings } from "../settings/marker/configs/MarkerStyleSettings";
import ScriptViewer from "../renderer/ScriptViewer"; // Assuming this path, check later

export function MarkerSettingsGuide() {
    // Dummy state for the interactive guide
    const [demoConfig, setDemoConfig] = useState({
        id: "demo-marker",
        label: "範例標記",
        type: "inline",
        priority: 10,
        matchMode: "enclosure",
        start: "{",
        end: "}",
        style: {
            color: "var(--marker-color-red)",
            fontWeight: "bold"
        },
        renderer: {
            template: ""
        }
    });

    // Mock update function
    const updateMarker = (_, field, value) => {
        setDemoConfig(prev => {
            if (typeof field === 'object') {
                return { ...prev, ...field };
            }
            return { ...prev, [field]: value };
        });
    };

    return (
        <div className="space-y-8">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 text-sm text-muted-foreground">
                <p>
                    這是 <strong>互動式說明手冊</strong>。下方的控制面板與真實設定完全相同，您可以試著操作看看，
                    立即觀察設定值如何改變，以及對應的渲染效果。
                </p>
            </div>

            {/* Section 1: General */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                     <h3 className="text-base font-semibold">基礎設定 (General)</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 border rounded-lg p-4 bg-background/50">
                        <MarkerGeneralSettings 
                            config={demoConfig} 
                            idx={0} 
                            updateMarker={updateMarker}
                            setExpandedId={() => {}} // No-op
                        />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2 lg:pt-2">
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>標記名稱</strong>：給您自己看的辨識名稱。</li>
                            <li><strong>代碼 (ID)</strong>：系統內部使用的唯一識別碼。</li>
                            <li><strong>類型</strong>：
                                <ul className="pl-4 mt-1 space-y-1 opacity-80">
                                    <li><code>Inline</code>: 行內標記 (如情緒、動作)。</li>
                                    <li><code>Block</code>: 整行區塊 (如筆記、段落)。</li>
                                    <li><code>Dual</code>: 雙人對話。</li>
                                </ul>
                            </li>
                            <li><strong>優先權</strong>：數字越大越優先。當兩個規則同時匹配時 (例如 Regex 重疊)，由此決定誰勝出。</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Section 2: Logic */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                     <h3 className="text-base font-semibold">邏輯與匹配 (Logic)</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 border rounded-lg p-4 bg-background/50">
                        <MarkerLogicSettings 
                            config={demoConfig} 
                            idx={0} 
                            updateMarker={updateMarker}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2 lg:pt-2">
                        <p className="font-semibold text-foreground">模式 (Mode)：</p>
                        <ul className="list-disc pl-4 space-y-1 mb-3">
                            <li><strong>包圍 (Enclosure)</strong>: 最常用的模式，設定開始與結束符號 (如 <code>{`{...}`}</code>)。</li>
                            <li><strong>前綴 (Prefix)</strong>: 偵測行首的符號 (如 <code>{`> ...`}</code>)。</li>
                            <li><strong>正規式 (Regex)</strong>: 進階使用者可用 Regular Expression 進行複雜匹配。</li>
                        </ul>
                         <p className="font-semibold text-foreground">進階功能：</p>
                         <ul className="list-disc pl-4 space-y-1">
                            <li><strong>顯示樣板</strong>: 改變標記在螢幕上的顯示文字。
                                <br/>可用 <code>{`{{content}}`}</code> 代表原內容。
                                <br/>例：設定 <code>[音效: {`{{content}}`}]</code>，輸入 <code>{`{爆炸}`}</code> 會顯示為 <code>[音效: 爆炸]</code>。
                            </li>
                         </ul>
                    </div>
                </div>
            </div>

            {/* Section 3: Style */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                     <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                     <h3 className="text-base font-semibold">外觀樣式 (Appearance)</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <div className="lg:col-span-2 border rounded-lg p-4 bg-background/50">
                        <MarkerStyleSettings 
                            config={demoConfig} 
                            idx={0} 
                            updateMarker={updateMarker}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-2 lg:pt-2">
                        <p>直觀的樣式編輯器：</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>字體樣式</strong>：粗體、斜體、底線。</li>
                            <li><strong>對齊</strong>：靠左、居中、靠右 (Block 類型常用)。</li>
                            <li><strong>顏色</strong>：可選預設色票或自訂 Hex 色碼。</li>
                            <li><strong>字級/行高</strong>：針對該標記的特殊縮放。</li>
                        </ul>
                    </div>
                </div>
            </div>

             {/* Live Preview of the Dummy Marker */}
            <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">當前設定預覽 (Live Preview)</h4>
                <div className="flex items-center justify-center p-6 bg-background rounded border border-dashed">
                     <span 
                        style={{
                            color: demoConfig.style?.color,
                            backgroundColor: demoConfig.style?.backgroundColor,
                            fontWeight: demoConfig.style?.fontWeight,
                            fontStyle: demoConfig.style?.fontStyle,
                            textDecoration: demoConfig.style?.textDecoration,
                            fontSize: demoConfig.style?.fontSize,
                            opacity: demoConfig.style?.opacity,
                        }}
                     >
                        {demoConfig.start}範例文字{demoConfig.end}
                     </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    (這只是簡易預覽，完整的渲染效果請參考下方的「試寫」區塊)
                </p>
            </div>
        </div>
    );
}

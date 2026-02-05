import React from "react";
// import { aboutContent } from "../../constants/aboutContent";
// import { aboutContent } from "../../constants/aboutContent";
// import { homeContent } from "../../constants/homeContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { X } from "lucide-react";
import ScriptViewer from "../renderer/ScriptViewer";
import { MarkerSettingsGuide } from "../guide/MarkerSettingsGuide";

import { useSettings } from "../../contexts/SettingsContext";

// Internal Reusable Demo Component
function DemoEditor({ initialText, accentStyle, title, showMarkers = false }) {
    const { markerConfigs } = useSettings();
    const [text, setText] = React.useState(initialText || "");

    // Reset text if initialText changes significantly (optional, but good for tab switching if reusing component)
    React.useEffect(() => {
        setText(initialText);
    }, [initialText]);

    return (
        <div className="mt-8 pt-8 border-t border-border/60">
            <h3 className="text-lg font-semibold mb-3">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">您可以直接在左側編輯內容，右側將即時渲染效果：</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px] border border-border/60 rounded-lg overflow-hidden">
                {/* Source */}
                <div className="bg-muted flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-border/60">
                    <div className="p-2 border-b border-border/40 bg-muted/50 text-xs text-muted-foreground font-bold uppercase tracking-wider shrink-0">Source Input</div>
                    <textarea 
                        className="flex-1 w-full bg-transparent p-4 font-mono text-xs resize-none focus:outline-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                </div>
                
                {/* Preview */}
                <div className="bg-background relative overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-border/40 bg-muted/20 text-xs text-muted-foreground font-bold uppercase tracking-wider shrink-0">
                    Preview Result
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 relative">
                    <div className="scale-[0.85] origin-top-left w-[117%] transform-gpu">
                        <ScriptViewer 
                            text={text}
                            accentColor={accentStyle?.accent || "160 84% 39%"}
                            fontSize={14}
                            bodyFontSize={14}
                            dialogueFontSize={14}
                            markerConfigs={showMarkers ? markerConfigs : undefined}
                        />
                    </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const markerDemoText = `Title: Custom Marker Demo
Author: Your Name

# 測試自訂標記

{{背景雨聲}}

.INT. BASEMENT - NIGHT

!這裡示範各種自訂標記的效果：

@HERO
(低聲)
(V.O.) 我內心的聲音變色了嗎？
(憤怒) 情緒標記應該不同顏色。

{手機震動}

JOHNNY
快看這個！ | 驚訝地指著螢幕

[SFX: 爆炸聲]

<系統提示>
請嘗試在設定面板中修改這些符號的樣式。
</系統提示>

~Love is in the air... (Lyrics)

>THE END<`;

function AboutPanel({ accentStyle, onClose }) {
  
  // -- Internal JSX Components --
  
  const AboutContent = () => (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Introduction */}
      <div className="space-y-4">
        <p className="text-base text-muted-foreground leading-relaxed">
          這是一個專為創作者打造的 <strong>視覺化劇本工具</strong>。透過獨創的 <strong>自訂標記系統</strong>，將文字轉換為豐富的互動閱讀體驗，打破傳統劇本的單調限制。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        
        {/* Core Features */}
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <h3 class="font-semibold">核心功能</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"></span>
              <span><strong>自訂標記引擎</strong>：完全自定義的語法解析器，支援括號、正則表達式等視覺化規則。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"></span>
              <span><strong>雲端工作室</strong>：專屬的作品管理中心，支援多專案彙整、版本控制與即時雲端儲存。</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"></span>
              <span><strong>角色專注模式</strong>：一鍵過濾特定角色台詞，為讀本排練量身打造。</span>
            </li>
          </ul>
        </div>

        {/* Feature Highlights */}
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <h3 className="font-semibold">系統亮點</h3>
            </div>
            <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>創作者中心</strong>：支援多作者/組織管理與公開展示頁面。</li>
              <li><strong>即時預覽</strong>：所見即所得的分欄編輯體驗。</li>
              <li><strong>行動裝置最佳化</strong>：針對手機閱讀重構的介面與抽屜式導航。</li>
              <li><strong>標準匯出</strong>：支援標準格式 PDF 輸出與列印。</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connect & Licensing */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Connect</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          
          <a href="https://discord.com" target="_blank" rel="noreferrer" 
             className="group flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground opacity-50 cursor-not-allowed" title="Coming Soon">
            <svg className="h-5 w-5 fill-current text-muted-foreground group-hover:text-foreground transition-colors" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-3.28-47.54-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span>Discord</span>
          </a>

          <a href="https://github.com/Shawn-csy/write_project" target="_blank" rel="noreferrer"
             className="group flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
            <svg className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.64.5 12c0 5.1 3.3 9.41 7.88 10.94.58.1.79-.25.79-.56 0-.28-.01-1.03-.02-2.02-3.2.69-3.87-1.54-3.87-1.54-.53-1.36-1.3-1.72-1.3-1.72-1.07-.74.08-.73.08-.73 1.18.08 1.8 1.22 1.8 1.22 1.05 1.8 2.74 1.28 3.41.98.1-.76.41-1.28.75-1.58-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.45.11-3.02 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.57.23 2.73.11 3.02.75.81 1.2 1.84 1.2 3.1 0 4.43-2.69 5.4-5.25 5.68.42.36.8 1.08.8 2.18 0 1.58-.02 2.85-.02 3.23 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.36-5.15-11.5-11.5-11.5Z"/></svg>
            <span>GitHub</span>
          </a>

          <a href="mailto:silence0603@gmail.com"
             className="group flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground">
             <svg className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9.06 7.64L20 7H4l7.06 4.64a2 2 0 0 0 2.12 0ZM4 9.56V18h16V9.56l-6.37 4.19a4 4 0 0 1-4.26 0Z"/></svg>
            <span>Email</span>
          </a>
        </div>
      </div>

      <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground text-center">
        <p>
          本專案採用 
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" className="underline hover:text-foreground">CC BY 4.0</a> 
          授權。
          <br className="sm:hidden" />
          保留姓名標示即可任意修改、重製、販售。
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm flex flex-col">
       <div className="p-4 border-b border-border/60 bg-muted/20 flex-shrink-0 flex items-center gap-3">
          <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-muted-foreground/10 transition-colors"
              aria-label="Close"
          >
             <X className="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">System Info & Guide</h2>
       </div>

       <div className="flex-1 min-h-0">
         <Tabs defaultValue="about" className="h-full flex flex-col">
            <div className="px-4 pt-2 shrink-0">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="about">關於</TabsTrigger>
                <TabsTrigger value="markers">自訂標記</TabsTrigger>
              </TabsList>
            </div>

            {/* 1. About Tab (Replaced Overview + Old About) */}
            <TabsContent value="about" className="flex-1 overflow-y-auto min-h-0 p-6 pt-2">
               <AboutContent />
            </TabsContent>

            {/* 2. Custom Markers Tab */}
            <TabsContent value="markers" className="flex-1 overflow-y-auto min-h-0 p-6 pt-2">
                <div className="max-w-4xl mx-auto space-y-6 pb-12">
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                      <h3>自訂標記設定</h3>
                      <MarkerSettingsGuide />

                      <DemoEditor 
                        title="自訂標記試寫" 
                        initialText={markerDemoText} 
                        accentStyle={accentStyle}
                        showMarkers={true}
                      />
                   </div>
                </div>
            </TabsContent>
         </Tabs>
       </div>
    </div>
  );
}

export default AboutPanel;

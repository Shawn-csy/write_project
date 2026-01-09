import React, { useState } from "react";
import { Button } from "./ui/button";
import { homeContent } from "../constants/homeContent";
import ScriptViewer from "./ScriptViewer";

function HomePanel({ accentStyle, onClose }) {
  const [demoText, setDemoText] = useState(homeContent.demo || "");
  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm">
      <div className="h-full overflow-y-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-6 py-8 prose prose-sm dark:prose-invert space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between gap-3 not-prose">
            <div>
              <p className={`text-[10px] uppercase tracking-[0.2em] ${accentStyle.label}`}>
                {homeContent.label}
              </p>
              <h2 className="text-2xl font-semibold">{homeContent.title}</h2>
            </div>
            <Button variant="secondary" onClick={onClose}>
              關閉
            </Button>
          </div>

          {/* Intro & Syntax Guide */}
          <div className="space-y-8">
            <div className="space-y-6">
              {homeContent.introHtml && (
                <div
                  className="prose prose-sm dark:prose-invert text-muted-foreground max-w-none"
                  dangerouslySetInnerHTML={{ __html: homeContent.introHtml }}
                />
              )}
            </div>

            {/* Live Playground */}
            <div className="not-prose flex flex-col gap-4 bg-muted/20 p-6 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`accent-label ${accentStyle.label?.split(" ")[1] || ""}`}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M8 15h8"/></svg>
                <h3 className="text-lg font-semibold m-0">即時試寫 (Live Playground)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[500px]">
                {/* Editor */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest pl-1">Editor (Fountain)</label>
                  <textarea 
                    className="flex-1 w-full bg-background border border-input rounded-md p-3 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={demoText}
                    onChange={(e) => setDemoText(e.target.value)}
                    spellCheck="false"
                  />
                </div>

                {/* Preview */}
                <div className="flex flex-col gap-2 overflow-hidden">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest pl-1">Preview</label>
                  <div className="flex-1 border border-border bg-card rounded-md overflow-hidden relative shadow-sm">
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 scale-[0.8] origin-top-left w-[125%] h-[125%]">
                      <ScriptViewer 
                        text={demoText} 
                        theme="light" // Force light or inherit? Let's assume light for demo or follow app
                        accentColor={accentStyle.accent}
                        fontSize={14}
                        bodyFontSize={14}
                        dialogueFontSize={14}
                        highlightCharacters={true}
                        highlightSfx={true}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                左側輸入 Fountain 語法，右側即時預覽效果。
              </p>
            </div>
          </div>

          {homeContent.quickGuide?.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-xl font-semibold mb-4">快速導覽</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-none pl-0">
                {homeContent.quickGuide.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted-foreground text-sm">
                    <span className={`mt-1.5 block h-1.5 w-1.5 rounded-full accent-dot ${accentStyle.dot}`}></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default HomePanel;

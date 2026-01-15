import React from "react";
import { aboutContent } from "../constants/aboutContent";
import { homeContent } from "../constants/homeContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { X } from "lucide-react";
import ScriptViewer from "./ScriptViewer";

function AboutPanel({ accentStyle, onClose }) {
  const [demoText, setDemoText] = React.useState(homeContent.demo || "");

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
         <Tabs defaultValue="guide" className="h-full flex flex-col">
            <div className="px-4 pt-2 shrink-0">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="guide">使用說明 (Guide)</TabsTrigger>
                <TabsTrigger value="about">版本資訊 (About)</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="guide" className="flex-1 overflow-y-auto min-h-0 p-6 pt-2">
                <div className="max-w-4xl mx-auto space-y-6 pb-12">
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                      <h3>{homeContent.title}</h3>
                      <div dangerouslySetInnerHTML={{ __html: homeContent.introHtml }} />
                      
                      {homeContent.demo && (
                        <div className="mt-8 pt-8 border-t border-border/60">
                           <h3 className="text-lg font-semibold mb-3">試寫範例 (Demo)</h3>
                           <p className="text-sm text-muted-foreground mb-4">您可以直接在左側編輯內容，右側將即時渲染效果：</p>
                           
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px] border border-border/60 rounded-lg overflow-hidden">
                              {/* Source */}
                              <div className="bg-muted flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-border/60">
                                 <div className="p-2 border-b border-border/40 bg-muted/50 text-xs text-muted-foreground font-bold uppercase tracking-wider shrink-0">Source Input</div>
                                 <textarea 
                                    className="flex-1 w-full bg-transparent p-4 font-mono text-xs resize-none focus:outline-none"
                                    value={demoText}
                                    onChange={(e) => setDemoText(e.target.value)}
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
                                          text={demoText}
                                          accentColor={accentStyle?.accent || "160 84% 39%"}
                                          fontSize={14}
                                          bodyFontSize={14}
                                          dialogueFontSize={14}
                                        />
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
            </TabsContent>

            <TabsContent value="about" className="flex-1 overflow-y-auto min-h-0 p-6 pt-2">
                <div className="max-w-4xl mx-auto space-y-6 prose prose-sm dark:prose-invert">
                    {aboutContent.introHtml ? (
                      <div
                        className="text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: aboutContent.introHtml }}
                      />
                    ) : (
                      <p className="text-muted-foreground">{aboutContent.intro}</p>
                    )}
                    
                    {aboutContent.quickGuide?.length > 0 && (
                      <>
                        <h3 className="text-lg font-semibold mt-6">Features</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {aboutContent.quickGuide.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    
                    {aboutContent.copyright && (
                      <div className="pt-8 mt-8 border-t border-border/60">
                         <p className="text-xs text-muted-foreground">{aboutContent.copyright}</p>
                      </div>
                    )}
                </div>
            </TabsContent>
         </Tabs>
       </div>
    </div>
  );
}

export default AboutPanel;

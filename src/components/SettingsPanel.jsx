import React, { useRef, useState, useEffect } from "react";
import { ThemeSettings } from "./settings/ThemeSettings";
import { DisplaySettings } from "./settings/DisplaySettings";
import { FontSettings } from "./settings/FontSettings";
import { cn } from "../lib/utils";

function SettingsPanel() {
  const scrollContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("display");
  
  const sectionRefs = {
    display: useRef(null),
    list: useRef(null),
  };

  const tabs = [
    { key: "display", label: "顯示 / 字級" },
    { key: "list", label: "列表 / 順讀" },
  ];

  const handleTabClick = (key) => {
    setActiveTab(key);
    const el = sectionRefs[key]?.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Optional: Update active tab on scroll could be added here, 
  // but for now manual selection is fine.

  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border/40 bg-background/60 backdrop-blur-xl rounded-2xl shadow-sm data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95">
      <div className="flex flex-col h-full">
        {/* Header / Tabs */}
        <div className="px-6 pt-5 pb-2 border-b border-border/50 bg-background/40 backdrop-blur-sm z-10">
           <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  activeTab === item.key
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-6"
          ref={scrollContainerRef}
        >
          <div className="grid gap-6 lg:gap-8 grid-cols-1">
             {/* Section 1: Display & Fonts */}
             <div ref={sectionRefs.display} className="space-y-6 scroll-mt-20">
               <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                 <h3 className="text-lg font-semibold tracking-tight text-foreground/90">顯示設定</h3>
               </div>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                 <ThemeSettings />
                 <div className="border border-border/60 rounded-xl bg-card/50 text-card-foreground shadow-sm transition-all hover:bg-card/80 hover:shadow-md hover:border-border/80">
                    <div className="p-5">
                       <FontSettings />
                    </div>
                 </div>
               </div>
             </div>
             
             {/* Section 2: List & Reader */}
             <div ref={sectionRefs.list} className="space-y-6 scroll-mt-20">
               <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                 <h3 className="text-lg font-semibold tracking-tight text-foreground/90">列表與閱讀</h3>
               </div>
               <DisplaySettings />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;

import React, { useRef, useState, useEffect } from "react";
import { ThemeSettings } from "./settings/ThemeSettings";
import { DisplaySettings } from "./settings/DisplaySettings";
import { FontSettings } from "./settings/FontSettings";
import { ProfileSettings } from "./settings/ProfileSettings";
import { MarkerSettings } from "./settings/MarkerSettings";
import TagManager from "./dashboard/TagManager";
import { cn } from "../lib/utils";

import { X } from "lucide-react";

function SettingsPanel({ onClose }) {
  const scrollContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState("display");
  
  const sectionRefs = {
    display: useRef(null),
    profile: useRef(null),
    tags: useRef(null),
    list: useRef(null),
    markers: useRef(null),
  };

  const tabs = [
    { key: "display", label: "顯示 / 字級" },
    { key: "list", label: "列表 / 順讀" },
    { key: "markers", label: "自訂標記" },
    { key: "tags", label: "標籤管理" },
    { key: "profile", label: "身份 / 設定" },
  ];

  const handleTabClick = (key) => {
    setActiveTab(key);
    // Simple view switching for now instead of scroll
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border/40 bg-background/60 backdrop-blur-xl rounded-2xl shadow-sm data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95 flex flex-col">
        {/* Main Header with Close Button (Mobile Friendly) */}
        {/* Main Header with Close Button (Mobile Friendly) */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0">
            <button 
                onClick={onClose}
                className="p-2 -ml-2 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                title="關閉"
            >
                <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold tracking-tight flex-1">設定 (Settings)</h2>
        </div>

        {/* Tabs Scroller */}
        <div className="px-6 py-2 border-b border-border/50 bg-background/40 backdrop-blur-sm z-10 w-full overflow-x-auto scrollbar-hide shrink-0">
           <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit whitespace-nowrap">
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
          {activeTab === "display" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground/90">顯示設定</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  <ThemeSettings />
                  <div className="border border-border/60 rounded-xl bg-card/50 text-card-foreground shadow-sm transition-all hover:bg-card/80 hover:shadow-md hover:border-border/80">
                     <div className="p-5">
                        <FontSettings />
                     </div>
                  </div>
                </div>
              </div>
          )}
          
          {activeTab === "markers" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground/90">自訂標記設定</h3>
                </div>
                <MarkerSettings />
              </div>
          )}

          {activeTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ProfileSettings />
              </div>
          )}

          {activeTab === "tags" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-4">
                      <h3 className="text-lg font-semibold tracking-tight text-foreground/90">全域標籤管理</h3>
                  </div>
                  <TagManager />
              </div>
          )}

          {activeTab === "list" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground/90">列表與閱讀</h3>
                </div>
                <DisplaySettings />
              </div>
          )}
        </div>
    </div>
  );
}

export default SettingsPanel;

import React, { useRef, useState } from "react";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { ProfileSettings } from "../settings/ProfileSettings";
import { MarkerSettings } from "../settings/MarkerSettings";
import { cn } from "../../lib/utils";

import { X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

function SettingsPanel({ onClose, activeTab, onTabChange }) {
  const { currentUser } = useAuth();
  const scrollContainerRef = useRef(null);
  const [internalTab, setInternalTab] = useState("display");
  
  const currentTab = activeTab || internalTab;
  const setTab = onTabChange || setInternalTab;
  
  const allTabs = [
    { key: "display", label: "外觀與閱讀" },
    { key: "markers", label: "自訂標記", authRequired: true },
    { key: "profile", label: "身份 / 設定", authRequired: true },
  ];

  const tabs = allTabs.filter(tab => !tab.authRequired || currentUser);

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

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r border-border/50 bg-background/40">
            <div className="px-4 py-3 overflow-x-auto md:overflow-visible scrollbar-hide">
              <div className="flex md:flex-col items-center md:items-stretch gap-1 p-1 bg-muted/50 rounded-lg w-fit md:w-full whitespace-nowrap">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={cn(
                      "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 text-left",
                      currentTab === item.key
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div
            className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-6"
            ref={scrollContainerRef}
          >
            {currentTab === "display" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <AppearanceSettings />
              </div>
            )}

            {currentTab === "markers" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground/90">自訂標記設定</h3>
                </div>
                <MarkerSettings />
              </div>
            )}

            {currentTab === "profile" && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ProfileSettings />
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

export default SettingsPanel;

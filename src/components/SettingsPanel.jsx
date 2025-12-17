import React, { useRef } from "react";
import { ThemeSettings } from "./settings/ThemeSettings";
import { DisplaySettings } from "./settings/DisplaySettings";
import { FontSettings } from "./settings/FontSettings";

function SettingsPanel() {
  const scrollContainerRef = useRef(null);
  const sectionRefs = {
    display: useRef(null),
    list: useRef(null),
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden border border-border bg-background/60 rounded-xl shadow-sm">
      <div
        className="h-full overflow-y-auto scrollbar-hide p-4 sm:p-6"
        ref={scrollContainerRef}
      >
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            { key: "display", label: "顯示 / 字級" },
            { key: "list", label: "列表 / 順讀" },
          ].map((item) => (
            <button
              key={item.key}
              className="px-3 py-2 rounded-lg border border-border/70 text-xs text-foreground/80 hover:text-foreground hover:border-foreground/50 transition-colors"
              onClick={() => {
                const el = sectionRefs[item.key]?.current;
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 lg:gap-5 grid-cols-1 lg:grid-cols-2">
           {/* Section 1: Display & Fonts */}
           <div className="space-y-4">
             <ThemeSettings sectionRef={sectionRefs.display} />
             {/* FontSettings is simpler to just include here as it was part of the display card originally. 
                 But wait, ThemeSettings is a Card. FontSettings is just a div content. 
                 To maintain UI consistency, I should probably have FontSettings inside a Card or modify ThemeSettings.
                 
                 Let's put FontSettings in a Card for consistency or just append it.
                 Actually, looking at previous code, Theme, Accent and Fonts were ALL in one "Display" card.
                 
                 Option A: Modify ThemeSettings to accept children and put FontSettings there.
                 Option B: Render FontSettings in its own Card.
                 
                 I'll go with Option B: Render FontSettings in its own Card or just append it to ThemeSettings if I modify ThemeSettings.
                 
                 Let's check ThemeSettings again. It closes the Card.
                 So I will render FontSettings in a new Card below ThemeSettings.
                 
                 Wait, I want to group them.
                 
                 Let's just Modify ThemeSettings.jsx to include FontSettings import or content, OR
                 make a new wrapper component.
                 
                 Actually, the simplest path now is to just have ThemeSettings AND FontSettings separate.
             */}
             <div className="border border-border/80 rounded-xl bg-card text-card-foreground shadow-sm">
                <div className="p-6">
                    <FontSettings />
                </div>
             </div>
           </div>
           
           {/* Section 2: List & Reader */}
           <DisplaySettings sectionRef={sectionRefs.list} />
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;

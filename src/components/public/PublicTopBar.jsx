import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

export function PublicTopBar({
  title = "劇本藝廊",
  showBack = false,
  onBack,
  tabs = [],
  activeTab,
  onTabChange,
  actions,
}) {
  const navigate = useNavigate();

  return (
    <header className="border-b sticky top-0 bg-background/80 backdrop-blur z-20">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <Button variant="ghost" size="icon" onClick={onBack || (() => navigate(-1))} aria-label="返回">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div
            className="flex items-center gap-2 font-serif font-semibold text-lg text-primary cursor-pointer"
            onClick={() => navigate("/")}
          >
            <BookOpen className="w-6 h-6" />
            <span className="truncate">{title}</span>
          </div>
        </div>

        {tabs.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => onTabChange?.(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {tabs.length > 0 && (
        <div className="md:hidden border-t">
          <div className="container mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
                onClick={() => onTabChange?.(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

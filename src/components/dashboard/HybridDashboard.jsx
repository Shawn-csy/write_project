import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "../ui/button";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { WriteTab } from "./WriteTab";

export default function HybridDashboard({ 
    isSidebarOpen,
    setSidebarOpen,
    onSelectCloudScript,
    openMobileMenu
}) {
  const { currentUser } = useAuth();
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 sm:px-6 pt-4 shrink-0 flex items-center gap-3">
              <div className="lg:hidden">
                  <Button variant="ghost" size="icon" onClick={openMobileMenu}>
                      <PanelLeftOpen className="w-5 h-5" />
                  </Button>
              </div>
              <div className={`hidden lg:block ${isSidebarOpen ? "lg:hidden" : ""}`}>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSidebarOpen && setSidebarOpen(true)}
                        title={t("common.openList")}
                    >
                        <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
                    </Button>
              </div>
              <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold tracking-tight">寫作工作台</h2>
                  <p className="text-xs text-muted-foreground">管理腳本、資料夾與發布狀態</p>
              </div>
              <LanguageSwitcher selectClassName="h-8" />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6">
              {currentUser ? <WriteTab onSelectScript={onSelectCloudScript} /> : null}
          </div>
      </div>
    </div>
  );
}

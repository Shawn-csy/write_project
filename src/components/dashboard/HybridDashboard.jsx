import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { PanelLeftOpen, Plus, ChevronDown, FolderPlus, Upload, CircleHelp, BookOpen } from "lucide-react";
import { Button } from "../ui/button";
import { LanguageSwitcher } from "../common/LanguageSwitcher";
import { WriteTab } from "./WriteTab";
import { useNavigate } from "react-router-dom";
import { TOPBAR_INNER_CLASS, TOPBAR_OUTER_CLASS } from "../layout/topbarLayout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function HybridDashboard({ 
    isSidebarOpen,
    setSidebarOpen,
    onSelectCloudScript,
    openMobileMenu
}) {
  const { currentUser } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const dispatchWriteTabAction = (type) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("write-tab-action", { detail: { type } }));
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-hidden flex flex-col">
          <div className={`${TOPBAR_OUTER_CLASS} shrink-0`}>
            <div className={`${TOPBAR_INNER_CLASS} h-14 sm:h-16 flex items-center gap-2 sm:gap-3`}>
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
                  <h2 className="truncate font-serif font-semibold text-base sm:text-lg text-primary">
                    <span className="sm:hidden">工作台</span>
                    <span className="hidden sm:inline">寫作工作台</span>
                  </h2>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="inline-flex items-center gap-1.5 sm:gap-2">
                  <div className="inline-flex items-center overflow-hidden rounded-md border border-primary/70 bg-primary text-primary-foreground shadow-[0_14px_28px_-14px_hsl(var(--primary)/0.95)]">
                    <Button
                      size="sm"
                      onClick={() => dispatchWriteTabAction("create-script")}
                      title={t("scriptToolbar.newScript")}
                      className="inline-flex h-9 sm:h-10 rounded-none border-0 bg-transparent px-2.5 sm:px-4 font-bold text-primary-foreground shadow-none hover:bg-white/12"
                      data-guide-id="write-create-script-btn"
                    >
                      <Plus className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">{t("scriptToolbar.newScriptLabel")}</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="h-9 sm:h-10 rounded-none border-0 border-l border-white/35 bg-transparent px-2 text-primary-foreground shadow-none hover:bg-white/12"
                          title={t("scriptToolbar.moreCreateOptions")}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-56 p-1.5">
                        <DropdownMenuLabel className="px-2 py-1 text-[11px] text-muted-foreground">
                          {t("scriptToolbar.moreCreateOptions")}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => dispatchWriteTabAction("create-folder")}>
                          <div className="flex flex-col items-start gap-0.5">
                            <div className="flex items-center">
                              <FolderPlus className="w-4 h-4 mr-2" />
                              {t("scriptToolbar.folder")}
                            </div>
                            <span className="pl-6 text-[11px] text-muted-foreground">{t("scriptToolbar.folderHint")}</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => dispatchWriteTabAction("import-script")}
                    title={t("scriptToolbar.importScript")}
                    className="inline-flex h-9 sm:h-10 rounded-md border border-primary/70 bg-primary px-2.5 sm:px-4 font-semibold text-primary-foreground shadow-[0_14px_28px_-14px_hsl(var(--primary)/0.9)] hover:bg-primary/90"
                    data-guide-id="write-import-script-btn"
                  >
                    <Upload className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t("scriptToolbar.import")}</span>
                  </Button>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  title={t("scriptToolbar.guide")}
                  aria-label={t("scriptToolbar.guide")}
                  onClick={() => dispatchWriteTabAction("open-guide")}
                >
                  <CircleHelp className="w-4 h-4" />
                </Button>
                <LanguageSwitcher
                  compact
                  buttonClassName="bg-background/70 backdrop-blur"
                  ariaLabel={t("settings.language")}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden min-[440px]:inline-flex h-8 px-2 sm:px-3"
                  onClick={() => navigate("/")}
                  title={t("nav.gallery", "公開台本")}
                >
                  <BookOpen className="w-4 h-4 sm:hidden" />
                  <span className="hidden sm:inline">{t("nav.gallery", "公開台本")}</span>
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden p-4 sm:p-6">
              {currentUser ? <WriteTab onSelectScript={onSelectCloudScript} /> : null}
          </div>
      </div>
    </div>
  );
}

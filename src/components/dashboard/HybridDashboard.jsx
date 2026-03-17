import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { PanelLeftOpen, Plus, ChevronDown, FolderPlus, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { WriteTab } from "./WriteTab";
import { useNavigate } from "react-router-dom";
import { TOPBAR_OUTER_CLASS } from "../layout/topbarLayout";
import {
  STUDIO_TOPBAR_ACTIONS_CLASS,
  STUDIO_TOPBAR_INNER_CLASS,
  STUDIO_PAGE_PADDING_CLASS,
  STUDIO_TOPBAR_ROW_CLASS,
  STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS,
  STUDIO_TOPBAR_SURFACE_CLASS,
  STUDIO_TOPBAR_TITLE_WRAP_CLASS,
} from "../layout/studioTopbarTokens";
import { StudioTopbarQuickActions } from "../layout/StudioTopbarQuickActions";
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
    <div className="flex h-full flex-col bg-[hsl(var(--surface-1))]">
      <div className="flex-1 overflow-hidden flex flex-col">
          <div className={`${TOPBAR_OUTER_CLASS} ${STUDIO_TOPBAR_SURFACE_CLASS}`}>
            <div className={STUDIO_TOPBAR_INNER_CLASS}>
            <div className={STUDIO_TOPBAR_ROW_CLASS}>
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
              <div className={STUDIO_TOPBAR_TITLE_WRAP_CLASS}>
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">
                      Studio
                    </span>
                    <h2 className="truncate font-serif text-base font-semibold text-primary sm:text-lg">
                      <span className="sm:hidden">工作台</span>
                      <span className="hidden sm:inline">寫作工作台</span>
                    </h2>
                  </div>
                  <p className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
                    草稿管理、發佈設定與作品維護集中在這裡
                  </p>
              </div>
              <div className={STUDIO_TOPBAR_ACTIONS_CLASS}>
                <div className="inline-flex items-center gap-1.5 sm:gap-2">
                  <div className="cta-breathe cta-lift inline-flex items-center overflow-hidden rounded-md border border-primary/70 bg-primary text-primary-foreground shadow-[0_14px_28px_-14px_hsl(var(--primary)/0.95)]">
                    <Button
                      size="sm"
                      onClick={() => dispatchWriteTabAction("create-script")}
                      title={t("scriptToolbar.newScript")}
                      className="inline-flex h-9 sm:h-10 rounded-none border-0 bg-transparent px-2.5 sm:px-4 font-extrabold text-primary-foreground shadow-none hover:bg-white/16"
                      data-guide-id="write-create-script-btn"
                    >
                      <Plus className="w-4 h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">{t("scriptToolbar.newScriptLabel")}</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="h-9 sm:h-10 rounded-none border-0 border-l border-white/35 bg-transparent px-2 text-primary-foreground shadow-none hover:bg-white/16"
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
                    variant="outline"
                    onClick={() => dispatchWriteTabAction("import-script")}
                    title={t("scriptToolbar.importScript")}
                    className={STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS}
                    data-guide-id="write-import-script-btn"
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">{t("scriptToolbar.import")}</span>
                  </Button>
                </div>
                <StudioTopbarQuickActions
                  onOpenGuide={() => dispatchWriteTabAction("open-guide")}
                  onOpenGallery={() => navigate("/")}
                  guideLabel={t("scriptToolbar.guide")}
                  galleryLabel={t("nav.gallery", "公開台本")}
                  languageLabel={t("settings.language")}
                />
              </div>
            </div>
            </div>
          </div>
          <div className={`flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-[hsl(var(--surface-2))] to-[hsl(var(--surface-1))] ${STUDIO_PAGE_PADDING_CLASS}`}>
              {currentUser ? <WriteTab onSelectScript={onSelectCloudScript} /> : null}
          </div>
      </div>
    </div>
  );
}

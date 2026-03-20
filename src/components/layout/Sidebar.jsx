import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Info,
  LayoutTemplate,
  Library,
  PencilLine
} from "lucide-react";
import { Button } from "../ui/button";
import UserMenu from "../auth/UserMenu";
import { useI18n } from "../../contexts/I18nContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

function Sidebar({
  // Scene Props
  sceneList = [],
  currentSceneId,
  onSelectScene,

  // Navigation
  // activeFile, // Removed
  openAbout,
  openSettings,
  closeAbout,
  setSidebarOpen,
  openHome,
  accentStyle,
  className,
  collapsed = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  const closeSidebarIfMobile = () => {
    if (!setSidebarOpen || typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const handleHome = () => {
    openHome();
    closeAbout();
    closeSidebarIfMobile();
  };

  const NavItem = ({ icon: Icon, label, onClick, isActive, className = "" }) => {
    const buttonEl = (
      <button
        onClick={onClick}
        title={collapsed ? undefined : label}
        aria-label={label}
        className={`
          w-full flex items-center rounded-md text-sm transition-all
          ${collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2"}
          ${isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }
          ${className}
        `}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {collapsed ? null : <span className="truncate">{label}</span>}
      </button>
    );

    if (!collapsed) return buttonEl;
    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside className={`relative h-full min-h-0 flex flex-col bg-muted/30 border-r border-border/40 ${className}`}>
      {/* Header */}
      <div className={`flex items-center px-3 py-3 h-14 shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label={t("sidebar.expandList")}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("sidebar.expandList")}</TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            className={`flex items-center hover:opacity-80 transition-opacity text-left group ${collapsed ? "justify-center" : "gap-2"}`}
            onClick={(e) => {
               e.preventDefault();
               handleHome();
            }}
            aria-label={t("sidebar.backHome")}
            title={t("sidebar.backHome")}
          >
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors`}>
                <span className={`text-[10px] font-bold ${accentStyle.label}`}>SR</span>
            </div>
            {collapsed ? null : (
              <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold leading-none truncate font-tracking-tight">Screenplay</span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5 truncate group-hover:text-primary/80 transition-colors">Reader</span>
              </div>
            )}
          </button>
        )}

        {collapsed ? null : (
          <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setSidebarOpen(false)}
              aria-label={t("sidebar.collapseList")}
          >
              <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

          <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin space-y-4">
             {/* Highlighted Public Gallery */}
              <div className="space-y-2 pt-2">
                  {collapsed ? null : (
                    <div className="px-3">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{t("sidebar.publicSection")}</span>
                    </div>
                  )}
                  <div className={collapsed ? "px-1" : "px-2"}>
                      <NavItem
                          icon={Library}
                          label={t("nav.gallery")}
                          onClick={() => { navigate("/"); closeSidebarIfMobile(); }}
                          isActive={location.pathname === "/"}
                          className="bg-primary/5 border border-primary/20"
                      />
                  </div>
                  <div className={`border-b border-border/40 ${collapsed ? "mx-2" : "mx-3"}`} />
              </div>

             {/* Main Navigation */}
             <div className="space-y-1 pt-1">
                  {collapsed ? null : (
                    <div className="px-3 pb-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground opacity-70">{t("sidebar.menuSection")}</span>
                    </div>
                  )}

                  <NavItem
                      icon={PencilLine}
                      label={t("nav.workspace")}
                      onClick={() => { openHome(); closeSidebarIfMobile(); }}
                      isActive={location.pathname.includes("/dashboard")}
                  />

                  <NavItem
                      icon={LayoutTemplate}
                      label={t("nav.studio")}
                      onClick={() => { navigate("/studio"); closeSidebarIfMobile(); }}
                      isActive={location.pathname === "/studio"}
                  />

              </div>
          </div>
      </div>

      {/* Footer Area */}
      <div className={`p-3 shrink-0 bg-background/40 backdrop-blur-sm border-t border-border/40 space-y-1 ${collapsed ? "px-2" : ""}`}>

        {/* Secondary Actions */}
        <div className={`space-y-0.5 mb-2 border-b border-border/40 pb-2 ${collapsed ? "mb-1 pb-1" : ""}`}>
             <NavItem
                icon={Settings}
                label={t("app.settings")}
                onClick={() => { openSettings(); closeSidebarIfMobile(); }}
                className="h-8 text-xs"
             />
             <NavItem
                icon={Info}
                label={t("app.about")}
                onClick={() => { openAbout(); closeSidebarIfMobile(); }}
                className="h-8 text-xs"
             />
        </div>

        {/* User Profile */}
        {collapsed ? null : <UserMenu />}
      </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;

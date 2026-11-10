import React from "react";
import { openPublicPath } from "../../lib/publicNavigation";
import { useNavigate, useLocation } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Info,
  FileText,
  Layers3,
  UserRound,
  Image,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  Mic2,
} from "lucide-react";
import { Button } from "../ui/button";
import UserMenu from "../auth/UserMenu";
import { useI18n } from "../../contexts/I18nContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { AppLogo } from "../common/AppLogo";
import { cn } from "../../lib/utils";

interface SidebarProps {
  openAbout: () => void;
  /** Closes the about/settings overlays before switching pages. */
  closeOverlays: () => void;
  setSidebarOpen: (open: boolean) => void;
  className?: string;
  collapsed?: boolean;
  isAdmin?: boolean;
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  trailing?: React.ReactNode;
  collapsed: boolean;
}

function NavItem({ icon: Icon, label, onClick, isActive, trailing, collapsed }: NavItemProps) {
  const buttonEl = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex w-full items-center rounded-lg text-sm transition-colors",
        collapsed ? "h-10 justify-center px-2" : "h-10 gap-2.5 px-2.5 lg:h-9",
        isActive
          ? "bg-background font-semibold text-foreground shadow-[0_0_0_1px_hsl(var(--border))]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {collapsed ? null : <span className="truncate">{label}</span>}
      {collapsed || !trailing ? null : <span className="ml-auto flex items-center">{trailing}</span>}
    </button>
  );

  if (!collapsed) return buttonEl;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{buttonEl}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function Sidebar({
  openAbout,
  closeOverlays,
  setSidebarOpen,
  className,
  collapsed = false,
  isAdmin = false,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const path = location.pathname;
  const searchTab = new URLSearchParams(location.search).get("tab");

  const closeSidebarIfMobile = () => {
    if (!setSidebarOpen || typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) setSidebarOpen(false);
  };

  const go = (to: string) => {
    closeOverlays();
    navigate(to);
    closeSidebarIfMobile();
  };

  const isWorks = path.startsWith("/works") || path.startsWith("/dashboard") || path.startsWith("/edit/") || path === "/studio";
  const isMedia = path === "/settings" && searchTab === "media";

  return (
    <TooltipProvider delayDuration={150}>
      <aside className={cn("relative flex h-full min-h-0 flex-col bg-[hsl(var(--studio-nav-bg))]", className)}>
        <div className={cn("flex h-14 shrink-0 items-center px-3", collapsed ? "justify-center" : "justify-between")}>
          {collapsed ? (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground"
                  onClick={() => setSidebarOpen(true)}
                  aria-label={t("sidebar.expandList")}
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{t("sidebar.expandList")}</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:opacity-80"
                onClick={() => go("/works")}
                aria-label={t("sidebar.backHome")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <AppLogo className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[15px] font-semibold">Screenplay</span>
                  <span className="text-xs text-muted-foreground">{t("nav.studioName", "工作室")}</span>
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => setSidebarOpen(false)}
                aria-label={t("sidebar.collapseList")}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <nav aria-label="工作室導覽" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-3 scrollbar-thin">
          <div className="space-y-0.5">
            <NavItem collapsed={collapsed} icon={FileText} label={t("nav.works", "作品")} onClick={() => go("/works")} isActive={isWorks} />
            <NavItem collapsed={collapsed} icon={Layers3} label={t("nav.series", "系列")} onClick={() => go("/series")} isActive={path.startsWith("/series")} />
            <NavItem collapsed={collapsed} icon={UserRound} label={t("nav.identity", "公開身份")} onClick={() => go("/identity")} isActive={path.startsWith("/identity") || path === "/community"} />
            <NavItem collapsed={collapsed} icon={Mic2} label={t("nav.demoManagement", "Demo 管理")} onClick={() => go("/studio/demos")} isActive={path === "/studio/demos"} />
            <NavItem collapsed={collapsed} icon={Image} label={t("nav.mediaLibrary", "媒體庫")} onClick={() => go("/settings?tab=media")} isActive={isMedia} />
          </div>

          {isAdmin && (
            <div className="space-y-0.5">
              {collapsed ? null : <div className="px-2.5 pb-1 text-xs font-semibold text-muted-foreground">{t("sidebar.adminSection")}</div>}
              <NavItem collapsed={collapsed} icon={ShieldCheck} label={t("nav.adminConsole", "超管後台")} onClick={() => go("/superadmin")} isActive={path === "/superadmin"} />
            </div>
          )}
        </nav>

        <div className={cn("shrink-0 space-y-0.5 border-t border-border/70 px-3 pb-3 pt-3", collapsed && "px-2")}>
          <NavItem collapsed={collapsed} icon={Settings} label={t("app.settings")} onClick={() => go("/settings")} isActive={path.startsWith("/settings") && !isMedia} />
          <NavItem
            collapsed={collapsed}
            icon={BookOpen}
            label={t("nav.gallery")}
            onClick={() => openPublicPath("/")}
            trailing={<ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />}
          />
          <NavItem collapsed={collapsed} icon={Info} label={t("app.about")} onClick={() => { openAbout(); closeSidebarIfMobile(); }} />
          {collapsed ? null : <div className="pt-2"><UserMenu /></div>}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;

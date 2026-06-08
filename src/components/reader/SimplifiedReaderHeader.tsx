import React from "react";
import { ArrowLeft, Share2, Moon, Sun, MoreHorizontal, Globe, Eye, Download, HelpCircle, Palette } from "lucide-react";
import { Button } from "../ui/button";
import { ReaderAppearanceMenu } from "./ReaderAppearanceMenu";
import { ReaderTOC } from "./ReaderTOC";
import { useI18n } from "../../contexts/I18nContext";
import { useTheme } from "../theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";

interface DownloadOption {
  id: string;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: (event: Event | React.MouseEvent) => void;
  renderDialog?: () => React.ReactNode;
}

interface SceneItem {
  id: string;
  label: string;
}

interface MetaItem {
  label: string;
  value?: React.ReactNode;
  render?: React.ReactNode;
}

interface MarkerConfigItem {
  id: string;
  label?: string;
  [key: string]: unknown;
}

interface SimplifiedReaderHeaderProps {
  onBack: () => void;
  title?: string;
  showTitle?: boolean;
  onShare?: () => void;
  onOpenGuide?: () => void;
  downloadOptions?: DownloadOption[];
  sceneList?: SceneItem[];
  currentSceneId?: string;
  onSelectScene: (sceneId: string) => void;
  tocOpen?: boolean;
  onTocOpenChange?: (open: boolean) => void;
  metaItems?: MetaItem[];
  markerConfigs?: MarkerConfigItem[];
  hiddenMarkerIds?: string[];
  onToggleMarker: (markerId: string) => void;
  className?: string;
}

export function SimplifiedReaderHeader({
  onBack,
  title,
  showTitle = false,
  onShare,
  onOpenGuide,
  downloadOptions = [],
  // TOC props
  sceneList,
  currentSceneId,
  onSelectScene,
  tocOpen,
  onTocOpenChange,
  metaItems = [],
  // Marker Props
  markerConfigs = [],
  hiddenMarkerIds = [],
  onToggleMarker,
  className = "",
}: SimplifiedReaderHeaderProps) {
  const { t, lang, setLang } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);
  const visibleMarkerIds = React.useMemo(() => {
    if (!Array.isArray(markerConfigs) || markerConfigs.length === 0) return [];
    const hidden = Array.isArray(hiddenMarkerIds) ? hiddenMarkerIds : [];
    return markerConfigs.filter((c) => !hidden.includes(c.id)).map((c) => c.id);
  }, [markerConfigs, hiddenMarkerIds]);
  const activeDownloadOptions = React.useMemo(
    () => (downloadOptions || []).filter((opt) => !opt?.hidden),
    [downloadOptions]
  );

  return (
    <header
      data-guide-id="public-guide-header"
      className={`fixed top-0 left-0 right-0 h-14 md:h-16 px-4 z-40 flex items-center justify-between transition-all duration-300 ${className}`}
    >
      {/* Left: Back */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          data-guide-id="public-guide-back"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-11 w-11 rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md shrink-0"
          title={t("common.back")}
          aria-label={t("common.back")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <ReaderTOC
          sceneList={sceneList}
          currentSceneId={currentSceneId}
          onSelectScene={onSelectScene}
          metaItems={metaItems}
          open={tocOpen}
          onOpenChange={onTocOpenChange}
          triggerGuideId="public-guide-toc-trigger"
          panelGuideId="public-guide-toc-panel"
          hideHeaderTrigger
        />

        <div className={`h-6 w-px bg-white/20 mx-1 transition-opacity duration-300 ${showTitle ? "opacity-100" : "opacity-0"}`} />
        
        <h1 
            className={`font-serif text-lg md:text-xl font-medium truncate transition-opacity duration-300 ${
                showTitle ? "opacity-100" : "opacity-0"
            }`}
        >
            {title}
        </h1>
      </div>

      {/* Right: Actions */}
      <div data-guide-id="public-guide-actions" className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="h-11 w-11 rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
          title={isDark ? t("appearance.light") : t("appearance.dark")}
          aria-label={isDark ? t("appearance.light") : t("appearance.dark")}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        {onShare && (
             <Button
                variant="ghost"
                size="icon"
                onClick={onShare}
                className="h-11 w-11 rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
                title={t("readerActions.share")}
              >
                <Share2 className="w-4 h-4" />
              </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
              title={t("common.more", "更多")}
              aria-label={t("common.more", "更多")}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("common.settings", "設定")}</DropdownMenuLabel>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Globe className="mr-2 h-4 w-4" />
                {t("settings.language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setLang("zh-TW")} disabled={lang === "zh-TW"}>{t("settings.languageZh")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("en")} disabled={lang === "en"}>{t("settings.languageEn")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("ja")} disabled={lang === "ja"}>{t("settings.languageJa")}</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Eye className="mr-2 h-4 w-4" />
                {t("markerVisibility.label")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {markerConfigs.map((config) => {
                  const id = String(config.id || "");
                  const checked = visibleMarkerIds.includes(id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={id}
                      checked={checked}
                      onCheckedChange={() => onToggleMarker(id)}
                    >
                      {config.label || id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => setAppearanceOpen(true)}>
              <Palette className="mr-2 h-4 w-4" />
              {t("readerAppearance.title")}
            </DropdownMenuItem>
            {onOpenGuide ? (
              <DropdownMenuItem onClick={onOpenGuide}>
                <HelpCircle className="mr-2 h-4 w-4" />
                {t("publicReader.guide")}
              </DropdownMenuItem>
            ) : null}
            {activeDownloadOptions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("common.download")}</DropdownMenuLabel>
                {activeDownloadOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.id}
                    disabled={Boolean(opt.disabled)}
                    onClick={(e) => opt.onClick?.(e)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {activeDownloadOptions.map((opt) => (
          <React.Fragment key={`${opt.id}-dialog`}>{opt.renderDialog?.()}</React.Fragment>
        ))}
        <ReaderAppearanceMenu open={appearanceOpen} onOpenChange={setAppearanceOpen} hideTrigger />
      </div>
    </header>
  );
}

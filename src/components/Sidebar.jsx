import React, { useMemo, useState } from "react";
import {
  PanelLeftClose,
  Type,
  FileText,
  ChevronDown,
  Settings,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { homeContent } from "../constants/homeContent";

function Sidebar({
  fileTree,
  searchTerm,
  onSearchChange,
  openFolders,
  toggleFolder,
  activeFile,
  onSelectFile,
  accentStyle,
  openAbout,
  openSettings,
  closeAbout,
  setSidebarOpen,
  openHome,
  fileTitleMap,
  fileTagsMap = {},
  fileLabelMode,
  setFileLabelMode,
  className,
}) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  const closeSidebarIfMobile = () => {
    if (!setSidebarOpen || typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  };

  const renderNode = (node, depth = 0) => {
    if (!node) return null;
    const isRoot = node.path === "__root__";
    const expanded = searchTerm ? true : openFolders.has(node.path);
    const label = isRoot ? "根目錄" : node.name;
    const indentPx = 16 + depth * 12;
    const folderDepthClass =
      depth === 0
        ? "folder-depth-0"
        : depth === 1
        ? "folder-depth-1"
        : "folder-depth-2";
    const fileDepthClass =
      depth === 0
        ? "file-depth-0"
        : depth === 1
        ? "file-depth-1"
        : "file-depth-2";

    if (isRoot) {
      return (
        <div key={node.path}>
          {node.files?.map((file) => (
            <div key={file.path}>
              <Button
                variant="ghost"
                className={`w-full justify-start rounded-none px-6 py-3 text-sm text-left ${
                  accentStyle.fileHoverBg
                } ${
                  activeFile === file.name
                    ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText} border-l-4 ${accentStyle.fileActiveBorder} font-semibold`
                    : `text-foreground ${fileDepthClass}`
                }`}
                onClick={() => {
                  closeAbout();
                  onSelectFile(file);
                  closeSidebarIfMobile();
                }}
                style={{
                  paddingLeft: `${indentPx + 12}px`,
                }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${accentStyle.dot} mr-3`}
                />
                <span className="truncate">
                  {fileLabelMode === "filename"
                    ? file.name
                    : fileTitleMap[file.name]?.trim() || file.name}
                </span>
              </Button>
            </div>
          ))}
          {node.children?.map((child) => renderNode(child, depth))}
        </div>
      );
    }

    return (
      <div key={node.path}>
        <Button
          variant="ghost"
          className={`w-full justify-between rounded-none px-4 py-3 text-sm font-semibold ${accentStyle.folderText} ${accentStyle.folderTextDark} ${folderDepthClass}`}
          onClick={() => toggleFolder(node.path)}
          disabled={Boolean(searchTerm)}
          style={{
            paddingLeft: `${indentPx}px`,
          }}
        >
          <span className="truncate">{label}</span>
          <span className="text-xs text-muted-foreground">
            {expanded ? "收合" : "展開"}
          </span>
        </Button>
        {expanded && (
          <div className="divide-y divide-border/60">
            {node.files?.map((file) => (
              <div key={file.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start rounded-none px-6 py-3 text-sm text-left ${
                    accentStyle.fileHoverBg
                  } ${
                    activeFile === file.name
                      ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText} border-l-4 ${accentStyle.fileActiveBorder} font-semibold`
                      : `text-foreground ${fileDepthClass}`
                  }`}
                  onClick={() => {
                    closeAbout();
                    onSelectFile(file);
                    closeSidebarIfMobile();
                  }}
                  style={{
                    paddingLeft: `${indentPx + 12}px`,
                  }}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${accentStyle.dot} mr-3`}
                  />
                  <span className="truncate">
                    {fileLabelMode === "filename"
                      ? file.name
                      : fileTitleMap[file.name]?.trim() || file.name}
                  </span>
                </Button>
              </div>
            ))}
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const hasFiles =
    fileTree &&
    ((fileTree.files && fileTree.files.length > 0) ||
      (fileTree.children && fileTree.children.length > 0));

  const tagSuggestions = useMemo(() => {
    const set = new Set();
    Object.values(fileTagsMap || {}).forEach((arr) => {
      arr?.forEach((t) => {
        const s = t.trim();
        if (s) set.add(s);
      });
    });
    const list = Array.from(set);
    list.sort(() => 0.5 - Math.random());
    return {
      inline: list.slice(0, 3),
      dropdown: list.slice(0, 10),
    };
  }, [fileTagsMap]);

  const toggleTagSelect = (tag) => {
    setSelectedTags((prev) => {
      const has = prev.includes(tag);
      const next = has ? prev.filter((t) => t !== tag) : [...prev, tag];
      onSearchChange(next.join(" "));
      return next;
    });
  };

  return (
    <Card className={`relative h-full min-h-0 overflow-hidden bg-muted/50 border-border/70 flex flex-col ${className}`}>
      <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/60">
        <div className="flex w-full items-center justify-between gap-3">
          <button
            className="space-y-1 text-left flex-1"
            onClick={() => {
              openHome();
              closeAbout();
              setSidebarOpen(false);
            }}
            aria-label="回首頁使用說明"
          >
            <p
              className={`text-[11px] uppercase tracking-[0.2em] ${accentStyle.label}`}
            >
              Scripts
            </p>
            <CardTitle className="text-lg">Screenplay Reader</CardTitle>
            <CardDescription>{homeContent.label}</CardDescription>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="設定"
              className="shrink-0 lg:hidden"
              onClick={(e) => {
                e.stopPropagation();
                openSettings();
                closeSidebarIfMobile();
              }}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="收合列表"
              className="shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <PanelLeftClose className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
          <label className="sr-only" htmlFor="sidebar-search">
            搜尋檔案或資料夾
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <input
                id="sidebar-search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜尋檔案或資料夾..."
                className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none ${accentStyle.focusRing}`}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange("")}
                  aria-label="清除搜尋"
                >
                  清除
                </Button>
              )}
            </div>
            <Select value={fileLabelMode} onValueChange={setFileLabelMode}>
              <SelectTrigger className="h-9 w-10 px-2">
                <SelectValue>
                  {fileLabelMode === "filename" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <Type className="h-4 w-4" />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  <SelectLabel>列表顯示</SelectLabel>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span>標題名稱</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="filename">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>檔名</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {tagSuggestions.inline.length > 0 && (
            <div className="mt-2 flex items-center gap-2 relative">
              <div className="flex gap-2 overflow-hidden">
                {tagSuggestions.inline.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => onSearchChange(tag)}
                    className="text-xs px-2 py-1 rounded-full border border-border/60 bg-background/60 hover:border-foreground/40 transition-colors whitespace-nowrap"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                aria-label="展開標籤"
                onClick={() => setTagMenuOpen((v) => !v)}
                className="h-8 w-8 inline-flex items-center justify-center text-foreground/80 hover:text-foreground transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {tagMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] rounded-md border border-border/70 bg-card shadow-lg">
                  <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                    {tagSuggestions.dropdown.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTagSelect(tag)}
                          className={`w-full flex items-center gap-2 text-left text-sm px-2 py-1 rounded ${
                            selected
                              ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText}`
                              : "hover:bg-muted/60"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 inline-flex items-center justify-center rounded border ${
                              selected
                                ? accentStyle.fileActiveBorder
                                : "border-border/60"
                            }`}
                          >
                            {selected ? "✓" : ""}
                          </span>
                          <span className="truncate">{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!hasFiles ? (
            <p className="p-4 text-sm text-muted-foreground">
              未找到符合的檔案
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {renderNode(fileTree)}
            </div>
          )}
        </div>
      </CardContent>

      <div
        className="mt-auto border-t border-border/60 bg-background/60 px-4 pt-3 flex flex-col gap-3 shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="flex-1 justify-between rounded-lg px-3 py-2 text-sm font-semibold"
            onClick={() => {
              openAbout();
              setSidebarOpen(false);
            }}
          >
            <span className="truncate">About</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="設定"
            className="h-10 w-10 rounded-lg border border-border/60"
            onClick={(e) => {
              e.stopPropagation();
              openSettings();
              closeSidebarIfMobile();
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default Sidebar;

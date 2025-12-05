import React, { useMemo, useState } from "react";
import { PanelLeftClose, Sun, Moon, Type, FileText, ChevronDown } from "lucide-react";
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
import { accentThemes } from "../constants/accent";

function Sidebar({
  groupedFiles,
  searchTerm,
  onSearchChange,
  openFolders,
  toggleFolder,
  activeFile,
  onSelectFile,
  accentStyle,
  accentOptions,
  accent,
  setAccent,
  openAbout,
  closeAbout,
  setSidebarOpen,
  openHome,
  isDark,
  setTheme,
  fontSize,
  setFontSize,
  fileTitleMap,
  fileTagsMap = {},
  fileLabelMode,
  setFileLabelMode,
}) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedFiles;
    const q = searchTerm.toLowerCase();
    return groupedFiles
      .map(({ folder, items }) => {
        const folderMatch = folder.toLowerCase().includes(q);
        const matchedItems = items.filter((f) =>
          f.name.toLowerCase().includes(q) ||
          f.display?.toLowerCase().includes(q) ||
          (fileTitleMap[f.name]?.toLowerCase() || "").includes(q) ||
          (fileTagsMap[f.name]?.join(" ").toLowerCase().includes(q) ?? false)
        );
        if (!folderMatch && matchedItems.length === 0) return null;
        return {
          folder,
          items: folderMatch ? items : matchedItems,
        };
      })
      .filter(Boolean);
  }, [groupedFiles, searchTerm, fileTitleMap, fileTagsMap]);

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
    <Card className="relative h-full min-h-0 overflow-hidden bg-muted/50 border-border/70 flex flex-col">
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
                            selected ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText}` : "hover:bg-muted/60"
                          }`}
                        >
                          <span
                            className={`h-4 w-4 inline-flex items-center justify-center rounded border ${
                              selected ? accentStyle.fileActiveBorder : "border-border/60"
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
          {filteredGroups.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              未找到符合的檔案
            </p>
          ) : (
            <div className="divide-y divide-border/70">
              {filteredGroups.map(({ folder, items }) => {
                const expanded = searchTerm ? true : openFolders.has(folder);
                return (
                  <div key={folder} className="bg-muted/30">
                    <Button
                      variant="ghost"
                      className={`w-full justify-between rounded-none px-4 py-3 text-sm font-semibold ${accentStyle.folderBg} ${accentStyle.folderBgDark} ${accentStyle.folderText} ${accentStyle.folderTextDark}`}
                      onClick={() => toggleFolder(folder)}
                      disabled={Boolean(searchTerm)}
                    >
                      <span className="truncate">
                        {folder === "__root__" ? "根目錄" : folder}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {expanded ? "收合" : "展開"}
                      </span>
                    </Button>
                    {expanded && (
                      <ul className="divide-y divide-border/60">
                        {items.map((file) => (
                          <li key={file.path}>
                            <Button
                              variant="ghost"
                              className={`w-full justify-start rounded-none px-6 py-3 text-sm text-left ${
                                accentStyle.fileHoverBg
                              } ${
                                activeFile === file.name
                                  ? `${accentStyle.fileActiveBg} ${accentStyle.fileActiveText} border-l-4 ${accentStyle.fileActiveBorder} font-semibold`
                                  : "text-foreground"
                              }`}
                              onClick={() => {
                                closeAbout();
                                onSelectFile(file);
                                if (setSidebarOpen) {
                                  const isDesktop = window.matchMedia(
                                    "(min-width: 1024px)"
                                  ).matches;
                                  if (!isDesktop) {
                                    setSidebarOpen(false);
                                  }
                                }
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
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>

      <div className="mt-auto border-t border-border/60 bg-background/60 px-4 py-3 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            字級
          </span>
          <div className="flex items-center gap-1">
            {[16, 24, 36, 72].map((size) => (
              <button
                key={size}
                aria-label={`字級 ${size}px`}
                onClick={() => setFontSize(size)}
                className={`h-8 w-8 inline-flex items-center justify-center rounded border ${
                  fontSize === size
                    ? accentStyle.fileActiveBorder
                    : "border-border/60"
                } text-foreground/80 hover:text-foreground transition-colors`}
              >
                <span
                  style={{ fontSize: size <= 24 ? 12 : size >= 72 ? 20 : 16 }}
                >
                  A
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            顯示模式
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="切換主題"
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <div className="flex items-center gap-1">
              {accentOptions.map((opt) => {
                const active = accent === opt.value;
                const palette = accentThemes[opt.value];
                const swatch = palette?.accent;
                const borderColor = active
                  ? `hsl(${swatch})`
                  : undefined;
                return (
                  <Button
                    key={opt.value}
                    variant="ghost"
                    size="icon"
                    aria-label={`重點色 ${opt.label}`}
                    className="h-9 w-9 p-0 border bg-background"
                    style={{
                      borderColor: borderColor || undefined,
                    }}
                    onClick={() => {
                      setAccent(opt.value);
                      localStorage.setItem(
                        "screenplay-reader-accent",
                        opt.value
                      );
                    }}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: swatch ? `hsl(${swatch})` : undefined }}
                    />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-between rounded-lg px-3 py-2 text-sm font-semibold"
          onClick={() => {
            openAbout();
            setSidebarOpen(false);
          }}
        >
          <span className="truncate">About</span>
          <span className="text-xs text-muted-foreground">查看</span>
        </Button>
      </div>
    </Card>
  );
}

export default Sidebar;

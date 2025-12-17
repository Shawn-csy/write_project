import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "./components/ui/drawer";
import Sidebar from "./components/Sidebar";
import MobileMenu from "./components/MobileMenu";
import HomePanel from "./components/HomePanel";
import ScriptPanel from "./components/ScriptPanel";
import ReaderHeader from "./components/ReaderHeader";
import { MainLayout } from "./components/MainLayout";
// import SettingsPanel from "./components/SettingsPanel"; // Lazy loaded
// import AboutPanel from "./components/AboutPanel"; // Lazy loaded
import { useTheme } from "./components/theme-provider";

const SettingsPanel = React.lazy(() => import("./components/SettingsPanel"));
const AboutPanel = React.lazy(() => import("./components/AboutPanel"));
import {
  accentThemes,
  accentOptions,
  accentClasses,
  defaultAccent,
} from "./constants/accent";
import { STORAGE_KEYS } from "./constants/storageKeys";
import { readNumber, readString, writeValue } from "./lib/storage";
import generatedFileMeta from "./constants/fileMeta.generated.json";
import { buildPrintHtml } from "./lib/print";
import { useSettings } from "./contexts/SettingsContext";

const scriptModules = import.meta.glob("./scripts_file/**/*.fountain", {
  query: "?raw",
  import: "default",
});

function App() {
  const {
      isDark,
      // Theme logic is handled by provider but we might need isDark for layout classes if any
      accent,
      accentConfig,
      // accentStyle is derived from imports, not state, so we keep using accentClasses
      fontSize,
      bodyFontSize,
      dialogueFontSize,
      exportMode,
      fileLabelMode,
      setFileLabelMode,
      focusEffect,
      focusContentMode,
      highlightCharacters,
      highlightSfx,
      adjustFont,
      // Setters if needed
  } = useSettings();

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [rawScript, setRawScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [characterList, setCharacterList] = useState([]);
  const [filterCharacter, setFilterCharacter] = useState("__ALL__");
  const [focusMode, setFocusMode] = useState(false);
  // settings removed
  const [processedScriptHtml, setProcessedScriptHtml] = useState("");
  // exportMode removed
  const contentScrollRef = useRef(null);

  // Persistence helpers removed
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isSidebarOpen = isDesktopSidebarOpen; // For backward compatibility if needed, or derived
  const setSidebarOpen = (open) => {
     // Hybrid setter: if mobile size, toggle drawer; if desktop, toggle sidebar
     if (window.innerWidth < 1024) {
       setIsMobileDrawerOpen(open);
     } else {
       setIsDesktopSidebarOpen(open);
     }
  };
  
  // Sync states on resize (optional but good for consistency)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileDrawerOpen) {
        setIsMobileDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileDrawerOpen]);
  // Removed local settings state definitions
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // accent removed
  const [homeOpen, setHomeOpen] = useState(false);
  const [fileMeta, setFileMeta] = useState({});
  const [openFolders, setOpenFolders] = useState(new Set(["__root__"]));
  const [titleHtml, setTitleHtml] = useState("");
  const [titleName, setTitleName] = useState("");
  const [titleNote, setTitleNote] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [hasTitle, setHasTitle] = useState(false);
  const [rawScriptHtml, setRawScriptHtml] = useState("");
  // fontSize removed
  const [fileTitleMap, setFileTitleMap] = useState({});
  // fileLabelMode removed
  const [fileTagsMap, setFileTagsMap] = useState({});
  const [shareCopied, setShareCopied] = useState(false);
  const shareCopiedTimer = useRef(null);
  const [sceneList, setSceneList] = useState([]);
  const [scrollSceneId, setScrollSceneId] = useState("");
  const [currentSceneId, setCurrentSceneId] = useState("");
  const initialParamsRef = useRef({ char: null, scene: null });
  const [scrollProgress, setScrollProgress] = useState(0);

  // useTheme removed (using SettingsContext)
  const appliedTheme = isDark ? "dark" : "light";
  const accentStyle = accentClasses;
  // accentConfig effect removed (moved to Context)

  useEffect(() => {
    if (hasTitle) {
      setShowTitle(false); // 預設摺疊
    } else {
      setShowTitle(false);
    }
  }, [hasTitle, activeFile]);

  useEffect(() => {
    if (homeOpen || aboutOpen || settingsOpen) {
      setShowTitle(false);
    }
  }, [homeOpen, aboutOpen, settingsOpen]);

  useEffect(() => {
    const entries = Object.entries(scriptModules).map(([path, loader]) => ({
      name: path.split("/").pop(),
      path,
      loader,
      display: path.replace("./scripts_file/", ""),
    }));
    setFiles(entries);
  }, []);

  useEffect(() => {
    if (!files.length) return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get("file");
    const target =
      (param && files.find((f) => f.display === param || f.name === param)) ||
      files[0];
    if (target) loadScript(target);
  }, [files]);

  useEffect(() => {
    if (!sceneList.length) return;
    const initialScene = initialParamsRef.current.scene;
    if (initialScene && sceneList.some((s) => s.id === initialScene)) {
      setCurrentSceneId(initialScene);
      setScrollSceneId(initialScene);
      initialParamsRef.current.scene = null;
    }
  }, [sceneList]);

  useEffect(() => {
    if (!files.length || !activeFile) return;
    syncUrl();
  }, [filterCharacter, currentSceneId, activeFile, files]);

  // Hydration effect removed (moved to Context)

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    initialParamsRef.current = {
      char: url.searchParams.get("char"),
      scene: url.searchParams.get("scene"),
    };
    const charParam = initialParamsRef.current.char;
    if (charParam) {
      setFilterCharacter(charParam);
      if (charParam !== "__ALL__") {
        setFocusMode(true);
      }
    }
  }, []);

  // 抽取標題欄位與 tags（首段 key:value 直到空行，僅 key 含 tag 的視為 tags）
  const extractTitleMeta = (text) => {
    const entries = [];
    const lines = (text || "").split("\n");
    let current = null;
    for (const raw of lines) {
      if (!raw.trim()) break;
      const match = raw.match(/^(\s*)([^:]+):(.*)$/);
      if (match) {
        const [, , key, rest] = match;
        const val = rest.trim();
        current = { key: key.trim(), values: val ? [val] : [] };
        entries.push(current);
      } else if (current) {
        const cont = raw.trim();
        if (cont) current.values.push(cont);
      }
    }
    const titleEntry = entries.find((e) => e.key.toLowerCase() === "title");
    const title = titleEntry?.values?.[0] || "";
    const tags = [];
    entries.forEach((e) => {
      const key = e.key.toLowerCase();
      if (!key.includes("tag")) return;
      e.values
        ?.flatMap((v) =>
          v
            .split(/[，,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        )
        .forEach((t) => tags.push(t));
    });
    return { title, tags };
  };

  // 預先建立標題/標籤索引供搜尋
  useEffect(() => {
    if (!files.length) return;
    (async () => {
      const titleMap = {};
      const tagsMap = {};
      await Promise.all(
        files.map(async (file) => {
          try {
            const content = await file.loader();
            const { title, tags } = extractTitleMeta(content);
            if (title) titleMap[file.name] = title;
            if (tags.length) tagsMap[file.name] = tags;
          } catch (err) {
            console.warn("建立標題索引失敗", file.name, err);
          }
        })
      );
      setFileTitleMap((prev) => ({ ...titleMap, ...prev }));
      setFileTagsMap(tagsMap);
    })();
  }, [files]);

  const fetchLastModified = async (file) => {
    try {
      const url = file.path.startsWith("./")
        ? new URL(file.path.replace("./", "/src/"), window.location.origin)
        : new URL(file.path, window.location.origin);
      const res = await fetch(url, { method: "HEAD" });
      const header = res.headers.get("last-modified");
      if (header) {
        setFileMeta((prev) => ({ ...prev, [file.name]: new Date(header) }));
      }
    } catch (err) {
      console.warn("取得檔案時間失敗", err);
    }
  };

  const syncUrl = ({ fileName, character, sceneId } = {}) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const fileEntry =
      (fileName && files.find((f) => f.name === fileName)) ||
      (activeFile && files.find((f) => f.name === activeFile));
    if (fileEntry) url.searchParams.set("file", fileEntry.display);
    else url.searchParams.delete("file");

    const charVal = character !== undefined ? character : filterCharacter;
    if (charVal && charVal !== "__ALL__") url.searchParams.set("char", charVal);
    else url.searchParams.delete("char");

    const sceneVal = sceneId !== undefined ? sceneId : currentSceneId;
    if (sceneVal) url.searchParams.set("scene", sceneVal);
    else url.searchParams.delete("scene");

    window.history.replaceState({}, "", url);
  };

  const loadScript = async (file) => {
    setIsLoading(true);
    try {
      const content = await file.loader();
      setActiveFile(file.name);
      setRawScript(content);
      const initChar = initialParamsRef.current.char;
      if (initChar) {
        setFilterCharacter(initChar);
        if (initChar !== "__ALL__") {
          setFocusMode(true);
        } else {
          setFocusMode(false);
        }
        initialParamsRef.current.char = null;
      } else {
        setFilterCharacter("__ALL__");
        setFocusMode(false);
      }
      setSceneList([]);
      setCurrentSceneId("");
      setScrollSceneId("");
      setTitleHtml("");
      setTitleName("");
      setHasTitle(false);
      setShowTitle(false);
      setRawScriptHtml("");
      setHomeOpen(false);
      setAboutOpen(false);
      setSettingsOpen(false);
      syncUrl({ fileName: file.name, sceneId: "" });
      const metaKey = file.display || file.name;
      if (generatedFileMeta?.[metaKey]) {
        setFileMeta((prev) => ({ ...prev, [file.name]: new Date(generatedFileMeta[metaKey]) }));
      } else {
        fetchLastModified(file);
      }
    } catch (err) {
      console.error("載入劇本失敗:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedFiles = useMemo(
    () => files.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [files]
  );

  const totalLines = useMemo(() => {
    if (!rawScript) return 0;
    return rawScript.split(/\r?\n/).length;
  }, [rawScript]);

  useEffect(() => {
    if (!files.length) return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get("file");
    const target =
      (param && files.find((f) => f.display === param || f.name === param)) ||
      files[0];
    if (target) loadScript(target);
  }, [files]);

  useEffect(() => {
    if (generatedFileMeta && Object.keys(generatedFileMeta).length) {
      const normalized = {};
      Object.entries(generatedFileMeta).forEach(([key, iso]) => {
        normalized[key] = new Date(iso);
      });
      setFileMeta((prev) => ({ ...normalized, ...prev }));
    }
  }, []);

  const handleShareUrl = async (e) => {
    e?.stopPropagation?.();
    if (typeof window === "undefined") return;
    const shareUrl = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        if (shareCopiedTimer.current) clearTimeout(shareCopiedTimer.current);
        setShareCopied(true);
        shareCopiedTimer.current = setTimeout(() => setShareCopied(false), 1800);
        return;
      }
      window.prompt("複製分享連結", shareUrl);
    } catch (err) {
      console.error("分享連結失敗", err);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
          if (shareCopiedTimer.current) clearTimeout(shareCopiedTimer.current);
          setShareCopied(true);
          shareCopiedTimer.current = setTimeout(() => setShareCopied(false), 1800);
        }
      } catch (copyErr) {
        console.error("複製連結失敗", copyErr);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (shareCopiedTimer.current) clearTimeout(shareCopiedTimer.current);
    };
  }, []);

  // 全域快捷鍵：字級調整、側欄開合、順讀切換
  // adjustFont handler moved to Context
  useEffect(() => {
    // Removed local adjustFont definition


    const handler = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "[" || key === "{") {
        e.preventDefault();
        adjustFont(-1);
      } else if (key === "]" || key === "}") {
        e.preventDefault();
        adjustFont(1);
      } else if (key === "b") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      } else if (key === "g") {
        if (filterCharacter && filterCharacter !== "__ALL__") {
          e.preventDefault();
          setFocusMode((v) => !v);
        }
      } else if (key === "arrowup" || key === "arrowdown") {
        if (!sceneList.length) return;
        e.preventDefault();
        const ids = sceneList.map((s) => s.id);
        const idx = ids.findIndex((id) => id === currentSceneId);
        if (key === "arrowup") {
          if (idx > 0) handleSelectScene(ids[idx - 1]);
          else handleSelectScene("");
        } else {
          if (idx === -1) handleSelectScene(ids[0]);
          else if (idx < ids.length - 1) handleSelectScene(ids[idx + 1]);
        }
      } else if (key === "arrowright" || key === "arrowleft") {
        e.preventDefault();
        const el = contentScrollRef.current;
        if (el) {
          const lineHeight = fontSize * 1.6;
          const deltaLines = 6;
          const delta = lineHeight * deltaLines * (key === "arrowright" ? 1 : -1);
          el.scrollTop = Math.max(0, el.scrollTop + delta);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fontSize, filterCharacter, sceneList, currentSceneId, adjustFont]);

  const containerBg = "bg-background text-foreground";
  const sidebarWrapper = isDesktopSidebarOpen
    ? "w-80 lg:w-72 translate-x-0 pointer-events-auto relative lg:static"
    : "lg:absolute w-0 h-0 -translate-x-full pointer-events-none";
  const sidebarBase =
    "fixed inset-y-0 left-0 z-40 lg:z-20 lg:static transition-transform duration-200 overflow-hidden min-h-0";
  const layoutGap = isDesktopSidebarOpen ? "gap-4 lg:gap-6" : "gap-0";

  const fileTree = useMemo(() => {
    const buildTree = () => ({
      name: "__root__",
      path: "__root__",
      children: new Map(),
      files: [],
    });

    const root = buildTree();
    sortedFiles.forEach((file) => {
      const rel = file.path.replace("./scripts_file/", "");
      const parts = rel.split("/");
      const filename = parts.pop();
      let node = root;
      parts.forEach((part, idx) => {
        if (!node.children.has(part)) {
          const childPath = node.path === "__root__" ? part : `${node.path}/${part}`;
          node.children.set(part, {
            name: part,
            path: childPath,
            children: new Map(),
            files: [],
          });
        }
        node = node.children.get(part);
      });
      node.files.push({ ...file, rel: filename });
    });

    const toArrayTree = (node) => ({
      name: node.name,
      path: node.path,
      files: node.files.sort((a, b) => a.name.localeCompare(b.name)),
      children: Array.from(node.children.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => toArrayTree(child)),
    });

    return toArrayTree(root);
  }, [sortedFiles]);

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return fileTree;
    const q = searchTerm.toLowerCase();

    const matchFile = (file) =>
      file.name.toLowerCase().includes(q) ||
      file.display?.toLowerCase().includes(q) ||
      (fileTitleMap[file.name]?.toLowerCase() || "").includes(q) ||
      (fileTagsMap[file.name]?.join(" ").toLowerCase().includes(q) ?? false);

    const filterNode = (node) => {
      const folderMatch =
        node.name !== "__root__" && node.name.toLowerCase().includes(q);
      const files = folderMatch ? node.files : node.files.filter(matchFile);
      const children = node.children
        .map((child) => filterNode(child))
        .filter(Boolean);
      if (folderMatch) return { ...node, files, children };
      if (files.length || children.length) return { ...node, files, children };
      return null;
    };

    return filterNode(fileTree);
  }, [fileTree, searchTerm, fileTitleMap, fileTagsMap]);

  const toggleFolder = (folder) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  const handleExportPdf = (e) => {
    e.stopPropagation();
    const bodyHtml =
      exportMode === "processed"
        ? processedScriptHtml || rawScriptHtml
        : rawScriptHtml;
    const hasContent = Boolean(bodyHtml || titleHtml);
    if (!hasContent) {
      window.print();
      return;
    }

    const accentValue =
      getComputedStyle(document.documentElement).getPropertyValue("--accent") ||
      accentThemes[defaultAccent].accent;
    const accentForegroundValue =
      getComputedStyle(document.documentElement).getPropertyValue("--accent-foreground") ||
      accentThemes[defaultAccent].accentForeground;
    const accentMutedValue =
      getComputedStyle(document.documentElement).getPropertyValue("--accent-muted") ||
      accentThemes[defaultAccent].accentMuted;

    const exportHtml = buildPrintHtml({
      titleName,
      activeFile,
      titleHtml,
      rawScriptHtml: bodyHtml,
      accent: accentValue.trim(),
      accentForeground: accentForegroundValue.trim(),
      accentMuted: accentMutedValue.trim(),
    });

    // Render into a hidden iframe and trigger print (no new window).
    const blob = new Blob([exportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-9999px";
    iframe.style.bottom = "-9999px";
    iframe.src = url;
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        iframe.remove();
      }, 1000);
    };
    document.body.appendChild(iframe);
  };

  const handleTitleName = (name) => {
    setTitleName(name);
    if (activeFile) {
      setFileTitleMap((prev) => ({
        ...prev,
        [activeFile]: name,
      }));
    }
  };

  const handleOpenHome = () => {
    setHomeOpen(true);
    setAboutOpen(false);
    setSettingsOpen(false);
    setShowTitle(false);
  };

  const handleOpenAbout = () => {
    setAboutOpen(true);
    setHomeOpen(false);
    setSettingsOpen(false);
    setShowTitle(false);
  };

  const handleOpenSettings = () => {
    setHomeOpen(false);
    setAboutOpen(false);
    setShowTitle(false);
    setSettingsOpen((prev) => !prev);
  };

  const handleSelectScene = (sceneId) => {
    const next = sceneId || "";
    setCurrentSceneId(next);
    setScrollSceneId(next);
    syncUrl({ sceneId: next });
  };

  const headerTitle = homeOpen
    ? "Home"
    : aboutOpen
      ? "About"
      : settingsOpen
        ? "Settings"
        : titleName || activeFile || "選擇一個劇本";
  const canShare = !homeOpen && !aboutOpen && !settingsOpen && Boolean(activeFile);

  return (
    <MainLayout
      isDesktopSidebarOpen={isDesktopSidebarOpen}
      setIsDesktopSidebarOpen={setIsDesktopSidebarOpen}
      isMobileDrawerOpen={isMobileDrawerOpen}
      setIsMobileDrawerOpen={setIsMobileDrawerOpen}
      fileTree={filteredTree}
      activeFile={activeFile}
      onSelectFile={loadScript}
      accentStyle={accentStyle}
      openAbout={handleOpenAbout}
      openSettings={handleOpenSettings}
      closeAbout={() => setAboutOpen(false)}
      openHome={handleOpenHome}
      files={files}
      fileTitleMap={fileTitleMap}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      openFolders={openFolders}
      toggleFolder={toggleFolder}
      fileTagsMap={fileTagsMap}
      fileLabelMode={fileLabelMode}
      setFileLabelMode={setFileLabelMode}
    >
        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col gap-3 lg:gap-4 h-full">
          <div>
            <ReaderHeader
              accentStyle={accentStyle}
              hasTitle={!homeOpen && !aboutOpen && !settingsOpen && hasTitle}
              onToggleTitle={() => setShowTitle((v) => !v)}
              titleName={headerTitle}
              activeFile={activeFile}
              fileMeta={fileMeta}
              isSidebarOpen={isDesktopSidebarOpen}
              setSidebarOpen={() => {
                if (window.innerWidth >= 1024) {
                  setIsDesktopSidebarOpen(true);
                } else {
                  setIsMobileDrawerOpen(true);
                }
              }}
              handleExportPdf={handleExportPdf}
              onShareUrl={handleShareUrl}
              canShare={canShare}
              shareCopied={shareCopied}
              sceneList={sceneList}
              currentSceneId={currentSceneId}
              onSelectScene={handleSelectScene}
              titleNote={titleNote}
              characterList={characterList}
              filterCharacter={filterCharacter}
              setFilterCharacter={setFilterCharacter}
              setFocusMode={setFocusMode}
              scrollProgress={scrollProgress}
              totalLines={totalLines}
            />
            {!homeOpen && !aboutOpen && !settingsOpen && hasTitle && showTitle && (
              <Card className="border border-border border-t-0 rounded-t-none">
                <CardContent className="p-4">
                  <div
                    className="title-page prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: titleHtml }}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {homeOpen ? (
            <HomePanel
              accentStyle={accentStyle}
              onClose={() => {
                setHomeOpen(false);
                if (!activeFile) {
                  setAboutOpen(false); // Should this be setSettingsOpen? Logic seems specific.
                }
              }}
            />
          ) : aboutOpen ? (
            <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
              <AboutPanel accentStyle={accentStyle} onClose={() => setAboutOpen(false)} />
            </React.Suspense>
          ) : settingsOpen ? (
            <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
              <SettingsPanel />
            </React.Suspense>
          ) : (
            <ScriptPanel
              isLoading={isLoading}
              rawScript={rawScript}
              filterCharacter={filterCharacter}
              focusMode={focusMode}
              focusEffect={focusEffect}
              focusContentMode={focusContentMode}
              highlightCharacters={highlightCharacters}
              highlightSfx={highlightSfx}
              setCharacterList={setCharacterList}
              setTitleHtml={setTitleHtml}
              setTitleName={handleTitleName}
              setTitleNote={setTitleNote}
              setHasTitle={setHasTitle}
              setRawScriptHtml={setRawScriptHtml}
              setRawScriptHtmlProcessed={setProcessedScriptHtml}
              setScenes={setSceneList}
              scrollToScene={scrollSceneId}
              theme={appliedTheme}
              fontSize={fontSize}
              bodyFontSize={bodyFontSize}
              dialogueFontSize={dialogueFontSize}
              accentColor={accentConfig.accent}
              scrollRef={contentScrollRef}
              onScrollProgress={setScrollProgress}
            />
          )}
        </main>
    </MainLayout>
  );
}

export default App;


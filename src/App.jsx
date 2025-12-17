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
import AboutPanel from "./components/AboutPanel";
import HomePanel from "./components/HomePanel";
import ScriptPanel from "./components/ScriptPanel";
import ReaderHeader from "./components/ReaderHeader";
import SettingsPanel from "./components/SettingsPanel";
import { useTheme } from "./components/theme-provider";
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

const scriptModules = import.meta.glob("./scripts_file/**/*.fountain", {
  query: "?raw",
  import: "default",
});

function App() {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [rawScript, setRawScript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [characterList, setCharacterList] = useState([]);
  const [filterCharacter, setFilterCharacter] = useState("__ALL__");
  const [focusMode, setFocusMode] = useState(false);
  const [focusEffect, setFocusEffect] = useState("hide"); // hide | dim
  const [focusContentMode, setFocusContentMode] = useState("all"); // all | dialogue
  const [highlightCharacters, setHighlightCharacters] = useState(true);
  const [highlightSfx, setHighlightSfx] = useState(true);
  const [bodyFontSize, setBodyFontSize] = useState(14); // 全文
  const [dialogueFontSize, setDialogueFontSize] = useState(14); // 對白
  const [processedScriptHtml, setProcessedScriptHtml] = useState("");
  const [exportMode, setExportMode] = useState("processed"); // processed | raw
  const contentScrollRef = useRef(null);

  const setFontSizePersist = (size) => {
    setFontSize(size);
    writeValue(STORAGE_KEYS.FONT_SIZE, size);
  };
  const setBodyFontPersist = (size) => {
    setBodyFontSize(size);
    writeValue(STORAGE_KEYS.BODY_FONT, size);
  };
  const setDialogueFontPersist = (size) => {
    setDialogueFontSize(size);
    writeValue(STORAGE_KEYS.DIALOGUE_FONT, size);
  };
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [accent, setAccent] = useState(defaultAccent);
  const [homeOpen, setHomeOpen] = useState(false);
  const [fileMeta, setFileMeta] = useState({});
  const [openFolders, setOpenFolders] = useState(new Set(["__root__"]));
  const [titleHtml, setTitleHtml] = useState("");
  const [titleName, setTitleName] = useState("");
  const [titleNote, setTitleNote] = useState("");
  const [showTitle, setShowTitle] = useState(false);
  const [hasTitle, setHasTitle] = useState(false);
  const [rawScriptHtml, setRawScriptHtml] = useState("");
  const [fontSize, setFontSize] = useState(14);
  const [fileTitleMap, setFileTitleMap] = useState({});
  const [fileLabelMode, setFileLabelMode] = useState("auto"); // auto | filename
  const [fileTagsMap, setFileTagsMap] = useState({});
  const [shareCopied, setShareCopied] = useState(false);
  const shareCopiedTimer = useRef(null);
  const [sceneList, setSceneList] = useState([]);
  const [scrollSceneId, setScrollSceneId] = useState("");
  const [currentSceneId, setCurrentSceneId] = useState("");
  const initialParamsRef = useRef({ char: null, scene: null });
  const [scrollProgress, setScrollProgress] = useState(0);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const appliedTheme = resolvedTheme || "light";
  const accentStyle = accentClasses;
  const accentConfig = accentThemes[accent] || accentThemes[defaultAccent];
  useEffect(() => {
    const root = document.documentElement;
    const cfg = accentConfig;
    root.style.setProperty("--accent", cfg.accent);
    root.style.setProperty("--accent-foreground", cfg.accentForeground);
    root.style.setProperty("--accent-muted", cfg.accentMuted || cfg.accent);
    root.style.setProperty("--accent-strong", cfg.accentStrong || cfg.accent);
  }, [accentConfig]);

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

  useEffect(() => {
    const savedAccent = readString(STORAGE_KEYS.ACCENT);
    if (savedAccent && accentThemes[savedAccent]) {
      setAccent(savedAccent);
    }
    const savedLabelMode = readString(STORAGE_KEYS.LABEL_MODE, ["auto", "filename"]);
    if (savedLabelMode === "auto" || savedLabelMode === "filename") {
      setFileLabelMode(savedLabelMode);
    }
    const savedFocusEffect = readString(STORAGE_KEYS.FOCUS_EFFECT, ["hide", "dim"]);
    if (savedFocusEffect === "hide" || savedFocusEffect === "dim") {
      setFocusEffect(savedFocusEffect);
    }
    const savedFocusContent = readString(STORAGE_KEYS.FOCUS_CONTENT, ["all", "dialogue"]);
    if (savedFocusContent === "all" || savedFocusContent === "dialogue") {
      setFocusContentMode(savedFocusContent);
    }
    const savedHighlight = readString(STORAGE_KEYS.HIGHLIGHT_CHAR, ["on", "off"]);
    if (savedHighlight === "off") {
      setHighlightCharacters(false);
    }
    const savedSfx = readString(STORAGE_KEYS.HIGHLIGHT_SFX, ["on", "off"]);
    if (savedSfx === "off") {
      setHighlightSfx(false);
    }
    const savedFontSize = readNumber(STORAGE_KEYS.FONT_SIZE);
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
    const savedBodyFont = readNumber(STORAGE_KEYS.BODY_FONT);
    if (savedBodyFont) {
      setBodyFontSize(savedBodyFont);
    }
    const savedDlgFont = readNumber(STORAGE_KEYS.DIALOGUE_FONT);
    if (savedDlgFont) {
      setDialogueFontSize(savedDlgFont);
    }
    const savedExportMode = readString(STORAGE_KEYS.EXPORT_MODE, ["processed", "raw"]);
    if (savedExportMode === "processed" || savedExportMode === "raw") {
      setExportMode(savedExportMode);
    }
  }, []);

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
  useEffect(() => {
    const fontSteps = [12, 14, 16, 24, 36, 72];
    const adjustFont = (delta) => {
      const idx = fontSteps.findIndex((v) => v === fontSize);
      if (idx === -1) {
        setFontSizePersist(fontSteps[0]);
        return;
      }
      const next = fontSteps[idx + delta];
      if (next) setFontSizePersist(next);
    };

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
  }, [fontSize, filterCharacter, sceneList, currentSceneId]);

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
    <div className={`min-h-screen ${containerBg}`}>
      {/* Floating opener when sidebar collapsed on desktop */}
      {!isSidebarOpen && (
        <button
          className="fixed left-2 top-1/2 -translate-y-1/2 z-30 hidden h-10 w-10 items-center justify-center text-foreground/80 hover:text-foreground transition-colors lg:inline-flex"
          aria-label="展開列表"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      )}
      <div
        className={`mx-auto flex h-screen max-w-7xl ${layoutGap} px-4 py-4 lg:px-6 lg:py-6`}
      >
        {/* Mobile Drawer with MobileMenu */}
        <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
          <DrawerContent className="h-[85vh] outline-none">
             <div className="sr-only">
               <DrawerTitle>導航選單</DrawerTitle>
               <DrawerDescription>劇本導航</DrawerDescription>
             </div>
             <MobileMenu 
                fileTree={filteredTree}
                activeFile={activeFile}
                onSelectFile={loadScript}
                accentStyle={accentStyle}
                openAbout={handleOpenAbout}
                openSettings={handleOpenSettings}
                onClose={() => setIsMobileDrawerOpen(false)}
                fileTitleMap={fileTitleMap}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                openFolders={openFolders}
                toggleFolder={toggleFolder}
             />
          </DrawerContent>
        </Drawer>

        {/* Desktop Sidebar */}
        <div className={`hidden lg:block ${sidebarBase} ${sidebarWrapper}`}>
          <Sidebar
            fileTree={filteredTree}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeFile={activeFile}
            onSelectFile={loadScript}
            accentStyle={accentStyle}
            openAbout={handleOpenAbout}
            openSettings={handleOpenSettings}
            closeAbout={() => setAboutOpen(false)}
            setSidebarOpen={setIsDesktopSidebarOpen}
            openHome={handleOpenHome}
            fileTitleMap={fileTitleMap}
            fileTagsMap={fileTagsMap}
            fileLabelMode={fileLabelMode}
            setFileLabelMode={(mode) => {
              setFileLabelMode(mode);
              localStorage.setItem(STORAGE_KEYS.LABEL_MODE, mode);
            }}
          />
        </div>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col gap-3 lg:gap-4">
          <div>
            <ReaderHeader
            accentStyle={accentStyle}
              hasTitle={!homeOpen && !aboutOpen && !settingsOpen && hasTitle}
              onToggleTitle={() => setShowTitle((v) => !v)}
              titleName={headerTitle}
              activeFile={activeFile}
              fileMeta={fileMeta}
              setSidebarOpen={setSidebarOpen}
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
                  setAboutOpen(false);
                }
              }}
            />
          ) : aboutOpen ? (
            <AboutPanel accentStyle={accentStyle} onClose={() => setAboutOpen(false)} />
          ) : settingsOpen ? (
            <SettingsPanel
              isDark={isDark}
              setTheme={setTheme}
              accent={accent}
              accentOptions={accentOptions}
              setAccent={(val) => {
                setAccent(val);
                writeValue(STORAGE_KEYS.ACCENT, val);
              }}
              fontSize={fontSize}
              setFontSize={setFontSizePersist}
              bodyFontSize={bodyFontSize}
              setBodyFontSize={setBodyFontPersist}
              dialogueFontSize={dialogueFontSize}
              setDialogueFontSize={setDialogueFontPersist}
              fileLabelMode={fileLabelMode}
              setFileLabelMode={(mode) => {
                setFileLabelMode(mode);
                writeValue(STORAGE_KEYS.LABEL_MODE, mode);
              }}
              focusEffect={focusEffect}
              setFocusEffect={(mode) => {
                setFocusEffect(mode);
                writeValue(STORAGE_KEYS.FOCUS_EFFECT, mode);
              }}
              focusContentMode={focusContentMode}
              setFocusContentMode={(mode) => {
                setFocusContentMode(mode);
                writeValue(STORAGE_KEYS.FOCUS_CONTENT, mode);
              }}
              highlightCharacters={highlightCharacters}
              setHighlightCharacters={(val) => {
                setHighlightCharacters(val);
                writeValue(STORAGE_KEYS.HIGHLIGHT_CHAR, val ? "on" : "off");
              }}
              highlightSfx={highlightSfx}
              setHighlightSfx={(val) => {
                setHighlightSfx(val);
                writeValue(STORAGE_KEYS.HIGHLIGHT_SFX, val ? "on" : "off");
              }}
              exportMode={exportMode}
              setExportMode={(mode) => {
                setExportMode(mode);
                writeValue(STORAGE_KEYS.EXPORT_MODE, mode);
              }}
            />
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
      </div>
    </div>
  );
}

export default App;

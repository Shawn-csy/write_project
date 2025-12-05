import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import Sidebar from "./components/Sidebar";
import AboutPanel from "./components/AboutPanel";
import HomePanel from "./components/HomePanel";
import ScriptPanel from "./components/ScriptPanel";
import ReaderHeader from "./components/ReaderHeader";
import { useTheme } from "./components/theme-provider";
import {
  accentThemes,
  accentOptions,
  accentClasses,
  defaultAccent,
} from "./constants/accent";
import generatedFileMeta from "./constants/fileMeta.generated.json";
import { buildPrintHtml } from "./lib/print";

const scriptModules = import.meta.glob("./scripts/**/*.fountain", {
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
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
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
    if (homeOpen || aboutOpen) {
      setShowTitle(false);
    }
  }, [homeOpen, aboutOpen]);

  useEffect(() => {
    const entries = Object.entries(scriptModules).map(([path, loader]) => ({
      name: path.split("/").pop(),
      path,
      loader,
      display: path.replace("./scripts/", ""),
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
    const savedAccent = localStorage.getItem("screenplay-reader-accent");
    if (savedAccent && accentThemes[savedAccent]) {
      setAccent(savedAccent);
    }
    const savedLabelMode = localStorage.getItem("screenplay-reader-label-mode");
    if (savedLabelMode === "auto" || savedLabelMode === "filename") {
      setFileLabelMode(savedLabelMode);
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
        setFocusEffect("dim");
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
          setFocusEffect("dim");
        } else {
          setFocusMode(false);
          setFocusEffect("hide");
        }
        initialParamsRef.current.char = null;
      } else {
        setFilterCharacter("__ALL__");
        setFocusMode(false);
        setFocusEffect("hide");
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

  const containerBg = "bg-background text-foreground";
  const sidebarWrapper = isSidebarOpen
    ? "w-[88vw] sm:w-80 lg:w-72 translate-x-0 pointer-events-auto relative lg:static"
    : "absolute lg:absolute w-0 h-0 -translate-x-full pointer-events-none";
  const sidebarBase =
    "fixed inset-y-0 left-0 z-40 lg:z-20 lg:static transition-transform duration-200 overflow-hidden min-h-0";
  const layoutGap = isSidebarOpen ? "gap-4 lg:gap-6" : "gap-0";

  const groupedFiles = useMemo(() => {
    const groups = {};
    sortedFiles.forEach((file) => {
      const rel = file.path.replace("./scripts/", "");
      const parts = rel.split("/");
      const folder =
        parts.length > 1 ? parts.slice(0, -1).join("/") : "__root__";
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(file);
    });
    return Object.entries(groups)
      .map(([folder, items]) => ({
        folder,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.folder.localeCompare(b.folder));
  }, [sortedFiles]);

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
    const hasContent = Boolean(rawScriptHtml || titleHtml);
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
      rawScriptHtml,
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
    setShowTitle(false);
  };

  const handleOpenAbout = () => {
    setAboutOpen(true);
    setHomeOpen(false);
    setShowTitle(false);
  };

  const handleSelectScene = (sceneId) => {
    const next = sceneId || "";
    setCurrentSceneId(next);
    setScrollSceneId(next);
    syncUrl({ sceneId: next });
  };

  const headerTitle =
    homeOpen ? "Home" : aboutOpen ? "About" : titleName || activeFile || "選擇一個劇本";
  const canShare = !homeOpen && !aboutOpen && Boolean(activeFile);

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
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <div className={`${sidebarBase} ${sidebarWrapper}`}>
          <Sidebar
            groupedFiles={groupedFiles}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeFile={activeFile}
            onSelectFile={loadScript}
            accentStyle={accentStyle}
            accentOptions={accentOptions}
            accent={accent}
            setAccent={setAccent}
            openAbout={handleOpenAbout}
            closeAbout={() => setAboutOpen(false)}
            setSidebarOpen={setSidebarOpen}
            isDark={isDark}
            setTheme={setTheme}
            fontSize={fontSize}
            setFontSize={setFontSize}
            openHome={handleOpenHome}
            fileTitleMap={fileTitleMap}
            fileTagsMap={fileTagsMap}
            fileLabelMode={fileLabelMode}
            setFileLabelMode={(mode) => {
              setFileLabelMode(mode);
              localStorage.setItem("screenplay-reader-label-mode", mode);
            }}
          />
        </div>

        {/* Main */}
        <main className="flex-1 overflow-hidden flex flex-col gap-3 lg:gap-4">
          <div>
            <ReaderHeader
              accentStyle={accentStyle}
              hasTitle={!homeOpen && !aboutOpen && hasTitle}
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
              focusMode={focusMode}
              focusEffect={focusEffect}
              setFocusEffect={setFocusEffect}
              characterList={characterList}
              filterCharacter={filterCharacter}
              setFilterCharacter={setFilterCharacter}
              setFocusMode={setFocusMode}
            />
            {!homeOpen && !aboutOpen && hasTitle && showTitle && (
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
          ) : (
            <ScriptPanel
              isLoading={isLoading}
              rawScript={rawScript}
              filterCharacter={filterCharacter}
              focusMode={focusMode}
              focusEffect={focusEffect}
              setCharacterList={setCharacterList}
              setTitleHtml={setTitleHtml}
              setTitleName={handleTitleName}
              setTitleNote={setTitleNote}
              setHasTitle={setHasTitle}
              setRawScriptHtml={setRawScriptHtml}
              setScenes={setSceneList}
              scrollToScene={scrollSceneId}
              theme={appliedTheme}
              fontSize={fontSize}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

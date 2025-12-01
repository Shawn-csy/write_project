import React, { useEffect, useMemo, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import Sidebar from "./components/Sidebar";
import AboutPanel from "./components/AboutPanel";
import HomePanel from "./components/HomePanel";
import ScriptPanel from "./components/ScriptPanel";
import ReaderHeader from "./components/ReaderHeader";
import { useTheme } from "./components/theme-provider";
import { accentThemes, accentOptions, defaultAccent } from "./constants/accent";
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
  const [showTitle, setShowTitle] = useState(false);
  const [hasTitle, setHasTitle] = useState(false);
  const [rawScriptHtml, setRawScriptHtml] = useState("");
  const [fontSize, setFontSize] = useState(14);
  const [fileTitleMap, setFileTitleMap] = useState({});
  const [fileLabelMode, setFileLabelMode] = useState("auto"); // auto | filename

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const appliedTheme = resolvedTheme || "light";
  const accentStyle = accentThemes[accent] || accentThemes.emerald;

  useEffect(() => {
    if (hasTitle) {
      setShowTitle(true);
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
    const savedAccent = localStorage.getItem("screenplay-reader-accent");
    if (savedAccent && accentThemes[savedAccent]) {
      setAccent(savedAccent);
    }
    const savedLabelMode = localStorage.getItem("screenplay-reader-label-mode");
    if (savedLabelMode === "auto" || savedLabelMode === "filename") {
      setFileLabelMode(savedLabelMode);
    }
  }, []);

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

  const setUrlFile = (file) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (file) url.searchParams.set("file", file.display);
    else url.searchParams.delete("file");
    window.history.replaceState({}, "", url);
  };

  const loadScript = async (file) => {
    setIsLoading(true);
    try {
      const content = await file.loader();
      setActiveFile(file.name);
      setRawScript(content);
      setFilterCharacter("__ALL__");
      setFocusMode(false);
      setFocusEffect("hide");
      setTitleHtml("");
      setTitleName("");
      setHasTitle(false);
      setShowTitle(false);
      setRawScriptHtml("");
      setHomeOpen(false);
      setUrlFile(file);
      fetchLastModified(file);
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

    const exportHtml = buildPrintHtml({
      titleName,
      activeFile,
      titleHtml,
      rawScriptHtml,
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

  const headerTitle =
    homeOpen ? "Home" : aboutOpen ? "About" : titleName || activeFile || "選擇一個劇本";

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
              setHasTitle={setHasTitle}
              setRawScriptHtml={setRawScriptHtml}
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useSettings } from "./contexts/SettingsContext";
import { useScriptManager } from "./hooks/useScriptManager";
import { useAppNavigation } from "./hooks/useAppNavigation";
import { useUrlSync } from "./hooks/useUrlSync";
import { getPublicScript, getScript } from "./lib/db";

// Components
// Components
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Globe, SlidersHorizontal } from "lucide-react";
import HybridDashboard from "./components/dashboard/HybridDashboard";
import LiveEditor from "./components/editor/LiveEditor";
import ScriptPanel from "./components/ScriptPanel";
import ReaderHeader from "./components/ReaderHeader";
import { MainLayout } from "./components/MainLayout";
import AboutPanel from "./components/AboutPanel"; // Using direct import for now to match logic flow or lazy?
// Use lazy for panels to keep bundle small
const SettingsPanel = React.lazy(() => import("./components/SettingsPanel"));
const AboutPanelLazy = React.lazy(() => import("./components/AboutPanel"));

import { buildPrintHtml } from "./lib/print"; // Kept for export

function App() {
  // 1. Contexts
  const {
      accentConfig,
      accentStyle,
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
      enableLocalFiles,
  } = useSettings();
  const { currentUser } = useAuth();

  // 2. Refs (for initial params)
  const initialParamsRef = useRef({ char: null, scene: null });
  // Initialize refs from URL once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    initialParamsRef.current = {
      char: url.searchParams.get("char"),
      scene: url.searchParams.get("scene"),
    };
  }, []);

  // 3. Custom Hooks
  const scriptManager = useScriptManager(initialParamsRef);
  const nav = useAppNavigation();
  
  // Destructure scriptManager for easier usage
  const { 
      files, activeFile, setActiveFile, loadScript, rawScript, setRawScript, rawScriptHtml, isLoading, setIsLoading,
      fileMeta, fileTitleMap, fileTagsMap, setFileMeta, setFileTitleMap, setFileTagsMap,
      sceneList, setSceneList, characterList, setCharacterList, setRawScriptHtml, setProcessedScriptHtml,
      titleHtml, setTitleHtml, titleName, setTitleName, titleNote, setTitleNote, titleSummary, setTitleSummary,
      hasTitle, setHasTitle, showTitle, setShowTitle,
      filterCharacter, setFilterCharacter, focusMode, setFocusMode, 
      currentSceneId, setCurrentSceneId, scrollSceneId, setScrollSceneId
  } = scriptManager;

  // 5. Local State mainly for UI not covered by hooks
  const [activeCloudScript, setActiveCloudScript] = useState(null);
  const [cloudScriptMode, setCloudScriptMode] = useState("read"); // read | edit
  const [activePublicScriptId, setActivePublicScriptId] = useState(null);
  const [openFolders, setOpenFolders] = useState(new Set(["__root__"]));
  const [searchTerm, setSearchTerm] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const shareCopiedTimer = useRef(null);
  const contentScrollRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // 4. URL Sync
  const { syncUrl } = useUrlSync({
      activeFile,
      activeCloudScript,
      activePublicScriptId,
      files,
      filterCharacter,
      currentSceneId
  });

  // 6. Effects
  // -- Load Initial File from URL
  // -- Load Initial File from URL
  useEffect(() => {
    // Initial Load Logic
    const syncStateFromUrl = async () => {
        const url = new URL(window.location.href);
        const editId = url.searchParams.get("edit");
        const readId = url.searchParams.get("read");
        const param = url.searchParams.get("file");

        // 1. Edit (Cloud Script)
        if (editId) {
             try {
                const script = await getScript(editId);
                handleSelectCloudScript(script); // Use new handler
                // Also close Home if open
                if (nav.homeOpen) nav.setHomeOpen(false);
                nav.setSettingsOpen(false); 
                nav.setAboutOpen(false);
             } catch (e) { console.error(e); }
             return;
        }

        // 2. Read (Public Script)
        if (readId) {
             handleLoadPublicScript({ id: readId }); 
             return;
        }

        // 3. Local File
        const target = (param && files.find((f) => f.display === param || f.name === param));
        
        if (target) {
            if (activeFile !== target.name) loadScript(target);
            nav.resetToReader(); 
        } else {
             if (activeFile) {
                 setActiveFile(null);
                 nav.openHome();
             } else if (!nav.homeOpen && !activeCloudScript && !activePublicScriptId) {
                 nav.openHome();
             }
        }
    };

    syncStateFromUrl(); 

    const handlePopState = () => syncStateFromUrl();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);

  }, [files]); 

  // -- Auto-hide Title on Nav
  useEffect(() => {
    if (nav.homeOpen || nav.aboutOpen || nav.settingsOpen) {
      setShowTitle(false);
    }
  }, [nav.homeOpen, nav.aboutOpen, nav.settingsOpen]);

  // -- Initial Scene Scroll
  useEffect(() => {
    if (!sceneList.length) return;
    const initialScene = initialParamsRef.current.scene;
    if (initialScene && sceneList.some((s) => s.id === initialScene)) {
      setCurrentSceneId(initialScene);
      setScrollSceneId(initialScene);
      initialParamsRef.current.scene = null;
    }
  }, [sceneList]);

  // -- Meta Tags
  useEffect(() => {
    if (typeof document === "undefined") return;

    const setMetaTag = (attr, key, content) => {
      if (!key) return;
      const selector = `meta[${attr}="${key}"]`;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content || "");
    };

    const cleanText = (text = "") => text.replace(/\s+/g, " ").trim();
    const summary =
      cleanText(titleSummary) ||
      cleanText(titleNote) ||
      (titleName ? `${titleName} 劇本摘要` : "");
    const description =
      summary.slice(0, 200) ||
      "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。";
    const shareTitle = titleName || activeFile || "Screenplay Reader";
    const fullTitle = titleName ? `${titleName}｜Screenplay Reader` : shareTitle;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    document.title = fullTitle;
    setMetaTag("name", "description", description);
    setMetaTag("property", "og:title", shareTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", shareUrl);
    setMetaTag("property", "og:type", activeFile ? "article" : "website");
  }, [titleName, titleSummary, titleNote, activeFile, filterCharacter, currentSceneId]);

  // 7. Handlers
  const handleLoadScript = async (file) => {
      await loadScript(file);
      nav.resetToReader(); 
      syncUrl({ fileName: file.name, sceneId: "" });
  };

  const handleSelectCloudScript = (script) => {
      setActiveCloudScript(script);
      setCloudScriptMode("read"); // Default to Read
      setRawScript(script.content || "");
      setTitleName(script.title || "Untitled");
      // Clear local file state if needed
      setActiveFile(null); 
      nav.resetToReader();
  };

  const handleReturnHome = () => {
    setActiveFile(null);
    setActiveCloudScript(null);
    setActivePublicScriptId(null);
    nav.openHome();
    syncUrl({ fileName: null, cloudScriptId: null, publicScriptId: null, character: null, sceneId: null });
    document.title = "Screenplay Reader";
  };

  const handleLoadPublicScript = async (script) => {
      setIsLoading(true);
      try {
          const fullScript = await getPublicScript(script.id);
          setRawScript(fullScript.content || "");
          setTitleName(fullScript.title || "Public Script");
          setActiveFile(fullScript.title || "Public Script"); 
          setActivePublicScriptId(script.id);
          
          nav.resetToReader();
          setShowTitle(false);
      } catch (err) {
          console.error("Failed to load public script", err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleExportPdf = (e) => {
      e?.stopPropagation();
      const bodyHtml = exportMode === "processed" ? processedScriptHtml || rawScriptHtml : rawScriptHtml;
       const hasContent = Boolean(bodyHtml || titleHtml);
       if (!hasContent) {
           window.print();
           return;
       }
       const accentValue = getComputedStyle(document.documentElement).getPropertyValue("--accent") || accentConfig.accent;
       const accentForegroundValue = getComputedStyle(document.documentElement).getPropertyValue("--accent-foreground") || accentConfig.accentForeground;
       const accentMutedValue = getComputedStyle(document.documentElement).getPropertyValue("--accent-muted") || accentConfig.accentMuted;

       const exportHtml = buildPrintHtml({
          titleName,
          activeFile,
          titleHtml,
          rawScriptHtml: bodyHtml,
          accent: accentValue.trim(),
          accentForeground: accentForegroundValue.trim(),
          accentMuted: accentMutedValue.trim(),
       });

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

  const handleShareUrl = async (e) => {
       e?.stopPropagation?.();
       if (typeof window === "undefined") return;
       const shareUrl = window.location.href;
       const title = titleName || activeFile || "Screenplay Reader";
       const summary = titleSummary || titleNote || (titleName ? `${titleName} 劇本摘要` : "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。");

       if (navigator.share) {
           try {
               await navigator.share({ title, text: summary, url: shareUrl });
               return;
           } catch (err) {}
       }
       const richText = `【${title}】\n${summary}\n\n${shareUrl}`;
       try {
           if (navigator.clipboard?.writeText) {
               await navigator.clipboard.writeText(richText);
               setShareCopied(true);
               if (shareCopiedTimer.current) clearTimeout(shareCopiedTimer.current);
               shareCopiedTimer.current = setTimeout(() => setShareCopied(false), 1800);
           } else {
               window.prompt("複製分享連結", shareUrl);
           }
       } catch (err) { console.error(err); }
  };
  
  // Shortcuts
  useEffect(() => {
      const handler = (e) => {
          if (e.target?.tagName?.match(/INPUT|TEXTAREA/) || e.target?.isContentEditable) return;
          const meta = e.metaKey || e.ctrlKey;
          const key = e.key.toLowerCase();
          
          if (meta && (key === "[" || key === "{")) { e.preventDefault(); adjustFont(-1); }
          else if (meta && (key === "]" || key === "}")) { e.preventDefault(); adjustFont(1); }
          else if (meta && key === "b") { e.preventDefault(); nav.setSidebarOpen(!nav.isDesktopSidebarOpen); }
          else if (meta && key === "g") { 
              if (filterCharacter && filterCharacter !== "__ALL__") {
                  e.preventDefault(); setFocusMode(v => !v);
              }
          }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
  }, [adjustFont, nav, filterCharacter]); 

  // 8. File Tree Logic ... (unchanged)
  const sortedFiles = useMemo(() => files.slice().sort((a, b) => a.name.localeCompare(b.name)), [files]);
  
  const fileTree = useMemo(() => {
       const buildTree = () => ({ name: "__root__", path: "__root__", children: new Map(), files: [] });
       const root = buildTree();
       sortedFiles.forEach((file) => {
          const rel = file.path.replace("../scripts_file/", ""); 
          const parts = rel.split("/");
          const filename = parts.pop();
          let node = root;
          parts.forEach((part) => {
              if (!node.children.has(part)) {
                  const childPath = node.path === "__root__" ? part : `${node.path}/${part}`;
                  node.children.set(part, { name: part, path: childPath, children: new Map(), files: [] });
              }
              node = node.children.get(part);
          });
          node.files.push({ ...file, rel: filename });
       });
       const toArrayTree = (node) => ({
           name: node.name,
           path: node.path,
           files: node.files.sort((a,b) => a.name.localeCompare(b.name)),
           children: Array.from(node.children.values()).sort((a,b) => a.name.localeCompare(b.name)).map(toArrayTree)
       });
       return toArrayTree(root);
  }, [sortedFiles]);
  
  const filteredTree = useMemo(() => {
      if (!searchTerm.trim()) return fileTree;
      const q = searchTerm.toLowerCase();
      const matchFile = (file) => file.name.toLowerCase().includes(q) || (fileTitleMap[file.name]?.toLowerCase() || "").includes(q);
      const filterNode = (node) => {
          const folderMatch = node.name !== "__root__" && node.name.toLowerCase().includes(q);
          const files = folderMatch ? node.files : node.files.filter(matchFile);
          const children = node.children.map(filterNode).filter(Boolean);
          if (folderMatch || files.length || children.length) return { ...node, files, children };
          return null;
      };
      return filterNode(fileTree);
  }, [fileTree, searchTerm, fileTitleMap]);

  const toggleFolder = (folder) => {
      setOpenFolders(prev => {
          const next = new Set(prev);
          if (next.has(folder)) next.delete(folder); else next.add(folder);
          return next;
      });
  };

  const headerTitle = nav.homeOpen ? "Screenplay Reader" : nav.aboutOpen ? "About" : nav.settingsOpen ? "Settings" : titleName || activeFile || activeCloudScript?.title || "選擇一個劇本";
  const canShare = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && Boolean(activeFile);
  const showReaderHeader = !nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && (
    activeFile || (activeCloudScript && cloudScriptMode === 'read')
  );

  // 9. Render
  return (
    <MainLayout
      isDesktopSidebarOpen={nav.isDesktopSidebarOpen}
      setIsDesktopSidebarOpen={nav.setIsDesktopSidebarOpen}
      isMobileDrawerOpen={nav.isMobileDrawerOpen}
      setIsMobileDrawerOpen={nav.setIsMobileDrawerOpen}
      fileTree={filteredTree}
      activeFile={activeFile}
      onSelectFile={handleLoadScript}
      accentStyle={accentStyle}
      openAbout={nav.openAbout}
      openSettings={nav.openSettings}
      closeAbout={() => nav.setAboutOpen(false)}
      openHome={handleReturnHome}
      files={files}
      fileTitleMap={fileTitleMap}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      openFolders={openFolders}
      toggleFolder={toggleFolder}
      fileTagsMap={fileTagsMap}
      fileLabelMode={fileLabelMode}
      setFileLabelMode={setFileLabelMode}
      sceneList={sceneList}
      currentSceneId={currentSceneId}
      onSelectScene={(id) => { setCurrentSceneId(id); setScrollSceneId(id); syncUrl({ sceneId: id }); }}
    >
        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col gap-3 lg:gap-4 h-full">
          {showReaderHeader && (
            <div>
              <ReaderHeader
              accentStyle={accentStyle}
              hasTitle={showReaderHeader && hasTitle}
              onToggleTitle={() => setShowTitle((v) => !v)}
              titleName={headerTitle}
              activeFile={activeFile}
              fileMeta={fileMeta}
              isSidebarOpen={nav.isDesktopSidebarOpen}
              setSidebarOpen={nav.setSidebarOpen}
              handleExportPdf={handleExportPdf}
              onShareUrl={handleShareUrl}
              canShare={canShare}
              shareCopied={shareCopied}
              sceneList={sceneList}
              currentSceneId={currentSceneId}
              onSelectScene={(id) => { setCurrentSceneId(id); setScrollSceneId(id); syncUrl({ sceneId: id }); }}
              titleNote={titleNote}
              characterList={characterList}
              filterCharacter={filterCharacter}
              setFilterCharacter={setFilterCharacter}
              setFocusMode={setFocusMode}
              scrollProgress={scrollProgress}
              totalLines={0} 
              onEdit={activeCloudScript ? () => setCloudScriptMode("edit") : null}
              onBack={handleReturnHome}
              extraActions={
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => nav.setAboutOpen(true)} title="關於">
                    <Globe className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => nav.setSettingsOpen(true)} title="設定">
                    <SlidersHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              }
            />
            {!nav.homeOpen && !nav.aboutOpen && !nav.settingsOpen && hasTitle && showTitle && (
              <Card className="border border-border border-t-0 rounded-t-none">
                <CardContent className="p-4">
                  <div className="title-page prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: titleHtml }} />
                </CardContent>
              </Card>
            )}
          </div>
          )}

          {nav.aboutOpen ? (
            <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
              <AboutPanelLazy accentStyle={accentStyle} onClose={() => nav.setAboutOpen(false)} />
            </React.Suspense>
          ) : nav.settingsOpen ? (
            <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
              <SettingsPanel onClose={() => nav.setSettingsOpen(false)} />
            </React.Suspense>
          ) : activeCloudScript && cloudScriptMode === "edit" ? (
              <LiveEditor 
                scriptId={activeCloudScript.id} 
                initialData={activeCloudScript}
                onClose={(finalSceneId) => {
                   setCloudScriptMode("read");
                   if (finalSceneId) {
                       setCurrentSceneId(finalSceneId);
                       setScrollSceneId(finalSceneId);
                   }
                   getScript(activeCloudScript.id).then(s => {
                       setRawScript(s.content);
                       setActiveCloudScript(s);
                   });
                }}
                initialSceneId={currentSceneId}
                defaultShowPreview={true}
              />
          ) : (activeFile || (activeCloudScript && cloudScriptMode === "read")) ? (
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
              setTitleName={(name) => { setTitleName(name);  }} 
              setTitleNote={setTitleNote}
              setTitleSummary={setTitleSummary}
              setHasTitle={setHasTitle}
              setRawScriptHtml={setRawScriptHtml}
              setRawScriptHtmlProcessed={setProcessedScriptHtml}
              setScenes={setSceneList}
              scrollToScene={scrollSceneId}
              fontSize={fontSize}
              bodyFontSize={bodyFontSize}
              dialogueFontSize={dialogueFontSize}
              accentColor={accentConfig.accent}
              scrollRef={contentScrollRef}
              onScrollProgress={setScrollProgress}
              onDoubleClick={activeCloudScript ? () => setCloudScriptMode("edit") : null}
            />
          ) : (
             <HybridDashboard 
                localFiles={enableLocalFiles ? files : []}
                onSelectLocalFile={handleLoadScript}
                onSelectCloudScript={handleSelectCloudScript}
                onSelectPublicScript={handleLoadPublicScript}
                enableLocalFiles={enableLocalFiles}
                openSettings={nav.openSettings}
                openAbout={nav.openAbout}
             />
          )}
        </main>
    </MainLayout>
  );
}

export default App;

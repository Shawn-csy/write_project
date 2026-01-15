import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { Lock, Home, PanelLeftOpen } from "lucide-react";
import { Button } from "../ui/button";

import WelcomeLanding from "./WelcomeLanding";
import { ReadTab } from "./ReadTab";
import { WriteTab } from "./WriteTab";
import { getUserScripts, createScript, updateScript } from "../../lib/db";

export default function HybridDashboard({ 
    localFiles = [], 
    onSelectLocalFile, 
    onSelectCloudScript,
    onSelectPublicScript,
    enableLocalFiles = true,
    openMobileMenu, // new prop
    isSidebarOpen,
    setSidebarOpen
}) {
  const { currentUser, login } = useAuth();
  
  const getInitialTab = () => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const t = params.get("tab");
            if (t && ["read", "write"].includes(t)) {
                return t;
            }
        }
        return currentUser ? "write" : "read";
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  
  const setActiveTab = (val) => {
      setActiveTabState(val);
      if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("tab", val);
          window.history.replaceState({}, "", url);
      }
  };

  const getInitialShowLanding = () => {
    if (currentUser) return false;
    if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        // If specific tab requested (e.g. back button from reader), skip landing
        if (params.get("tab")) return false; 
    }
    return true;
  };

  const [showLanding, setShowLanding] = useState(getInitialShowLanding);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
      if (currentUser) {
          setShowLanding(false);
      } else {
          setShowLanding(true);
      }
  }, [currentUser]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-hidden flex flex-col">
          {!currentUser && showLanding ? (
              <WelcomeLanding 
                  onBrowsePublic={() => {
                      setShowLanding(false); 
                      setActiveTab("read");
                  }}
                  onLoginRequest={login}
              />
          ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col justify-start min-h-0">
                <div className="px-4 sm:px-6 pt-4 shrink-0 flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    <div className="lg:hidden">
                        <Button variant="ghost" size="icon" onClick={openMobileMenu}>
                            <PanelLeftOpen className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Desktop Sidebar Toggle (Visible only when sidebar is closed) */}
                    <div className={`hidden lg:block ${isSidebarOpen ? "lg:hidden" : ""}`}>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSidebarOpen && setSidebarOpen(true)}
                            title="展開側邊欄"
                         >
                            <PanelLeftOpen className="w-5 h-5 text-muted-foreground" />
                        </Button>
                    </div>

                    <TabsList className="flex-1 sm:flex-none">
                        <TabsTrigger value="read" className="flex-1 sm:w-auto px-4 sm:px-6">閱讀 (Read)</TabsTrigger>
                        <TabsTrigger value="write" className="flex-1 sm:w-auto px-4 sm:px-6">創作 (Write)</TabsTrigger>
                    </TabsList>
                    
                    {!currentUser && (
                        <div className="ml-auto">
                            <Button variant="ghost" size="sm" onClick={() => setShowLanding(true)}>
                                <Home className="w-4 h-4 mr-2" />
                                <span className="hidden sm:inline">回首頁</span>
                            </Button>
                        </div>
                    )}
                </div>

                <TabsContent value="read" className={`flex-1 min-h-0 overflow-hidden flex-col p-4 sm:p-6 mt-0 h-full ${activeTab === 'read' ? 'flex' : 'hidden'}`}>
                    <ReadTab 
                        localFiles={localFiles} 
                        onSelectLocalFile={onSelectLocalFile}
                        onSelectPublicScript={onSelectPublicScript}
                        enableLocalFiles={enableLocalFiles}
                        onImportFile={currentUser ? (async (file) => {
                            // Removed native confirm, handled by UI now
                            const content = await file.loader();
                            const parts = file.display.split('/');
                            let folder = "/";
                            let title = file.name.replace(".fountain", "");
                            
                            if (parts.length > 1) {
                                title = parts.pop().replace(".fountain", "");
                                const folderPath = "/" + parts.join("/");
                                const all = await getUserScripts();
                                const exists = all.some(s => s.type === 'folder' && ((s.folder === '/' ? '' : s.folder) + '/' + s.title) === folderPath);
                                if (!exists) {
                                    let current = "";
                                    for (const part of parts) {
                                        const parent = current || "/";
                                        const pathToCheck = (parent === '/' ? '' : parent) + '/' + part;
                                        if (!all.some(s => s.type === 'folder' && ((s.folder === '/' ? '' : s.folder) + '/' + s.title) === pathToCheck)) {
                                            await createScript(part, 'folder', parent);
                                        }
                                        current = pathToCheck;
                                    }
                                }
                                folder = folderPath;
                            }
                            
                            const id = await createScript(title, "script", folder);
                            await updateScript(id, { content });
                            alert("匯入成功！");
                            setRefreshKey(prev => prev + 1);
                            setActiveTab("write");
                        }) : null}
                        onImportAll={currentUser ? (async (files) => {
                             // Removed native confirm, handled by UI now
                             try {
                                 const allScripts = await getUserScripts();
                                 const existingFolders = new Set(
                                     allScripts.filter(s => s.type === 'folder')
                                               .map(s => (s.folder === '/' ? '' : s.folder) + '/' + s.title)
                                 );

                                 const ensureFolder = async (path) => {
                                     if (path === '/' || !path) return;
                                     if (existingFolders.has(path)) return;
                                     
                                     const parts = path.split('/').filter(Boolean);
                                     const name = parts.pop();
                                     const parent = parts.length ? "/" + parts.join("/") : "/";
                                     
                                     await ensureFolder(parent);
                                     await createScript(name, 'folder', parent);
                                     existingFolders.add(path);
                                 };

                                 // Use sequential loop to prevent race conditions on folder creation
                                 for (const f of files) {
                                      const content = await f.loader();
                                      const parts = f.display.split('/');
                                      let folder = "/";
                                      let title = f.name.replace(".fountain", "");
                                      
                                      if (parts.length > 1) {
                                          title = parts.pop().replace(".fountain", "");
                                          // fix: if path starts with /, parts[0] is empty string.
                                          // but f.display usually is relative path like "folder/file.fountain"
                                          // let's robustly handle it
                                          const dirParts = parts; 
                                          folder = "/" + dirParts.join("/");
                                          await ensureFolder(folder);
                                      }

                                      const id = await createScript(title, "script", folder);
                                      await updateScript(id, { content });
                                 }

                                 alert(`成功匯入 ${files.length} 個檔案！`);
                                 setRefreshKey(prev => prev + 1);
                                 setActiveTab("write");
                             } catch(e) {
                                 console.error(e);
                                 alert("匯入過程中發生錯誤");
                             }
                        }) : null}
                    />
                </TabsContent>

                <TabsContent value="write" className={`flex-1 min-h-0 overflow-hidden flex-col p-4 sm:p-6 mt-0 h-full ${activeTab === 'write' ? 'flex' : 'hidden'}`}>
                    {currentUser ? (
                        <WriteTab onSelectScript={onSelectCloudScript} refreshTrigger={refreshKey} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-xl m-4">
                            <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">請先登入</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm">
                                登入後即可開始創作、建立資料夾並管理您的雲端劇本。
                            </p>
                            <Button onClick={login}>登入 / 註冊</Button>
                        </div>
                    )}
                </TabsContent>


            </Tabs>
          )}
      </div>
    </div>
  );
}

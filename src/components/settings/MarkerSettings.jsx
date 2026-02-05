import React, { useState, useEffect } from "react";
import { FileText, Sparkles, PlusCircle, BookOpen, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSettings } from "../../contexts/SettingsContext";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerList } from "./marker/MarkerList";
import { MarkerJsonEditor } from "./marker/MarkerJsonEditor";
import { MarkerDetailEditor } from "./marker/MarkerDetailEditor";
import { MarkerWizard } from "./marker/MarkerWizard";
import { MarkerUsageGuide } from "./marker/MarkerUsageGuide";
import { RECOMMENDED_PRESETS } from "../../constants/markerPresets";

export function MarkerSettings({ sectionRef }) {
  const { 
      markerConfigs, setMarkerConfigs, currentUser,
      markerThemes, currentThemeId, switchTheme, addTheme, addThemeFromCurrent, deleteTheme, renameTheme, updateThemeDescription, updateThemePublicity
  } = useSettings();
  
  const [localConfigs, setLocalConfigs] = useState(markerConfigs);
  const [viewMode, setViewMode] = useState('ui'); // 'ui' | 'json' | 'guide'
  const [expandedId, setExpandedId] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Sync Local State
  useEffect(() => {
    setLocalConfigs(markerConfigs || []);
  }, [markerConfigs]);
  
  // Debounced Save
  useEffect(() => {
      const timer = setTimeout(() => {
          if (viewMode === 'ui' || viewMode === 'guide') {
            if (JSON.stringify(markerConfigs) !== JSON.stringify(localConfigs)) {
                setMarkerConfigs(localConfigs);
            }
          }
      }, 500);
      return () => clearTimeout(timer);
  }, [localConfigs, setMarkerConfigs, markerConfigs, viewMode]);

  const updateMarker = (index, field, value) => {
    setLocalConfigs(prev => {
        const newConfigs = [...prev];
        if (typeof field === 'object' && field !== null) {
            newConfigs[index] = { ...newConfigs[index], ...field };
        } else if (field === 'style') { 
             newConfigs[index] = { ...newConfigs[index], style: value };
        } else {
             newConfigs[index] = { ...newConfigs[index], [field]: value };
        }
        return newConfigs;
    });
  };

  // Preset Handler
  const applyPreset = (preset) => {
      if (confirm(`確定要套用 "${preset.label}" 嗎？\n這將會添加 ${preset.configs.length} 個新規則到您目前的主題中。`)) {
          // Merge logic: Add new ones, but maybe give them unique IDs if collision?
          // For simplicity, just append. User can reorder/delete.
          const newConfigs = [...preset.configs, ...localConfigs].map((item, index) => ({
              ...item,
              // Ensure unique ID just in case, though presets should have distinct IDs
              id: localConfigs.some(lc => lc.id === item.id) ? `${item.id}-${Date.now()}` : item.id,
              priority: 2000 - (index * 10) // Give presets high priority initially
          }));
          setLocalConfigs(newConfigs);
          setViewMode('ui');
      }
  };

  // 從 Wizard 新增標記
  const addMarkerFromWizard = (newMarkerConfig) => {
      const newConfigs = [newMarkerConfig, ...localConfigs].map((item, index) => ({
           ...item,
           priority: 1000 - (index * 10)
      }));
      setLocalConfigs(newConfigs);
      setExpandedId(newMarkerConfig.id);
  };

  const removeMarker = (index) => {
      const newConfigs = [...localConfigs];
      newConfigs.splice(index, 1);
      setLocalConfigs(newConfigs);
      // If removed active item, clear expandedId
      if (localConfigs[index] && (localConfigs[index].id === expandedId || localConfigs[index]._tempId === expandedId)) {
        setExpandedId(null);
      }
  };

  return (
    <Card className="border border-border/60 bg-card/50 shadow-sm overflow-hidden flex flex-col h-[750px]" ref={sectionRef}>
      <CardHeader className="pb-3 px-5 py-4 border-b bg-muted/20 shrink-0">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
            </div>
            <div>
                <CardTitle className="text-base">自訂標記規則 (Custom Markers)</CardTitle>
                <CardDescription className="text-xs mt-0.5">定義劇本中的特殊格式與渲染效果</CardDescription>
            </div>
           </div>
           
           <div className="flex items-center gap-2">


               <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />

               <Button 
                    variant={viewMode === 'ui' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('ui')}
                    className="h-7 text-xs"
               >
                    編輯器
               </Button>
               <Button 
                    variant={viewMode === 'guide' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('guide')}
                    className="h-7 text-xs gap-1"
               >
                    <BookOpen className="w-3.5 h-3.5" />
                    使用說明
               </Button>
               <Button 
                    variant={viewMode === 'json' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('json')}
                    className="h-7 text-xs"
               >
                    JSON
               </Button>
           </div>
        </div>
      </CardHeader>

      <div className="flex-1 min-h-0 flex flex-col bg-background/40">
         {/* Theme Manager Bar */}
         <div className="px-5 py-2 border-b bg-background/50">
            <MarkerThemeHeader 
                markerThemes={markerThemes}
                currentThemeId={currentThemeId}
                switchTheme={switchTheme}
                addTheme={addTheme}
                addThemeFromCurrent={addThemeFromCurrent}
                deleteTheme={deleteTheme}
                renameTheme={renameTheme}
                updateThemeDescription={updateThemeDescription}
                updateThemePublicity={updateThemePublicity}
                currentUser={currentUser}
            />
         </div>
         
         <div className="flex-1 min-h-0">
            {viewMode === 'guide' ? (
                <div className="h-full overflow-hidden p-6 text-sm">
                    <MarkerUsageGuide markerConfigs={localConfigs} />
                </div>
            ) : viewMode === 'json' ? (
                <div className="h-full p-4">
                    <MarkerJsonEditor 
                        localConfigs={localConfigs} 
                        setLocalConfigs={setLocalConfigs} 
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-full divide-x divide-border/40">
                    {/* Left Column: List */}
                    <div className="h-full flex flex-col min-h-0 bg-muted/10">
                        {/* List Actions */}
                        <div className="p-3 border-b flex gap-2 shrink-0 bg-background/30">
                            <Button onClick={() => setWizardOpen(true)} className="flex-1 gap-1.5 h-8 text-xs font-medium shadow-sm">
                                <PlusCircle className="w-3.5 h-3.5" /> 
                                新增標記
                            </Button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                          <MarkerList 
                              localConfigs={localConfigs}
                              setLocalConfigs={setLocalConfigs}
                              updateMarker={updateMarker}
                              removeMarker={removeMarker}
                              selectedId={expandedId}
                              onSelect={setExpandedId}
                          />
                        </div>
                    </div>
  
                    {/* Right Column: Editor */}
                    <div className="h-full min-h-0 bg-background/20 relative">
                      {expandedId ? (
                         <MarkerDetailEditor 
                            config={localConfigs.find(c => (c.id || c._tempId) === expandedId)}
                            idx={localConfigs.findIndex(c => (c.id || c._tempId) === expandedId)}
                            updateMarker={updateMarker}
                        />
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-3">
                              <Sparkles className="w-12 h-12 stroke-1" />
                              <p className="text-sm">從左側列表選擇一個標記，或建立新標記</p>
                          </div>
                      )}
                    </div>
                </div>
            )}
         </div>
      </div>
          
      {/* Wizard Dialog */}
      <MarkerWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onComplete={addMarkerFromWizard}
      />
    </Card>
  );
}

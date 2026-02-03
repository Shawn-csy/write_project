import React, { useState, useEffect } from "react";
import { FileText, Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { useSettings } from "../../contexts/SettingsContext";

import { MarkerThemeHeader } from "./marker/MarkerThemeHeader";
import { MarkerList } from "./marker/MarkerList";
import { MarkerJsonEditor } from "./marker/MarkerJsonEditor";
import { MarkerDetailEditor } from "./marker/MarkerDetailEditor";
import { MarkerWizard } from "./marker/MarkerWizard";

export function MarkerSettings({ sectionRef }) {
  const { 
      markerConfigs, setMarkerConfigs, currentUser,
      markerThemes, currentThemeId, switchTheme, addTheme, addThemeFromCurrent, deleteTheme, renameTheme, updateThemeDescription, updateThemePublicity
  } = useSettings();
  
  const [localConfigs, setLocalConfigs] = useState(markerConfigs);
  const [viewMode, setViewMode] = useState('ui'); // 'ui' | 'json'
  const [expandedId, setExpandedId] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Sync Local State
  useEffect(() => {
    setLocalConfigs(markerConfigs || []);
  }, [markerConfigs]);
  
  // Debounced Save
  useEffect(() => {
      const timer = setTimeout(() => {
          if (viewMode === 'ui') {
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

  // 從 Wizard 新增標記
  const addMarkerFromWizard = (newMarkerConfig) => {
      const newConfigs = [newMarkerConfig, ...localConfigs].map((item, index) => ({
           ...item,
           priority: 1000 - (index * 10)
      }));
      setLocalConfigs(newConfigs);
      setExpandedId(newMarkerConfig.id);
  };

  // 快速新增空白標記（舊方法，保留作為備用）
  const addMarkerQuick = () => {
      const newId = `custom-${Date.now()}`;
      const newMarker = {
          id: newId,
          label: '新標記',
          type: 'inline',
          matchMode: 'enclosure',
          start: '',
          end: '',
          isBlock: false,
          priority: 500,
          style: { color: '#000000', fontWeight: 'bold', textAlign: 'left', fontFamily: "'Courier New', 'Songti TC', 'SimSun', serif" }
      };
      
      const newConfigs = [newMarker, ...localConfigs].map((item, index) => ({
           ...item,
           priority: 1000 - (index * 10)
      }));
      setLocalConfigs(newConfigs);
      setExpandedId(newId);
  };

  const removeMarker = (index) => {
      const newConfigs = [...localConfigs];
      newConfigs.splice(index, 1);
      setLocalConfigs(newConfigs);
  };

  return (
    <Card className="border border-border/60 bg-card/50 shadow-sm transition-all hover:bg-card/80" ref={sectionRef}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
            </div>
            <div>
                <CardTitle className="text-base">自訂標記 (Markers)</CardTitle>
                <CardDescription className="text-xs mt-0.5">拖曳列表以改變優先權 (越上方越優先)</CardDescription>
            </div>
           </div>
           <div className="flex items-center gap-2">
               <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setMarkerConfigs(localConfigs)}
                    className="h-7 text-xs"
                    title="手動儲存設定"
               >
                    儲存 (Save)
               </Button>
               <Button 
                    variant={viewMode === 'ui' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setViewMode(viewMode === 'ui' ? 'json' : 'ui')}
                    className="h-7 text-xs"
               >
                    {viewMode === 'ui' ? 'JSON 模式' : 'UI 模式'}
               </Button>
           </div>
        </div>
      </CardHeader>
      <CardContent>
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
          
          {viewMode === 'json' ? (
              <MarkerJsonEditor 
                  localConfigs={localConfigs} 
                  setLocalConfigs={setLocalConfigs} 
              />
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 items-start h-[600px]">
                  {/* Left Column: List */}
                  <div className="h-full flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                        <MarkerList 
                            localConfigs={localConfigs}
                            setLocalConfigs={setLocalConfigs}
                            updateMarker={updateMarker}
                            removeMarker={removeMarker}
                            selectedId={expandedId}
                            onSelect={setExpandedId}
                        />
                      </div>
                      <div className="flex gap-2 mt-2 shrink-0">
                          <Button onClick={() => setWizardOpen(true)} variant="default" className="flex-1 gap-1">
                              <Sparkles className="w-4 h-4" /> 新增標記
                          </Button>
                          <Button onClick={addMarkerQuick} variant="outline" size="icon" title="快速新增空白標記">
                              <Plus className="w-4 h-4" />
                          </Button>
                      </div>

                      {/* Wizard Dialog */}
                      <MarkerWizard
                          open={wizardOpen}
                          onClose={() => setWizardOpen(false)}
                          onComplete={addMarkerFromWizard}
                      />
                  </div>

                  {/* Right Column: Editor */}
                  <div className="h-full min-h-0">
                    <MarkerDetailEditor 
                        config={localConfigs.find(c => (c.id || c._tempId) === expandedId)}
                        idx={localConfigs.findIndex(c => (c.id || c._tempId) === expandedId)}
                        updateMarker={updateMarker}
                    />
                  </div>
              </div>
          )}
      </CardContent>
    </Card>
  );
}

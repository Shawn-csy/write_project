import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PublicReaderLayout } from "../components/reader/PublicReaderLayout";
import { getPublicScript, getPublicThemes } from "../lib/db";
import { extractMetadataWithRaw } from "../lib/metadataParser";
import { useScriptViewerDefaults } from "../hooks/useScriptViewerDefaults";
import { defaultMarkerConfigs } from "../constants/defaultMarkers";

export default function PublicReaderPage({ scriptManager, navProps }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
      // Existing destructured props...
      setActivePublicScriptId, setRawScript, setTitleName, setActiveFile,
      isLoading, setIsLoading, setActiveCloudScript, activeCloudScript,
      // Props required for ScriptSurface/Viewer
      rawScript, filterCharacter, focusMode, focusEffect, focusContentMode,
      highlightCharacters, highlightSfx, setCharacterList, setTitleHtml, setTitleNote, setTitleSummary, setHasTitle, setRawScriptHtml, setProcessedScriptHtml, setSceneList,
      scrollSceneId, fontSize, bodyFontSize, dialogueFontSize, accentConfig, contentScrollRef, setScrollProgress, setCloudScriptMode
  } = scriptManager;

  const [mockMeta, setMockMeta] = useState(null);

  useEffect(() => {
    // Reset override on mount/unmount or id change
    if(scriptManager.setOverrideMarkerConfigs) {
        scriptManager.setOverrideMarkerConfigs(null);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    
    const loadScript = async () => {
        setIsLoading(true);
        setActivePublicScriptId(id);
        
        try {
            // Mock Delay
            // await new Promise(r => setTimeout(r, 800));

            const script = await getPublicScript(id);
            if (script) {
                setRawScript(script.content || "");
                setTitleName(script.title || "Untitled");
                setActiveFile({ 
                    id: script.id, 
                    name: script.title,
                    type: 'script',
                    isPublic: true 
                });
                setActiveCloudScript(script); 
                setCloudScriptMode("read");

                // --- Real Extended Metadata ---
                const author = script.persona || script.owner || null;
                const { meta, rawEntries } = extractMetadataWithRaw(script.content || "");
                const reserved = new Set([
                    "title", "credit", "author", "authors", "source",
                    "draftdate", "date", "contact", "copyright",
                    "notes", "description", "synopsis", "summary",
                    "cover", "coverurl"
                ]);
                const customFields = rawEntries
                    .map(({ key, value }) => ({ key, value }))
                    .filter((entry) => {
                        const norm = entry.key.toLowerCase().replace(/\s/g, "");
                        return !reserved.has(norm);
                    });
                let contactValue = meta.contact || "";
                try {
                    const parsedContact = JSON.parse(contactValue);
                    contactValue = parsedContact;
                } catch {}
                setMockMeta({
                    coverUrl: script.coverUrl || null,
                    author: author ? {
                        id: author.id,
                        displayName: author.displayName || "Unknown",
                        avatarUrl: author.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${author.displayName}`
                    } : {
                        id: script.ownerId || "unknown",
                        displayName: script.author || "Unknown",
                    },
                    tags: script.tags ? script.tags.map(t => t.name) : [],
                    synopsis: meta.synopsis || meta.summary || "",
                    description: meta.description || meta.notes || "",
                    date: meta.date || meta.draftdate || "",
                    contact: contactValue,
                    source: meta.source || "",
                    credit: meta.credit || "",
                    authors: meta.authors || "",
                    customFields
                });
                
                // Fetch & Apply Public Theme if exists
                if (script.markerTheme) {
                     try {
                         const matched = script.markerTheme;
                         if (matched && matched.configs) {
                             const parsed = typeof matched.configs === 'string' ? JSON.parse(matched.configs) : matched.configs;
                             const normalized = Array.isArray(parsed) ? parsed : (parsed ? Object.values(parsed) : []);
                             if (scriptManager.setOverrideMarkerConfigs) {
                                 scriptManager.setOverrideMarkerConfigs(normalized);
                             }
                         }
                    } catch (e) { console.error("Failed to apply embedded theme", e); }
                } else if (script.markerThemeId) {
                    try {
                        const themes = await getPublicThemes();
                        const matched = themes.find(t => t.id === script.markerThemeId);
                        if (matched && matched.configs) {
                             const parsed = typeof matched.configs === 'string' ? JSON.parse(matched.configs) : matched.configs;
                             const normalized = Array.isArray(parsed) ? parsed : (parsed ? Object.values(parsed) : []);
                             if (scriptManager.setOverrideMarkerConfigs) {
                                 scriptManager.setOverrideMarkerConfigs(normalized);
                             }
                        }
                    } catch (e) { console.error("Failed to load theme", e); }
                }
            } else {
                console.error("Script not found");
            }
        } catch (error) {
            console.warn("Failed to load public script, falling back to mock:", error);
            // Mock Fallback for Verification/Dev
            if (id === "mock-script-id") {
                 setRawScript(`Title: The Infinite Horizon
Credit: Written by
Author: Alex Chen
Draft Date: 2024-02-02

EXT. SPACE STATION - DAY

The station rotates slowly against the backdrop of the nebula.

INT. CONTROL ROOM

COMMANDER SHEPARD looks out the viewport.

SHEPARD
(into comms)
Status report.

EXT. PLANET SURFACE - NIGHT

The away team moves through the dense jungle.

INT. ANCIENT RUINS

They discover a glowing artifact.
`);
                 setTitleName("The Infinite Horizon");
                 setActiveFile({ 
                    id: "mock-script-id", 
                    name: "The Infinite Horizon", 
                    type: 'script',
                    isPublic: true 
                 });
                 setActiveCloudScript({ 
                     id: "mock-script-id", 
                     title: "The Infinite Horizon",
                     markerThemeId: "default" 
                 });
                 setCloudScriptMode("read");
                 setMockMeta({
                    coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
                    author: { id: "user-1", displayName: "Alex Chen", avatarUrl: "https://github.com/shadcn.png" },
                    tags: ["Sci-Fi", "Thriller"],
                    synopsis: "Two astronauts on a distant moon discover a time-bending anomaly."
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    loadScript();
  }, [id, setIsLoading, setActivePublicScriptId, setRawScript, setTitleName, setActiveFile, setCloudScriptMode]);

  // Hook for viewer defaults (font, theme css injection)
  const viewerDefaults = useScriptViewerDefaults({
    theme: activeCloudScript?.markerThemeId, // Ideally this hook handles theme logic
    fontSize,
    bodyFontSize,
    dialogueFontSize,
    accentColor: accentConfig?.accent || "#3b82f6",
    markerConfigs: scriptManager.effectiveMarkerConfigs, // Pass effective configs
  });

  const fullScriptData = {
      ...activeCloudScript,
      content: rawScript,
      title: scriptManager.titleName, // Use manager's title
      ...mockMeta
  };

  return (
    <PublicReaderLayout
        script={fullScriptData}
        isLoading={isLoading}
        onBack={() => navigate("/")} // Return to library/home
        onShare={() => {
            if (navigator.share) {
                navigator.share({
                    title: fullScriptData.title,
                    text: fullScriptData.synopsis,
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied!");
            }
        }}
        // Marker Props for Header
        validMarkerConfigs={scriptManager.effectiveMarkerConfigs}
        hiddenMarkerIds={scriptManager.hiddenMarkerIds}
        onToggleMarker={scriptManager.toggleMarkerVisibility}
        
        // onExport={() => {}} // Optional
        scriptSurfaceProps={{
            scrollRef: navProps?.contentScrollRef,
            onScrollProgress: setScrollProgress,
        }}
        viewerProps={{
            ...viewerDefaults, // Defaults first
            filterCharacter,
            focusMode,
            focusEffect,
            focusContentMode,
            highlightCharacters,
            highlightSfx,
            onCharacters: setCharacterList,
            onTitle: setTitleHtml,
            // onTitleName: setTitleName, // Read-only, maybe no need
            onTitleNote: setTitleNote,
            onSummary: setTitleSummary,
            onHasTitle: setHasTitle,
            onRawHtml: setRawScriptHtml,
            onProcessedHtml: setProcessedScriptHtml,
            onScenes: setSceneList,
            scrollToScene: scrollSceneId,
            hiddenMarkerIds: scriptManager.hiddenMarkerIds, // Override defaults
        }}
    />
  );
}

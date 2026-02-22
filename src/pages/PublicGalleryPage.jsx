import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GalleryFilterBar } from "../components/gallery/GalleryFilterBar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { AuthorGalleryCard } from "../components/gallery/AuthorGalleryCard";
import { OrgGalleryCard } from "../components/gallery/OrgGalleryCard";
import { Button } from "../components/ui/button";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { getPublicBundle } from "../lib/db";
import { extractMetadataWithRaw } from "../lib/metadataParser";
import { deriveUsageRights, deriveCcLicenseTags } from "../lib/licenseRights";

export default function PublicGalleryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, login } = useAuth();
  const view = searchParams.get("view") || "scripts";
  const authorTag = searchParams.get("authorTag");
  const orgTag = searchParams.get("orgTag");
  const setView = (next) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", next);
      if (next !== "scripts") params.delete("tag");
      if (next !== "authors") params.delete("authorTag");
      if (next !== "orgs") params.delete("orgTag");
      if (next !== "scripts") params.delete("usage");
      setSearchParams(params);
  };
  const [scripts, setScripts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("recent");
  const [viewMode, setViewMode] = useState(() => {
      const fromUrl = searchParams.get("mode");
      if (fromUrl) return fromUrl;
      if (typeof window !== "undefined") {
          if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
              return "compact";
          }
      }
      return "standard";
  });
  const parseTagParam = (value) => {
      if (!value) return [];
      return value.split(",").map(v => v.trim()).filter(Boolean);
  };
  // Sync selected tags with URL params
  const selectedTags = parseTagParam(searchParams.get("tag"));
  const selectedAuthorTags = parseTagParam(searchParams.get("authorTag"));
  const selectedOrgTags = parseTagParam(searchParams.get("orgTag"));
  const usageFilter = searchParams.get("usage") || "all";

  const setSelectedTags = (tags) => {
      const params = new URLSearchParams(searchParams);
      if (tags.length > 0) {
          params.set("tag", tags.join(","));
          params.set("view", "scripts");
      } else {
          params.delete("tag");
      }
      setSearchParams(params);
  };
  const setAuthorTags = (tags) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "authors");
      if (tags.length > 0) {
        params.set("authorTag", tags.join(","));
      } else {
        params.delete("authorTag");
      }
      setSearchParams(params);
  };
  const setOrgTags = (tags) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "orgs");
      if (tags.length > 0) {
        params.set("orgTag", tags.join(","));
      } else {
        params.delete("orgTag");
      }
      setSearchParams(params);
  };
  const setUsageFilter = (usage) => {
      const params = new URLSearchParams(searchParams);
      if (usage === "all") params.delete("usage");
      else params.set("usage", usage);
      params.set("view", "scripts");
      setSearchParams(params);
  };
  const handleViewModeChange = (mode) => {
      const params = new URLSearchParams(searchParams);
      params.set("mode", mode);
      setSearchParams(params);
      setViewMode(mode);
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);

  // Data Fetching
  useEffect(() => {
    const loadBundle = async () => {
      setIsLoading(true);
      setIsLoadingPeople(true);
      try {
          const data = await getPublicBundle();
          const scriptsData = data?.scripts || [];
          const personasData = data?.personas || [];
          const orgsData = data?.organizations || [];
          const hotTags = data?.topTags || [];

          const normalized = scriptsData.map((script) => ({
              ...script,
              author: script.persona || script.owner || script.author,
              tags: (script.tags || []).map((tag) =>
                typeof tag === "string" ? tag : tag?.name
              ).filter(Boolean),
          }));
          setScripts(normalized);

          const normalizeEntity = (entity) => ({
              ...entity,
              displayName: entity.displayName || entity.name || "Unknown",
              avatar: entity.avatar || entity.avatarUrl || entity.logoUrl || null,
              tags: (entity.tags || []).map(t => typeof t === "string" ? t : t?.name).filter(Boolean)
          });

          setAuthors(personasData.map(normalizeEntity));
          setOrgs(orgsData.map(o => ({
              ...o,
              tags: (o.tags || []).map(t => typeof t === "string" ? t : t?.name).filter(Boolean)
          })));
          setTopTags(hotTags);
      } catch (e) {
          console.error("Failed to load public bundle:", e);
      } finally {
          setIsLoading(false);
          setIsLoadingPeople(false);
      }
    };
    loadBundle();
  }, []);

  const scriptsWithMeta = useMemo(() => {
      return (scripts || []).map((script) => {
          if (!script?.content) {
              return { ...script, _licenseText: "", _licenseTermsText: "" };
          }
          let meta = {};
          try {
              meta = extractMetadataWithRaw(script.content || "").meta || {};
          } catch {
              meta = {};
          }
          const license = meta.license || meta.licenseName || "";
          let terms = meta.licenseterms || meta.licenseTerms || "";
          let licenseTagsFromMeta = meta.licensetags || meta.licenseTags || [];
          if (typeof terms === "string") {
              try {
                  const parsed = JSON.parse(terms);
                  if (Array.isArray(parsed)) terms = parsed;
              } catch {}
          }
          if (typeof licenseTagsFromMeta === "string") {
              try {
                  const parsed = JSON.parse(licenseTagsFromMeta);
                  if (Array.isArray(parsed)) licenseTagsFromMeta = parsed;
              } catch {
                  licenseTagsFromMeta = String(licenseTagsFromMeta)
                    .split(/,|，/)
                    .map((t) => t.trim())
                    .filter(Boolean);
              }
          }
          if (!Array.isArray(licenseTagsFromMeta)) licenseTagsFromMeta = [];
          const termsText = Array.isArray(terms) ? terms.join(" ") : String(terms || "");
          const rights = deriveUsageRights(license, termsText);
          const licenseTags = Array.from(new Set([
            ...deriveCcLicenseTags(license),
            ...licenseTagsFromMeta
          ]));
          const mergedTags = Array.from(new Set([...(script.tags || []), ...licenseTags]));
          return {
              ...script,
              tags: mergedTags,
              _licenseText: String(license || ""),
              _licenseTermsText: termsText,
              _derivedLicenseTags: licenseTags,
              _allowCommercial: rights.allowCommercial,
              _isFreeToUse: rights.isFreeToUse
          };
      });
  }, [scripts]);

  // Filter Logic
  const filteredScripts = scriptsWithMeta.filter(script => {
      const needle = searchTerm.toLowerCase();
      const matchesSearch =
          script.title?.toLowerCase().includes(needle) ||
          script.author?.displayName?.toLowerCase().includes(needle) ||
          script._licenseText?.toLowerCase().includes(needle) ||
          script._licenseTermsText?.toLowerCase().includes(needle);
      const matchesTag = selectedTags.length > 0 
        ? (script.tags || []).some(t => selectedTags.includes(t)) 
        : true;
      const matchesUsage =
          usageFilter === "all" ? true :
          usageFilter === "commercial" ? script._allowCommercial === true :
          usageFilter === "free" ? script._isFreeToUse === true :
          true;
      return matchesSearch && matchesTag && matchesUsage;
  }).sort((a, b) => {
      if (sortKey === "views") {
          return (b.views || 0) - (a.views || 0);
      }
      // recent
      return (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0);
  });

  const allTags = Array.from(new Set(scriptsWithMeta.flatMap(s => s.tags || [])));
  const licenseTagShortcuts = Array.from(
    new Set(scriptsWithMeta.flatMap((s) => s._derivedLicenseTags || []))
  );
  const filteredAuthors = authors.filter(a => {
    const matchesSearch = a.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedAuthorTags.length > 0 
      ? (a.tags || []).some(t => selectedAuthorTags.includes(t)) 
      : true;
    return matchesSearch && matchesTag;
  });
  const filteredOrgs = orgs.filter(o => {
    const matchesSearch = o.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedOrgTags.length > 0 
      ? (o.tags || []).some(t => selectedOrgTags.includes(t)) 
      : true;
    return matchesSearch && matchesTag;
  });
  const tabs = useMemo(() => ([
    { key: "scripts", label: "作品" },
    { key: "authors", label: "作者" },
    { key: "orgs", label: "組織" },
  ]), []);
  const allAuthorTags = Array.from(new Set(authors.flatMap(a => a.tags || [])));
  const allOrgTags = Array.from(new Set(orgs.flatMap(o => o.tags || [])));
  const authorTags = allAuthorTags;
  const orgTags = allOrgTags;
  const tagStyle = (tag, list) => getMorandiTagStyle(tag, list);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar
        tabs={tabs}
        activeTab={view}
        onTabChange={setView}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/about")}>
              關於本站
            </Button>
            {currentUser ? (
              <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
                前往工作室
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={async () => {
                try { await login(); } catch(e) { console.error(e); }
              }}>
                登入
              </Button>
            )}
          </div>
        }
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Unified Filter Bar */}
        <GalleryFilterBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedTags={
                view === "scripts" ? selectedTags :
                view === "authors" ? selectedAuthorTags :
                selectedOrgTags
            }
            onSelectTags={
                view === "scripts" ? setSelectedTags :
                view === "authors" ? setAuthorTags :
                setOrgTags
            }
            featuredTags={view === "scripts" ? topTags : []}
            tags={
                view === "scripts" ? allTags :
                view === "authors" ? authorTags :
                orgTags
            }
            placeholder={
                view === "scripts" ? "搜尋劇本..." :
                view === "authors" ? "搜尋作者..." :
                "搜尋組織..."
            }
            showSort={view === "scripts"}
            sortValue={sortKey}
            onSortChange={setSortKey}
            sortOptions={[
                { value: "recent", label: "最新更新" },
                { value: "views", label: "點閱數" }
            ]}
            showViewToggle={view === "scripts"}
            viewValue={viewMode}
            onViewChange={handleViewModeChange}
            viewOptions={[
                { value: "standard", label: "標準" },
                { value: "compact", label: "密集" }
            ]}
            quickFilters={view === "scripts" ? [
                { value: "all", label: "全部授權" },
                { value: "commercial", label: "可商用" },
                { value: "free", label: "可免費使用" },
            ] : []}
            quickFilterValue={usageFilter}
            onQuickFilterChange={setUsageFilter}
            quickTagFilters={view === "scripts" ? licenseTagShortcuts.map((tag) => ({
                value: tag,
                label: tag.replace(/^授權:/, "")
            })) : []}
        />

        {/* Content Grid */}
        {view === "scripts" && (
          isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[1,2,3,4,5].map(i => (
                      <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-lg" />
                  ))}
              </div>
          ) : (
              <div className={`grid gap-6 animate-in fade-in duration-500 ${viewMode === "compact" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}>
                  {filteredScripts.map(script => (
                      <ScriptGalleryCard 
                          key={script.id}
                          script={script}
                          variant={viewMode === "compact" ? "compact" : "standard"}
                          onClick={() => navigate(`/read/${script.id}`)}
                      />
                  ))}
              </div>
          )
        )}

        {view === "scripts" && !isLoading && filteredScripts.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
              <p>找不到符合條件的劇本。</p>
              <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedTags([]); setUsageFilter("all"); }}>
                  清除篩選
              </Button>
          </div>
        )}

        {view === "authors" && (
          isLoadingPeople ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredAuthors.map(author => (
                <AuthorGalleryCard
                  key={author.id}
                  author={author}
                  onClick={() => navigate(`/author/${author.id}`)}
                  onTagClick={(tag) => setAuthorTags([tag])}
                />
              ))}
            </div>
          )
        )}
        
        {view === "authors" && !isLoadingPeople && filteredAuthors.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <p>找不到符合條件的作者。</p>
            </div>
        )}

        {view === "orgs" && (
          isLoadingPeople ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredOrgs.map(org => (
                <OrgGalleryCard
                  key={org.id}
                  org={org}
                  onClick={() => navigate(`/org/${org.id}`)}
                  onTagClick={(tag) => setOrgTags([tag])}
                />
              ))}
            </div>
          )
        )}

        {view === "orgs" && !isLoadingPeople && filteredOrgs.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <p>找不到符合條件的組織。</p>
            </div>
        )}
      </main>
    </div>
  );
}

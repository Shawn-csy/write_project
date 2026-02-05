import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GalleryFilterBar } from "../components/gallery/GalleryFilterBar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { AuthorGalleryCard } from "../components/gallery/AuthorGalleryCard";
import { OrgGalleryCard } from "../components/gallery/OrgGalleryCard";
import { Button } from "../components/ui/button";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { getPublicScripts, getPublicPersonas, getPublicOrganizations } from "../lib/db";
import { extractMetadataWithRaw } from "../lib/metadataParser";

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
      setSearchParams(params);
  };
  const [scripts, setScripts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("recent");
  const [viewMode, setViewMode] = useState(() => searchParams.get("mode") || "standard");
  // Sync selectedTag with URL param 'tag'
  const selectedTag = searchParams.get("tag");
  const setSelectedTag = (tag) => {
      if (tag) {
          const params = new URLSearchParams(searchParams);
          params.set("tag", tag);
          params.set("view", "scripts");
          setSearchParams(params);
      } else {
          const params = new URLSearchParams(searchParams);
          params.delete("tag");
          setSearchParams(params);
      }
  };
  const setAuthorTag = (tag) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "authors");
      if (tag) {
        params.set("authorTag", tag);
      } else {
        params.delete("authorTag");
      }
      setSearchParams(params);
  };
  const setOrgTag = (tag) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "orgs");
      if (tag) {
        params.set("orgTag", tag);
      } else {
        params.delete("orgTag");
      }
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
    const loadScripts = async () => {
      setIsLoading(true);
      try {
          const data = await getPublicScripts();
          const normalized = (data || []).map((script) => ({
              ...script,
              author: script.persona || script.owner || script.author,
              tags: (script.tags || []).map((tag) =>
                typeof tag === "string" ? tag : tag?.name
              ).filter(Boolean),
          }));
          setScripts(normalized);
      } catch (e) {
          console.error("Failed to load public scripts:", e);
      } finally {
          setIsLoading(false);
      }
    };
    loadScripts();
  }, []);

  useEffect(() => {
    const loadPeople = async () => {
      setIsLoadingPeople(true);
      try {
          const [personaData, orgData] = await Promise.all([
              getPublicPersonas(),
              getPublicOrganizations()
          ]);
          const normalizeEntity = (entity) => ({
              ...entity,
              displayName: entity.displayName || entity.name || "Unknown",
              avatar: entity.avatar || entity.avatarUrl || entity.logoUrl || null,
              tags: (entity.tags || []).map(t => typeof t === "string" ? t : t?.name).filter(Boolean)
          });

          setAuthors((personaData || []).map(normalizeEntity));
          setOrgs((orgData || []).map(o => ({
              ...o,
              tags: (o.tags || []).map(t => typeof t === "string" ? t : t?.name).filter(Boolean)
          })));
      } catch (e) {
          console.error("Failed to load public lists:", e);
      } finally {
          setIsLoadingPeople(false);
      }
    };
    loadPeople();
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
          if (typeof terms === "string") {
              try {
                  const parsed = JSON.parse(terms);
                  if (Array.isArray(parsed)) terms = parsed;
              } catch {}
          }
          const termsText = Array.isArray(terms) ? terms.join(" ") : String(terms || "");
          return {
              ...script,
              _licenseText: String(license || ""),
              _licenseTermsText: termsText
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
      const matchesTag = selectedTag ? script.tags?.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
  }).sort((a, b) => {
      if (sortKey === "views") {
          return (b.views || 0) - (a.views || 0);
      }
      // recent
      return (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0);
  });

  const allTags = Array.from(new Set(scripts.flatMap(s => s.tags || [])));
  const filteredAuthors = authors.filter(a => {
    const matchesSearch = a.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = authorTag ? (a.tags || []).includes(authorTag) : true;
    return matchesSearch && matchesTag;
  });
  const filteredOrgs = orgs.filter(o => {
    const matchesSearch = o.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = orgTag ? (o.tags || []).includes(orgTag) : true;
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
          currentUser ? (
            <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
              前往工作室
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={async () => {
              try { await login(); } catch(e) { console.error(e); }
            }}>
              登入
            </Button>
          )
        }
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Unified Filter Bar */}
        <GalleryFilterBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedTag={
                view === "scripts" ? selectedTag :
                view === "authors" ? authorTag :
                orgTag
            }
            onSelectTag={
                view === "scripts" ? setSelectedTag :
                view === "authors" ? setAuthorTag :
                setOrgTag
            }
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
        />

        {/* Content Grid */}
        {view === "scripts" && (
          isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[1,2,3,4,5].map(i => (
                      <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-lg" />
                  ))}
              </div>
          ) : (
              <div className={`grid gap-6 animate-in fade-in duration-500 ${viewMode === "compact" ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}`}>
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
              <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedTag(null); }}>
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
                  onTagClick={setAuthorTag}
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
                  onTagClick={setOrgTag}
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

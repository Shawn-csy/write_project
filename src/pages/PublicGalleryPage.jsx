import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GalleryFilterBar } from "../components/gallery/GalleryFilterBar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { getPublicScripts, getPublicPersonas, getPublicOrganizations } from "../lib/db";
import { getMorandiTagStyle } from "../lib/tagColors";

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
          setAuthors(personaData || []);
          setOrgs(orgData || []);
      } catch (e) {
          console.error("Failed to load public lists:", e);
      } finally {
          setIsLoadingPeople(false);
      }
    };
    loadPeople();
  }, []);

  // Filter Logic
  const filteredScripts = scripts.filter(script => {
      const matchesSearch = script.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            script.author?.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = selectedTag ? script.tags?.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
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
      <main className="flex-1 container mx-auto px-4 pb-20">
        {view === "scripts" ? (
          <GalleryFilterBar 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedTag={selectedTag}
              onSelectTag={setSelectedTag}
              tags={allTags}
          />
        ) : (
          <div className="py-6 space-y-3">
            <Input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={view === "authors" ? "搜尋作者" : "搜尋組織"}
            />
            {view === "authors" && authorTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={authorTag ? "secondary" : "default"}
                  className="cursor-pointer"
                  onClick={() => setAuthorTag(null)}
                >
                  全部
                </Badge>
                {authorTags.map(tag => (
                  <button
                    key={`author-filter-${tag}`}
                    className={`text-xs px-2 py-1 rounded-full cursor-pointer ${authorTag === tag ? "" : "opacity-70"}`}
                    style={tagStyle(tag, allAuthorTags)}
                    onClick={() => setAuthorTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            {view === "orgs" && orgTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={orgTag ? "secondary" : "default"}
                  className="cursor-pointer"
                  onClick={() => setOrgTag(null)}
                >
                  全部
                </Badge>
                {orgTags.map(tag => (
                  <button
                    key={`org-filter-${tag}`}
                    className={`text-xs px-2 py-1 rounded-full cursor-pointer ${orgTag === tag ? "" : "opacity-70"}`}
                    style={tagStyle(tag, allOrgTags)}
                    onClick={() => setOrgTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "scripts" && (
          isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[1,2,3,4,5].map(i => (
                      <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-lg" />
                  ))}
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-in fade-in duration-500">
                  {filteredScripts.map(script => (
                      <ScriptGalleryCard 
                          key={script.id}
                          script={script}
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
                <div key={i} className="h-28 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredAuthors.map(author => (
                <div
                  key={author.id}
                  className="border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors bg-card"
                  onClick={() => navigate(`/author/${author.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={author.avatar} />
                      <AvatarFallback>{author.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{author.displayName}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{author.bio || "尚未填寫簡介"}</div>
                    </div>
                  </div>
                  {author.tags && author.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {author.tags.map((tag, i) => (
                        <button
                          key={`${author.id}-tag-${i}`}
                          className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer"
                          style={tagStyle(tag, allAuthorTags)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAuthorTag(tag);
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  {author.organizations && author.organizations.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {author.organizations.map(org => (
                        <Badge key={org.id} variant="secondary" className="text-[10px]">
                          {org.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredAuthors.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">找不到符合條件的作者。</div>
              )}
            </div>
          )
        )}

        {view === "orgs" && (
          isLoadingPeople ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-28 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredOrgs.map(org => (
                <div
                  key={org.id}
                  className="border rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors bg-card"
                  onClick={() => navigate(`/org/${org.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">LOGO</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{org.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{org.description || "尚未填寫描述"}</div>
                    </div>
                  </div>
                  {org.tags && org.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {org.tags.map((tag, i) => (
                        <button
                          key={`${org.id}-tag-${i}`}
                          className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer"
                          style={tagStyle(tag, allOrgTags)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrgTag(tag);
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredOrgs.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">找不到符合條件的組織。</div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}

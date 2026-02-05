import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Link as LinkIcon, Building2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { getPublicPersona, getPublicScripts } from "../lib/db";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { getMorandiTagStyle } from "../lib/tagColors";

export default function AuthorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [author, setAuthor] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const persona = await getPublicPersona(id);
        setAuthor(persona);
        const publicScripts = await getPublicScripts(undefined, undefined, id);
        const normalizedScripts = (publicScripts || [])
          .filter(s => s.type !== "folder" && !s.isFolder)
          .map((s) => ({
          ...s,
          author: s.persona || s.owner || s.author,
        }));
        setScripts(normalizedScripts);
      } catch (e) {
        console.error("Failed to load author profile", e);
        setAuthor(null);
        setScripts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const tagStyle = (tag) => getMorandiTagStyle(tag, author?.tags || []);

  if (isLoading) {
      return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading Profile...</div>;
  }

  if (!author) return <div className="min-h-screen flex items-center justify-center">Author not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar
        showBack
        onBack={() => navigate(-1)}
        tabs={[
          { key: "scripts", label: "作品" },
          { key: "authors", label: "作者" },
          { key: "orgs", label: "組織" },
        ]}
        activeTab="authors"
        onTabChange={(key) => {
          if (key === "scripts") navigate("/?view=scripts");
          if (key === "authors") navigate("/?view=authors");
          if (key === "orgs") navigate("/?view=orgs");
        }}
      />

      <main className="container mx-auto px-4 py-8">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-12">
            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-muted">
                <AvatarImage src={author.avatar} />
                <AvatarFallback>{author.displayName?.[0]}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4 pt-2">
                <div>
                    <h1 className="text-3xl font-bold font-serif">{author.displayName}</h1>
                    {author.organizations && author.organizations.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                            {author.organizations.map(org => (
                                <div
                                    key={org.id}
                                    className="flex items-center gap-1.5 text-primary hover:underline cursor-pointer"
                                    onClick={() => navigate(`/org/${org.id}`)}
                                >
                                    <Building2 className="w-4 h-4" />
                                    <span>{org.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                    {author.bio}
                </p>
                {author.tags && author.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {author.tags.map((tag, i) => (
                      <button
                        key={`author-tag-${i}`}
                        className="text-xs px-2 py-1 rounded-full hover:opacity-90"
                        style={tagStyle(tag)}
                        onClick={() => navigate(`/?view=authors&authorTag=${encodeURIComponent(tag)}`)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {author.website && (
                        <a href={author.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                            <LinkIcon className="w-4 h-4" />
                            Website
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* Works Section */}
        <div className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-2">公開作品</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {scripts.map(script => (
                    <ScriptGalleryCard 
                        key={script.id}
                        script={script}
                        onClick={() => navigate(`/read/${script.id}`)}
                    />
                ))}
            </div>
        </div>

      </main>
    </div>
  );
}

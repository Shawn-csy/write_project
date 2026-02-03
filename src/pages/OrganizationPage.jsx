import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { getPublicOrganization, getPublicScripts } from "../lib/db";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { getMorandiTagStyle } from "../lib/tagColors";

export default function OrganizationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [scripts, setScripts] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const orgData = await getPublicOrganization(id);
        setOrg(orgData);
        setMembers(orgData.members || []);
        const publicScripts = await getPublicScripts(undefined, undefined, undefined, id);
        const normalizedScripts = (publicScripts || []).map((s) => ({
          ...s,
          author: s.persona || s.owner || s.author,
        }));
        setScripts(normalizedScripts);
      } catch (e) {
        console.error("Failed to load organization", e);
        setOrg(null);
        setMembers([]);
        setScripts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const tagStyle = (tag) => getMorandiTagStyle(tag, org?.tags || []);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading Organization...</div>;
  if (!org) return <div className="min-h-screen flex items-center justify-center">Organization not found</div>;

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
        activeTab="orgs"
        onTabChange={(key) => {
          if (key === "scripts") navigate("/?view=scripts");
          if (key === "authors") navigate("/?view=authors");
          if (key === "orgs") navigate("/?view=orgs");
        }}
      />

      {/* Banner Area (Optional, gradient for now) */}
      <div className="h-48 bg-gradient-to-r from-blue-900 to-slate-900"></div>
      
      <main className="container mx-auto px-4 -mt-16 pb-12 relative animate-in slide-in-from-bottom-4 duration-700">
         {/* Org Header Card */}
         <div className="bg-card border rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm mb-8">
             <div className="w-24 h-24 md:w-32 md:h-32 bg-background rounded-lg border-4 border-background shadow overflow-hidden shrink-0">
                 <img src={org.logoUrl || "https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300&auto=format&fit=crop"} alt={org.name} className="w-full h-full object-cover" />
             </div>
             
             <div className="flex-1 space-y-2">
                 <h1 className="text-3xl md:text-4xl font-bold font-serif">{org.name}</h1>
                 <p className="text-muted-foreground max-w-2xl">{org.description}</p>
                 {org.tags && org.tags.length > 0 && (
                   <div className="flex flex-wrap gap-2 pt-2">
                     {org.tags.map((tag, i) => (
                       <button
                         key={`org-tag-${i}`}
                         className="text-xs px-2 py-1 rounded-full hover:opacity-90"
                         style={tagStyle(tag)}
                         onClick={() => navigate(`/?view=orgs&orgTag=${encodeURIComponent(tag)}`)}
                       >
                         {tag}
                       </button>
                     ))}
                   </div>
                 )}
                 
                 <div className="flex items-center gap-4 pt-2">
                     {org.website && (
                         <a href={org.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                             <Globe className="w-4 h-4" />
                             Official Website
                         </a>
                     )}
                     <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                         <Users className="w-4 h-4" />
                         {members.length} Members
                     </div>
                 </div>
             </div>
             
             <div className="flex gap-2 self-start md:self-center">
                 <Button variant="outline">Follow</Button>
             </div>
         </div>

         {/* Content Tabs */}
         <Tabs defaultValue="works" className="w-full">
            <TabsList className="mb-6">
                <TabsTrigger value="works">公開作品</TabsTrigger>
                <TabsTrigger value="members">成員</TabsTrigger>
            </TabsList>
            
            <TabsContent value="works">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {scripts.map(script => (
                        <ScriptGalleryCard 
                            key={script.id}
                            script={script}
                            onClick={() => navigate(`/read/${script.id}`)}
                        />
                    ))}
                </div>
            </TabsContent>
            
            <TabsContent value="members">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {members.map(member => (
                        <div 
                            key={member.id} 
                            className="bg-card border rounded-lg p-4 flex items-center gap-4 hover:border-primary/50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/author/${member.id}`)}
                        >
                            <Avatar>
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>{member.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{member.displayName}</div>
                                <div className="text-xs text-muted-foreground">Member</div>
                            </div>
                        </div>
                    ))}
                </div>
            </TabsContent>
         </Tabs>

      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Globe, Users } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { getPublicOrganization, getPublicScripts } from "../lib/api/public";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { getMorandiTagStyle } from "../lib/tagColors";
import { useAuth } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";

export default function OrganizationPage() {
  const { t } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, login } = useAuth();
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
  }, [id, currentUser]);

  const tagStyle = (tag) => getMorandiTagStyle(tag, org?.tags || []);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">{t("orgPage.loading")}</div>;
  if (!org) return <div className="min-h-screen flex items-center justify-center">{t("orgPage.notFound")}</div>;

  const canonicalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/org/${org.id || id}`
      : `/org/${org.id || id}`;
  const pageTitle = `${org.name || t("orgPage.fallbackOrg")}｜${t("orgPage.siteName")}`;
  const pageDescription = (org.description || t("orgPage.descriptionFallback").replace("{name}", org.name || t("orgPage.fallbackOrg"))).slice(0, 200);
  const primaryImage = org.logoUrl || org.bannerUrl || "";
  const memberNames = (members || []).map((m) => m?.displayName).filter(Boolean);
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name || "Organization",
    url: canonicalUrl,
    description: org.description || undefined,
    logo: org.logoUrl || undefined,
    image: org.bannerUrl || org.logoUrl || undefined,
    sameAs: org.website ? [org.website] : undefined,
    member: memberNames.length > 0 ? memberNames.map((name) => ({ "@type": "Person", name })) : undefined,
    keywords: Array.isArray(org.tags) && org.tags.length > 0 ? org.tags.join(", ") : undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={t("orgPage.siteName")} />
        {primaryImage && <meta property="og:image" content={primaryImage} />}
        <meta name="twitter:card" content={primaryImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {primaryImage && <meta name="twitter:image" content={primaryImage} />}
        <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      </Helmet>
      <PublicTopBar
        fullBleed
        tabs={[
          { key: "scripts", label: t("publicTopbar.scripts") },
          { key: "authors", label: t("publicTopbar.authors") },
          { key: "orgs", label: t("publicTopbar.orgs") },
        ]}
        activeTab="orgs"
        onTabChange={(key) => {
          if (key === "scripts") navigate("/?view=scripts");
          if (key === "authors") navigate("/?view=authors");
          if (key === "orgs") navigate("/?view=orgs");
        }}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => navigate("/license")}>
                {t("publicGallery.licenseTerms")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/help")}>
                {t("publicGallery.help")}
              </Button>
            </div>
            {currentUser ? (
              <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
                {t("publicGallery.goStudio")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try { await login(); } catch (e) { console.error(e); }
                }}
              >
                {t("publicGallery.login")}
              </Button>
            )}
          </div>
        }
      />

      {/* Banner Area */}
      <div className="relative h-48">
        {org.bannerUrl ? (
          <img src={org.bannerUrl} alt={`${org.name} banner`} className="w-full h-full object-cover" />
        ) : (
          <div className="h-full bg-gradient-to-r from-blue-900 to-slate-900" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/18 to-transparent" />
      </div>
      
      <main className="relative -mt-16 mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 animate-in slide-in-from-bottom-4 duration-700">
         {/* Org Header Card */}
         <div className="mb-8 flex flex-col items-start gap-6 rounded-xl border border-white/45 bg-background/72 p-6 shadow-[0_24px_50px_-28px_rgba(15,23,42,0.6)] backdrop-blur-md backdrop-brightness-90 backdrop-saturate-75 md:flex-row md:items-center md:p-8 dark:border-white/20 dark:bg-background/68">
             <div className="w-24 h-24 md:w-32 md:h-32 bg-background rounded-lg border-4 border-background shadow overflow-hidden shrink-0">
                 <img src={org.logoUrl || "https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=300&auto=format&fit=crop"} alt={org.name} className="w-full h-full object-cover" />
             </div>
             
             <div className="flex-1 space-y-2">
                 <h1 className="text-3xl md:text-4xl font-bold font-serif">{org.name}</h1>
                 <p className="max-w-2xl text-foreground/85">{org.description}</p>
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
                             {t("orgPage.officialWebsite")}
                         </a>
                     )}
                     <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                         <Users className="w-4 h-4" />
                         {t("orgPage.membersCount").replace("{count}", String(members.length))}
                     </div>
                 </div>
             </div>
             
             {/* 申請加入已移除（改由搜尋申請流程） */}
         </div>

         {/* Content Tabs */}
         <Tabs defaultValue="works" className="w-full">
            <TabsList className="mb-5 h-auto rounded-lg border border-border/60 bg-[hsl(var(--surface-2))]/55 p-1">
                <TabsTrigger
                  value="works"
                  className="h-9 rounded-md border border-transparent bg-background/65 px-3 text-sm text-muted-foreground transition-colors data-[state=active]:border-primary/35 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  {t("orgPage.publicWorks")}
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="h-9 rounded-md border border-transparent bg-background/65 px-3 text-sm text-muted-foreground transition-colors data-[state=active]:border-primary/35 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  {t("orgPage.membersTab")}
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="works" className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {scripts.map(script => (
                        <ScriptGalleryCard 
                            key={script.id}
                            script={script}
                            onClick={() => navigate(`/read/${script.id}`)}
                        />
                    ))}
                </div>
            </TabsContent>
            
            <TabsContent value="members" className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {members.map(member => (
                        <div 
                            key={member.id} 
                            className="rounded-lg border border-border/70 bg-background/75 p-4 flex items-center gap-4 transition-colors hover:border-primary/50 hover:bg-background cursor-pointer"
                            onClick={() => navigate(`/author/${member.id}`)}
                        >
                            <Avatar>
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback>{member.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <div className="font-medium">{member.displayName}</div>
                                <div className="text-xs text-muted-foreground">{t("orgPage.member")}</div>
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

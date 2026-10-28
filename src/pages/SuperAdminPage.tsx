import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileText, ArrowRightLeft, Building2, Plus, Search, UserCircle, Loader2, Trash2, ChevronDown, ChevronUp, Database, Settings2, PanelLeftOpen, BookOpen, Globe2, ClipboardCheck, Megaphone } from "lucide-react";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { AdminUserManagementCard } from "../components/admin/AdminUserManagementCard";
import { TermsAcceptanceTable } from "../components/admin/TermsAcceptanceTable";
import { HomepageBannerSection } from "../components/admin/HomepageBannerSection";
import { ExternalPublicScriptSection } from "../components/admin/ExternalPublicScriptSection";
import { PublicFeedbackInbox } from "../components/admin/PublicFeedbackInbox";
import { PublicDemoSubmissionInbox } from "../components/admin/PublicDemoSubmissionInbox";
import { AdminTransferModal } from "../components/admin/AdminTransferModal";
import { useAdminPageState } from "../hooks/useAdminPageState";
import { getMediaCropStyle } from "../lib/mediaCropRef";
import { LanguageSwitcher } from "../components/common/LanguageSwitcher";
import { openPublicPath } from "../lib/publicNavigation";
import { TOPBAR_OUTER_CLASS } from "../components/layout/topbarLayout";
import {
  STUDIO_PAGE_CONTENT_CLASS,
  STUDIO_PAGE_PADDING_CLASS,
  STUDIO_TOPBAR_ACTIONS_CLASS,
  STUDIO_TOPBAR_ICON_BUTTON_CLASS,
  STUDIO_TOPBAR_INNER_CLASS,
  STUDIO_TOPBAR_ROW_CLASS,
  STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS,
  STUDIO_TOPBAR_SURFACE_CLASS,
  STUDIO_TOPBAR_TITLE_WRAP_CLASS,
} from "../components/layout/studioTopbarTokens";

const workbenchTabClass = "h-11 justify-start rounded-lg border border-transparent bg-background/75 px-3 text-muted-foreground transition-colors hover:bg-[color:var(--morandi-tone-helper-bg)]/55 hover:text-foreground data-[state=active]:border-[color:var(--morandi-tone-panel-border)] data-[state=active]:bg-[color:var(--morandi-tone-trigger-bg)] data-[state=active]:text-[color:var(--morandi-tone-trigger-fg)] data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[color:var(--morandi-tone-helper-border)]";

interface SuperAdminPageProps {
  isSidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
  openMobileMenu?: () => void;
}

interface CollapsibleSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, description, defaultOpen = false, children }: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className="rounded-xl border border-border/70 bg-background shadow-sm">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <div className="font-semibold text-sm">{title}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}

function AdminWorkflowPlaceholder({ title }: { title: string }): React.JSX.Element {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/60 p-6 text-center">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{title}</h2>
        <Badge variant="outline">尚未啟用</Badge>
      </div>
    </div>
  );
}

export default function SuperAdminPage({ isSidebarOpen, setSidebarOpen, openMobileMenu }: SuperAdminPageProps): React.JSX.Element {
  const s = useAdminPageState();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const requestedSection = searchParams.get("section") || "";
  const reviewTabs = ["applications", "signatures", "submissions", "claims"];
  const activityReviewTabs = ["activity-submissions", "campaigns"];
  const activeArea = requestedSection === "directory" || requestedSection === "catalog" || requestedSection === "settings"
    ? "settings"
    : requestedSection === "external"
      ? "external"
      : requestedSection === "marketing" || requestedSection === "homepage" || requestedSection === "activities"
        ? "marketing"
        : activityReviewTabs.includes(requestedSection)
          ? "activity-review"
          : requestedSection === "activity-review"
            ? "activity-review"
            : "review";
  const catalogTabs = ["scripts", "orgs", "personas", "users"];
  const reviewTab = reviewTabs.includes(requestedSection) ? requestedSection : "applications";
  const activityReviewTab = activityReviewTabs.includes(requestedSection) ? requestedSection : "activity-submissions";
  const marketingTab = requestedSection === "activities" ? "activities" : "homepage";
  const requestedCatalogTab = searchParams.get("catalog") || "";
  const settingsTab = requestedSection === "directory" || requestedSection === "catalog" ? "directory" : "settings";
  const catalogTab = catalogTabs.includes(requestedCatalogTab)
    ? requestedCatalogTab
    : requestedSection === "directory"
      ? "personas"
      : "scripts";
  const resourceTabs = ["scripts", "author-pages", "studios"];
  const requestedResourceTab = searchParams.get("resource") || "";
  const resourceTab = resourceTabs.includes(requestedResourceTab) ? requestedResourceTab : "scripts";

  const goToSection = (section: string) => {
    const next = new URLSearchParams();
    const targetSection = section === "review"
      ? "applications"
      : section === "activity-review"
        ? "activity-submissions"
        : section === "marketing"
          ? "homepage"
          : section;
    next.set("section", targetSection);
    navigate({ pathname: location.pathname, search: `?${next.toString()}` });
  };

  const goToActivityReviewTab = (tab: string) => goToSection(tab);

  const goToMarketingTab = (tab: string) => {
    const next = new URLSearchParams();
    next.set("section", tab === "activities" ? "activities" : "marketing");
    navigate({ pathname: location.pathname, search: `?${next.toString()}` });
  };

  const goToCatalogTab = (tab: string) => {
    const next = new URLSearchParams();
    next.set("section", "directory");
    next.set("catalog", tab);
    navigate({ pathname: location.pathname, search: `?${next.toString()}` });
  };

  const goToSettingsTab = (tab: string) => {
    const next = new URLSearchParams();
    next.set("section", tab === "directory" ? "directory" : "settings");
    if (tab === "directory" && catalogTabs.includes(requestedCatalogTab)) next.set("catalog", requestedCatalogTab);
    navigate({ pathname: location.pathname, search: `?${next.toString()}` });
  };

  const goToResourceTab = (tab: string) => {
    const next = new URLSearchParams();
    next.set("section", "external");
    next.set("resource", tab);
    navigate({ pathname: location.pathname, search: `?${next.toString()}` });
  };

  if (!s.profile?.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">沒有超級管理員權限</CardTitle>
            <CardDescription>請使用已列入 ADMIN_USER_EMAILS 或超管名單的帳號登入。</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className={`${TOPBAR_OUTER_CLASS} ${STUDIO_TOPBAR_SURFACE_CLASS}`}>
        <div className={STUDIO_TOPBAR_INNER_CLASS}>
          <div className={STUDIO_TOPBAR_ROW_CLASS}>
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => openMobileMenu?.()} title="展開選單">
                <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            <div className={`hidden lg:block ${isSidebarOpen ? "lg:hidden" : ""}`}>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen?.(true)} title="展開側欄">
                <PanelLeftOpen className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
            <div className={STUDIO_TOPBAR_TITLE_WRAP_CLASS}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary sm:inline-flex">Superadmin</span>
                <h1 className="truncate font-serif text-lg font-semibold text-primary">超管工作台</h1>
              </div>
            </div>
            <div className={STUDIO_TOPBAR_ACTIONS_CLASS}>
              <Badge variant="outline" className="hidden max-w-40 truncate text-xs md:inline-flex">管理員 · {s.currentUser?.displayName || "Admin"}</Badge>
              <LanguageSwitcher compact buttonClassName={STUDIO_TOPBAR_ICON_BUTTON_CLASS} ariaLabel={s.t("settings.language")} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`${STUDIO_TOPBAR_SECONDARY_BUTTON_CLASS} w-10 px-0 sm:w-auto sm:px-3`}
                onClick={() => openPublicPath("/")}
                title="公開台本"
                aria-label="公開台本"
              >
                <BookOpen className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">公開台本</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto ${STUDIO_PAGE_PADDING_CLASS}`}>
        <div className={STUDIO_PAGE_CONTENT_CLASS}>
      <Tabs value={activeArea} onValueChange={goToSection} className="space-y-3">
        <div className="sticky top-0 z-20 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-gradient-to-r from-[var(--morandi-tone-helper-bg)]/85 via-[var(--morandi-tone-helper-bg)]/45 to-background p-2.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1.5">
        <TabsList className="grid h-auto min-w-0 flex-1 grid-cols-2 gap-1.5 bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="review" className={workbenchTabClass}>
            <span className="flex items-center gap-2 text-xs sm:text-sm"><ClipboardCheck className="h-4 w-4 shrink-0" /><span>一般審核</span></span>
          </TabsTrigger>
          <TabsTrigger value="activity-review" className={workbenchTabClass}>
            <span className="flex items-center gap-2 text-xs sm:text-sm"><ClipboardCheck className="h-4 w-4 shrink-0" /><span>活動審核</span></span>
          </TabsTrigger>
          <TabsTrigger value="marketing" className={workbenchTabClass}>
            <span className="flex items-center gap-2 text-xs sm:text-sm"><Megaphone className="h-4 w-4 shrink-0" /><span>行銷</span></span>
          </TabsTrigger>
          <TabsTrigger value="external" className={workbenchTabClass}>
            <span className="flex items-center gap-2 text-xs sm:text-sm"><Globe2 className="h-4 w-4 shrink-0" /><span>外部資源</span></span>
          </TabsTrigger>
          <TabsTrigger value="settings" className={workbenchTabClass}>
            <span className="flex items-center gap-2 text-xs sm:text-sm"><Settings2 className="h-4 w-4 shrink-0" /><span>平台設定</span></span>
          </TabsTrigger>
        </TabsList>
        </div>
        </div>

        <TabsContent value="settings" className="space-y-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
          <Tabs value={settingsTab} onValueChange={goToSettingsTab} className="space-y-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0">
              <TabsTrigger value="settings" className={workbenchTabClass}>
                <span className="flex items-center gap-2 text-xs sm:text-sm"><Settings2 className="h-4 w-4 shrink-0" /><span>平台設定</span></span>
              </TabsTrigger>
              <TabsTrigger value="directory" className={workbenchTabClass}>
                <span className="flex items-center gap-2 text-xs sm:text-sm"><Database className="h-4 w-4 shrink-0" /><span>全站名錄</span></span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="mt-0">
              <CollapsibleSection title="超管帳號管理" description="新增或移除平台超管帳號">
                <AdminUserManagementCard />
              </CollapsibleSection>
            </TabsContent>
            <TabsContent value="directory" className="mt-0 space-y-3">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "使用者", value: s.users.length },
              { label: "組織", value: s.orgs.length },
              { label: "作者", value: s.personas.length },
              { label: "劇本", value: s.scripts.filter((sc) => sc.type !== "folder").length },
            ].map(({ label, value }) => (
              <Card key={label} className="border-border/60 bg-card/70 shadow-none">
                <CardContent className="flex items-center justify-between p-3 sm:px-4">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-xl font-semibold leading-tight tabular-nums">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background px-3 py-3 sm:flex-row sm:items-center sm:px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
              placeholder="搜尋名稱、ID 或 owner"
              value={s.listQuery}
              onChange={(e) => s.setListQuery(e.target.value)}
            />
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => s.loadAllData(s.listQuery.trim())}>
              {s.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "重新載入"}
            </Button>
          </div>
          <Tabs value={catalogTab} onValueChange={goToCatalogTab} className="space-y-3">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0 sm:grid-cols-4">
            <TabsTrigger value="scripts" className={workbenchTabClass}>
              {s.t("transferAdmin.scriptTab")}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.scripts.filter((sc) => sc.type !== "folder").length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="orgs" className={workbenchTabClass}>
              {s.t("transferAdmin.orgTab")}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.orgs.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="personas" className={workbenchTabClass}>
              {s.t("transferAdmin.personaTab")}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.personas.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="users" className={workbenchTabClass}>
              使用者
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">{s.users.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Scripts */}
          <TabsContent value="scripts">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>所有劇本</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Input placeholder="篩選名稱或 owner..." value={s.scriptFilter} onChange={(e) => s.setScriptFilter(e.target.value)} className="h-8 text-sm" />
                  <div className="inline-flex rounded-md border bg-background p-0.5 gap-0.5 shrink-0">
                    {["all", "Public", "Private"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`h-7 px-3 text-xs rounded transition-colors ${s.scriptStatusFilter === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                        onClick={() => s.setScriptStatusFilter(opt)}
                      >
                        {opt === "all" ? "全部" : opt === "Public" ? "公開" : "私人"}
                      </button>
                    ))}
                  </div>
                </div>
                <CardDescription className="mt-1">顯示 {s.filteredScripts.length} / {s.scripts.filter((sc) => sc.type !== "folder").length} 部</CardDescription>
              </CardHeader>
              <CardContent>
                {s.isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : s.filteredScripts.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
                ) : (
                  <div className="space-y-1.5">
                    {s.filteredScripts.map((sc) => (
                      <div key={sc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate text-sm">{sc.title || "(無標題)"}</div>
                            <div className="text-xs text-muted-foreground truncate">owner: {s.getOwnerLabel(sc.ownerId)}</div>
                          </div>
                          {sc.status === "Public" && (
                            <Badge variant="secondary" className="text-[10px] h-5 shrink-0">{s.t("transferAdmin.publicBadge")}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenScriptSettings(sc)}>設定</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenTransfer("script", sc)}>
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7" disabled={s.isDeleting} onClick={() => s.handleDeleteScript(sc)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orgs */}
          <TabsContent value="orgs" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1 h-fit">
                <CardHeader>
                  <CardTitle className="text-base">{s.t("transferAdmin.createOrgTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder={s.t("transferAdmin.orgNamePlaceholder")} value={s.newOrgName} onChange={(e) => s.setNewOrgName(e.target.value)} />
                  <Button className="w-full" onClick={s.handleCreateOrg} disabled={!s.newOrgName}>
                    <Plus className="w-4 h-4 mr-2" />{s.t("transferAdmin.createOrg")}
                  </Button>
                </CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">所有組織</CardTitle>
                  <Input placeholder="篩選名稱或 owner..." value={s.orgFilter} onChange={(e) => s.setOrgFilter(e.target.value)} className="h-8 text-sm mt-2" />
                  <CardDescription>顯示 {s.filteredOrgs.length} / {s.orgs.length} 個</CardDescription>
                </CardHeader>
                <CardContent>
                  {s.isLoading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                  ) : s.filteredOrgs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
                  ) : (
                    <div className="space-y-2">
                      {s.filteredOrgs.map((org) => (
                        <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">{org.name}</div>
                              <div className="text-xs text-muted-foreground">owner: {s.getOwnerLabel(org.ownerId)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenTransfer("org", org)}>
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7" disabled={s.isDeleting} onClick={() => s.handleDeleteOrg(org)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Personas */}
          <TabsContent value="personas">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>所有作者</CardTitle>
                <Input placeholder="篩選名稱或 owner..." value={s.personaFilter} onChange={(e) => s.setPersonaFilter(e.target.value)} className="h-8 text-sm mt-2" />
                <CardDescription>顯示 {s.filteredPersonas.length} / {s.personas.length} 位</CardDescription>
              </CardHeader>
              <CardContent>
                {s.isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : s.filteredPersonas.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {s.filteredPersonas.map((p) => {
                      const cropAvatar = getMediaCropStyle(String(p.avatar || ""));
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                              {p.avatar ? (
                                <img src={cropAvatar.src} style={cropAvatar.style} alt={p.displayName || p.id} className="w-full h-full object-cover" />
                              ) : <UserCircle className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{p.displayName}</div>
                              <div className="text-xs text-muted-foreground truncate">owner: {s.getOwnerLabel(p.ownerId)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => s.handleOpenTransfer("persona", p)}>
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="destructive" size="sm" className="h-7" disabled={s.isDeleting} onClick={() => s.handleDeletePersona(p)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>所有使用者</CardTitle>
                <Input placeholder="篩選名稱 / email / ID..." value={s.userFilter} onChange={(e) => s.setUserFilter(e.target.value)} className="h-8 text-sm mt-2" />
                <CardDescription>顯示 {s.filteredUsers.length} / {s.users.length} 位</CardDescription>
              </CardHeader>
              <CardContent>
                {s.isLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                ) : s.filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">無符合結果</div>
                ) : (
                  <div className="space-y-1.5">
                    {s.filteredUsers.map((u) => (
                      <div key={u.id} className="rounded border px-3 py-2.5 text-sm flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.displayName || u.handle || "-"}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email || "-"} ｜ {u.id}</div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 shrink-0"
                          disabled={s.isDeleting || u.id === s.currentUser?.uid}
                          onClick={() => s.handleDeleteUser(u)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="review" className="space-y-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
          <Tabs value={reviewTab} onValueChange={goToSection} className="space-y-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0 sm:grid-cols-4">
              <TabsTrigger value="applications" className={workbenchTabClass}>申請與回報</TabsTrigger>
              <TabsTrigger value="signatures" className={workbenchTabClass}>簽署紀錄</TabsTrigger>
              <TabsTrigger value="submissions" className={workbenchTabClass}>Demo 投稿</TabsTrigger>
              <TabsTrigger value="claims" className={workbenchTabClass}>身份認領</TabsTrigger>
            </TabsList>
            <TabsContent value="applications">
              <CollapsibleSection title="廣告、上架申請與回報" defaultOpen>
                <PublicFeedbackInbox />
              </CollapsibleSection>
            </TabsContent>
            <TabsContent value="signatures">
              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                <h2 className="mb-3 text-sm font-semibold">授權條款簽署紀錄</h2>
                <TermsAcceptanceTable />
              </div>
            </TabsContent>
            <TabsContent value="submissions"><PublicDemoSubmissionInbox /></TabsContent>
            <TabsContent value="claims"><AdminWorkflowPlaceholder title="身份認領" /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="activity-review" className="space-y-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
          <Tabs value={activityReviewTab} onValueChange={goToActivityReviewTab} className="space-y-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0">
              <TabsTrigger value="activity-submissions" className={workbenchTabClass}>活動頁面審核</TabsTrigger>
              <TabsTrigger value="campaigns" className={workbenchTabClass}>活動徵件審核</TabsTrigger>
            </TabsList>
            <TabsContent value="activity-submissions"><AdminWorkflowPlaceholder title="活動頁面審核" /></TabsContent>
            <TabsContent value="campaigns"><AdminWorkflowPlaceholder title="活動徵件審核" /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
          <Tabs value={marketingTab} onValueChange={goToMarketingTab} className="space-y-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 bg-transparent p-0">
              <TabsTrigger value="homepage" className={workbenchTabClass}>首頁 Banner</TabsTrigger>
              <TabsTrigger value="activities" className={workbenchTabClass}>活動頁面</TabsTrigger>
            </TabsList>
            <TabsContent value="homepage" className="mt-0">
              <CollapsibleSection title="首頁 Banner 設定" description="管理首頁輪播 Banner 內容">
                <HomepageBannerSection />
              </CollapsibleSection>
            </TabsContent>
            <TabsContent value="activities"><AdminWorkflowPlaceholder title="活動頁面管理" /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="external" className="space-y-3 rounded-xl border border-[color:var(--morandi-tone-panel-border)] bg-[color:var(--morandi-tone-panel-bg)] p-2 shadow-sm sm:p-3">
          <Tabs value={resourceTab} onValueChange={goToResourceTab} className="space-y-3">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1.5 bg-transparent p-0">
              <TabsTrigger value="scripts" className={workbenchTabClass}>
                <span className="flex items-center gap-2 text-xs sm:text-sm"><FileText className="h-4 w-4 shrink-0" /><span>台本</span></span>
              </TabsTrigger>
              <TabsTrigger value="author-pages" className={workbenchTabClass}>
                <span className="flex items-center gap-2 text-xs sm:text-sm"><UserCircle className="h-4 w-4 shrink-0" /><span>作者頁</span></span>
              </TabsTrigger>
              <TabsTrigger value="studios" className={workbenchTabClass}>
                <span className="flex items-center gap-2 text-xs sm:text-sm"><Building2 className="h-4 w-4 shrink-0" /><span>錄音室</span></span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="scripts">
              <ExternalPublicScriptSection />
            </TabsContent>
            <TabsContent value="author-pages">
              <AdminWorkflowPlaceholder title="外部作者頁來源尚未接入" />
            </TabsContent>
            <TabsContent value="studios">
              <AdminWorkflowPlaceholder title="外部錄音室來源尚未接入" />
            </TabsContent>
          </Tabs>
        </TabsContent>

      </Tabs>

      {s.showTransferModal && s.selectedItem && (
        <AdminTransferModal
          selectedItem={s.selectedItem}
          selectedItemLabel={s.selectedItemLabel}
          transferTypeLabel={s.transferTypeLabel}
          targetUser={s.targetUser}
          setTargetUser={s.setTargetUser}
          searchQuery={s.searchQuery}
          setSearchQuery={s.setSearchQuery}
          searchResults={s.searchResults}
          isSearching={s.isSearching}
          searchError={s.searchError}
          isTransferring={s.isTransferring}
          onCancel={() => s.setShowTransferModal(false)}
          onConfirm={s.confirmTransfer}
        />
      )}

      {s.showScriptSettingsModal && s.selectedScriptSettings && (
        <ScriptMetadataDialog
          open={s.showScriptSettingsModal}
          onOpenChange={(open) => {
            s.setShowScriptSettingsModal(open);
            if (!open) s.setSelectedScriptSettings(null);
          }}
          script={s.selectedScriptSettings}
          fetchFullScript={false}
          preserveAuthorInternalData
          saveScript={s.handleSaveScriptSettings}
          onSave={() => {
            s.loadAllData(s.listQuery.trim());
          }}
        />
      )}
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { FileText, ArrowRightLeft, Building2, Plus, Search, UserCircle, Loader2, Trash2, ChevronDown, ChevronUp, Menu, Database, Settings2 } from "lucide-react";
import { ScriptMetadataDialog } from "../components/dashboard/ScriptMetadataDialog";
import { AdminUserManagementCard } from "../components/admin/AdminUserManagementCard";
import { TermsAcceptanceTable } from "../components/admin/TermsAcceptanceTable";
import { HomepageBannerSection } from "../components/admin/HomepageBannerSection";
import { ExternalPublicScriptSection } from "../components/admin/ExternalPublicScriptSection";
import { ExternalAuthorPagesSection } from "../components/admin/ExternalAuthorPagesSection";
import { ActivityPagesAdminSection } from "../components/admin/ActivityPagesAdminSection";
import { ActivitySubmissionsAdminSection } from "../components/admin/ActivitySubmissionsAdminSection";
import { VoiceActorManagementSection } from "../components/admin/VoiceActorManagementSection";
import { PublicFeedbackInbox } from "../components/admin/PublicFeedbackInbox";
import { PublicDemoSubmissionInbox } from "../components/admin/PublicDemoSubmissionInbox";
import { PublicDemoManagement } from "../components/admin/PublicDemoManagement";
import { VoiceActorProfileReviewInbox } from "../components/admin/VoiceActorProfileReviewInbox";
import { ExternalAuthorProfileReviewInbox } from "../components/admin/ExternalAuthorProfileReviewInbox";
import { AdminTransferModal } from "../components/admin/AdminTransferModal";
import { useAdminPageState } from "../hooks/useAdminPageState";
import { getExternalAuthorProfileSubmissionsAdmin, getPublicDemoSubmissionsAdmin, getPublicFeedbackAdmin, getVoiceActorProfileSubmissionsAdmin } from "../lib/api/admin";
import { ADMIN_QUEUE_UPDATED_EVENT } from "../lib/adminNotifications";
import { getMediaCropStyle } from "../lib/mediaCropRef";
import { useStudioShell } from "../components/studio/StudioShellContext";

/** Sub-section triggers stay mounted for Radix state but the side nav replaces them visually. */
const workbenchTabClass = "";

interface CollapsibleSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, description, defaultOpen = false, children }: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className="rounded-[10px] border border-border bg-background">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-[10px] px-4 py-3 text-left transition-colors hover:bg-muted/40"
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
    <div className="flex min-h-40 items-center justify-center rounded-[10px] border border-dashed border-border p-6 text-center">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{title}</h2>
        <Badge variant="outline">尚未啟用</Badge>
      </div>
    </div>
  );
}

export default function SuperAdminPage(): React.JSX.Element {
  const s = useAdminPageState();
  const [pendingDemoCount, setPendingDemoCount] = useState(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [pendingVoiceActorProfileCount, setPendingVoiceActorProfileCount] = useState(0);
  const [pendingExternalAuthorProfileCount, setPendingExternalAuthorProfileCount] = useState(0);
  const { openMobileMenu } = useStudioShell();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const requestedSection = searchParams.get("section") || "";
  const reviewTabs = ["applications", "signatures", "submissions", "claims", "voice-actor-profiles", "external-author-profiles"];
  const activityReviewTabs = ["activity-submissions", "campaigns"];
  const activeArea = requestedSection === "directory" || requestedSection === "catalog" || requestedSection === "settings"
    ? "settings"
    : requestedSection === "voice-actors"
      ? "voice-actors"
    : requestedSection === "demos"
      ? "demos"
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

  const refreshQueueCounts = useCallback(async () => {
    const [feedbackResult, demoResult, voiceActorResult, externalAuthorResult] = await Promise.allSettled([
      getPublicFeedbackAdmin({ excludeKind: "demo_submission", status: "new", limit: 1, offset: 0 }),
      getPublicDemoSubmissionsAdmin({ status: "pending", limit: 1, offset: 0 }),
      getVoiceActorProfileSubmissionsAdmin({ status: "pending", limit: 1, offset: 0 }),
      getExternalAuthorProfileSubmissionsAdmin({ status: "pending", limit: 1, offset: 0 }),
    ]);
    if (feedbackResult.status === "fulfilled") setNewFeedbackCount(feedbackResult.value.total || 0);
    if (demoResult.status === "fulfilled") setPendingDemoCount(demoResult.value.total || 0);
    if (voiceActorResult.status === "fulfilled") setPendingVoiceActorProfileCount(voiceActorResult.value.total || 0);
    if (externalAuthorResult.status === "fulfilled") setPendingExternalAuthorProfileCount(externalAuthorResult.value.total || 0);
  }, []);

  useEffect(() => {
    if (!s.profile?.isAdmin) return;
    const refresh = () => { void refreshQueueCounts(); };
    refresh();
    const intervalId = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(ADMIN_QUEUE_UPDATED_EVENT, refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(ADMIN_QUEUE_UPDATED_EVENT, refresh);
    };
  }, [s.profile?.isAdmin, refreshQueueCounts]);

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

  const navGroups: Array<{ name: string; items: Array<{ key: string; label: string; active: boolean; go: () => void }> }> = [
    {
      name: "審核",
      items: [
        { key: "applications", label: "申請與回報", active: activeArea === "review" && reviewTab === "applications", go: () => goToSection("applications") },
        { key: "submissions", label: "Demo 投稿", active: activeArea === "review" && reviewTab === "submissions", go: () => goToSection("submissions") },
        { key: "claims", label: "身份認領", active: activeArea === "review" && reviewTab === "claims", go: () => goToSection("claims") },
        { key: "voice-actor-profiles", label: "聲演頁面審核", active: activeArea === "review" && reviewTab === "voice-actor-profiles", go: () => goToSection("voice-actor-profiles") },
        { key: "external-author-profiles", label: "外部台本師頁面審核", active: activeArea === "review" && reviewTab === "external-author-profiles", go: () => goToSection("external-author-profiles") },
        { key: "activity-submissions", label: "活動頁面審核", active: activeArea === "activity-review" && activityReviewTab === "activity-submissions", go: () => goToSection("activity-submissions") },
        { key: "campaigns", label: "活動投稿管理", active: activeArea === "activity-review" && activityReviewTab === "campaigns", go: () => goToSection("campaigns") },
      ],
    },
    {
      name: "內容與行銷",
      items: [
        { key: "demo-management", label: "Demo 管理", active: activeArea === "demos", go: () => goToSection("demos") },
        { key: "homepage", label: "首頁 Banner", active: activeArea === "marketing" && marketingTab === "homepage", go: () => goToMarketingTab("homepage") },
        { key: "activities", label: "活動頁面", active: activeArea === "marketing" && marketingTab === "activities", go: () => goToMarketingTab("activities") },
        { key: "external-scripts", label: "外部台本", active: activeArea === "external" && resourceTab === "scripts", go: () => goToResourceTab("scripts") },
        { key: "external-author-pages", label: "外部作者頁", active: activeArea === "external" && resourceTab === "author-pages", go: () => goToResourceTab("author-pages") },
        { key: "external-studios", label: "外部錄音室", active: activeArea === "external" && resourceTab === "studios", go: () => goToResourceTab("studios") },
      ],
    },
    {
      name: "全站名錄",
      items: [
        { key: "voice-actors", label: "聲演管理", active: activeArea === "voice-actors", go: () => goToSection("voice-actors") },
        { key: "catalog-scripts", label: s.t("transferAdmin.scriptTab"), active: activeArea === "settings" && settingsTab === "directory" && catalogTab === "scripts", go: () => goToCatalogTab("scripts") },
        { key: "catalog-personas", label: s.t("transferAdmin.personaTab"), active: activeArea === "settings" && settingsTab === "directory" && catalogTab === "personas", go: () => goToCatalogTab("personas") },
        { key: "catalog-orgs", label: s.t("transferAdmin.orgTab"), active: activeArea === "settings" && settingsTab === "directory" && catalogTab === "orgs", go: () => goToCatalogTab("orgs") },
        { key: "catalog-users", label: "使用者", active: activeArea === "settings" && settingsTab === "directory" && catalogTab === "users", go: () => goToCatalogTab("users") },
      ],
    },
    {
      name: "平台",
      items: [
        { key: "admins", label: "超管帳號", active: activeArea === "settings" && settingsTab === "settings", go: () => goToSettingsTab("settings") },
        { key: "signatures", label: "授權簽署紀錄", active: activeArea === "review" && reviewTab === "signatures", go: () => goToSection("signatures") },
      ],
    },
  ];
  const activeNavItem = navGroups.flatMap((group) => group.items).find((item) => item.active);

  return (
    <div className="studio-density flex h-full min-h-0 flex-col bg-background lg:flex-row">
      <nav aria-label="後台分類" className="shrink-0 border-b border-border lg:w-60 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-6">
        <div className="flex items-center gap-1 px-4 pt-3 lg:px-5 lg:pt-0">
          <button type="button" onClick={openMobileMenu} className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted lg:hidden" aria-label="開啟選單">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">超管後台</h1>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pb-3 pt-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:px-3 lg:pb-0">
          {navGroups.map((group) => (
            <div key={group.name} className="contents lg:block lg:pb-2">
              <div className="hidden px-2.5 pb-1 pt-3 text-xs font-semibold text-muted-foreground lg:block">{group.name}</div>
              {group.items.map((item) => (
                (() => {
                  const noticeCount = item.key === "applications" ? newFeedbackCount : item.key === "submissions" ? pendingDemoCount : item.key === "voice-actor-profiles" ? pendingVoiceActorProfileCount : item.key === "external-author-profiles" ? pendingExternalAuthorProfileCount : 0;
                  return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.go}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 text-left text-sm transition-colors max-lg:h-10 lg:w-full lg:py-2 ${
                    item.active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  {noticeCount > 0 && <span aria-label={`${noticeCount} 筆待處理`} title={`${noticeCount} 筆待處理`} className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">{noticeCount > 99 ? "99+" : noticeCount}</span>}
                </button>
                  );
                })()
              ))}
            </div>
          ))}
        </div>
      </nav>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{activeNavItem?.label || "超管後台"}</h2>
        <span className="text-xs text-muted-foreground">管理員 · {s.currentUser?.displayName || "Admin"}</span>
      </div>
      <Tabs value={activeArea} onValueChange={goToSection} className="space-y-4">
        <TabsContent value="settings" className="mt-0 space-y-4">
          <Tabs value={settingsTab} onValueChange={goToSettingsTab} className="space-y-3">
            <TabsList className="hidden">
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
              { label: "台本師", value: s.authorPersonas.length },
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
          <TabsList className="hidden">
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
                <CardTitle>所有台本師</CardTitle>
                <Input placeholder="篩選名稱或 owner..." value={s.personaFilter} onChange={(e) => s.setPersonaFilter(e.target.value)} className="h-8 text-sm mt-2" />
                <CardDescription>依台本師標記或已綁定台本的身份篩選。顯示 {s.filteredPersonas.length} / {s.authorPersonas.length} 位</CardDescription>
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

        <TabsContent value="review" className="mt-0 space-y-4">
          <Tabs value={reviewTab} onValueChange={goToSection} className="space-y-3">
            <TabsList className="hidden">
              <TabsTrigger value="applications" className={workbenchTabClass}>申請與回報</TabsTrigger>
              <TabsTrigger value="signatures" className={workbenchTabClass}>簽署紀錄</TabsTrigger>
              <TabsTrigger value="submissions" className={workbenchTabClass}>Demo 投稿</TabsTrigger>
              <TabsTrigger value="claims" className={workbenchTabClass}>身份認領</TabsTrigger>
              <TabsTrigger value="voice-actor-profiles" className={workbenchTabClass}>聲演頁面審核</TabsTrigger>
              <TabsTrigger value="external-author-profiles" className={workbenchTabClass}>外部台本師頁面審核</TabsTrigger>
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
            <TabsContent value="voice-actor-profiles"><VoiceActorProfileReviewInbox /></TabsContent>
            <TabsContent value="external-author-profiles"><ExternalAuthorProfileReviewInbox /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="demos" className="mt-0 space-y-4">
          <PublicDemoManagement />
        </TabsContent>

        <TabsContent value="voice-actors" className="mt-0 space-y-4">
          <VoiceActorManagementSection />
        </TabsContent>

        <TabsContent value="activity-review" className="mt-0 space-y-4">
          <Tabs value={activityReviewTab} onValueChange={goToActivityReviewTab} className="space-y-3">
            <TabsList className="hidden">
              <TabsTrigger value="activity-submissions" className={workbenchTabClass}>活動頁面審核</TabsTrigger>
              <TabsTrigger value="campaigns" className={workbenchTabClass}>活動投稿管理</TabsTrigger>
            </TabsList>
            <TabsContent value="activity-submissions"><AdminWorkflowPlaceholder title="活動頁面審核" /></TabsContent>
            <TabsContent value="campaigns"><ActivitySubmissionsAdminSection /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="marketing" className="mt-0 space-y-4">
          <Tabs value={marketingTab} onValueChange={goToMarketingTab} className="space-y-3">
            <TabsList className="hidden">
              <TabsTrigger value="homepage" className={workbenchTabClass}>首頁 Banner</TabsTrigger>
              <TabsTrigger value="activities" className={workbenchTabClass}>活動頁面</TabsTrigger>
            </TabsList>
            <TabsContent value="homepage" className="mt-0">
              <CollapsibleSection title="首頁 Banner 設定" description="管理首頁輪播 Banner 內容">
                <HomepageBannerSection />
              </CollapsibleSection>
            </TabsContent>
            <TabsContent value="activities"><ActivityPagesAdminSection /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="external" className="mt-0 space-y-4">
          <Tabs value={resourceTab} onValueChange={goToResourceTab} className="space-y-3">
            <TabsList className="hidden">
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
              <ExternalAuthorPagesSection />
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

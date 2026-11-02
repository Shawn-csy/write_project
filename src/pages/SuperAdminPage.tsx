import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { AdminDirectorySection } from "../components/admin/AdminDirectorySection";
import { SegmentedControl } from "../components/studio/SegmentedControl";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";
import { StatusPill } from "../components/studio/StatusPill";
import { useAdminPageState } from "../hooks/useAdminPageState";
import { useI18n } from "../contexts/I18nContext";
import { getExternalAuthorProfileSubmissionsAdmin, getPublicDemoSubmissionsAdmin, getPublicFeedbackAdmin, getVoiceActorProfileSubmissionsAdmin } from "../lib/api/admin";
import { ADMIN_QUEUE_UPDATED_EVENT } from "../lib/adminNotifications";
import {
  ADMIN_GROUPS,
  adminTabSearch,
  groupOfTab,
  resolveAdminTab,
  tabsForGroup,
  type AdminGroupKey,
  type AdminTabKey,
} from "./superAdminNav";

export default function SuperAdminPage(): React.JSX.Element {
  const s = useAdminPageState();
  const { t } = useI18n();
  const [pendingDemoCount, setPendingDemoCount] = useState(0);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [pendingVoiceActorProfileCount, setPendingVoiceActorProfileCount] = useState(0);
  const [pendingExternalAuthorProfileCount, setPendingExternalAuthorProfileCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = resolveAdminTab(location.search);
  const activeGroup = groupOfTab(activeTab);

  // Legacy links (claims, activity-review, marketing, studios ...) are rewritten to the canonical URL.
  useEffect(() => {
    if (!new URLSearchParams(location.search).has("section")) return;
    const canonical = adminTabSearch(activeTab);
    if (canonical !== location.search) navigate({ pathname: location.pathname, search: canonical }, { replace: true });
  }, [activeTab, location.pathname, location.search, navigate]);

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

  const goToTab = (tab: AdminTabKey) => navigate({ pathname: location.pathname, search: adminTabSearch(tab) });
  const goToGroup = (group: AdminGroupKey) => {
    const first = tabsForGroup(group)[0];
    if (first) goToTab(first.key);
  };

  if (!s.profile?.isAdmin) {
    return (
      <StudioPage width="narrow">
        <StudioPageHeader title={t("adminConsole.noAccessTitle")} description={t("adminConsole.noAccessDesc")} />
      </StudioPage>
    );
  }

  const tabCount = (tab: AdminTabKey): number | null => {
    const count =
      tab === "applications" ? newFeedbackCount
        : tab === "submissions" ? pendingDemoCount
          : tab === "voice-actor-profiles" ? pendingVoiceActorProfileCount
            : tab === "external-author-profiles" ? pendingExternalAuthorProfileCount
              : 0;
    return count > 0 ? count : null;
  };
  const groupCount = (group: AdminGroupKey): number | null => {
    const total = tabsForGroup(group).reduce((sum, tab) => sum + (tabCount(tab.key) || 0), 0);
    return total > 0 ? total : null;
  };

  const groupTabs = tabsForGroup(activeGroup);

  return (
    <StudioPage width="wide">
      <StudioPageHeader
        title={t("adminConsole.title")}
        description={t("adminConsole.subtitle")}
        meta={<StatusPill status="live">{t("adminConsole.adminLabel")} · {s.currentUser?.displayName || "Admin"}</StatusPill>}
      />

      <div className="mb-5 flex flex-col gap-3">
        <SegmentedControl
          ariaLabel={t("adminConsole.groupNavLabel")}
          value={activeGroup}
          onChange={goToGroup}
          options={ADMIN_GROUPS.map((group) => ({ value: group.key, label: t(group.labelKey), count: groupCount(group.key) }))}
          className="self-start"
        />
        {groupTabs.length > 1 ? (
          <nav aria-label={t("adminConsole.tabNavLabel")} className="flex flex-wrap gap-x-1 gap-y-1 border-b border-border">
            {groupTabs.map((tab) => {
              const active = tab.key === activeTab;
              const count = tabCount(tab.key);
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => goToTab(tab.key)}
                  className={`-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors ${
                    active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(tab.labelKey)}
                  {count ? <span aria-label={t("adminConsole.pendingCount").replace("{n}", String(count))} className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">{count > 99 ? "99+" : count}</span> : null}
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>

      <div role="tabpanel">
        {activeTab === "applications" && <PublicFeedbackInbox />}
        {activeTab === "submissions" && <PublicDemoSubmissionInbox />}
        {activeTab === "voice-actor-profiles" && <VoiceActorProfileReviewInbox />}
        {activeTab === "external-author-profiles" && <ExternalAuthorProfileReviewInbox />}
        {activeTab === "campaigns" && <ActivitySubmissionsAdminSection />}
        {activeTab === "activities" && <ActivityPagesAdminSection />}
        {activeTab === "homepage" && <HomepageBannerSection />}
        {activeTab === "demos" && <PublicDemoManagement />}
        {activeTab === "external-scripts" && <ExternalPublicScriptSection />}
        {activeTab === "external-author-pages" && <ExternalAuthorPagesSection />}
        {activeTab === "voice-actors" && <VoiceActorManagementSection />}
        {(activeTab === "scripts" || activeTab === "orgs" || activeTab === "personas" || activeTab === "users") && (
          <AdminDirectorySection kind={activeTab} s={s} />
        )}
        {activeTab === "settings" && <AdminUserManagementCard />}
        {activeTab === "signatures" && <TermsAcceptanceTable />}
      </div>

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
    </StudioPage>
  );
}

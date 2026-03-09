import React from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Loader2 } from "lucide-react";
import { PublisherFormRow } from "./PublisherFormRow";

const roleBadgeClass = (role) => {
  if (role === "owner") return "border-[color:var(--license-term-border)] bg-[color:var(--license-term-bg)] text-[color:var(--license-term-fg)]";
  if (role === "admin") return "border-primary/35 bg-primary/12 text-primary";
  return "border-muted-foreground/30 bg-muted text-muted-foreground";
};

const roleLabel = (role) => {
  if (role === "owner") return "擁有者";
  if (role === "admin") return "管理員";
  return "一般成員";
};

export function PublisherOrgMembershipPanel({
  t,
  isLoading,
  orgMembers,
  canManageOrgMembers,
  currentUserId,
  handleChangeMemberRole,
  handleRemoveMember,
  handleRemovePersonaMember,
  inviteSearchQuery,
  setInviteSearchQuery,
  inviteSearchResults,
  isInviteSearching,
  handleInviteMember,
  orgRequests,
  handleAcceptRequest,
  handleDeclineRequest,
  orgInvites,
}) {
  return (
    <>
      <div id="org-guide-members">
        <PublisherFormRow label={t("publisherOrgTab.members")}>
          <div className="border rounded-md p-3 bg-muted/10 space-y-3">
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>正在同步成員資料...</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {t("publisherOrgTab.memberCount")
                .replace("{users}", String(orgMembers?.users?.length || 0))
                .replace("{personas}", String(orgMembers?.personas?.length || 0))}
            </div>
            {(orgMembers?.users?.length || 0) === 0 && (orgMembers?.personas?.length || 0) === 0 ? (
              <div className="text-sm text-muted-foreground">{t("publisherOrgTab.noMember")}</div>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                <div className="rounded-md border bg-background/80 p-2.5 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">帳號成員（{orgMembers?.users?.length || 0}）</div>
                  {(orgMembers?.users || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground">目前沒有帳號成員</div>
                  ) : (
                    (orgMembers?.users || []).map((u) => (
                      <div key={`u-${u.id}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                            {(u.displayName || u.handle || "?")[0]?.toUpperCase?.() || "?"}
                          </div>
                          <span>{u.displayName || u.handle || u.email || t("publisherOrgTab.defaultUser")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline">{t("publisherOrgTab.user")}</Badge>
                          <Badge className={roleBadgeClass(u.organizationRole)}>{roleLabel(u.organizationRole)}</Badge>
                          {canManageOrgMembers && u.organizationRole !== "owner" && u.id !== currentUserId && (
                            <>
                              <Select
                                value={u.organizationRole === "admin" ? "admin" : "member"}
                                onValueChange={(value) => handleChangeMemberRole?.(u.id, value)}
                              >
                                <SelectTrigger className="h-7 w-[104px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">一般成員</SelectItem>
                                  <SelectItem value="admin">管理員</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveMember?.(u.id)}
                              >
                                移除
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-md border bg-background/80 p-2.5 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">作者身份（{orgMembers?.personas?.length || 0}）</div>
                  {(orgMembers?.personas || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground">目前沒有作者身份</div>
                  ) : (
                    (orgMembers?.personas || []).map((p) => (
                      <div key={`p-${p.id}`} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                            {(p.displayName || "?")[0]?.toUpperCase?.() || "?"}
                          </div>
                          <span>{p.displayName || t("publisherOrgTab.persona")}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary">{t("publisherOrgTab.author")}</Badge>
                          <Badge className={roleBadgeClass(p.organizationRole)}>{roleLabel(p.organizationRole)}</Badge>
                          {canManageOrgMembers && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemovePersonaMember?.(p.id)}
                            >
                              移除
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </PublisherFormRow>
      </div>

      {canManageOrgMembers && (
        <>
          <div id="org-guide-invite">
            <PublisherFormRow label={t("publisherOrgTab.inviteMember")}>
              <div className="border rounded-md p-3 bg-muted/10 space-y-2">
                <Input
                  id="org-invite-search"
                  name="orgInviteSearch"
                  aria-label={t("publisherOrgTab.inviteSearchAria")}
                  placeholder={t("publisherOrgTab.inviteSearchPlaceholder")}
                  value={inviteSearchQuery}
                  onChange={(e) => setInviteSearchQuery(e.target.value)}
                />
                {isInviteSearching && <div className="text-xs text-muted-foreground">{t("publisherOrgTab.searching")}</div>}
                {inviteSearchResults?.length > 0 && (
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {inviteSearchResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm">
                        <span>{u.displayName || u.handle || u.email || u.id}</span>
                        <Button size="sm" onClick={() => handleInviteMember(u.id)}>
                          {t("publisherOrgTab.invite")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PublisherFormRow>
          </div>

          <PublisherFormRow label={t("publisherOrgTab.pendingRequests")}>
            <div className="border rounded-md p-3 bg-muted/10 space-y-2">
              {(orgRequests || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("publisherOrgTab.noRequests")}</div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {(orgRequests || []).map((req) => (
                    <div key={req.id} className="flex items-center justify-between text-sm">
                      <span>{t("publisherOrgTab.requester").replace("{value}", req.requester?.email || req.requester?.displayName || req.requesterUserId)}</span>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAcceptRequest(req.id)}>
                          {t("publisherOrgTab.accept")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeclineRequest(req.id)}>
                          {t("publisherOrgTab.decline")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PublisherFormRow>

          <PublisherFormRow label={t("publisherOrgTab.sentInvites")}>
            <div className="border rounded-md p-3 bg-muted/10 space-y-2">
              {(orgInvites || []).length === 0 ? (
                <div className="text-sm text-muted-foreground">{t("publisherOrgTab.noInvites")}</div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {(orgInvites || []).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm">
                      <span>{t("publisherOrgTab.inviteLabel").replace("{value}", inv.invitedUser?.email || inv.invitedUser?.displayName || inv.invitedUserId)}</span>
                      <Badge variant="outline">{inv.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PublisherFormRow>
        </>
      )}
    </>
  );
}

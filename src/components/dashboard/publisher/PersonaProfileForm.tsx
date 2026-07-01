import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { PublisherFormRow } from "./PublisherFormRow";
import { PublisherTagEditor } from "./PublisherTagEditor";
import { MetadataLicenseTab } from "../metadata/MetadataLicenseTab";
import { MEDIA_FILE_ACCEPT } from "../../../lib/mediaLibrary";
import { getMediaCropStyle } from "../../../lib/mediaCropRef";
import type { PersonaDraft, PersonaLink, OrgItem } from "../../../hooks/publisher/usePublisherProfileState";

interface ImageGuide {
  supported: string;
  recommended: string;
}

interface Props {
  t: (key: string, fallback?: string) => string;
  personaDraft: PersonaDraft;
  setPersonaDraft: React.Dispatch<React.SetStateAction<PersonaDraft>>;
  orgs: OrgItem[];
  safeLinks: PersonaLink[];
  avatarPreviewFailed: boolean;
  setAvatarPreviewFailed: (v: boolean) => void;
  bannerPreviewFailed: boolean;
  setBannerPreviewFailed: (v: boolean) => void;
  avatarUploadError: string;
  bannerUploadError: string;
  avatarUploadWarning: string;
  bannerUploadWarning: string;
  avatarGuide: ImageGuide;
  bannerGuide: ImageGuide;
  handleImageUpload: (field: "avatar" | "bannerUrl") => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAvatarMediaPicker: () => void;
  onOpenBannerMediaPicker: () => void;
  onAdjustAvatarFocalPoint?: () => void;
  onAdjustBannerFocalPoint?: () => void;
  // org
  hasPersona: boolean;
  orgSearchQuery: string;
  setOrgSearchQuery: (v: string) => void;
  isOrgSearching: boolean;
  orgSearchResults: Array<{ id: string; name?: string }>;
  handleRequestJoinOrg: (orgId: string) => void;
  myOrgRequests: Array<{ id: string; organization?: { name?: string }; orgName?: string; organizationId?: string; status?: string }>;
  // tags
  personaTagInput: string;
  setPersonaTagInput: (v: string) => void;
  parseTags: (v: string) => string[];
  addTags: (base: string[], incoming: string[]) => string[];
  getTagStyle: (tag: string) => React.CSSProperties;
  filteredTagOptions: string[];
}

export function PersonaProfileForm({
  t, personaDraft, setPersonaDraft, orgs, safeLinks,
  avatarPreviewFailed, setAvatarPreviewFailed,
  bannerPreviewFailed, setBannerPreviewFailed,
  avatarUploadError, bannerUploadError, avatarUploadWarning, bannerUploadWarning,
  avatarGuide, bannerGuide, handleImageUpload,
  onOpenAvatarMediaPicker, onOpenBannerMediaPicker,
  onAdjustAvatarFocalPoint, onAdjustBannerFocalPoint,
  hasPersona, orgSearchQuery, setOrgSearchQuery, isOrgSearching,
  orgSearchResults, handleRequestJoinOrg, myOrgRequests,
  personaTagInput, setPersonaTagInput, parseTags, addTags, getTagStyle, filteredTagOptions,
}: Props) {
  const avatarCrop = getMediaCropStyle(String(personaDraft.avatar || ""), personaDraft.avatarCrop);
  const bannerCrop = getMediaCropStyle(String(personaDraft.bannerUrl || ""), personaDraft.bannerCrop);

  return (
    <>
      <PublisherFormRow label={t("publisherProfileTab.displayName")} required hint={t("publisherProfileTab.displayNameRequiredHint", "最重要欄位，建立身份前請先填寫。")}>
        <div className="space-y-1.5">
          <Input
            id="persona-display-name" name="personaDisplayName"
            value={personaDraft.displayName}
            onChange={e => setPersonaDraft({ ...personaDraft, displayName: e.target.value })}
            placeholder={t("publisherProfileTab.displayNamePlaceholder")}
            className="font-medium"
          />
          {!personaDraft.displayName.trim() && (
            <p className="text-xs font-medium text-destructive">{t("publisherProfileTab.displayNameRequiredMessage", "請先填寫作者名稱，才能建立或儲存身份。")}</p>
          )}
        </div>
      </PublisherFormRow>

      <PublisherFormRow label={t("publisherProfileTab.bio")}>
        <Textarea id="persona-bio" name="personaBio" value={personaDraft.bio} onChange={e => setPersonaDraft({ ...personaDraft, bio: e.target.value })} placeholder={t("publisherProfileTab.bioPlaceholder")} className="min-h-[80px] resize-none" />
      </PublisherFormRow>

      <PublisherFormRow label={t("publisherProfileTab.website")}>
        <Input id="persona-website" name="personaWebsite" value={personaDraft.website} onChange={e => setPersonaDraft({ ...personaDraft, website: e.target.value })} placeholder="https://" />
      </PublisherFormRow>

      <PublisherFormRow label={t("publisherProfileTab.avatarUrl", "頭像")} hint={t("publisherProfileTab.avatarUrlPlaceholder")}>
        <div className="space-y-2">
          <div className="h-28 w-28 overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
            {personaDraft.avatar && !avatarPreviewFailed ? (
              <img src={avatarCrop.src} style={avatarCrop.style} alt="persona avatar preview" className="h-full w-full object-cover" onError={() => setAvatarPreviewFailed(true)} onLoad={() => setAvatarPreviewFailed(false)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Avatar</div>
            )}
          </div>
          <Input id="persona-avatar-url" name="personaAvatarUrl" value={personaDraft.avatar} onChange={e => setPersonaDraft({ ...personaDraft, avatar: e.target.value, avatarCrop: null })} className="text-xs h-8" />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
              {t("publisherProfileTab.uploadAvatar")}
              <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleImageUpload("avatar")} />
            </label>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20" onClick={onOpenAvatarMediaPicker}>
              {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
            </Button>
            {personaDraft.avatar && onAdjustAvatarFocalPoint && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={onAdjustAvatarFocalPoint}>
                {t("mediaLibrary.adjustFocalPoint", "調整焦點")}
              </Button>
            )}
          </div>
          <div className="space-y-0.5 text-[11px] text-muted-foreground"><p>{avatarGuide.supported}</p><p>{avatarGuide.recommended}</p></div>
          <div className="min-h-[16px] text-[11px]">
            {avatarUploadError ? <p className="text-destructive">{avatarUploadError}</p>
              : avatarUploadWarning ? <p className="text-[color:var(--license-term-fg)]">{avatarUploadWarning}</p>
              : avatarPreviewFailed ? <p className="text-[color:var(--license-term-fg)]">{t("publisherProfileTab.avatarPreviewFailed")}</p>
              : <p className="opacity-0">placeholder</p>}
          </div>
        </div>
      </PublisherFormRow>

      <PublisherFormRow label={t("publisherProfileTab.bannerUrl", "封面")} hint={t("publisherProfileTab.bannerUrlPlaceholder")}>
        <div className="space-y-2">
          <div className="h-16 w-full max-w-sm overflow-hidden rounded-md border bg-muted/20">
            {personaDraft.bannerUrl && !bannerPreviewFailed ? (
              <img src={bannerCrop.src} style={bannerCrop.style} alt="persona banner preview" className="h-full w-full object-cover" onError={() => setBannerPreviewFailed(true)} onLoad={() => setBannerPreviewFailed(false)} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Banner</div>
            )}
          </div>
          <Input id="persona-banner-url" name="personaBannerUrl" value={personaDraft.bannerUrl || ""} onChange={e => setPersonaDraft({ ...personaDraft, bannerUrl: e.target.value, bannerCrop: null })} className="text-xs h-8" />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
              {t("publisherProfileTab.uploadBanner")}
              <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={handleImageUpload("bannerUrl")} />
            </label>
            <Button type="button" variant="secondary" size="sm" className="h-8 text-[11px] border bg-primary/5 hover:bg-primary/10 text-primary border-primary/20" onClick={onOpenBannerMediaPicker}>
              {t("mediaLibrary.selectFromLibrary", "從媒體庫選擇")}
            </Button>
            {personaDraft.bannerUrl && onAdjustBannerFocalPoint && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={onAdjustBannerFocalPoint}>
                {t("mediaLibrary.adjustFocalPoint", "調整焦點")}
              </Button>
            )}
          </div>
          <div className="space-y-0.5 text-[11px] text-muted-foreground"><p>{bannerGuide.supported}</p><p>{bannerGuide.recommended}</p></div>
          <div className="min-h-[16px] text-[11px]">
            {bannerUploadError ? <p className="text-destructive">{bannerUploadError}</p>
              : bannerUploadWarning ? <p className="text-[color:var(--license-term-fg)]">{bannerUploadWarning}</p>
              : bannerPreviewFailed ? <p className="text-[color:var(--license-term-fg)]">{t("publisherProfileTab.bannerPreviewFailed")}</p>
              : <p className="opacity-0">placeholder</p>}
          </div>
        </div>
      </PublisherFormRow>

      <div className="space-y-3 pt-4 border-t">
        <PublisherFormRow label={t("publisherProfileTab.customLinks")}>
          <div className="border rounded-md p-3 bg-muted/10 space-y-2">
            {safeLinks.length === 0 && <div className="text-sm text-muted-foreground">{t("publisherProfileTab.noLinks")}</div>}
            {safeLinks.map((link, idx) => (
              <div key={`link-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                <Input id={`persona-link-label-${idx}`} name={`persona-link-label-${idx}`} aria-label={t("publisherProfileTab.linkNameAria")} placeholder={t("publisherProfileTab.linkNamePlaceholder")} value={link.label || ""}
                  onChange={e => { const next = [...safeLinks]; next[idx] = { ...next[idx], label: e.target.value }; setPersonaDraft({ ...personaDraft, links: next }); }} />
                <Input id={`persona-link-url-${idx}`} name={`persona-link-url-${idx}`} aria-label={t("publisherProfileTab.linkUrlAria")} placeholder="https://" value={link.url || ""}
                  onChange={e => { const next = [...safeLinks]; next[idx] = { ...next[idx], url: e.target.value }; setPersonaDraft({ ...personaDraft, links: next }); }} />
                <Button variant="ghost" size="sm" onClick={() => { const next = safeLinks.filter((_, i) => i !== idx); setPersonaDraft({ ...personaDraft, links: next }); }}>{t("common.remove")}</Button>
              </div>
            ))}
            <Button id="persona-add-link-btn" variant="outline" size="sm" onClick={() => { const next = [...safeLinks, { label: "", url: "" }]; setPersonaDraft({ ...personaDraft, links: next }); }}>
              {t("publisherProfileTab.addLink")}
            </Button>
          </div>
        </PublisherFormRow>

        <PublisherFormRow label={t("publisherProfileTab.orgMembership")}>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/10 p-2.5">
              <div className="mb-2 text-xs font-medium text-muted-foreground">勾選要顯示在作者頁的組織</div>
              {orgs.length === 0 ? (
                <div className="text-sm text-muted-foreground italic px-1">{t("publisherProfileTab.noOrgYet")}</div>
              ) : (
                <div className="space-y-2">
                  {orgs.map(org => {
                    const checked = (personaDraft.organizationIds || []).includes(org.id);
                    return (
                      <div key={org.id} className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-md border transition-all ${checked ? "bg-primary/10 border-primary text-primary" : "bg-background border-border hover:bg-muted/40"}`}>
                        <div className="min-w-0 flex items-center gap-2">
                          <input type="checkbox" id={`persona-org-${org.id}`} name={`personaOrg-${org.id}`} checked={checked}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...(personaDraft.organizationIds || []), org.id]
                                : (personaDraft.organizationIds || []).filter(id => id !== org.id);
                              setPersonaDraft({ ...personaDraft, organizationIds: next });
                            }} className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 max-w-[220px] truncate font-medium">{org.name}</span>
                        </div>
                        {checked && <span className="text-xs">已顯示</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-2 border rounded-md p-2.5 bg-muted/10 space-y-2">
              <div className="text-xs text-muted-foreground">{t("publisherProfileTab.searchOrgAndApply")}</div>
              {!hasPersona && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                  {t("publisherProfileTab.needPersonaBeforeOrgDesc", "建立至少一個作者身份後，才能申請加入組織。")}
                </div>
              )}
              <Input id="org-search-query" name="orgSearchQuery" placeholder={t("publisherProfileTab.searchOrgPlaceholder")} aria-label={t("publisherProfileTab.searchOrgAria")} value={orgSearchQuery} onChange={e => setOrgSearchQuery(e.target.value)} disabled={!hasPersona} />
              {isOrgSearching && <div className="text-xs text-muted-foreground">{t("publisherProfileTab.searching")}</div>}
              {orgSearchResults.length > 0 && (
                <div className="space-y-2">
                  {orgSearchResults.map(org => (
                    <div key={org.id} className="flex items-center justify-between text-sm">
                      <span>{org.name}</span>
                      <Button size="sm" variant="outline" onClick={() => handleRequestJoinOrg(org.id)} disabled={!hasPersona}>{t("publisherProfileTab.sendRequest")}</Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-1 border-t border-border/60">
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">{t("publisherProfileTab.pendingJoinRequests", "等待接受的組織申請")}</div>
                {myOrgRequests.length === 0 ? (
                  <div className="text-xs text-muted-foreground">{t("publisherProfileTab.noPendingJoinRequests", "目前沒有待審核申請。")}</div>
                ) : (
                  <div className="space-y-1.5">
                    {myOrgRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between rounded border bg-background px-2 py-1.5 text-xs">
                        <span className="truncate">{req.organization?.name || req.orgName || req.organizationId || "-"}</span>
                        <span className="text-[color:var(--license-term-fg)]">{req.status || t("publisherProfileTab.pendingStatus", "待審核")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </PublisherFormRow>

        <PublisherFormRow label={t("publisherProfileTab.tags")}>
          <PublisherTagEditor
            tags={personaDraft.tags || []}
            setTags={nextTags => setPersonaDraft(prev => ({ ...prev, tags: nextTags }))}
            tagInput={personaTagInput} setTagInput={setPersonaTagInput}
            parseTags={parseTags} addTags={addTags} getTagStyle={getTagStyle}
            filteredOptions={filteredTagOptions}
            inputId="persona-tag-input" inputName="personaTagInput"
            inputAriaLabel={t("publisherProfileTab.addTag")}
            addTagLabel={t("publisherProfileTab.addTag")}
            inputPlaceholder={t("publisherProfileTab.searchOrAddTag")}
            addQuotedTemplate={t("publisherProfileTab.addQuoted")}
            noMatchedTagLabel={t("publisherProfileTab.noMatchedTag")}
            emptyHintLabel={t("publisherProfileTab.inputTagHint")}
          />
        </PublisherFormRow>
      </div>

      <div className="border-t pt-4">
        <PublisherFormRow label={t("publisherProfileTab.defaultLicense")} hint={t("publisherProfileTab.defaultLicenseTip")}>
          <div className="rounded-lg border bg-muted/10 p-3">
            <MetadataLicenseTab
              licenseCommercial={personaDraft.defaultLicenseCommercial || ""}
              setLicenseCommercial={v => setPersonaDraft(prev => ({ ...prev, defaultLicenseCommercial: v }))}
              licenseDerivative={personaDraft.defaultLicenseDerivative || ""}
              setLicenseDerivative={v => setPersonaDraft(prev => ({ ...prev, defaultLicenseDerivative: v }))}
              licenseNotify={personaDraft.defaultLicenseNotify || ""}
              setLicenseNotify={v => setPersonaDraft(prev => ({ ...prev, defaultLicenseNotify: v }))}
              licenseSpecialTerms={personaDraft.defaultLicenseSpecialTerms}
              setLicenseSpecialTerms={v => setPersonaDraft(prev => ({ ...prev, defaultLicenseSpecialTerms: v }))}
              copyright="" setCopyright={() => {}}
            />
          </div>
        </PublisherFormRow>
      </div>
    </>
  );
}

import React from "react";
import { X } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

export function ScriptMetadataPublishSection({
  t,
  missingRequiredMap,
  requiredErrorMap,
  targetAudience,
  handleSetTargetAudience,
  contentRating,
  handleSetContentRating,
  licenseCommercial,
  setLicenseCommercial,
  licenseDerivative,
  setLicenseDerivative,
  licenseNotify,
  setLicenseNotify,
  publishNewTerm,
  setPublishNewTerm,
  addLicenseSpecialTerm,
  licenseSpecialTerms,
  removeLicenseSpecialTerm,
  renderRowLabel,
}) {
  const selectedPositiveClass = "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40 hover:bg-primary/90";
  const selectedNegativeClass = "border-destructive bg-destructive text-destructive-foreground ring-2 ring-destructive/40 hover:bg-destructive/90";
  const selectedWarningClass = "border-[color:var(--license-term-border)] bg-[color:var(--license-term-bg)] text-[color:var(--license-term-fg)] ring-2 ring-[color:var(--license-term-border)]/60 hover:bg-[color:var(--license-term-bg)]";
  return (
    <section id="metadata-section-publish" className="space-y-3 scroll-mt-24">
      <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabPublish", "發布設定")}</h3>
      <div className="rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="grid grid-cols-1 divide-y md:grid-cols-[220px_minmax(0,1fr)] md:divide-y-0 md:divide-x">
          {renderRowLabel("觀眾取向", "required", Boolean(missingRequiredMap.audience))}
          <div id="metadata-audience" className="space-y-2 p-4">
            <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
              {["男性向", "女性向", "一般向"].map((opt) => (
                <Button
                  key={`aud-${opt}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 px-3 text-xs font-medium ${targetAudience === opt ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => handleSetTargetAudience(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
            {requiredErrorMap.audience && <p className="text-xs text-destructive">發佈前必須選擇觀眾取向</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          {renderRowLabel("內容分級", "required", Boolean(missingRequiredMap.rating))}
          <div id="metadata-rating" className="space-y-2 p-4">
            <div className="inline-flex flex-wrap gap-1.5 rounded-md border bg-background p-1">
              {["全年齡向", "成人向"].map((opt) => (
                <Button
                  key={`rating-${opt}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`h-8 px-3 text-xs font-medium ${contentRating === opt ? (opt === "成人向" ? selectedNegativeClass : selectedPositiveClass) : "border-border bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => handleSetContentRating(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
            {requiredErrorMap.rating && <p className="text-xs text-destructive">發佈前必須選擇內容分級</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          {renderRowLabel("授權條款", "required", Boolean(missingRequiredMap.license), "商業使用 / 改作 / 修改通知")}
          <div className="space-y-3 p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <div className="mb-1 text-xs text-muted-foreground">可否商業使用</div>
                <div id="license-commercial" className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={licenseCommercial === "allow" ? selectedPositiveClass : ""}
                    onClick={() => setLicenseCommercial("allow")}
                  >
                    可
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={licenseCommercial === "disallow" ? selectedNegativeClass : ""}
                    onClick={() => setLicenseCommercial("disallow")}
                  >
                    不可
                  </Button>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">改作</div>
                <div className="grid grid-cols-3 gap-1">
                  <Button type="button" size="sm" variant="outline" className={licenseDerivative === "allow" ? selectedPositiveClass : ""} onClick={() => setLicenseDerivative("allow")}>可</Button>
                  <Button type="button" size="sm" variant="outline" className={licenseDerivative === "disallow" ? selectedNegativeClass : ""} onClick={() => setLicenseDerivative("disallow")}>不可</Button>
                  <Button type="button" size="sm" variant="outline" className={licenseDerivative === "limited" ? selectedWarningClass : ""} onClick={() => setLicenseDerivative("limited")}>需同意</Button>
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-muted-foreground">修改須通知作者</div>
                <div className="grid grid-cols-2 gap-1">
                  <Button type="button" size="sm" variant="outline" className={licenseNotify === "required" ? selectedPositiveClass : ""} onClick={() => setLicenseNotify("required")}>需要</Button>
                  <Button type="button" size="sm" variant="outline" className={licenseNotify === "not_required" ? selectedNegativeClass : ""} onClick={() => setLicenseNotify("not_required")}>不需要</Button>
                </div>
              </div>
            </div>
            {requiredErrorMap.license && (
              <p className="text-xs text-destructive">發佈前需完成授權設定</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 border-t md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div
            className="p-4 text-sm font-medium text-foreground border-l-[5px]"
            style={{
              borderLeftColor: "var(--license-term-border)",
              backgroundColor: "var(--license-term-bg)",
              color: "var(--license-term-fg)",
            }}
          >
            <div className="text-sm font-medium text-foreground">附加條款</div>
            <div className="mt-1 text-xs text-muted-foreground">補充授權限制與使用說明</div>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              <Input
                value={publishNewTerm}
                onChange={(e) => setPublishNewTerm(e.target.value)}
                placeholder="新增附加條款..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLicenseSpecialTerm();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addLicenseSpecialTerm}>新增</Button>
            </div>
            {(licenseSpecialTerms || []).length > 0 && (
              <div className="space-y-2">
                {licenseSpecialTerms.map((term, idx) => (
                  <div key={`${term}-${idx}`} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">{term}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLicenseSpecialTerm(idx)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

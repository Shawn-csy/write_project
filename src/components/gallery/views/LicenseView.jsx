import React from "react";
import { Scale, ShieldCheck, FileCheck2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { useI18n } from "../../../contexts/I18nContext";
import { getPublicTermsConfig } from "../../../lib/api/public";

const licenseCardStyle = {
  backgroundColor: "var(--license-card-bg)",
  borderColor: "var(--license-card-border)",
  color: "var(--license-card-fg)",
};

export function LicenseView() {
  const { t } = useI18n();
  const [termsConfig, setTermsConfig] = React.useState(null);

  React.useEffect(() => {
    getPublicTermsConfig()
      .then((data) => setTermsConfig(data || null))
      .catch(() => {});
  }, []);

  const termsVersion = String(termsConfig?.version || "").trim();
  const termsSections = Array.isArray(termsConfig?.sections) ? termsConfig.sections : [];
  const requiredChecks = Array.isArray(termsConfig?.requiredChecks) ? termsConfig.requiredChecks : [];
  const effectiveDate = /^\d{4}-\d{2}-\d{2}$/.test(termsVersion) ? termsVersion : "";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="flex flex-col items-center text-center space-y-4 mb-10">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 shadow-sm border"
          style={licenseCardStyle}
        >
          <Scale className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-foreground">{t("publicLicense.title")}</h1>
        <p className="text-lg text-muted-foreground max-w-xl">{t("publicLicense.subtitle")}</p>
        {termsVersion && (
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-foreground">
              {t("publicLicense.currentVersion")}：{termsVersion}
            </span>
            {effectiveDate && (
              <span className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-muted-foreground">
                {t("publicLicense.effectiveDate")}：{effectiveDate}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {termsSections.length > 0 && (
          <Card style={licenseCardStyle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {termsConfig?.title || t("publicLicense.checkTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm sm:text-base">
              {termsSections.map((section) => (
                <div key={section?.id || section?.title}>
                  <p className="font-medium">{section?.title}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{section?.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card style={licenseCardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="w-5 h-5 text-primary" />
              {t("publicLicense.checkTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <div>
              <p className="font-medium">{t("publicLicense.commercialUse")}</p>
              <p className="text-muted-foreground">{t("publicLicense.commercialUseDesc")}</p>
            </div>
            <div>
              <p className="font-medium">{t("publicLicense.derivativeUse")}</p>
              <p className="text-muted-foreground">{t("publicLicense.derivativeUseDesc")}</p>
            </div>
            <div>
              <p className="font-medium">{t("publicLicense.notifyModify")}</p>
              <p className="text-muted-foreground">{t("publicLicense.notifyModifyDesc")}</p>
            </div>
            <div>
              <p className="font-medium">{t("publicLicense.specialTerms")}</p>
              <p className="text-muted-foreground">{t("publicLicense.specialTermsDesc")}</p>
            </div>
          </CardContent>
        </Card>

        {requiredChecks.length > 0 && (
          <Card style={licenseCardStyle}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileCheck2 className="w-5 h-5 text-primary" />
                {t("publicLicense.requiredChecksTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm sm:text-base text-muted-foreground">
              <p>{t("publicLicense.requiredChecksDesc")}</p>
              <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                {requiredChecks.map((item) => (
                  <li key={item?.id || item?.label}>{item?.label}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card style={licenseCardStyle}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileCheck2 className="w-5 h-5 text-primary" />
              {t("publicLicense.copyrightTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground leading-relaxed text-sm sm:text-base">
            {t("publicLicense.copyrightBody")}
          </CardContent>
        </Card>

        <Card style={licenseCardStyle}>
          <CardHeader>
            <CardTitle className="text-xl">{t("publicLicense.signingLogTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm sm:text-base text-muted-foreground">
            <p>{t("publicLicense.signingLogDesc")}</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t("publicLicense.signingLogItemIp")}</li>
              <li>{t("publicLicense.signingLogItemTime")}</li>
              <li>{t("publicLicense.signingLogItemDevice")}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

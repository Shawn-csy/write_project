import React from "react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { X } from "lucide-react";
import { useI18n } from "../../../contexts/I18nContext";

export function MetadataLicenseTab({
    licenseCommercial, setLicenseCommercial,
    licenseDerivative, setLicenseDerivative,
    licenseNotify, setLicenseNotify,
    licenseSpecialTerms = [], setLicenseSpecialTerms,
    copyright, setCopyright,
    requiredErrors = {},
    licenseTerms = [],
    setLicenseTerms
}) {
    const { t } = useI18n();
    const [newTerm, setNewTerm] = React.useState("");
    const effectiveTerms = licenseSpecialTerms.length > 0 ? licenseSpecialTerms : licenseTerms;
    const setEffectiveTerms = setLicenseSpecialTerms || setLicenseTerms || (() => {});

    const handleAddTerm = () => {
        if (!newTerm.trim()) return;
        setEffectiveTerms([...(effectiveTerms || []), newTerm.trim()]);
        setNewTerm("");
    };

    const handleRemoveTerm = (index) => {
        const next = [...(effectiveTerms || [])];
        next.splice(index, 1);
        setEffectiveTerms(next);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTerm();
        }
    }

    const hasBasic =
        Boolean(licenseCommercial?.trim()) &&
        Boolean(licenseDerivative?.trim()) &&
        Boolean(licenseNotify?.trim());
    const optionClass = (active) =>
        `h-auto min-h-8 w-full px-2 py-2 text-xs leading-tight transition ${
            active
                ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
        }`;
    const optionPanelClass = "space-y-1 rounded-lg border border-border/70 bg-muted/10 p-2";

    return (
        <div className="space-y-5 px-1">

            {/* 1. Base License */}
            <div className="space-y-3">
                <Label className="text-base font-semibold block">{t("metadataLicense.base")}</Label>
                {requiredErrors.license && !hasBasic && (
                    <p className="text-xs text-destructive">{t("metadataLicense.required")}</p>
                )}
                <div className="grid gap-3 lg:grid-cols-3">
                    <div className={optionPanelClass}>
                        <Label className="text-xs text-muted-foreground" htmlFor="license-commercial">
                            {t("metadataLicense.commercial")}
                        </Label>
                        <div id="license-commercial" className="grid grid-cols-2 gap-1">
                            <Button type="button" variant="outline" className={optionClass(licenseCommercial === "allow")} onClick={() => setLicenseCommercial("allow")}>Y</Button>
                            <Button type="button" variant="outline" className={optionClass(licenseCommercial === "disallow")} onClick={() => setLicenseCommercial("disallow")}>N</Button>
                        </div>
                    </div>
                    <div className={optionPanelClass}>
                        <Label className="text-xs text-muted-foreground" htmlFor="license-derivative">
                            {t("metadataLicense.derivative")}
                        </Label>
                        <div id="license-derivative" className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                            <Button type="button" variant="outline" className={optionClass(licenseDerivative === "allow")} onClick={() => setLicenseDerivative("allow")}>Y</Button>
                            <Button type="button" variant="outline" className={optionClass(licenseDerivative === "disallow")} onClick={() => setLicenseDerivative("disallow")}>N</Button>
                            <Button type="button" variant="outline" className={optionClass(licenseDerivative === "limited")} onClick={() => setLicenseDerivative("limited")}>有條件</Button>
                        </div>
                    </div>
                    <div className={optionPanelClass}>
                        <Label className="text-xs text-muted-foreground" htmlFor="license-notify">
                            {t("metadataLicense.notify")}
                        </Label>
                        <div id="license-notify" className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                            <Button type="button" variant="outline" className={optionClass(licenseNotify === "required")} onClick={() => setLicenseNotify("required")}>Y</Button>
                            <Button type="button" variant="outline" className={optionClass(licenseNotify === "not_required")} onClick={() => setLicenseNotify("not_required")}>N</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Advanced */}
            <div className="space-y-3 pt-2">
                <Label className="text-base font-semibold block" htmlFor="license-new-term">{t("metadataLicense.advanced")}</Label>
                <p className="text-sm text-muted-foreground">{t("metadataLicense.specialTerms")}</p>
                <div className="flex gap-2">
                    <Input 
                        id="license-new-term"
                        name="licenseNewTerm"
                        placeholder={t("metadataLicense.extraPlaceholder")}
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Button variant="secondary" onClick={handleAddTerm}>{t("common.add")}</Button>
                </div>
                
                {/* Terms List */}
                <div className="space-y-2 mt-2">
                    {(effectiveTerms || []).map((term, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-background group hover:border-primary/50 transition-colors">
                            <span className="text-sm pl-1">{term}</span>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100"
                                onClick={() => handleRemoveTerm(idx)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                    {(effectiveTerms || []).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">{t("metadataLicense.noExtraTerms")}</p>
                    )}
                </div>
            </div>

        </div>
    );
}

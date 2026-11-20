import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';
import { SettingRow } from "./SettingRow";
import { SettingsSectionCard } from "./SettingsSectionCard";

export function ProfileSettings() {
    const { currentUser, profile, saveProfile } = useAuth();
    const { t } = useI18n();
    const { toast } = useToast();
    const [displayName, setDisplayName] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    React.useEffect(() => {
        const nextName = profile?.displayName || currentUser?.displayName || "";
        setDisplayName(nextName);
    }, [profile?.displayName, currentUser?.displayName]);

    if (!currentUser) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                {t("profile.loginRequired")}
            </div>
        );
    }

    const currentDisplayName = profile?.displayName || currentUser.displayName || "";
    const normalizedDisplayName = displayName.trim();
    const canSave = normalizedDisplayName.length > 0 && normalizedDisplayName !== currentDisplayName;

    const handleSave = async () => {
        if (!canSave || isSaving) return;
        setIsSaving(true);
        try {
            await saveProfile({ displayName: normalizedDisplayName });
            toast({ title: t("profile.saved") });
        } catch (error: unknown) {
            toast({
                title: t("profile.saveFailed"),
                description: error instanceof Error ? error.message : t("profile.saveFailed"),
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SettingsSectionCard
            icon={<User className="w-4 h-4" />}
            title={t("profile.title")}
            description={t("profile.accountSource")}
            contentClassName="divide-y divide-border/60"
        >
            <div className="flex items-center gap-3 py-3">
                {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                        {currentDisplayName?.[0] || currentUser.email?.[0] || "?"}
                    </span>
                )}
                <span className="min-w-0 break-words text-sm font-semibold">{currentDisplayName || t("profile.defaultUser")}</span>
            </div>
            <SettingRow label={<label htmlFor="profile-display-name">{t("profile.displayName")}</label>}>
                <form className="flex min-w-0 flex-wrap justify-end gap-2" onSubmit={event => { event.preventDefault(); void handleSave(); }}>
                    <Input
                        id="profile-display-name"
                        value={displayName}
                        onChange={event => setDisplayName(event.target.value)}
                        placeholder={t("profile.displayNamePlaceholder")}
                        maxLength={60}
                        className="h-8 w-28 min-w-0 flex-auto text-sm sm:w-52"
                        aria-invalid={!normalizedDisplayName}
                        aria-describedby={!normalizedDisplayName ? "profile-name-error" : undefined}
                    />
                    <Button type="submit" size="sm" className="h-8" disabled={!canSave || isSaving}>
                        {isSaving ? t("profile.saving") : t("profile.saveChanges")}
                    </Button>
                    {!normalizedDisplayName && (
                        <p id="profile-name-error" className="basis-full text-xs text-destructive">{t("profile.displayNameRequired")}</p>
                    )}
                </form>
            </SettingRow>
            <SettingRow label={t("profile.email")}>
                <span className="block break-all text-right text-sm">{currentUser.email}</span>
            </SettingRow>
            <SettingRow label={t("profile.userId")}>
                <span className="block break-all text-right font-mono text-xs text-muted-foreground">{currentUser.uid}</span>
            </SettingRow>
        </SettingsSectionCard>
    );
}

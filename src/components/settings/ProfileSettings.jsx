import React from 'react';
import { User, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '../ui/toast';
import { PublisherFormRow } from "../dashboard/publisher/PublisherFormRow";

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
        } catch (error) {
            toast({
                title: t("profile.saveFailed"),
                description: error?.message || t("profile.saveFailed"),
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold tracking-tight text-foreground/90">{t("profile.title")}</h3>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                    {currentUser.photoURL ? (
                        <img 
                            src={currentUser.photoURL} 
                            alt={currentDisplayName} 
                            className="w-16 h-16 rounded-full border-2 border-background shadow-sm"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                            {currentDisplayName?.[0] || currentUser.email?.[0] || "?"}
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-lg">{currentDisplayName || t("profile.defaultUser")}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {currentUser.email}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4">
                     <PublisherFormRow
                        label={t("profile.displayName")}
                        className="md:grid-cols-[180px_minmax(0,1fr)]"
                     >
                        <div className="grid gap-2">
                        <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={t("profile.displayNamePlaceholder")}
                            maxLength={60}
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("profile.accountSource")}
                        </p>
                        {normalizedDisplayName.length === 0 && (
                            <p className="text-xs text-destructive">{t("profile.displayNameRequired")}</p>
                        )}
                        <div>
                            <Button onClick={handleSave} disabled={!canSave || isSaving}>
                                {isSaving ? t("profile.saving") : t("profile.saveChanges")}
                            </Button>
                        </div>
                        </div>
                    </PublisherFormRow>
                    
                    <PublisherFormRow label={t("profile.email")} className="md:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="grid gap-2 opacity-80 pointer-events-none">
                            <Input value={currentUser.email || ""} readOnly disabled />
                        </div>
                    </PublisherFormRow>

                    <PublisherFormRow label={t("profile.userId")} className="md:grid-cols-[180px_minmax(0,1fr)]">
                        <div className="grid gap-2 opacity-80 pointer-events-none">
                            <Input value={currentUser.uid} readOnly disabled className="font-mono text-xs" />
                        </div>
                    </PublisherFormRow>
                </div>
            </div>
        </div>
    );
}

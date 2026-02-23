import React from 'react';
import { User, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export function ProfileSettings() {
    const { currentUser } = useAuth();
    const { t } = useI18n();

    if (!currentUser) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                {t("profile.loginRequired")}
            </div>
        );
    }

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
                            alt={currentUser.displayName} 
                            className="w-16 h-16 rounded-full border-2 border-background shadow-sm"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                            {currentUser.displayName?.[0] || currentUser.email?.[0] || "?"}
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold text-lg">{currentUser.displayName || t("profile.defaultUser")}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {currentUser.email}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 opacity-80 pointer-events-none">
                     <div className="grid gap-2">
                        <Label>{t("profile.displayName")}</Label>
                        <Input value={currentUser.displayName || ""} readOnly disabled />
                        <p className="text-xs text-muted-foreground">{t("profile.accountSource")}</p>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>{t("profile.email")}</Label>
                        <Input value={currentUser.email || ""} readOnly disabled />
                    </div>

                    <div className="grid gap-2">
                        <Label>{t("profile.userId")}</Label>
                        <Input value={currentUser.uid} readOnly disabled className="font-mono text-xs" />
                    </div>
                </div>
            </div>
        </div>
    );
}

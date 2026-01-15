import React from 'react';
import { User, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export function ProfileSettings() {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                請先登入以查看個人資料。
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold tracking-tight text-foreground/90">個人身份 (Google Account)</h3>
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
                        <h4 className="font-semibold text-lg">{currentUser.displayName || "使用者"}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {currentUser.email}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 opacity-80 pointer-events-none">
                     <div className="grid gap-2">
                        <Label>顯示名稱 (Display Name)</Label>
                        <Input value={currentUser.displayName || ""} readOnly disabled />
                        <p className="text-xs text-muted-foreground">目前直接使用您的 Google 帳戶設定。</p>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label>電子郵件 (Email)</Label>
                        <Input value={currentUser.email || ""} readOnly disabled />
                    </div>

                    <div className="grid gap-2">
                        <Label>使用者 ID (UID)</Label>
                        <Input value={currentUser.uid} readOnly disabled className="font-mono text-xs" />
                    </div>
                </div>
            </div>
        </div>
    );
}

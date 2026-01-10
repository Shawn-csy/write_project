import React from 'react';
import { Button } from "../ui/button";
import { Globe, BookOpen, PenTool } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function WelcomeLanding({ onBrowsePublic, onLoginRequest }) {
    const { login } = useAuth();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px] pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight lg:text-6xl text-foreground">
                        Screenplay Reader
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                        專為劇本創作設計的閱讀與寫作平台。<br />
                        支援 Fountain 語法，即時預覽，隨時隨地捕捉靈感。
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md mx-auto pt-4">
                    <Button 
                        size="lg" 
                        className="w-full text-lg h-12 shadow-md hover:shadow-lg transition-all"
                        onClick={onBrowsePublic}
                    >
                        <Globe className="w-5 h-5 mr-2" />
                        瀏覽公開劇本
                    </Button>
                    
                    <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full text-lg h-12 border-primary/20 hover:bg-primary/5"
                        onClick={() => {
                            if (onLoginRequest) onLoginRequest();
                            else login();
                        }}
                    >
                        <PenTool className="w-5 h-5 mr-2" />
                        登入開始創作
                    </Button>
                </div>
                
                <div className="pt-8 grid grid-cols-3 gap-8 text-center text-sm text-muted-foreground/60 w-full max-w-lg mx-auto">
                    <div className="flex flex-col items-center gap-2">
                        <BookOpen className="w-6 h-6 opacity-50" />
                        <span>流暢閱讀體驗</span>
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <PenTool className="w-6 h-6 opacity-50" />
                        <span>Fountain 編輯</span>
                    </div>
                     <div className="flex flex-col items-center gap-2">
                        <Globe className="w-6 h-6 opacity-50" />
                        <span>社群分享</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

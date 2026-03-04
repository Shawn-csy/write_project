import React from "react";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { useNavigate } from "react-router-dom";
import { BookOpen, Mail, MessageSquare, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useI18n } from "../contexts/I18nContext";

export default function PublicAboutPage() {
    const { t } = useI18n();
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <PublicTopBar
                title={t("publicAbout.topbarTitle")}
                showBack={true}
                onBack={() => navigate("/")}
            />
            
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
                <div className="flex flex-col items-center text-center space-y-4 mb-10">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-primary/20">
                        <BookOpen className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">
                        {t("publicAbout.title")}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-xl">
                        {t("publicAbout.subtitle")}
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Intro Card */}
                    <Card id="guide">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Heart className="w-5 h-5 text-primary" />
                                {t("publicAbout.visionTitle")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-muted-foreground leading-relaxed text-sm sm:text-base">
                            <p>
                                {t("publicAbout.visionBody")}
                            </p>
                            <ul className="list-disc pl-5 space-y-2 mt-4 text-foreground/90">
                                <li><strong>{t("publicAbout.featureReadTitle")}</strong>：{t("publicAbout.featureReadBody")}</li>
                                <li><strong>{t("publicAbout.featureProfileTitle")}</strong>：{t("publicAbout.featureProfileBody")}</li>
                                <li><strong>{t("publicAbout.featureStudioTitle")}</strong>：{t("publicAbout.featureStudioBody")}</li>
                                <li><strong>{t("publicAbout.featureEditorTitle")}</strong>：{t("publicAbout.featureEditorBody")}</li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Contact Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                {t("publicAbout.contactTitle")}
                            </CardTitle>
                            <CardDescription className="text-sm">
                                {t("publicAbout.contactDesc")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a href="mailto:silence0603@gmail.com" className="flex-1 flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group">
                                    <div className="bg-primary/10 p-2.5 rounded-lg group-hover:scale-110 transition-transform">
                                        <Mail className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground text-sm">{t("publicAbout.emailLabel")}</div>
                                        <div className="text-sm text-muted-foreground mt-0.5">silence0603@gmail.com</div>
                                    </div>
                                </a>
                                <a href="https://discordapp.com/users/booostman1" target="_blank" rel="noreferrer" className="flex-1 flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group">
                                    <div className="bg-[#5865F2]/10 p-2.5 rounded-lg group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5 text-[#5865F2] fill-current" viewBox="0 0 127.14 96.36">
                                            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-23.28-3.28-47.54-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-foreground text-sm">{t("publicAbout.discordLabel")}</div>
                                        <div className="text-sm text-muted-foreground mt-0.5">booostman1</div>
                                    </div>
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="mt-12 text-center">
                    <Button onClick={() => navigate("/")} size="lg" className="rounded-full px-8">
                        {t("publicAbout.back")}
                    </Button>
                </div>
            </main>
        </div>
    );
}

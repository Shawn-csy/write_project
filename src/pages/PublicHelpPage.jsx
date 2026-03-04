import React from "react";
import { useNavigate } from "react-router-dom";
import { CircleHelp, UploadCloud, LayoutTemplate } from "lucide-react";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useI18n } from "../contexts/I18nContext";

export default function PublicHelpPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar
        title={t("publicHelp.topbarTitle")}
        showBack={true}
        onBack={() => navigate("/")}
      />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="flex flex-col items-center text-center space-y-4 mb-10">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-primary/20">
            <CircleHelp className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">{t("publicHelp.title")}</h1>
          <p className="text-lg text-muted-foreground max-w-xl">{t("publicHelp.subtitle")}</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UploadCloud className="w-5 h-5 text-primary" />
                {t("publicHelp.publishFlowTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm sm:text-base">
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>{t("publicHelp.publishStep1")}</li>
                <li>{t("publicHelp.publishStep2")}</li>
                <li>{t("publicHelp.publishStep3")}</li>
                <li>{t("publicHelp.publishStep4")}</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                {t("publicHelp.layoutTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm sm:text-base text-muted-foreground">
              <p>{t("publicHelp.layoutDesc")}</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>{t("publicHelp.layoutItemHeader")}</li>
                <li>{t("publicHelp.layoutItemInfo")}</li>
                <li>{t("publicHelp.layoutItemContent")}</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button onClick={() => navigate("/")} size="lg" className="rounded-full px-8">
            {t("publicHelp.back")}
          </Button>
        </div>
      </main>
    </div>
  );
}

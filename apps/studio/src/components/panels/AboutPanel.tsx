import React from "react";
import { Github, Mail, MessageCircle, X } from "lucide-react";
import { useI18n } from "../../contexts/I18nContext";

interface AboutPanelProps {
  onClose: () => void;
}

function AboutPanel({ onClose }: AboutPanelProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm" aria-labelledby="about-panel-title">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
        <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={t("common.close")}>
          <X className="h-4 w-4" />
        </button>
        <h2 id="about-panel-title" className="text-base font-semibold">{t("aboutPanel.title")}</h2>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7">
        <div className="mx-auto max-w-4xl space-y-6 pb-8">
          <p className="text-base leading-relaxed text-muted-foreground">{t("aboutPanel.intro")}</p>

          <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <h3 className="mb-2 font-semibold">{t("aboutPanel.coreFeatures")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["feature1", "feature2", "feature3"].map((key) => (
                <li key={key} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" /><span>{t(`aboutPanel.${key}`)}</span></li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <h3 className="mb-2 font-semibold">{t("aboutPanel.highlights")}</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {["highlight1", "highlight2", "highlight3", "highlight4"].map((key) => <li key={key}>{t(`aboutPanel.${key}`)}</li>)}
            </ul>
          </section>

          <section className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <h3 className="font-semibold">{t("aboutPanel.developerTitle")}</h3>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {["developerBody1", "developerBody2", "developerBody3", "developerBody4"].map((key) => <p key={key}>{t(`aboutPanel.${key}`)}</p>)}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("aboutPanel.connect")}</h3>
            <nav aria-label={t("aboutPanel.connect")} className="grid gap-3 sm:grid-cols-3">
              <a href="https://discordapp.com/users/booostman1" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"><MessageCircle className="h-4 w-4" />Discord</a>
              <a href="https://github.com/Shawn-csy/write_project" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"><Github className="h-4 w-4" />GitHub</a>
              <a href="mailto:silence0603@gmail.com" className="flex items-center justify-center gap-2 rounded-md border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"><Mail className="h-4 w-4" />Email</a>
            </nav>
          </section>

          <p className="text-xs leading-5 text-muted-foreground">
            {t("aboutPanel.licensePrefix")} <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">CC BY 4.0</a>{t("aboutPanel.licenseSuffix")} {t("aboutPanel.licenseNote")}
          </p>
        </div>
      </main>
    </section>
  );
}

export default AboutPanel;

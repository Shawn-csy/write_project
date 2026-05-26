interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
}

interface Props {
  t: (key: string, fallback?: string) => string;
  profileProgress: number;
  profileDone: number;
  profileChecklistLength: number;
  profileNextSteps: ChecklistItem[];
  missingRequiredFields: ChecklistItem[];
  suggestedFields: ChecklistItem[];
  jumpToRequiredField: (key: string) => void;
}

export function PersonaProfileChecklist({
  t, profileProgress, profileDone, profileChecklistLength,
  profileNextSteps, missingRequiredFields, suggestedFields, jumpToRequiredField,
}: Props) {
  if (profileProgress >= 100) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{t("publisherProfileTab.progress")}</span>
        <span className="text-muted-foreground">{profileDone}/{profileChecklistLength} · {profileProgress}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileProgress}%` }} />
      </div>
      {profileNextSteps.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {t("publisherProfileTab.nextSteps").replace("{items}", profileNextSteps.map(i => i.label).join("、"))}
        </div>
      )}
      {missingRequiredFields.length > 0 && (
        <div className="pt-1">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            {t("publisherProfileTab.missingRequiredFields", "缺少必填欄位")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingRequiredFields.map(field => (
              <button
                key={`missing-required-${field.key}`}
                type="button"
                onClick={() => jumpToRequiredField(field.key)}
                className="rounded-full border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.14)]"
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {suggestedFields.length > 0 && (
        <div className="pt-1">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            {t("publisherProfileTab.suggestedFields", "建議填寫")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedFields.map(field => (
              <button
                key={`suggested-field-${field.key}`}
                type="button"
                onClick={() => jumpToRequiredField(field.key)}
                className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

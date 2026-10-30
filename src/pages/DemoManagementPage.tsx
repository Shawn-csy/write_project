import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ExternalLink, Loader2, Mic2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { StudioPage, StudioPageHeader } from "../components/studio/StudioPage";
import { useI18n } from "../contexts/I18nContext";
import { getPublicBundle } from "../lib/api/public";
import { getPersonas } from "../lib/api/personas";
import { createMyDemoSubmission, deleteMyDemoSubmission, getMyDemoSubmissions, updateMyDemoSubmission } from "../lib/api/demoSubmissions";
import type { BaseScriptApi, ExternalPublicScript, PersonaLike, PublicDemoSubmissionRecord, StudioDemoSubmissionPayload } from "../types/api";

type DemoForm = {
  scriptKey: string;
  voiceActorPersonaId: string;
  demoName: string;
  demoUrl: string;
  coverUrl: string;
  cast: string;
  voiceTypes: Array<"male" | "female">;
  description: string;
};

const emptyForm: DemoForm = {
  scriptKey: "", voiceActorPersonaId: "",
  demoName: "", demoUrl: "", coverUrl: "", cast: "", voiceTypes: [], description: "",
};

const isVoiceActor = (persona: PersonaLike) => (persona.tags || []).some((tag) =>
  ["聲演", "配音", "voice actor", "voice-actor", "voiceactor"].includes(String(tag).trim().toLocaleLowerCase()),
);

export default function DemoManagementPage(): React.JSX.Element {
  const { t } = useI18n();
  const [personas, setPersonas] = useState<PersonaLike[]>([]);
  const [scripts, setScripts] = useState<BaseScriptApi[]>([]);
  const [externalScripts, setExternalScripts] = useState<ExternalPublicScript[]>([]);
  const [items, setItems] = useState<PublicDemoSubmissionRecord[]>([]);
  const [form, setForm] = useState<DemoForm>(emptyForm);
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [scriptSearch, setScriptSearch] = useState("");
  const [isScriptPickerOpen, setIsScriptPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [identityList, bundle, submissionList] = await Promise.all([getPersonas(), getPublicBundle(), getMyDemoSubmissions()]);
      setPersonas(identityList);
      setScripts(bundle.scripts || []);
      setExternalScripts(bundle.externalPublicScripts || []);
      setItems(submissionList.items || []);
      setForm((current) => ({
        ...current,
        voiceActorPersonaId: current.voiceActorPersonaId || identityList.find(isVoiceActor)?.id || "",
        scriptKey: current.scriptKey || (bundle.scripts?.[0]?.id ? `internal:${bundle.scripts[0].id}` : bundle.externalPublicScripts?.[0]?.id ? `external:${bundle.externalPublicScripts[0].id}` : ""),
      }));
    } catch (loadError) {
      setError(String(loadError instanceof Error ? loadError.message : loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const voiceActors = useMemo(() => personas.filter(isVoiceActor), [personas]);
  const scriptOptions = useMemo(() => [
    ...scripts.map((script) => ({ key: `internal:${script.id}`, scriptType: "internal" as const, scriptId: script.id, title: String(script.title || "") })),
    ...externalScripts.map((script) => ({ key: `external:${script.id}`, scriptType: "external" as const, externalScriptId: script.id, title: String(script.titleOverride || script.remoteTitle || script.title || "") })),
  ], [scripts, externalScripts]);
  const selectedScript = scriptOptions.find((script) => script.key === form.scriptKey);
  const matchingScripts = useMemo(() => {
    const query = scriptSearch.trim().toLocaleLowerCase();
    return (query ? scriptOptions.filter((script) => script.title.toLocaleLowerCase().includes(query)) : scriptOptions).slice(0, 100);
  }, [scriptOptions, scriptSearch]);
  const selectedScriptTitle = (item: PublicDemoSubmissionRecord) => item.scriptTitle || item.scriptUrl;

  const resetForm = () => {
    setEditingId(null);
    setScriptSearch("");
    setIsScriptPickerOpen(false);
    setForm({ ...emptyForm, voiceActorPersonaId: voiceActors[0]?.id || "", scriptKey: scriptOptions[0]?.key || "" });
  };

  const beginEdit = (item: PublicDemoSubmissionRecord) => {
    setIsFormOpen(true);
    setEditingId(item.id);
    setForm({
      ...emptyForm,
      scriptKey: item.scriptType === "internal" ? `internal:${item.scriptId || ""}` : `external:${item.externalScriptId || ""}`,
      voiceActorPersonaId: item.voiceActorPersonaId || item.voiceActorIds?.[0] || "",
      demoName: item.demoName || "", demoUrl: item.demoUrl, coverUrl: item.coverUrl || "",
      cast: item.cast || "", voiceTypes: item.voiceTypes || [], description: item.description || "",
    });
    setScriptSearch("");
    setIsScriptPickerOpen(false);
    setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.voiceActorPersonaId || (!editingId && !selectedScript)) return;
    setIsSaving(true);
    setError("");
    const details = {
      demoName: form.demoName, demoUrl: form.demoUrl, coverUrl: form.coverUrl,
      cast: form.cast, voiceTypes: form.voiceTypes, description: form.description,
    };
    try {
      if (editingId) {
        const updated = await updateMyDemoSubmission(editingId, details);
        setItems((current) => current.map((item) => item.id === editingId ? updated : item));
      } else {
        const payload: StudioDemoSubmissionPayload = {
          ...details,
          scriptType: selectedScript!.scriptType,
          ...(selectedScript!.scriptType === "internal" && "scriptId" in selectedScript! ? { scriptId: selectedScript!.scriptId } : {}),
          ...(selectedScript!.scriptType === "external" && "externalScriptId" in selectedScript! ? { externalScriptId: selectedScript!.externalScriptId } : {}),
          voiceActorPersonaId: form.voiceActorPersonaId,
        };
        const created = await createMyDemoSubmission(payload);
        setItems((current) => [created, ...current]);
      }
      resetForm();
      setIsFormOpen(false);
    } catch (saveError) {
      setError(String(saveError instanceof Error ? saveError.message : saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (item: PublicDemoSubmissionRecord) => {
    if (!window.confirm(t("demoManagement.confirmDelete"))) return;
    setBusyId(item.id);
    setError("");
    try {
      await deleteMyDemoSubmission(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
    } catch (removeError) {
      setError(String(removeError instanceof Error ? removeError.message : removeError));
    } finally {
      setBusyId(null);
    }
  };

  const toggleVoiceType = (voiceType: "male" | "female") => setForm((current) => ({
    ...current,
    voiceTypes: current.voiceTypes.includes(voiceType) ? current.voiceTypes.filter((value) => value !== voiceType) : [...current.voiceTypes, voiceType],
  }));

  return (
    <StudioPage width="wide">
      <StudioPageHeader title={t("demoManagement.title")} description={t("demoManagement.description")} actions={(
        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => void load()} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}{t("demoManagement.refresh")}
        </Button>
      )} />

      {error && <div role="alert" className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      {voiceActors.length === 0 && <div className="mb-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{t("demoManagement.noVoiceActor")}</div>}

      <div className="space-y-4">
        <section className="min-w-0 space-y-2" aria-label={t("demoManagement.listTitle")}>
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">{t("demoManagement.listTitle")}</h2><span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span></div>
          {isLoading ? <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{t("demoManagement.loading")}</div>
            : items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><Mic2 className="mx-auto mb-2 h-5 w-5" />{t("demoManagement.empty")}</div>
              : items.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-start">
                {item.coverUrl && <img src={item.coverUrl} alt="" className="h-16 w-24 shrink-0 rounded-md border object-cover" loading="lazy" referrerPolicy="no-referrer" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold">{item.demoName || selectedScriptTitle(item)}</h3><span className="rounded-full border border-emerald-700/30 bg-emerald-700/10 px-2 py-0.5 text-[11px] text-emerald-700">{t("demoManagement.published")}</span></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{selectedScriptTitle(item)} · {item.voiceActorPersonaId ? personas.find((persona) => persona.id === item.voiceActorPersonaId)?.displayName || item.displayName : item.displayName}</p>
                  {item.description && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{item.description}</p>}
                  <a href={item.demoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">{t("demoManagement.openDemo")}<ExternalLink className="h-3 w-3" /></a>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                  <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => beginEdit(item)}><Pencil className="mr-1.5 h-3.5 w-3.5" />{t("demoManagement.edit")}</Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t("demoManagement.delete")} disabled={busyId === item.id} onClick={() => void remove(item)}>{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button>
                </div>
              </article>)}
        </section>

        <section className="overflow-visible rounded-xl border border-border bg-card">
          <button
            type="button"
            aria-expanded={isFormOpen}
            onClick={() => setIsFormOpen((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
          >
            <span className="text-sm font-semibold">{editingId ? t("demoManagement.edit") : t("demoManagement.new")}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isFormOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {isFormOpen && (
            <form onSubmit={save} className="space-y-3 border-t border-border px-4 py-4">
              {editingId && <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => { resetForm(); setIsFormOpen(false); }}>{t("common.cancel")}</Button></div>}
              <label className="block space-y-1"><span className="text-xs font-medium">{t("demoManagement.voiceActor")}</span>
                <select required value={form.voiceActorPersonaId} onChange={(event) => setForm((current) => ({ ...current, voiceActorPersonaId: event.target.value }))} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" disabled={Boolean(editingId)}>
                  <option value="">{t("demoManagement.selectVoiceActor")}</option>
                  {voiceActors.map((persona) => <option key={persona.id} value={persona.id}>{persona.displayName}</option>)}
                </select>
              </label>
              {!editingId && <label className="block space-y-1">
                <span className="text-xs font-medium">{t("demoManagement.script")}</span>
                <div
                  className="relative"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsScriptPickerOpen(false);
                  }}
                >
                  <Input
                    required={!selectedScript}
                    role="combobox"
                    aria-expanded={isScriptPickerOpen}
                    aria-controls="demo-script-options"
                    aria-autocomplete="list"
                    autoComplete="off"
                    className="h-9"
                    value={isScriptPickerOpen ? scriptSearch : selectedScript?.title || scriptSearch}
                    placeholder={t("demoManagement.searchScripts")}
                    onFocus={() => { setScriptSearch(""); setIsScriptPickerOpen(true); }}
                    onChange={(event) => {
                      setScriptSearch(event.target.value);
                      setForm((current) => ({ ...current, scriptKey: "" }));
                      setIsScriptPickerOpen(true);
                    }}
                  />
                  {isScriptPickerOpen && (
                    <div id="demo-script-options" role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
                      {matchingScripts.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">{t("demoManagement.noMatchingScripts")}</p>
                      ) : matchingScripts.map((script) => (
                        <button
                          key={script.key}
                          type="button"
                          role="option"
                          aria-selected={form.scriptKey === script.key}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setForm((current) => ({ ...current, scriptKey: script.key }));
                            setScriptSearch("");
                            setIsScriptPickerOpen(false);
                          }}
                          className="flex min-h-9 w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent"
                        >
                          <span className="truncate">{script.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>}
              <label className="block space-y-1"><span className="text-xs font-medium">{t("demoManagement.demoName")}</span><Input className="h-9" value={form.demoName} onChange={(event) => setForm((current) => ({ ...current, demoName: event.target.value }))} placeholder={t("demoManagement.demoNamePlaceholder")} /></label>
              <label className="block space-y-1"><span className="text-xs font-medium">{t("demoManagement.demoUrl")}</span><Input required type="url" className="h-9" value={form.demoUrl} onChange={(event) => setForm((current) => ({ ...current, demoUrl: event.target.value }))} placeholder="https://" /></label>
              <label className="block space-y-1"><span className="text-xs font-medium">{t("demoManagement.coverUrl")}</span><Input type="url" className="h-9" value={form.coverUrl} onChange={(event) => setForm((current) => ({ ...current, coverUrl: event.target.value }))} placeholder="https://" /></label>
              <label className="block space-y-1"><span className="text-xs font-medium">{t("demoManagement.cast")}</span><Input className="h-9" value={form.cast} onChange={(event) => setForm((current) => ({ ...current, cast: event.target.value }))} /></label>
              <fieldset className="space-y-1"><legend className="text-xs font-medium">{t("demoManagement.voiceTypes")}</legend><div className="flex gap-2">
                {(["male", "female"] as const).map((voiceType) => <button key={voiceType} type="button" aria-pressed={form.voiceTypes.includes(voiceType)} onClick={() => toggleVoiceType(voiceType)} className={`h-8 rounded-md border px-3 text-xs ${form.voiceTypes.includes(voiceType) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>{voiceType === "male" ? t("demoManagement.maleVoice") : t("demoManagement.femaleVoice")}</button>)}
              </div></fieldset>
              <label className="block space-y-1"><span className="text-xs font-medium">{t("demoManagement.descriptionLabel")}</span><Textarea className="min-h-[72px] resize-y" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="submit" size="sm" className="h-8" disabled={isSaving || voiceActors.length === 0 || (!editingId && (!selectedScript || scriptOptions.length === 0))}>
                  {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : editingId ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}{editingId ? t("demoManagement.save") : t("demoManagement.publish")}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </StudioPage>
  );
}

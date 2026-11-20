import { useId, useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  PRODUCTION_MARKER_TARGETS,
  loadProductionMarkerMapping,
  type ProductionMarkerMapping,
  type ProductionMarkerTarget,
} from "../../lib/productionScriptExport";
import { defaultMarkerConfigs, normalizeMarkerConfigsSchema, type MarkerConfig } from "@write/script-engine";

interface Props {
  t: (key: string) => string;
  markerConfigs?: MarkerConfig[];
  onClose: () => void;
  onExport: (mapping: ProductionMarkerMapping) => Promise<void>;
}

export function ProductionScriptExportDialog({ t, markerConfigs = defaultMarkerConfigs, onClose, onExport }: Props) {
  const formId = useId();
  const rules = normalizeMarkerConfigsSchema(markerConfigs)
    .filter((rule) => rule.id && rule.matchMode !== "virtual" && (rule.start || rule.regex));
  const [mapping, setMapping] = useState<ProductionMarkerMapping>(() => loadProductionMarkerMapping(markerConfigs));
  const [isExporting, setIsExporting] = useState(false);
  const [hasError, setHasError] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isExporting) return;
    setIsExporting(true);
    setHasError(false);
    try {
      await onExport(mapping);
      onClose();
    } catch {
      setHasError(true);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isExporting) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg">
        <DialogHeader>
          <DialogTitle id={formId}>{t("productionExport.title")}</DialogTitle>
          <DialogDescription>{t("productionExport.description")}</DialogDescription>
        </DialogHeader>
        <form aria-labelledby={formId} className="grid min-h-0 gap-4" onSubmit={submit}>
          <div className="grid max-h-[50dvh] gap-3 overflow-y-auto p-1">
            {rules.map((rule, index) => {
              const inputId = `${formId}-${index}`;
              const marker = [rule.start, rule.pause, rule.end].filter(Boolean).join(" … ") || rule.regex;
              return (
                <div key={rule.id} className="grid gap-1">
                  <label htmlFor={inputId} className="break-words text-sm font-medium">
                    {rule.label || rule.id} <code className="text-muted-foreground">{marker}</code>
                  </label>
                  <select
                    id={inputId}
                    name={rule.id}
                    value={mapping[rule.id] ?? ""}
                    disabled={isExporting}
                    className="min-h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => {
                      const target = event.target.value as ProductionMarkerTarget | "";
                      setMapping((previous) => {
                        const next = { ...previous };
                        delete next[rule.id];
                        return target ? { ...next, [rule.id]: target } : next;
                      });
                    }}
                  >
                    <option value="">{t("productionExport.auto")}</option>
                    {PRODUCTION_MARKER_TARGETS.map((target) => (
                      <option key={target} value={target}>{t(`productionExport.${target}`)}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          {hasError && <p role="alert" className="text-sm text-destructive">{t("productionExport.error")}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isExporting} onClick={onClose}>
              {t("productionExport.cancel")}
            </Button>
            <Button type="submit" disabled={isExporting}>
              {t(isExporting ? "productionExport.exporting" : "productionExport.download")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

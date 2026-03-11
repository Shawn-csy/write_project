import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

export function ScriptMetadataDemoSection({
  sectionId = "metadata-section-demo",
  showTitle = true,
  getRowLabelClass,
  activityDemoLinks,
  onAddActivityDemoLink,
  onUpdateActivityDemoLink,
  onRemoveActivityDemoLink,
}) {
  return (
    <section id={sectionId || undefined} className="space-y-3 scroll-mt-24">
      {showTitle && <h3 className="text-base font-semibold">試聽範例</h3>}
      <div className="rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] md:divide-x">
          <div className={getRowLabelClass("recommended")}>
            <div className="text-sm font-medium text-foreground">試聽項目</div>
            <div className="mt-1 text-xs text-muted-foreground">可新增多筆，包含名稱、連結、聲演與說明</div>
          </div>
          <div className="space-y-3 p-4">
            {(activityDemoLinks || []).map((link, idx) => (
              <div key={link.id || `demo-${idx + 1}`} className="space-y-2 rounded-md border border-border/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">試聽 #{idx + 1}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onRemoveActivityDemoLink(idx)}
                    aria-label={`remove-demo-link-${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    value={link.name || ""}
                    onChange={(e) => onUpdateActivityDemoLink(idx, "name", e.target.value)}
                    placeholder="名稱（例如：第一集試聽）"
                  />
                  <Input
                    value={link.cast || ""}
                    onChange={(e) => onUpdateActivityDemoLink(idx, "cast", e.target.value)}
                    placeholder="聲演"
                  />
                </div>
                <Input
                  value={link.url || ""}
                  onChange={(e) => onUpdateActivityDemoLink(idx, "url", e.target.value)}
                  placeholder="連結（https://...）"
                />
                <Textarea
                  value={link.description || ""}
                  onChange={(e) => onUpdateActivityDemoLink(idx, "description", e.target.value)}
                  placeholder="說明"
                  className="min-h-[80px]"
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddActivityDemoLink}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              新增試聽範例
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

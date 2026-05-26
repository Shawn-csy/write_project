import React from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { X, Plus } from "lucide-react";
import { useI18n } from "../../../contexts/I18nContext";

interface TagOption {
  id?: string | number;
  name?: string;
  color?: string;
}

interface Props {
  currentTags: TagOption[];
  availableTags: TagOption[];
  newTagInput: string;
  setNewTagInput: (value: string) => void;
  handleAddTag: (tagName?: string) => void;
  handleAddTagsBatch?: (tags: string[]) => void;
  handleRemoveTag: (tagId: string | number) => void;
  handleClearTags: () => void;
  recommendedErrors?: Record<string, string | boolean | undefined>;
  className?: string;
}

const MANAGED_TAGS = new Set(["男性向", "女性向", "全性向", "一般", "一般內容", "r-18", "r18", "18+", "全年齡向", "成人向"]);

function resolveTagSwatch(rawColor: string | undefined) {
  const value = String(rawColor || "").trim();
  if (!value) return { className: "bg-primary/60", style: undefined };
  if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl") || value.startsWith("var("))
    return { className: "", style: { backgroundColor: value } };
  return { className: value, style: undefined };
}

function parsePastedTags(text: string): string[] {
  return String(text || "").split(/,|，|、|#|\n|\t|;/).map(item => item.trim()).filter(Boolean);
}

export function MetadataTagsCard({ currentTags, availableTags, newTagInput, setNewTagInput, handleAddTag, handleAddTagsBatch, handleRemoveTag, handleClearTags, recommendedErrors = {}, className = "" }: Props) {
  const { t } = useI18n();

  const handleTagPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData?.getData("text") || "";
    const parsed = parsePastedTags(text);
    if (parsed.length <= 1) return;
    event.preventDefault();
    handleAddTagsBatch?.(parsed);
  };

  return (
    <div className={`grid gap-2 rounded-xl border border-border/70 bg-background p-4 shadow-sm h-fit ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium" htmlFor="metadata-new-tag">{t("metadataDetails.tags", "標籤")}</label>
        {currentTags.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={handleClearTags}>
            {t("metadataDetails.clearAll", "清除全部")}
          </Button>
        )}
      </div>
      {recommendedErrors.tags && <p className="text-xs text-[color:var(--license-term-fg)]">{t("metadataDetails.tagsTip")}</p>}

      <div className="flex flex-col gap-3 mt-1">
        <Input
          id="metadata-new-tag"
          name="metadataNewTag"
          aria-label="新增標籤"
          value={newTagInput}
          onChange={e => setNewTagInput(e.target.value)}
          onPaste={handleTagPaste}
          placeholder={t("metadataDetails.tagInputPlaceholder", "搜尋或輸入新標籤...")}
          onKeyDown={e => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
          }}
          className="h-9"
        />
        <div className="max-h-48 overflow-y-auto border rounded-md bg-background flex flex-wrap gap-1.5 p-2">
          {availableTags
            .filter(tag => String(tag.name || "").toLowerCase().includes(newTagInput.toLowerCase()))
            .filter(tag => !currentTags.some(ct => ct.id === tag.id))
            .map(tag => (
              <button key={tag.id} type="button" className="px-2.5 py-1 text-xs rounded-full border bg-muted/30 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center" onClick={e => { e.preventDefault(); handleAddTag(tag.name || ""); }}>
                <Plus className="w-3 h-3 mr-1 opacity-60" /> {tag.name}
              </button>
            ))}
          {newTagInput.trim() && !availableTags.find(tag => String(tag.name || "").toLowerCase() === newTagInput.trim().toLowerCase()) && !currentTags.find(tag => String(tag.name || "").toLowerCase() === newTagInput.trim().toLowerCase()) && (
            <button type="button" className="px-2.5 py-1 text-xs rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors flex items-center" onClick={e => { e.preventDefault(); handleAddTag(newTagInput); }}>
              <Plus className="w-3 h-3 mr-1" /> {t("metadataDetails.addQuoted", `新增 "${newTagInput.trim()}"`).replace("{value}", newTagInput.trim())}
            </button>
          )}
          {availableTags.filter(tag => !currentTags.some(ct => ct.id === tag.id)).length === 0 && !newTagInput.trim() && (
            <div className="text-xs text-muted-foreground w-full text-center py-2 opacity-70">{t("metadataDetails.noTags", "無可用標籤")}</div>
          )}
        </div>
      </div>

      {currentTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 p-3 bg-background border rounded-md">
          {currentTags.map(tag => {
            const tagName = String(tag.name || "");
            const isManagedOption = MANAGED_TAGS.has(tagName);
            const swatch = resolveTagSwatch(tag.color);
            return (
              <Badge key={tag.id} variant="outline" className="flex items-center gap-1 border-[color:var(--license-filter-border)] bg-[color:var(--license-filter-bg)] py-1 pl-2.5 pr-1.5 text-[color:var(--license-filter-fg)]">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${swatch.className}`} style={swatch.style} />
                <span>{tagName}</span>
                {!isManagedOption && (
                  <button type="button" className="ml-1.5 hover:bg-black/20 dark:hover:bg-white/20 rounded-full p-0.5 transition-colors focus:outline-none flex items-center justify-center" onClick={() => { if (tag.id !== undefined) handleRemoveTag(tag.id); }} title={t("common.remove", "移除")}>
                    <X className="w-3 h-3 opacity-70 hover:opacity-100" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

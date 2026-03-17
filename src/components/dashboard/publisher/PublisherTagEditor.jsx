import React from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { X } from "lucide-react";

export function PublisherTagEditor({
  tags = [],
  setTags,
  tagInput,
  setTagInput,
  parseTags,
  addTags,
  getTagStyle,
  filteredOptions = [],
  inputId,
  inputName,
  inputAriaLabel,
  addTagLabel,
  inputPlaceholder,
  addQuotedTemplate,
  noMatchedTagLabel,
  emptyHintLabel,
}) {
  const handleTagPaste = (event) => {
    const text = event.clipboardData?.getData("text") || "";
    const incoming = parseTags(text);
    if (incoming.length <= 1) return;
    event.preventDefault();
    setTags(addTags(tags || [], incoming));
    setTagInput("");
  };

  const handleAddFromInput = () => {
    const incoming = parseTags(tagInput);
    if (incoming.length === 0) return;
    setTags(addTags(tags || [], incoming));
    setTagInput("");
  };

  return (
    <div className="border rounded-md p-3 bg-muted/10 space-y-2">
      <div className="flex gap-2">
        <Input
          id={inputId}
          name={inputName}
          aria-label={inputAriaLabel}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onPaste={handleTagPaste}
          onKeyDown={(e) => {
            if (e.nativeEvent?.isComposing) return;
            if (e.key === "Enter" || e.key === "," || e.key === "，") {
              e.preventDefault();
              handleAddFromInput();
            }
          }}
          placeholder={inputPlaceholder}
          className="h-8"
        />
        <Button type="button" variant="secondary" size="sm" onClick={handleAddFromInput}>
          {addTagLabel}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(tags || []).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="flex items-center gap-1 py-1 pl-2.5 pr-1.5"
            style={getTagStyle(tag)}
          >
            <span>{tag}</span>
            <button
              type="button"
              className="ml-1.5 rounded-full p-0.5 hover:bg-foreground/15"
              onClick={() => setTags((tags || []).filter((item) => item !== tag))}
              aria-label={`remove-${tag}`}
            >
              <X className="h-3 w-3 opacity-70" />
            </button>
          </Badge>
        ))}
        {(tags || []).length === 0 ? (
          <span className="text-sm text-muted-foreground">{emptyHintLabel}</span>
        ) : null}
      </div>

      <div className="max-h-44 overflow-y-auto rounded-md border border-border/60 bg-background/70 p-1">
        {tagInput.trim() && (
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent"
            onClick={handleAddFromInput}
          >
            {addQuotedTemplate.replace("{value}", tagInput.trim())}
          </button>
        )}
        {filteredOptions.map((name) => {
          const selected = (tags || []).includes(name);
          return (
            <button
              key={name}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded hover:bg-accent ${
                selected ? "bg-accent/50" : ""
              }`}
              onClick={() => {
                if (selected) {
                  setTags((tags || []).filter((item) => item !== name));
                } else {
                  setTags(addTags(tags || [], [name]));
                }
                setTagInput("");
              }}
            >
              <span className="truncate">{name}</span>
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: getTagStyle(name)?.backgroundColor || "#CBD5E1" }}
              />
            </button>
          );
        })}
        {tagInput.trim() && filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">{noMatchedTagLabel}</div>
        ) : null}
      </div>
    </div>
  );
}

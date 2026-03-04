import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { SortableTag } from "./SortableTag";

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
  const [tagOpen, setTagOpen] = React.useState(false);

  const handleTagPaste = (event) => {
    const text = event.clipboardData?.getData("text") || "";
    const incoming = parseTags(text);
    if (incoming.length <= 1) return;
    event.preventDefault();
    setTags(addTags(tags || [], incoming));
    setTagInput("");
  };

  return (
    <div className="border rounded-md p-3 bg-muted/10 space-y-2">
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          const items = tags || [];
          const oldIndex = items.indexOf(active.id);
          const newIndex = items.indexOf(over.id);
          setTags(arrayMove(items, oldIndex, newIndex));
        }}
      >
        <SortableContext items={tags || []} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2">
            {(tags || []).map((tag) => (
              <SortableTag
                key={tag}
                id={tag}
                style={getTagStyle(tag)}
                onRemove={() => {
                  setTags((tags || []).filter((item) => item !== tag));
                }}
              />
            ))}
            {(tags || []).length === 0 && <span className="text-sm text-muted-foreground">{emptyHintLabel}</span>}
          </div>
        </SortableContext>
      </DndContext>

      <Popover open={tagOpen} onOpenChange={setTagOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-fit">
            {addTagLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[90vw] sm:w-80 p-2" align="start">
          <div className="p-2">
            <Input
              id={inputId}
              name={inputName}
              aria-label={inputAriaLabel}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onPaste={handleTagPaste}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === "，") {
                  e.preventDefault();
                  const incoming = parseTags(tagInput);
                  if (incoming.length === 0) return;
                  setTags(addTags(tags || [], incoming));
                  setTagInput("");
                  setTagOpen(false);
                }
              }}
              placeholder={inputPlaceholder}
              className="h-8"
            />
          </div>
          <div className="max-h-56 overflow-y-auto px-1 pb-1">
            {tagInput.trim() && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent"
                onClick={() => {
                  const incoming = parseTags(tagInput);
                  if (incoming.length === 0) return;
                  setTags(addTags(tags || [], incoming));
                  setTagInput("");
                  setTagOpen(false);
                }}
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
            {tagInput.trim() && filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">{noMatchedTagLabel}</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

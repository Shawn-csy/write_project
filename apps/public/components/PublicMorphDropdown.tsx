"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { useCallback, useId, useState } from "react";

type ChoiceGroup<Value> = {
  label?: string;
  options: readonly { value: Value; label: string }[];
};

interface Props<Value extends string> {
  label: string;
  value: Value;
  groups: readonly ChoiceGroup<Value>[];
  onChange: (value: Value) => void;
  summary?: string;
  checkbox?: { label: string; checked: boolean; onChange: (checked: boolean) => void };
  className?: string;
  align?: "start" | "end";
}

/** UI Stage nv-md-05 motion, with keyboard navigation and viewport placement from Radix. */
export function PublicMorphDropdown<Value extends string>({ label, value, groups, onChange, summary, checkbox, className = "", align = "start" }: Props<Value>) {
  const labelId = useId();
  const valueId = useId();
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  const setTrigger = useCallback((element: HTMLButtonElement | null) => {
    setDialog(element?.closest<HTMLElement>('[role="dialog"]') ?? null);
  }, []);
  const options = groups.flatMap((group) => group.options);
  const selected = options.find((option) => option.value === value);

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger
        ref={setTrigger}
        aria-labelledby={`${labelId} ${valueId}`}
        className={`gallery-morph-trigger inline-flex h-9 shrink-0 items-center justify-between gap-1 rounded-md px-1.5 text-[0.8125rem] leading-5 text-foreground hover:bg-muted data-[state=open]:bg-muted sm:px-2 ${className}`}
      >
        <span id={labelId} className="sr-only">{label}</span>
        <span id={valueId} className="truncate">{summary ?? selected?.label ?? options[0]?.label}</span>
        <ChevronDown className="gallery-morph-chevron h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Portal container={dialog}>
        <Dropdown.Content align={align} sideOffset={4} collisionPadding={8} className="gallery-morph-menu rounded-lg border border-border bg-card p-1 text-foreground shadow-lg">
          {checkbox && (
            <div className="mb-1 border-b border-border pb-1">
              <Dropdown.CheckboxItem
                checked={checkbox.checked}
                onCheckedChange={checkbox.onChange}
                onSelect={(event) => event.preventDefault()}
                className="gallery-morph-option flex min-h-10 cursor-default items-center gap-2 rounded px-2 text-[0.8125rem] leading-5 outline-none data-[highlighted]:bg-muted"
              >
                <span aria-hidden="true" className="gallery-morph-checkbox grid h-4 w-4 shrink-0 place-items-center rounded border border-muted-foreground text-primary-foreground">
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {checkbox.label}
              </Dropdown.CheckboxItem>
            </div>
          )}
          <Dropdown.RadioGroup value={value} onValueChange={(next) => {
            const option = options.find((choice) => choice.value === next);
            if (option) onChange(option.value);
          }}>
            {groups.map((group) => (
              <Dropdown.Group key={group.label ?? group.options[0]?.value} aria-label={group.label} className="gallery-morph-group">
                {group.label && <Dropdown.Label className="px-2 pb-0.5 pt-1 text-xs font-medium text-muted-foreground">{group.label}</Dropdown.Label>}
                {group.options.map((option) => (
                  <Dropdown.RadioItem
                    key={option.value}
                    value={option.value}
                    style={{ animationDelay: `${(options.indexOf(option) + Number(Boolean(checkbox))) * 24}ms` }}
                    className="gallery-morph-option flex min-h-10 cursor-default items-center justify-between gap-3 rounded px-2 text-[0.8125rem] leading-5 outline-none data-[highlighted]:bg-muted data-[state=checked]:font-semibold data-[state=checked]:text-link"
                  >
                    {option.label}
                    <Dropdown.ItemIndicator><Check className="h-3.5 w-3.5" aria-hidden /></Dropdown.ItemIndicator>
                  </Dropdown.RadioItem>
                ))}
              </Dropdown.Group>
            ))}
          </Dropdown.RadioGroup>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

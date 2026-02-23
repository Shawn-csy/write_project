import React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "../../contexts/I18nContext";

export function DownloadMenu({
  options = [],
  align = "end",
  triggerClassName = "",
  title,
  iconOnly = true,
}) {
  const { t } = useI18n();
  const resolvedTitle = title || t("common.download");
  const enabledOptions = options.filter((opt) => !opt?.hidden);
  if (enabledOptions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName}
          title={resolvedTitle}
          aria-label={resolvedTitle}
        >
          <Download className="w-4 h-4" />
          {!iconOnly && <span className="ml-2 text-xs">{resolvedTitle}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        {enabledOptions.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            disabled={Boolean(opt.disabled)}
            onClick={(e) => {
              e.stopPropagation();
              opt.onClick?.(e);
            }}
          >
            {opt.icon ? <opt.icon className="w-4 h-4 mr-2" /> : null}
            <span>{opt.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

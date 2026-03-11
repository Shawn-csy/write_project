import React from "react";
import { Settings2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { AppearanceSettings } from "../settings/AppearanceSettings";
import { useI18n } from "../../contexts/I18nContext";

export function ReaderAppearanceMenu() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full bg-background/20 hover:bg-background/40 text-foreground backdrop-blur-md"
        aria-label={t("readerAppearance.title")}
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(96vw,980px)] max-w-none p-0 overflow-hidden">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>{t("readerAppearance.title")}</DialogTitle>
            <DialogDescription>{t("appearance.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(88vh,760px)] overflow-y-auto p-4 sm:p-6 space-y-4">
            <AppearanceSettings />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import React from "react";
import { Settings2, X } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
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
        <DialogContent className="w-[min(96vw,980px)] max-w-none p-0 overflow-hidden flex max-h-[92vh] flex-col [&>button]:hidden">
          <DialogHeader className="border-b px-4 py-3 pr-14">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle>{t("readerAppearance.title")}</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={t("common.close")} title={t("common.close")}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription>{t("appearance.subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <AppearanceSettings />
          </div>
          <div className="border-t px-4 py-3 sm:hidden">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full">
                {t("common.close")}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

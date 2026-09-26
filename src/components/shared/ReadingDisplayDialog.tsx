import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/design-system";
import { AccessibilitySettingsPanel } from "@/components/shared/AccessibilitySettingsPanel";

interface ReadingDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement>;
}

/** Kept outside a dropdown's subtree so closing its menu cannot unmount it. */
export default function ReadingDisplayDialog({ open, onOpenChange, returnFocusRef }: ReadingDisplayDialogProps) {
  const { t } = useTranslation("common");
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false}
      className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]"
      onCloseAutoFocus={(event) => {
        const target = returnFocusRef.current;
        if (target?.isConnected) {
          event.preventDefault();
          target.focus();
        }
      }}>
      <div className="flex min-w-0 items-start gap-3">
        <DialogHeader className="min-w-0 grow text-start sm:text-start">
          <DialogTitle className="break-words text-balance">{t("accessibility.menuLabel")}</DialogTitle>
          <DialogDescription>{t("accessibility.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={t("buttons.close")}>
            <X className="size-5" aria-hidden="true" />
          </Button>
        </DialogClose>
      </div>
      <div role="region" aria-label={t("accessibility.title")}
        className="min-h-0 min-w-0 overflow-y-auto overscroll-contain px-1 py-1">
        <AccessibilitySettingsPanel />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal">{t("buttons.close")}</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

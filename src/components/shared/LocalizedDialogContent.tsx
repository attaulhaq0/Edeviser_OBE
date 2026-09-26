import { useRef, type ComponentProps, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent as PrimitiveDialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** One generated-primitive adoption: keep Radix behavior, own localized close. */
type Props = Omit<
  ComponentProps<typeof PrimitiveDialogContent>,
  "showCloseButton"
> & {
  /** Controlled external triggers can supply the exact safe focus return. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export const LocalizedDialogContent = ({
  children,
  className,
  returnFocusRef,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: Props) => {
  const { t } = useTranslation("common");
  const opener = useRef<HTMLElement | null>(null);
  return (
    <PrimitiveDialogContent
      {...props}
      showCloseButton={false}
      onOpenAutoFocus={(event) => {
        const active = document.activeElement;
        opener.current =
          active instanceof HTMLElement &&
          active !== document.body &&
          !active.closest("[data-slot=dialog-content]")
            ? active
            : null;
        onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event);
        if (event.defaultPrevented) return;
        const target = opener.current?.isConnected
          ? opener.current
          : returnFocusRef?.current?.isConnected
          ? returnFocusRef.current
          : document.getElementById("main-content");
        opener.current = null;
        if (target?.isConnected) {
          event.preventDefault();
          target.focus();
        }
      }}
      className={cn("min-w-0 grid-cols-[minmax(0,1fr)] [&_[data-slot=dialog-header]]:pe-14", className)}
    >
      {children}
      <DialogClose asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("buttons.close")}
          className="absolute top-3 end-3 z-10 size-11 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" aria-hidden="true" />
        </Button>
      </DialogClose>
    </PrimitiveDialogContent>
  );
};

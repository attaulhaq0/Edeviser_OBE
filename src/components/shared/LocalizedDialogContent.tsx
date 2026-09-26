import type { ComponentProps } from "react";
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
>;

export const LocalizedDialogContent = ({
  children,
  className,
  ...props
}: Props) => {
  const { t } = useTranslation("common");
  return (
    <PrimitiveDialogContent
      {...props}
      showCloseButton={false}
      className={cn("[&_[data-slot=dialog-header]]:pe-14", className)}
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

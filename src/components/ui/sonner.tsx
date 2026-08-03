import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { toastOptions, ...rest } = props;

  return (
    <Sonner
      theme="system"
      className="toaster group lg:ms-[132px]"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast:
            "!border-transparent !bg-slate-900 !text-white !shadow-[0_12px_32px_rgba(0,0,0,0.28)]",
          title: "!text-[13px] !font-semibold !text-white",
          description: "!text-xs !text-slate-300",
          actionButton: "!bg-white !text-slate-900",
          cancelButton: "!bg-slate-700 !text-white",
          ...toastOptions?.classNames,
        },
      }}
      {...rest}
    />
  );
};

export { Toaster };

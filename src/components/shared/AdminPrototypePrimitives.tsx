import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const adminPageClass = "space-y-4";

export const adminCardClass =
  "rounded-[20px] border border-[#eef2f6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]";

export const adminTableClass =
  "w-full min-w-[560px] border-collapse text-start text-xs";

export const AdminSectionHeader = ({
  emoji,
  title,
  action,
  className,
}: {
  emoji: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex items-center gap-2", className)}>
    <span
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-base shadow-sm backdrop-blur-xs"
      aria-hidden="true"
    >
      {emoji}
    </span>
    <h2 className="min-w-0 flex-1 text-sm font-black text-slate-900">
      {title}
    </h2>
    {action}
  </div>
);

export const AdminCardHeader = ({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) => (
  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
    <span className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur-xs">
      <Icon className="size-4" aria-hidden="true" />
    </span>
    <h2 className="text-base font-black tracking-tight text-slate-900">
      {title}
    </h2>
  </div>
);

export const AdminStatCard = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "teal" | "green" | "red";
}) => (
  <div className={cn(adminCardClass, "p-3.5")}>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
      {label}
    </p>
    <p
      className={cn(
        "mt-0.5 text-2xl font-black",
        tone === "teal" && "text-teal-600",
        tone === "green" && "text-emerald-600",
        tone === "red" && "text-red-600",
        tone === "default" && "text-slate-900"
      )}
    >
      {value}
    </p>
  </div>
);

export const AdminStatusPill = ({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "green" | "blue" | "amber" | "red" | "slate";
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold",
      tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
      tone === "blue" && "border-blue-200 bg-blue-50 text-blue-700",
      tone === "amber" && "border-amber-200 bg-amber-50 text-amber-700",
      tone === "red" && "border-red-200 bg-red-50 text-red-700",
      tone === "slate" && "border-slate-200 bg-slate-50 text-slate-600"
    )}
  >
    {children}
  </span>
);

export const AdminFilterPill = ({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) => (
  <Button
    type="button"
    onClick={onClick}
    variant="ghost"
    className={cn(
      "h-auto rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
      active
        ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:text-white"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    )}
  >
    {children}
  </Button>
);

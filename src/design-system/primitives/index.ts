// =============================================================================
// L2 primitives — the prototype design system adopts the existing Shadcn
// wrappers (`src/components/ui/*`) as its primitive layer (PARITY.md §A). This
// `.ts` facade re-exports them so screens import primitives from a single
// design-system surface. `Button` carries the `tactile` variant that reproduces
// the prototype `.btn3d`.
// =============================================================================

export * from "@/components/ui/button";
export * from "@/components/ui/card";
export * from "@/components/ui/badge";
export * from "@/components/ui/input";
export * from "@/components/ui/textarea";
export * from "@/components/ui/label";
export * from "@/components/ui/select";
export * from "@/components/ui/checkbox";
export * from "@/components/ui/switch";
export * from "@/components/ui/dialog";
export * from "@/components/ui/sheet";
export * from "@/components/ui/tabs";
export * from "@/components/ui/popover";
export * from "@/components/ui/separator";
export * from "@/components/ui/alert";
export * from "@/components/ui/avatar";
export * from "@/components/ui/dropdown-menu";
export * from "@/components/ui/table";

// Toast lives in the `sonner` library (ui/sonner is just the <Toaster/> host).
export { toast } from "sonner";

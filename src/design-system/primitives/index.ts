// =============================================================================
// Canonical primitive facade: adopt existing generated Shadcn implementations,
// rather than create another component library. Current ownership, imports and
// migration limits are documented in design-system/README.md. Generated custody
// remains in src/components/ui; shared token/control adoption stays centralized.
// Existing variants remain compatible; exports are not blanket verification.
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

// REFERENCE ONLY: these active compatibility APIs are not new-work defaults.
// Replacement candidates require caller/behavior review, not automatic swaps.
import type { ComponentProps } from "react";
import { HCard } from "@/design-system";
import { KPICard } from "@/design-system/patterns";

export function LegacyKpiReference(props: ComponentProps<typeof KPICard>) {
  return <KPICard {...props} />;
}

export function LegacyHawdexReference(props: ComponentProps<typeof HCard>) {
  return <HCard {...props} />;
}

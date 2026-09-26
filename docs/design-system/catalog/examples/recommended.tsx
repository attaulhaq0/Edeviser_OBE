// Typechecked composition examples only, not rendered stories or execution proof.
// Text and callbacks are supplied by the caller; production callers localize copy.
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/design-system/primitives";
import { PCard, PreferenceToggle, SectionHeader, StatePanel } from "@/design-system/patterns";

export function ReadingSurfaceExample({ heading, actionLabel, onAction, children }: {
  heading: string; actionLabel: string; onAction: () => void; children: ReactNode;
}) {
  return <PCard>
    <SectionHeader title={heading} action={<Button type="button" onClick={onAction}>{actionLabel}</Button>} />
    {children}
  </PCard>;
}

export function StateExample(props: ComponentProps<typeof StatePanel>) {
  return <StatePanel {...props} />;
}

export function PreferenceExample(props: ComponentProps<typeof PreferenceToggle>) {
  return <PreferenceToggle {...props} />;
}

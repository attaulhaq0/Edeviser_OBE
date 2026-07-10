// =============================================================================
// FeatureBoundary — render new-UI children when a flag is on, else the fallback
// =============================================================================
//
// The swap point for the UI prototype migration: keeps the OLD component in the
// tree (as `fallback`) until the new one passes its parity gate, and lets either
// be selected without a redeploy (R13.2 / G.4). Example:
//
//   <FeatureBoundary flag="newUiChrome" fallback={<Sidebar />}>
//     <NewSidebar />
//   </FeatureBoundary>
// =============================================================================

import type { ReactNode } from "react";

import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import type { FeatureFlag } from "@/lib/featureFlags";

export interface FeatureBoundaryProps {
  /** The migration flag that gates the new UI. */
  flag: FeatureFlag;
  /** New UI, rendered when the flag is enabled. */
  children: ReactNode;
  /** Existing UI, rendered when the flag is disabled. Defaults to nothing. */
  fallback?: ReactNode;
}

const FeatureBoundary = ({
  flag,
  children,
  fallback = null,
}: FeatureBoundaryProps) => {
  const enabled = useFeatureFlag(flag);
  return <>{enabled ? children : fallback}</>;
};

export default FeatureBoundary;

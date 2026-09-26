import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import RouteFailureState from "@/components/shared/RouteFailureState";
import RouteLoadingState from "@/components/shared/RouteLoadingState";

/** Keeps local page/rail/immersive failures inside their existing owner. */
const RouteContentBoundary = ({
  children,
  compact = false,
  immersive = false,
}: {
  children: ReactNode;
  compact?: boolean;
  immersive?: boolean;
}) => {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary
      key={pathname}
      fallback={<RouteFailureState compact={compact} immersive={immersive} />}
    >
      <Suspense
        fallback={<RouteLoadingState compact={compact} immersive={immersive} />}
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default RouteContentBoundary;

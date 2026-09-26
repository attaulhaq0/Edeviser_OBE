import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatePanel from "@/design-system/patterns/StatePanel";
import { captureAnalyticsEvent } from "@/lib/analyticsConsent";

/** Content failure stays inside its page/rail while shell navigation survives. */
const RouteFailureState = ({
  compact = false,
  immersive = false,
}: {
  compact?: boolean;
  immersive?: boolean;
}) => {
  const { t } = useTranslation("common");
  const { pathname } = useLocation();
  const failedPath = useRef(pathname);
  const heading = useId();
  const Container = compact ? "aside" : immersive ? "main" : "section";

  // Preserve the existing consent-gated event name and path-only payload.
  // Never add exception text or a stack to the analytics event.
  useEffect(() => {
    captureAnalyticsEvent("route_error_shown", { path: failedPath.current });
  }, []);

  return (
    <Container
      aria-labelledby={heading}
      id={immersive ? "main-content" : undefined}
      tabIndex={immersive ? -1 : undefined}
      className={
        compact
          ? "hidden min-w-0 p-4 xl:col-start-3 xl:row-start-1 xl:block"
          : immersive
          ? "mx-auto min-h-dvh min-w-0 max-w-2xl bg-background p-6"
          : "mx-auto min-w-0 max-w-2xl p-4 sm:p-6"
      }
    >
      <h2
        id={heading}
        className="mb-3 text-lg font-semibold text-foreground text-balance"
      >
        {t("routeState.title")}
      </h2>
      <StatePanel
        variant="error"
        message={t("routeState.message")}
        action={
          <Button
            type="button"
            variant="tactile"
            className="min-h-11"
            onClick={() => window.location.reload()}
          >
            {t("routeState.reload")}
          </Button>
        }
      />
    </Container>
  );
};

export default RouteFailureState;

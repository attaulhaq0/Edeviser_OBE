import { useTranslation } from "react-i18next";
import StatePanel from "@/design-system/patterns/StatePanel";

/** Announces lazy route work; skeleton is already reduced-motion aware. */
const RouteLoadingState = ({
  compact = false,
  immersive = false,
  message,
}: {
  compact?: boolean;
  immersive?: boolean;
  message?: string;
}) => {
  const { t } = useTranslation("common");
  const Container = immersive ? "main" : "div";
  return (
    <Container
      id={immersive ? "main-content" : undefined}
      tabIndex={immersive ? -1 : undefined}
      className={
        compact
          ? "hidden min-w-0 p-4 xl:col-start-3 xl:row-start-1 xl:block"
          : immersive
          ? "min-h-dvh min-w-0 bg-background p-6"
          : "min-w-0 p-4 sm:p-6"
      }
    >
      <StatePanel
        variant="loading"
        message={message ?? t("routeState.loading")}
      />
    </Container>
  );
};

export default RouteLoadingState;

// =============================================================================
// DevFlagToggle — DEV-only live switch for UI-migration feature flags
// =============================================================================
//
// A small floating control so reviewers can flip new-UI flags on/off in the
// browser without editing localStorage or redeploying (R13.2). Mount it behind
// `import.meta.env.DEV` at the call site so it never ships to production.
// =============================================================================

import { FlaskConical } from "lucide-react";

import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { setFeatureOverride } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

const DevFlagToggle = () => {
  const newChrome = useFeatureFlag("newUiChrome");

  return (
    <div className="fixed bottom-4 end-4 z-[200] flex items-center gap-2">
      <button
        type="button"
        onClick={() => setFeatureOverride("newUiChrome", !newChrome)}
        title="Toggle the redesigned chrome (dev only)"
        className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg transition-colors",
          newChrome
            ? "border-transparent text-white"
            : "border-border bg-white text-gray-700 dark:bg-background dark:text-gray-200"
        )}
        style={newChrome ? { background: "var(--brand-gradient)" } : undefined}
      >
        <FlaskConical className="h-4 w-4" aria-hidden="true" />
        New&nbsp;UI&nbsp;chrome: {newChrome ? "ON" : "OFF"}
      </button>
    </div>
  );
};

export default DevFlagToggle;

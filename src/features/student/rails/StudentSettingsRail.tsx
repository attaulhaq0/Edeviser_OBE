import { useTranslation } from "react-i18next";
import { RailCard, RailHead } from "@/design-system";

/** Contextual prototype privacy rail for student settings routes. */
const StudentSettingsRail = () => {
  const { t } = useTranslation("student");

  return (
    <aside
      aria-label={t("settingsRail.label")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto px-5 py-4 xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      <RailCard>
        <RailHead title={t("settingsRail.title")} />
        <p className="m-0 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {t("settingsRail.body")}
        </p>
      </RailCard>
    </aside>
  );
};

export default StudentSettingsRail;

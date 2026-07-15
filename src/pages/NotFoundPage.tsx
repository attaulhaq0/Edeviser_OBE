import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/design-system";
import { Compass, ArrowLeft } from "lucide-react";

// 404 — composed from @/design-system primitives + brand tokens (the prototype
// has no 404 screen, so this follows the nearest archetype per prototype-
// fidelity: light canvas, brand-gradient accent chip, tactile CTA). Rendered by
// the router catch-all; reachable by authenticated or anonymous users, so the
// primary CTA routes to /login (which forwards signed-in users onward).
const NotFoundPage = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
        style={{ background: "var(--brand-gradient)" }}
      >
        <Compass className="h-8 w-8" />
      </div>

      <p className="text-sm font-black uppercase tracking-widest text-slate-400">
        {t("notFound.code")}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {t("notFound.title")}
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {t("notFound.description")}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          {t("notFound.goBack")}
        </Button>
        <Button variant="tactile" asChild>
          <Link to="/login">{t("notFound.backToLogin")}</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;

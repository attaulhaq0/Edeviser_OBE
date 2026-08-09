import {
  ArrowLeft,
  BookOpenText,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { cn } from "@/lib/utils";

export type LegalPageKind = "terms" | "privacy";

const SECTION_COUNTS: Record<LegalPageKind, number> = {
  terms: 8,
  privacy: 8,
};

const CONTACT_EMAIL: Record<LegalPageKind, string> = {
  terms: "legal@edeviser.com",
  privacy: "privacy@edeviser.com",
};

export const LegalPage = ({ kind }: { kind: LegalPageKind }) => {
  const { t } = useTranslation("common");
  const isTerms = kind === "terms";
  const Icon = isTerms ? Scale : ShieldCheck;
  const otherKind: LegalPageKind = isTerms ? "privacy" : "terms";
  const sections = Array.from(
    { length: SECTION_COUNTS[kind] },
    (_, index) => index + 1
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f8fafc_40%,#f8fafc_100%)] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Button asChild variant="ghost" className="h-auto gap-2 px-1">
            <Link to="/login">
              <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-black text-white shadow-sm">
                E
              </span>
              <span className="text-lg font-black tracking-tight">
                Edeviser
              </span>
            </Link>
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:py-12">
        <div className="min-w-0">
          <div className="mb-6 flex items-start gap-4">
            <span
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-sm",
                isTerms
                  ? "border-blue-100 bg-blue-50 text-blue-600"
                  : "border-cyan-100 bg-cyan-50 text-cyan-600"
              )}
            >
              <Icon className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                {t("legal.eyebrow")}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                {t(`legal.${kind}.title`)}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {t(`legal.${kind}.subtitle`)}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {t("legal.lastUpdated")}
              </p>
            </div>
          </div>

          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="space-y-0 p-0">
              {sections.map((section, index) => (
                <section
                  key={section}
                  className={cn(
                    "px-5 py-6 sm:px-7",
                    index > 0 && "border-t border-slate-100"
                  )}
                >
                  <h2 className="text-base font-black tracking-tight text-slate-900">
                    {t(`legal.${kind}.sections.${section}.title`)}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    {t(`legal.${kind}.sections.${section}.body`)}
                  </p>
                  {section === SECTION_COUNTS[kind] && (
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="mt-2 h-auto gap-2 px-0 text-blue-600"
                    >
                      <a href={`mailto:${CONTACT_EMAIL[kind]}`}>
                        <Mail className="size-4" />
                        {CONTACT_EMAIL[kind]}
                      </a>
                    </Button>
                  )}
                </section>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-6">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardContent className="p-5">
              <BookOpenText className="size-5 text-blue-600" />
              <h2 className="mt-3 text-sm font-black">
                {t("legal.summary.title")}
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {t(`legal.${kind}.summary`)}
              </p>
            </CardContent>
          </Card>

          <Button
            asChild
            variant="outline"
            className="h-auto w-full justify-between py-3"
          >
            <Link to={`/${otherKind}`}>
              {t(`legal.${otherKind}.title`)}
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className="h-auto w-full justify-between py-3 text-slate-600"
          >
            <Link to="/login">
              {t("legal.backToSignIn")}
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
};

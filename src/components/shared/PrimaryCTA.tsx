// =============================================================================
// PrimaryCTA — single dominant dashboard call-to-action + subordinate secondaries
// =============================================================================
//
// Presentational component (no Supabase, no data fetching). It consumes the
// pure `primaryCtaSelector` business logic to choose the single highest-priority
// applicable action and renders it as the one dominant CTA, with the remaining
// applicable actions rendered as a visually subordinate secondary-actions row.
//
// All user-facing copy (labels, descriptions, region label) is supplied by the
// consumer already localized, keeping this component bilingual-ready while the
// owning page (StudentDashboard) performs the i18next lookup. This satisfies the
// label-availability requirement (R16.5) at the composition boundary.
//
// Design: Area K — Dashboard single PrimaryCTA
// Requirements: 16.1, 16.4, 16.5
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  selectPrimary,
  orderSecondary,
  type CtaCandidate,
} from "@/lib/primaryCtaSelector";

/**
 * A single candidate action presented by {@link PrimaryCTA}.
 *
 * Extends the pure {@link CtaCandidate} (id / priority / applicable) with the
 * presentational fields the component needs. Provide exactly one of `href`
 * (internal route) or `onSelect` (callback); when both are present `onSelect`
 * is invoked in addition to navigation, and when neither is present the action
 * renders as a disabled control.
 */
export interface PrimaryCtaAction extends CtaCandidate {
  /**
   * Already-localized headline for the action (R16.5). Shown as the dominant
   * CTA's heading, and as the button text for secondary actions.
   */
  label: string;
  /**
   * Optional already-localized button action text (e.g. "Start Now"). When
   * provided it is used for the dominant CTA's button, keeping the button verb
   * distinct from the descriptive headline; falls back to {@link label}.
   */
  ctaLabel?: string;
  /** Optional already-localized supporting copy shown under the primary label. */
  description?: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Internal route target; rendered as a router `Link`. */
  href?: string;
  /** Click handler; used when there is no `href`, or alongside it. */
  onSelect?: () => void;
}

export interface PrimaryCTAProps {
  /** Candidate actions; only `applicable` ones are ever rendered. */
  actions: readonly PrimaryCtaAction[];
  /**
   * Accessible label for the region, already localized. Defaults to a generic
   * English label only as a last resort; consumers should pass a localized one.
   */
  regionLabel?: string;
  /**
   * Optional already-localized heading rendered above the dominant CTA copy
   * (e.g. "Your next step").
   */
  heading?: string;
  className?: string;
}

// ─── Internal renderers ──────────────────────────────────────────────────────

/**
 * Render a single action button. The dominant action uses the brand gradient
 * (the one-and-only gradient button in this section per the design system);
 * secondary actions use a subordinate `ghost` style so they read as clearly
 * less important than the primary (R16.4).
 */
const ActionButton = ({
  action,
  variant,
}: {
  action: PrimaryCtaAction;
  variant: "primary" | "secondary";
}) => {
  const Icon = action.icon;
  const isPrimary = variant === "primary";
  const disabled = !action.href && !action.onSelect;

  // The dominant CTA can carry a distinct verb (`ctaLabel`) so the button does
  // not merely echo the headline shown above it; secondaries use their label.
  const buttonText =
    isPrimary && action.ctaLabel ? action.ctaLabel : action.label;

  const className = isPrimary
    ? cn(
        "min-h-11 bg-gradient-to-r from-teal-500 to-blue-600 text-white",
        "active:scale-95 transition-transform duration-100"
      )
    : cn("min-h-11 text-gray-600 hover:text-gray-900");

  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {buttonText}
    </>
  );

  // Internal navigation: render the button as a router Link.
  if (action.href) {
    return (
      <Button
        asChild
        size={isPrimary ? "lg" : "sm"}
        variant={isPrimary ? "default" : "ghost"}
        className={className}
        data-testid={`primary-cta-${isPrimary ? "primary" : "secondary"}-${
          action.id
        }`}
      >
        <Link to={action.href} onClick={action.onSelect}>
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={isPrimary ? "lg" : "sm"}
      variant={isPrimary ? "default" : "ghost"}
      className={className}
      disabled={disabled}
      onClick={action.onSelect}
      data-testid={`primary-cta-${isPrimary ? "primary" : "secondary"}-${
        action.id
      }`}
    >
      {content}
    </Button>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders exactly one dominant CTA (or nothing when no action applies) plus a
 * subordinate row of the remaining applicable actions.
 *
 * Selection and ordering are delegated entirely to `primaryCtaSelector`:
 * - {@link selectPrimary} picks the single highest-precedence applicable action
 *   (R16.1 — at most one dominant CTA; none when nothing applies).
 * - {@link orderSecondary} lists the rest, ordered by precedence, for the
 *   subordinate row (R16.4).
 *
 * When the previously-dominant action becomes inapplicable, the selector
 * promotes the next applicable candidate automatically (R16.3, exercised via
 * the `actions` prop the consumer recomputes).
 */
const PrimaryCTA = ({
  actions,
  regionLabel = "Recommended actions",
  heading,
  className,
}: PrimaryCTAProps) => {
  const primary = selectPrimary(actions);

  // R16.1: exactly one dominant CTA at a time — when none is applicable there
  // is nothing to surface, so render nothing rather than an empty shell.
  if (!primary) return null;

  const secondaries = orderSecondary(actions, primary.id);

  return (
    <Card
      role="region"
      aria-label={regionLabel}
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
      data-testid="primary-cta"
    >
      <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {heading ? (
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              {heading}
            </p>
          ) : null}
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            {primary.label}
          </h2>
          {primary.description ? (
            <p className="text-sm font-medium text-gray-500 mt-1">
              {primary.description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <ActionButton action={primary} variant="primary" />
        </div>
      </div>

      {secondaries.length > 0 ? (
        // R16.4: secondary actions are visually subordinate — a quieter row,
        // separated from and lighter than the dominant CTA above.
        <div
          className="px-6 pb-4 -mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"
          data-testid="primary-cta-secondaries"
        >
          {secondaries.map((action) => (
            <ActionButton key={action.id} action={action} variant="secondary" />
          ))}
        </div>
      ) : null}
    </Card>
  );
};

export default PrimaryCTA;

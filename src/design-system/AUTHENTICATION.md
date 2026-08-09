# Edeviser authentication design system

Authentication is a focused extension of the shared Edeviser design system. It
uses the shared Shadcn primitives and auth-specific composition without forking
the application-wide token or component libraries.

## Source files

- `src/features/auth/landing/AuthLanding.css` — auth tokens, responsive layout,
  component states and RTL rules.
- `src/features/auth/landing/AuthLandingVisuals.tsx` — brand lockup, hero,
  feature timeline, feedback loop and Foxi scene.
- `src/features/auth/landing/content.ts` — paired English/Arabic landing copy.
- `src/pages/LoginPage.tsx` — working login, registration, magic-link and
  localhost demo orchestration.
- `public/auth/` — transparent localized feedback-loop and feature-timeline
  artwork, the Foxi scene and the cropped official Edeviser logo mark.

## Foundations

| Token                | Value                                              | Use                             |
| -------------------- | -------------------------------------------------- | ------------------------------- |
| `--brand-blue`       | `#0382BD`                                          | Links, active tab, icons, focus |
| `--brand-green`      | `#09B99C`                                          | Outcome emphasis, CTA endpoint  |
| `--brand-navy`       | `#1D3557`                                          | Primary text and wordmark       |
| `--brand-black`      | `#121212`                                          | Reserved high-emphasis text     |
| `--brand-gray`       | `#504E4E`                                          | Neutral text                    |
| `--brand-white`      | `#FFFFFF`                                          | Cards and controls              |
| `--primary-gradient` | `linear-gradient(90deg, #0382BD 0%, #09B99C 100%)` | Primary auth actions only       |

### Authentication semantic color roles

Authentication components must consume semantic roles rather than copying hex
values from the feedback-loop illustrations.

| Role token                   | Value                 | Contract                                                   |
| ---------------------------- | --------------------- | ---------------------------------------------------------- |
| `--auth-canvas-start`        | `#FFFFFF`             | Page-gradient start                                        |
| `--auth-canvas-mid`          | `#F5F9FF`             | Dominant icy-white page tone                               |
| `--auth-canvas-end`          | `#EDF4FD`             | Cool page-gradient endpoint                                |
| `--auth-surface`             | `#FFFFFF`             | Cards, fields and secondary buttons                        |
| `--auth-surface-soft`        | `#F4FAFF`             | Hover and supporting surfaces                              |
| `--auth-text-strong`         | `#10215C`             | Labels and high-emphasis content                           |
| `--auth-text-muted`          | `#5E7398`             | Secondary copy; 4.79:1 against white                       |
| `--auth-link`                | `#086BEE`             | Small links; 4.83:1 against white                          |
| `--auth-control`             | `#0877F9`             | Tabs, checks and graphical control states                  |
| `--auth-border`              | `#D6E1EF`             | Field and component boundaries                             |
| `--auth-border-subtle`       | `#E2EAF4`             | Dividers and quiet meter tracks                            |
| `--auth-illustration-cyan`   | `#0ABEEA`             | Feedback-loop/illustration accent only                     |
| `--auth-illustration-violet` | `#5B32F4`             | Feedback-loop/illustration accent only                     |
| `--auth-focus-ring`          | `rgba(3,130,189,.12)` | Focus halo paired with a solid `--brand-blue` field border |

The exact page background is:

```css
radial-gradient(circle at 46% 46%, rgba(126, 184, 255, 0.20), transparent 42%),
linear-gradient(118deg, #FFFFFF 0%, #F5F9FF 55%, #EDF4FD 100%)
```

Color usage rules:

1. Navy/strong text carries meaning. Hero emphasis uses `--auth-control` blue
   for learning/measurable outcomes and `--brand-green` for outcome emphasis.
2. `--brand-blue` and `--brand-green` remain the brand/CTA endpoints. Small
   links use the darker `--auth-link` role for WCAG AA contrast.
3. Cyan and violet belong to loop artwork, charts and decorative emphasis. They
   are not form-label or body-copy colors.
4. Interactive state is never communicated by color alone: tabs use an
   underline, checkboxes use a check, and focus uses both a border and halo.
5. Do not add component-level hex colors. Add or reuse a semantic role here and
   in `AuthLanding.css`.

This follows Material's role-based approach (primary, secondary, surface,
background and complementary “on” colors) and WCAG 2.2 thresholds: 4.5:1 for
normal text and 3:1 for meaningful graphical objects. References:
[Material color system](https://m2.material.io/guidelines/style/color.html),
[WCAG 2.2 contrast](https://www.w3.org/TR/WCAG22/#contrast-minimum), and
[W3C icon contrast technique](https://www.w3.org/WAI/WCAG22/Techniques/general/G207).

The page uses an icy-white atmospheric surface, 24px card radii, 13px control
radii, cool low-opacity shadows and 48–52px form targets. Latin text uses Inter
with system fallbacks; Arabic uses Noto Sans Arabic / IBM Plex Sans Arabic
fallbacks.

## Component contract

- `BrandLogo` uses `public/auth/edeviser-logo-mark.png`, cropped directly from
  the supplied official `e deviser logo 2.png` without changing its artwork,
  plus the exact `E DEVISER` wordmark.
- `public/auth/edeviser-chain-mark.svg` is a compatibility alias that embeds the
  official PNG. It exists only so older Vite module graphs do not fail while a
  dev server is restarted; authentication components do not reference it.
- `HeroCopy` remains localized HTML. `FeatureTimeline` swaps the approved
  transparent 1024×1536 English/Arabic reference artwork so both locales use
  the same Adaptive, Habits and Outcomes badge family and proportions.
- `FeedbackLoop` swaps the approved transparent 1024×1536 localized artwork.
  Both locales use the same CSS size/crop and render without a blend mode, box
  or baked background tone.
- `MascotScene` keeps the subtle English hoodie mark. The laptop is unbranded
  in both locales, and Arabic has no scene-logo overlay.
- Auth tabs, fields, checkbox and buttons use Shadcn primitives with semantic
  labels, visible focus, logical CSS properties and RTL-aware direction.
- The primary CTA always uses `--primary-gradient`; secondary actions remain
  white with a blue border.
- The demo role selector is allowed only on `localhost` / `127.0.0.1` and only
  when `VITE_DEMO_PASSWORD` is present. It must never render on a deployed host.

## Responsive order

- Desktop: copy + feature timeline, loop/Foxi artwork, authentication card.
- Tablet: copy and supporting artwork remain left; auth stays right.
- Mobile: brand header, headline/copy, authentication card, supporting artwork.

English uses `dir="ltr"`; Arabic uses `dir="rtl"`, mirrored control semantics,
right-aligned copy and a left-facing action arrow.

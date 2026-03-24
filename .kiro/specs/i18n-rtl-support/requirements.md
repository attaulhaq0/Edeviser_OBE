# Requirements Document — i18n & RTL Support (Arabic/English)

## Introduction

This document defines the requirements for full internationalization (i18n) and right-to-left (RTL) layout support in the Edeviser platform, enabling bilingual Arabic/English operation for the Qatar education market. The feature covers language detection and switching, translation file management, RTL-aware CSS layout, bidirectional text handling, locale-aware formatting, bilingual entity content, database persistence of language preferences, and accessibility enhancements for cognitive and neurodivergent learner support.

---

## Section A: i18n Core Infrastructure

### Requirement 1: i18next Initialization and Language Detection

**User Story:** As a user, I want the platform to detect my preferred language automatically so that I see the interface in my chosen language without manual configuration.

#### Acceptance Criteria

1. WHEN the application loads, THE i18n_Module SHALL initialize i18next with bundled JSON resources for English and Arabic across all namespaces (common, auth, admin, student, teacher, coordinator, parent).
2. THE i18n_Module SHALL support exactly two languages: English (`en`) and Arabic (`ar`).
3. WHEN detecting the active language, THE i18n_Module SHALL follow the priority chain: user profile preference → institution default → browser language → English fallback.
4. THE i18n_Module SHALL use `initReactI18next` plugin for React integration with interpolation escaping disabled (React handles escaping).
5. IF a translation key is missing in the active language, THEN THE i18n_Module SHALL fall back to the English translation for that key.
6. THE i18n_Module SHALL set `common` as the default namespace.
7. THE i18n_Module SHALL support all six Arabic plural forms (zero, one, two, few, many, other) using i18next built-in ICU plural rules.

### Requirement 2: Direction Manager

**User Story:** As a user, I want the page layout to automatically switch between LTR and RTL when I change languages so that the interface reads naturally in my chosen language.

#### Acceptance Criteria

1. WHEN the language changes to Arabic, THE Direction_Manager SHALL set the `dir` attribute on the `<html>` element to `rtl`.
2. WHEN the language changes to English, THE Direction_Manager SHALL set the `dir` attribute on the `<html>` element to `ltr`.
3. WHEN the language changes, THE Direction_Manager SHALL set the `lang` attribute on the `<html>` element to the active language code.
4. WHEN the language is Arabic, THE Direction_Manager SHALL set the font-family to `"Noto Sans Arabic", "Noto Sans", ui-sans-serif, system-ui, sans-serif`.
5. WHEN the language is English, THE Direction_Manager SHALL set the font-family to `"Noto Sans", ui-sans-serif, system-ui, sans-serif`.
6. THE Direction_Manager SHALL be idempotent: calling `applyDirection` multiple times with the same language SHALL produce the same document state as calling it once.

### Requirement 3: Language Persistence

**User Story:** As a user, I want my language preference to persist across sessions and devices so that I do not need to re-select my language each time I use the platform.

#### Acceptance Criteria

1. WHEN a user changes the language, THE Platform SHALL store the preference in `localStorage` under the key `edeviser-language`.
2. WHEN a user changes the language while authenticated, THE Platform SHALL persist the preference to the `profiles.preferred_language` column in the database.
3. WHEN the application loads before authentication, THE i18n_Module SHALL use the `localStorage` value as the initial language.
4. WHEN a user authenticates, THE AuthProvider SHALL apply the `preferred_language` from the user's profile via `i18n.changeLanguage()`.

---

## Section B: Translation Files & Namespaces

### Requirement 4: Namespace Organization and Key Structure

**User Story:** As a developer, I want translation files organized by role-based namespaces so that translations are maintainable and can be lazy-loaded per role.

#### Acceptance Criteria

1. THE Translation_System SHALL organize translations into seven namespaces: `common`, `auth`, `admin`, `student`, `teacher`, `coordinator`, `parent`.
2. THE Translation_System SHALL store translation files as JSON in `src/locales/{lang}/{namespace}.json`.
3. THE Translation_System SHALL bundle all translation files at build time via Vite static imports (not HTTP fetch).
4. THE `common` namespace SHALL contain shared UI strings including buttons, status labels, pagination, attainment levels, Bloom's taxonomy terms, gamification terms, error messages, and empty states.
5. EACH role-specific namespace SHALL contain strings specific to that role's pages and workflows.

### Requirement 5: Arabic Translation Quality

**User Story:** As an Arabic-speaking user, I want accurate and natural Arabic translations so that the platform feels native and professional.

#### Acceptance Criteria

1. THE Arabic_Translations SHALL use proper Arabic grammar and natural phrasing (not literal word-for-word translations from English).
2. THE Arabic_Translations SHALL support all six Arabic plural forms (zero, one, two, few, many, other) for countable nouns.
3. FOR ALL translation keys present in any English namespace file, THE corresponding key SHALL exist in the Arabic namespace file.
4. FOR ALL translation keys present in any Arabic namespace file, THE corresponding key SHALL exist in the English namespace file.
5. THE Arabic_Translations SHALL use Western Arabic numerals (0-9) in both languages for consistency with the data model.

---

## Section C: Language Switcher & User Preference

### Requirement 6: Language Switcher Component

**User Story:** As a user, I want a visible language toggle in the interface so that I can switch between Arabic and English at any time.

#### Acceptance Criteria

1. THE Language_Switcher SHALL render as a dropdown menu triggered by a Globe icon button in the application header.
2. THE Language_Switcher SHALL display each language option using its native label (English: "English", Arabic: "العربية").
3. WHEN a user selects a language, THE Language_Switcher SHALL immediately change the UI language without a page reload.
4. WHEN a user selects a language, THE Language_Switcher SHALL highlight the currently active language in the dropdown.
5. THE Language_Switcher SHALL appear in all role layout headers (Admin, Coordinator, Teacher, Student, Parent).
6. THE Language_Switcher SHALL appear on unauthenticated pages (Login, Reset Password, Update Password).

### Requirement 7: Profile-Persisted Language Preference

**User Story:** As an authenticated user, I want my language choice saved to my profile so that it applies across all my devices.

#### Acceptance Criteria

1. WHEN an authenticated user changes the language, THE Platform SHALL update the `profiles.preferred_language` column via a TanStack Query mutation.
2. THE mutation SHALL invalidate the profile query cache on success to keep the UI consistent.
3. THE language switch SHALL be optimistic: the UI SHALL update immediately before the database write completes.
4. IF the database update fails, THEN THE Platform SHALL keep the locally applied language (no rollback of UI language).

---

## Section D: RTL Layout Support

### Requirement 8: Tailwind Logical Property Migration

**User Story:** As a user viewing the platform in Arabic, I want all layout elements to mirror correctly so that the interface reads naturally from right to left.

#### Acceptance Criteria

1. THE Platform SHALL replace all physical direction Tailwind classes with logical equivalents: `ml-*` → `ms-*`, `mr-*` → `me-*`, `pl-*` → `ps-*`, `pr-*` → `pe-*`, `left-*` → `start-*`, `right-*` → `end-*`.
2. THE Platform SHALL replace `text-left` with `text-start` and `text-right` with `text-end` in all components.
3. THE Platform SHALL replace `border-l-*` with `border-s-*` and `border-r-*` with `border-e-*` in all components.
4. THE Platform SHALL replace `rounded-l-*` with `rounded-s-*` and `rounded-r-*` with `rounded-e-*` in all components.
5. WHERE a `translate-x-*` transform is used, THE Platform SHALL add an explicit `rtl:-translate-x-*` variant alongside.
6. THE Platform SHALL migrate all shared components, role layouts, and page components.
7. THE Platform SHALL retain `flex-row` and `space-x-*` classes unchanged because flexbox respects the `dir` attribute automatically.
8. NO component source file in `src/components/` or `src/pages/` SHALL contain physical direction Tailwind classes without an accompanying `rtl:` variant.

### Requirement 9: Directional Icon Mirroring

**User Story:** As a user viewing the platform in Arabic, I want directional icons (arrows, chevrons) to mirror so that navigation cues match the reading direction.

#### Acceptance Criteria

1. THE Platform SHALL mirror directional icons (ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ExternalLink) in RTL mode using `rtl:-scale-x-100`.
2. THE Platform SHALL NOT mirror non-directional icons (Check, X, Plus, Minus, Search, Settings, Bell, Clock, Calendar).

### Requirement 10: Sidebar and Layout RTL Adaptation

**User Story:** As a user viewing the platform in Arabic, I want the sidebar to appear on the right side so that the layout matches RTL reading patterns.

#### Acceptance Criteria

1. WHEN the document direction is RTL, THE sidebar layout SHALL render the sidebar on the right side and main content on the left side.
2. THE sidebar SHALL use `border-e` (border-inline-end) instead of `border-r` so the border appears on the correct side in both directions.
3. THE sidebar navigation items SHALL use logical padding and margin properties.

---

## Section E: Bidirectional Text & Content

### Requirement 11: Bilingual Content Resolver

**User Story:** As a user, I want entity titles (ILOs, PLOs, CLOs, courses, programs) displayed in my active language with a fallback to the other language so that I always see meaningful content.

#### Acceptance Criteria

1. THE Bilingual_Content_Resolver SHALL accept a bilingual field object with optional `en` and `ar` string properties.
2. WHEN both language versions are provided, THE Bilingual_Content_Resolver SHALL return the version matching the active language.
3. WHEN only one language version is provided, THE Bilingual_Content_Resolver SHALL return that version regardless of the active language.
4. WHEN both language versions are empty or null, THE Bilingual_Content_Resolver SHALL return an empty string.
5. THE Bilingual_Content_Resolver SHALL be a pure function with no side effects.
6. THE Platform SHALL add bilingual input fields (title_ar, name_ar) to ILO, PLO, CLO, Course, and Program forms.

### Requirement 12: Bidirectional Text Utilities

**User Story:** As a user viewing mixed Arabic/English content (outcome codes, Bloom's verbs), I want text direction handled correctly so that codes and terms display in the right order.

#### Acceptance Criteria

1. THE Bidi_Text_Utilities SHALL provide an `ltrIsolate()` function that wraps a string in Unicode LTR isolate characters (U+2066 ... U+2069).
2. THE Bidi_Text_Utilities SHALL provide an `rtlIsolate()` function that wraps a string in Unicode RTL isolate characters (U+2067 ... U+2069).
3. THE Bidi_Text_Utilities SHALL provide a `startsWithRTL()` function that detects if a string begins with an RTL character.
4. FOR ALL strings S, stripping the Unicode isolate characters from `ltrIsolate(S)` SHALL return the original string S (round-trip property).

---

## Section F: Locale-Aware Formatting

### Requirement 13: Date Formatting with Arabic Locale

**User Story:** As an Arabic-speaking user, I want dates displayed in Arabic format so that temporal information is natural to read.

#### Acceptance Criteria

1. THE Date_Formatter SHALL format dates using the `date-fns` Arabic locale when the active language is Arabic.
2. THE Date_Formatter SHALL format dates using the `date-fns` English (US) locale when the active language is English.
3. THE Date_Formatter SHALL provide a `formatLocalDate()` function accepting a Date or ISO string and an optional pattern.
4. THE Date_Formatter SHALL provide a `formatRelativeTime()` function for "time ago" displays.
5. THE Platform SHALL replace all direct `format()` calls from `date-fns` with `formatLocalDate()`.

### Requirement 14: Number Formatting with Locale Awareness

**User Story:** As a user, I want numbers and percentages formatted according to my locale so that numerical data is easy to read.

#### Acceptance Criteria

1. THE Number_Formatter SHALL format numbers using `Intl.NumberFormat` with locale `ar-QA` for Arabic and `en-US` for English.
2. THE Number_Formatter SHALL provide `formatNumber()`, `formatPercent()`, and `formatCompact()` functions.
3. THE Number_Formatter SHALL use Western Arabic numerals (0-9) in both locales.
4. THE Platform SHALL replace all direct number formatting with locale-aware formatting functions.
5. FOR ALL finite numbers N, `formatNumber(N)` SHALL produce a non-empty string.

---

## Section G: Database & Admin Settings

### Requirement 15: Preferred Language Column on Profiles

**User Story:** As a platform administrator, I want user language preferences stored in the database so that preferences persist across devices and sessions.

#### Acceptance Criteria

1. THE Database SHALL have a `preferred_language` column on the `profiles` table of type `VARCHAR(5)` with a default value of `'en'`.
2. THE `preferred_language` column SHALL have a CHECK constraint limiting values to `('en', 'ar')`.
3. THE migration SHALL backfill existing profiles with `preferred_language = 'en'` or the institution default if available.
4. THE existing profile RLS policies SHALL cover the `preferred_language` column (no new RLS policies needed).

### Requirement 16: Default Language in Institution Settings

**User Story:** As an institution administrator, I want to set a default language for my institution so that new users start with the appropriate language.

#### Acceptance Criteria

1. THE Database SHALL store a `default_language` key in the `institution_settings` JSONB column on the `institutions` table.
2. THE default value for `default_language` SHALL be `'en'`.
3. THE Admin_Settings_Page SHALL include a Default Language selector (dropdown: English / Arabic).
4. THE institution settings Zod schema SHALL include a `default_language` field validated against supported languages.
5. WHEN a new user is created, THE Platform SHALL set `preferred_language` from the institution's `default_language`.

### Requirement 17: Bilingual Content Columns on Entities

**User Story:** As an administrator or teacher, I want to enter entity titles in both Arabic and English so that all users see content in their preferred language.

#### Acceptance Criteria

1. THE Database SHALL add nullable `title_ar` columns to `institution_learning_outcomes`, `program_learning_outcomes`, and `course_learning_outcomes` tables.
2. THE Database SHALL add nullable `name_ar` columns to `courses` and `programs` tables.
3. THE bilingual columns SHALL be nullable — the Bilingual_Content_Resolver falls back to the primary (English) field when the Arabic version is not provided.

---

## Section H: Google Fonts & CSS

### Requirement 18: Noto Sans Arabic Font Loading

**User Story:** As a user viewing the platform in Arabic, I want Arabic text rendered in a high-quality font so that the interface looks professional.

#### Acceptance Criteria

1. THE Platform SHALL load `Noto Sans Arabic` from Google Fonts alongside the existing `Noto Sans` font.
2. THE font link SHALL include weights 400, 500, 600, 700, and 900 for both font families.
3. THE font link SHALL use `display=swap` to prevent layout shift during font loading.

### Requirement 19: RTL-Specific CSS Rules

**User Story:** As a developer, I want RTL-specific CSS rules so that third-party components (Radix/Shadcn) respect the document direction.

#### Acceptance Criteria

1. THE CSS SHALL include a `[dir="rtl"]` rule setting the Arabic font-family stack.
2. THE CSS SHALL include a rule ensuring Radix popper content wrappers respect the RTL direction.

---

## Section I: String Extraction

### Requirement 20: Wrapping Hardcoded Strings with t() Calls

**User Story:** As a developer, I want all user-facing strings extracted into translation files so that the entire UI is translatable.

#### Acceptance Criteria

1. THE Platform SHALL replace all hardcoded user-facing strings in auth pages with `t()` calls using the `auth` namespace.
2. THE Platform SHALL replace all hardcoded user-facing strings in Admin pages with `t()` calls using the `admin` namespace.
3. THE Platform SHALL replace all hardcoded user-facing strings in Coordinator pages with `t()` calls using the `coordinator` namespace.
4. THE Platform SHALL replace all hardcoded user-facing strings in Teacher pages with `t()` calls using the `teacher` namespace.
5. THE Platform SHALL replace all hardcoded user-facing strings in Student pages with `t()` calls using the `student` namespace.
6. THE Platform SHALL replace all hardcoded user-facing strings in shared components with `t()` calls using the `common` namespace.
7. THE Platform SHALL replace all hardcoded toast notification messages (Sonner calls) with `t()` calls.
8. THE Platform SHALL replace all hardcoded Zod validation error messages with i18next-translated custom error messages.

---

## Section J: Cognitive Accessibility

### Requirement 21: Cognitive Load Indicators on Complex Pages

**User Story:** As a student with cognitive accessibility needs, I want the platform to indicate when a page has high information density so that I can choose a simplified view to reduce overwhelm.

#### Acceptance Criteria

1. WHEN a page exceeds a defined complexity threshold (configurable number of visible sections, data tables, or interactive elements), THE Cognitive_Load_Indicator SHALL display a non-intrusive banner offering a simplified view.
2. THE Cognitive_Load_Indicator SHALL display a message such as "This page has a lot of information — would you like a simplified view?" with an actionable toggle.
3. WHEN the user activates the simplified view from the indicator, THE Platform SHALL hide non-essential sections and reduce the page to core content.
4. THE Cognitive_Load_Indicator SHALL respect the user's stored preference and not re-prompt if the user has dismissed it for that page.
5. THE Cognitive_Load_Indicator SHALL be dismissible and not block interaction with the page.

### Requirement 22: UI Focus Mode

**User Story:** As a student with ADHD or attention difficulties, I want a platform-wide Focus Mode that hides non-essential UI elements so that I can concentrate on the task at hand.

#### Acceptance Criteria

1. THE Platform SHALL provide a Focus Mode toggle accessible from the user menu or accessibility settings panel.
2. WHEN Focus Mode is active, THE Platform SHALL hide non-essential UI elements including gamification widgets (XP display, streak, leaderboard sidebar), decorative animations, notification badges (except urgent), and secondary navigation items.
3. WHEN Focus Mode is active, THE Platform SHALL retain essential elements including primary navigation, current page content, form inputs, submit buttons, and critical alerts.
4. THE Focus Mode state SHALL persist across page navigations within the same session.
5. THE Focus Mode preference SHALL be stored in the user's accessibility preferences in the database.
6. WHEN Focus Mode is deactivated, THE Platform SHALL restore all hidden elements without requiring a page reload.

### Requirement 23: Cognitive Accessibility User Preferences

**User Story:** As a user with accessibility needs, I want configurable accessibility preferences stored in my profile so that the platform adapts to my needs across sessions and devices.

#### Acceptance Criteria

1. THE Platform SHALL store accessibility preferences as a JSONB column (`accessibility_preferences`) on the `profiles` table.
2. THE accessibility preferences SHALL include: `font_size` (string: 'default' | 'large' | 'x-large'), `high_contrast` (boolean), `reduced_animations` (boolean), `dyslexia_font` (boolean), `simplified_view` (boolean).
3. THE Platform SHALL provide an Accessibility Settings panel accessible from the user menu.
4. WHEN a user updates an accessibility preference, THE Platform SHALL apply the change immediately without a page reload.
5. THE Platform SHALL persist accessibility preferences to the database for authenticated users and to `localStorage` for unauthenticated users.
6. THE Platform SHALL load and apply accessibility preferences on application startup, following the same priority chain as language detection (profile → localStorage → defaults).

---

## Section K: Neurodivergent Learner Support

### Requirement 24: Dyslexia-Friendly Font Option

**User Story:** As a student with dyslexia, I want the option to switch to a dyslexia-friendly font so that I can read text more easily.

#### Acceptance Criteria

1. THE Platform SHALL load the OpenDyslexic font as an optional font resource.
2. WHEN the `dyslexia_font` accessibility preference is enabled, THE Platform SHALL apply the OpenDyslexic font-family to all body text.
3. WHEN the `dyslexia_font` preference is disabled, THE Platform SHALL revert to the default font stack (Noto Sans / Noto Sans Arabic).
4. THE dyslexia font toggle SHALL be available in the Accessibility Settings panel.
5. THE OpenDyslexic font SHALL support both LTR and RTL text rendering.

### Requirement 25: ADHD-Friendly Reduced Animation Mode

**User Story:** As a student with ADHD, I want an explicit option to reduce animations and visual distractions beyond the OS-level `prefers-reduced-motion` so that I can focus on content.

#### Acceptance Criteria

1. THE Platform SHALL provide a `reduced_animations` toggle in the Accessibility Settings panel.
2. WHEN `reduced_animations` is enabled, THE Platform SHALL disable all custom animations (shimmer, xp-pulse, badge-pop, float, streak-flame, fade-in-up, confetti).
3. WHEN `reduced_animations` is enabled, THE Platform SHALL disable Framer Motion animations by setting `transition: { duration: 0 }` globally.
4. THE `reduced_animations` preference SHALL take effect independently of the OS-level `prefers-reduced-motion` media query.
5. IF either the OS-level `prefers-reduced-motion` is set OR the user's `reduced_animations` preference is enabled, THEN THE Platform SHALL disable animations.
6. THE reduced animation mode SHALL not affect essential UI transitions (page routing, dropdown open/close) that provide functional feedback.

---

## Section L: Standardized Educational Terminology

### Requirement 26: Standardized Bloom's Taxonomy Arabic Translations

**User Story:** As an Arabic-speaking educator, I want Bloom's Taxonomy levels translated using standardized Arabic educational terminology so that the platform aligns with established Arabic pedagogical vocabulary.

#### Acceptance Criteria

1. THE Arabic_Translations SHALL use the following standardized Bloom's Taxonomy translations: Remembering → التذكر, Understanding → الفهم, Applying → التطبيق, Analyzing → التحليل, Evaluating → التقييم, Creating → الإبداع.
2. THE Arabic_Translations SHALL include standardized Arabic action verbs for each Bloom's level in the Bloom's Verb Guide component.
3. THE Bloom's Taxonomy translations SHALL be reviewed against established Arabic educational standards (not literal translations).
4. THE Bloom's Taxonomy Arabic terms SHALL be consistent across all namespaces and components that reference them.

### Requirement 27: OBE Terminology Glossary in Arabic

**User Story:** As an Arabic-speaking educator, I want OBE-specific terms (ILO, PLO, CLO, attainment levels) translated using standardized Arabic educational terminology so that the platform is professionally aligned with Arabic academic standards.

#### Acceptance Criteria

1. THE Arabic_Translations SHALL include standardized translations for OBE terms: ILO (مخرجات التعلم المؤسسية), PLO (مخرجات التعلم البرنامجية), CLO (مخرجات التعلم للمقرر).
2. THE Arabic_Translations SHALL include standardized translations for attainment levels: Excellent (ممتاز), Satisfactory (مُرضٍ), Developing (قيد التطوير), Not Yet (لم يتحقق بعد).
3. THE Arabic_Translations SHALL include standardized translations for CQI terms, accreditation concepts, and curriculum matrix terminology.
4. THE OBE Arabic terminology SHALL be consistent across all namespaces and components.

---

## Glossary

- **i18n_Module**: The i18next initialization module (`src/lib/i18n.ts`) responsible for language detection, translation loading, and pluralization.
- **Direction_Manager**: The utility module (`src/lib/directionManager.ts`) that sets `dir`, `lang`, and font-family attributes on the HTML document element.
- **Language_Switcher**: The UI component (`src/components/shared/LanguageSwitcher.tsx`) that allows users to toggle between Arabic and English.
- **Bilingual_Content_Resolver**: The pure utility function (`src/lib/bilingualContent.ts`) that resolves bilingual entity fields based on the active language with fallback logic.
- **Bidi_Text_Utilities**: The utility module (`src/lib/bidiText.ts`) providing Unicode isolate wrappers for mixed-direction text.
- **Date_Formatter**: The locale-aware date formatting utility (`src/lib/formatDate.ts`) wrapping `date-fns`.
- **Number_Formatter**: The locale-aware number formatting utility (`src/lib/formatNumber.ts`) wrapping `Intl.NumberFormat`.
- **Cognitive_Load_Indicator**: A UI component that detects high-complexity pages and offers a simplified view option.
- **Focus_Mode**: A platform-wide UI mode that hides non-essential elements to reduce visual clutter for users with attention difficulties.
- **AuthProvider**: The React context provider (`src/providers/AuthProvider.tsx`) managing authentication state and user profile data.
- **Platform**: The Edeviser web application as a whole.
- **Arabic_Translations**: The set of Arabic translation JSON files in `src/locales/ar/`.
- **Translation_System**: The overall translation infrastructure including i18next, namespace files, and loading mechanism.
- **RTL**: Right-to-left text direction, used for Arabic and other RTL languages.
- **LTR**: Left-to-right text direction, used for English and other LTR languages.
- **EARS**: Easy Approach to Requirements Syntax — the pattern used for structuring acceptance criteria.
- **OBE**: Outcome-Based Education — the pedagogical framework implemented by Edeviser.
- **ILO**: Institution Learning Outcome.
- **PLO**: Program Learning Outcome.
- **CLO**: Course Learning Outcome.
- **CQI**: Continuous Quality Improvement.

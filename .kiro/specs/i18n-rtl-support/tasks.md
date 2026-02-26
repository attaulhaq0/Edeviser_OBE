# Tasks — i18n & RTL Support (Arabic/English)

## 1. Database Migrations

- [ ] 1.1 Create migration: add `preferred_language VARCHAR(5) DEFAULT 'en'` column to `profiles` table with CHECK constraint for ('en', 'ar')
- [ ] 1.2 Create migration: backfill existing profiles with `preferred_language = 'en'` (or institution default if available)
- [ ] 1.3 Create migration: add `default_language` key to `institution_settings` JSONB with default value `'en'`
- [ ] 1.4 Create migration: add optional bilingual columns (`title_ar`, `name_ar`) to `institution_learning_outcomes`, `program_learning_outcomes`, `course_learning_outcomes`, `courses`, and `programs` tables

## 2. i18n Core Infrastructure

- [ ] 2.1 Create `src/lib/i18n.ts` — i18next initialization with `initReactI18next`, bundled JSON resources, fallback to English, Arabic pluralization, `supportedLngs: ['en', 'ar']`
- [ ] 2.2 Create `src/lib/directionManager.ts` — `getDirection()` and `applyDirection()` functions that set `dir`, `lang`, and font-family on `<html>` element
- [ ] 2.3 Update `src/main.tsx` — import `@/lib/i18n` as side-effect before React render
- [ ] 2.4 Update `src/lib/schemas/languagePrefs.ts` — add `supportedLanguages` const array and `SupportedLanguage` type export
- [ ] 2.5 Add `i18n` query keys to `src/lib/queryKeys.ts` (profile language preference)

## 3. Translation Files — English

- [ ] 3.1 Create `src/locales/en/common.json` — shared UI strings (buttons, status labels, pagination, attainment levels, Bloom's taxonomy, gamification terms, error messages, empty states)
- [ ] 3.2 Create `src/locales/en/auth.json` — login page, password reset, session strings
- [ ] 3.3 Create `src/locales/en/admin.json` — admin dashboard, user management, program/course/ILO management, audit logs, bonus events, institution settings strings
- [ ] 3.4 Create `src/locales/en/student.json` — student dashboard, assignments, leaderboard, journal, habits, marketplace strings
- [ ] 3.5 Create `src/locales/en/teacher.json` — teacher dashboard, CLO management, rubrics, grading, assignment management strings
- [ ] 3.6 Create `src/locales/en/coordinator.json` — coordinator dashboard, PLO management, curriculum matrix, CQI strings
- [ ] 3.7 Create `src/locales/en/parent.json` — parent dashboard, linked student view strings

## 4. Translation Files — Arabic

- [ ] 4.1 Create `src/locales/ar/common.json` — Arabic translations for all common UI strings
- [ ] 4.2 Create `src/locales/ar/auth.json` — Arabic translations for auth strings
- [ ] 4.3 Create `src/locales/ar/admin.json` — Arabic translations for admin strings
- [ ] 4.4 Create `src/locales/ar/student.json` — Arabic translations for student strings
- [ ] 4.5 Create `src/locales/ar/teacher.json` — Arabic translations for teacher strings
- [ ] 4.6 Create `src/locales/ar/coordinator.json` — Arabic translations for coordinator strings
- [ ] 4.7 Create `src/locales/ar/parent.json` — Arabic translations for parent strings

## 5. Utility Libraries

- [ ] 5.1 Create `src/lib/bilingualContent.ts` — `resolveBilingualContent()` and `createBilingualField()` pure functions with fallback logic
- [ ] 5.2 Create `src/lib/bidiText.ts` — `ltrIsolate()`, `rtlIsolate()`, and `startsWithRTL()` bidirectional text utilities
- [ ] 5.3 Create `src/lib/formatDate.ts` — locale-aware date formatting wrapping `date-fns` with Arabic/English locale switching
- [ ] 5.4 Create `src/lib/formatNumber.ts` — locale-aware number formatting using `Intl.NumberFormat` with `formatNumber()`, `formatPercent()`, `formatCompact()`

## 6. Language Switcher & Preference Persistence

- [ ] 6.1 Create `src/hooks/useLanguagePreference.ts` — TanStack Query mutation for updating `profiles.preferred_language`
- [ ] 6.2 Create `src/components/shared/LanguageSwitcher.tsx` — dropdown toggle between English/Arabic using Shadcn DropdownMenu, persists to profile + localStorage
- [ ] 6.3 Modify `src/providers/AuthProvider.tsx` — apply user's `preferred_language` from profile on authentication via `i18n.changeLanguage()`
- [ ] 6.4 Add LanguageSwitcher to all role layout headers (AdminLayout, CoordinatorLayout, TeacherLayout, StudentLayout, ParentLayout)
- [ ] 6.5 Add LanguageSwitcher to unauthenticated pages (LoginPage, ResetPasswordPage, UpdatePasswordPage)

## 7. Google Fonts & CSS Updates

- [ ] 7.1 Update `index.html` — add `Noto Sans Arabic` to Google Fonts link alongside existing `Noto Sans`
- [ ] 7.2 Update `src/index.css` — add `[dir="rtl"]` font-family rule and Radix popover direction fix

## 8. RTL Layout Migration — Shared Components

- [ ] 8.1 Migrate `src/components/shared/DataTable.tsx` — replace physical direction classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`) with logical equivalents (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`)
- [ ] 8.2 Migrate `src/components/shared/ConfirmDialog.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.3 Migrate `src/components/shared/EmptyState.tsx` — replace physical direction classes with logical equivalents (if any)
- [ ] 8.4 Migrate `src/components/shared/BadgeCollection.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.5 Migrate `src/components/shared/StreakDisplay.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.6 Migrate `src/components/shared/XPAwardToast.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.7 Migrate `src/components/shared/LevelProgress.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.8 Migrate `src/components/shared/BloomsVerbGuide.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.9 Migrate `src/components/shared/RubricPreview.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.10 Migrate `src/components/shared/CurriculumMatrix.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.11 Migrate `src/components/shared/BonusEventBanner.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.12 Migrate `src/components/shared/CellDetailSheet.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.13 Migrate `src/components/shared/BadgeAwardModal.tsx` — replace physical direction classes with logical equivalents
- [ ] 8.14 Migrate `src/components/shared/LevelUpOverlay.tsx` — replace physical direction classes with logical equivalents

## 9. RTL Layout Migration — Role Layouts & Navigation

- [ ] 9.1 Migrate Admin layout sidebar — replace `border-r` with `border-e`, physical margins/paddings with logical equivalents
- [ ] 9.2 Migrate Coordinator layout sidebar — same logical property migration
- [ ] 9.3 Migrate Teacher layout sidebar — same logical property migration
- [ ] 9.4 Migrate Student layout sidebar — same logical property migration
- [ ] 9.5 Migrate Parent layout sidebar — same logical property migration

## 10. RTL Layout Migration — Pages

- [ ] 10.1 Migrate Admin pages — replace physical direction classes in AdminDashboard, UserListPage, UserForm, ProgramListPage, ProgramForm, CourseListPage, CourseForm, ILOListPage, ILOForm, AuditLogPage, BonusXPEventManager
- [ ] 10.2 Migrate Coordinator pages — replace physical direction classes in PLOListPage, PLOForm, CurriculumMatrixPage
- [ ] 10.3 Migrate Teacher pages — replace physical direction classes in TeacherDashboard, CLOListPage, CLOForm, RubricBuilder, GradingInterface, AssignmentForm
- [ ] 10.4 Migrate Student pages — replace physical direction classes in StudentDashboard, AssignmentListPage, AssignmentDetailPage, LeaderboardPage
- [ ] 10.5 Migrate Auth pages — replace physical direction classes in LoginPage, ResetPasswordPage, UpdatePasswordPage

## 11. i18n String Extraction — Wrap Hardcoded Strings

- [ ] 11.1 Extract strings in auth pages (LoginPage, ResetPasswordPage, UpdatePasswordPage) — replace hardcoded text with `t()` calls using `auth` namespace
- [ ] 11.2 Extract strings in Admin pages — replace hardcoded text with `t()` calls using `admin` namespace
- [ ] 11.3 Extract strings in Coordinator pages — replace hardcoded text with `t()` calls using `coordinator` namespace
- [ ] 11.4 Extract strings in Teacher pages — replace hardcoded text with `t()` calls using `teacher` namespace
- [ ] 11.5 Extract strings in Student pages — replace hardcoded text with `t()` calls using `student` namespace
- [ ] 11.6 Extract strings in shared components — replace hardcoded text with `t()` calls using `common` namespace
- [ ] 11.7 Extract strings in toast notifications (Sonner calls) — replace hardcoded toast messages with `t()` calls
- [ ] 11.8 Extract strings in Zod validation error messages — use i18next for custom error messages in schemas

## 12. Bilingual Content Support

- [ ] 12.1 Add bilingual input fields to ILOForm (title_ar alongside existing title)
- [ ] 12.2 Add bilingual input fields to PLOForm (title_ar alongside existing title)
- [ ] 12.3 Add bilingual input fields to CLOForm (title_ar alongside existing title)
- [ ] 12.4 Add bilingual input fields to CourseForm (name_ar alongside existing name)
- [ ] 12.5 Add bilingual input fields to ProgramForm (name_ar alongside existing name)
- [ ] 12.6 Update list pages and display components to use `resolveBilingualContent()` for entity titles/names

## 13. Date & Number Localization Integration

- [ ] 13.1 Replace all direct `format()` calls from `date-fns` with `formatLocalDate()` from `src/lib/formatDate.ts`
- [ ] 13.2 Replace all direct number formatting with `formatNumber()` / `formatPercent()` from `src/lib/formatNumber.ts`
- [ ] 13.3 Update dashboard KPI cards to use locale-aware number formatting
- [ ] 13.4 Update attainment displays to use locale-aware percentage formatting

## 14. Admin Institution Settings

- [ ] 14.1 Add Default Language selector to institution settings page (dropdown: English / Arabic)
- [ ] 14.2 Update institution settings Zod schema to include `default_language` field
- [ ] 14.3 Update user creation flow to set `preferred_language` from institution default

## 15. Testing

- [ ] 15.1 Create `src/__tests__/properties/languageDetection.property.test.ts` — property test: language detection priority chain always returns a valid supported language (Property 1)
- [ ] 15.2 Create `src/__tests__/properties/translationParity.property.test.ts` — property test: all keys in English namespaces exist in Arabic namespaces and vice versa (Property 2)
- [ ] 15.3 Create `src/__tests__/properties/bilingualContent.property.test.ts` — property test: bilingual resolver returns non-empty string when at least one language is provided, correct language when both provided (Property 5)
- [ ] 15.4 Create `src/__tests__/properties/directionManager.property.test.ts` — property test: getDirection is idempotent and maps correctly for all supported languages (Properties 4, 7)
- [ ] 15.5 Create `src/__tests__/properties/bidiText.property.test.ts` — property test: ltrIsolate/rtlIsolate round-trip (strip isolate chars returns original string) (Property 9)
- [ ] 15.6 Create `src/__tests__/properties/formatNumber.property.test.ts` — property test: formatNumber produces non-empty string for any finite number (Property 8)
- [ ] 15.7 Create `src/__tests__/unit/languageSwitcher.test.tsx` — unit test: LanguageSwitcher renders, toggles language, persists preference
- [ ] 15.8 Create `src/__tests__/unit/directionManager.test.ts` — unit test: applyDirection sets correct dir/lang attributes
- [ ] 15.9 Create `src/__tests__/unit/formatDate.test.ts` — unit test: formatLocalDate returns correct locale-formatted strings

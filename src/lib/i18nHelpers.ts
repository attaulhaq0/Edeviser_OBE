/**
 * Internationalization helper functions
 *
 * Provides a single source of truth for Intl formatters with ar-QA defaults.
 * Consumers should never instantiate Intl.DateTimeFormat, Intl.NumberFormat, etc. directly.
 */

/**
 * Supported locales
 */
export type SupportedLocale = "en" | "ar-QA";

/**
 * Format a date value
 *
 * Usage:
 * ```tsx
 * formatDate(new Date(), 'ar-QA') // "١٢ مايو ٢٠٢٦"
 * formatDate(new Date(), 'en')    // "May 12, 2026"
 * ```
 */
export const formatDate = (
  value: Date | number,
  locale: SupportedLocale = "ar-QA",
  options?: Intl.DateTimeFormatOptions
): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(
    typeof value === "number" ? new Date(value) : value
  );
};

/**
 * Format a date as a short date (e.g., "12/05/2026" or "١٢/٠٥/٢٠٢٦")
 */
export const formatDateShort = (
  value: Date | number,
  locale: SupportedLocale = "ar-QA"
): string => {
  return formatDate(value, locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * Format a date with time (e.g., "May 12, 2026, 3:30 PM")
 */
export const formatDateTime = (
  value: Date | number,
  locale: SupportedLocale = "ar-QA"
): string => {
  return formatDate(value, locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Format a number value
 *
 * For Arabic locale, uses Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)
 *
 * Usage:
 * ```tsx
 * formatNumber(1234.56, 'ar-QA') // "١٬٢٣٤٫٥٦"
 * formatNumber(1234.56, 'en')    // "1,234.56"
 * ```
 */
export const formatNumber = (
  value: number,
  locale: SupportedLocale = "ar-QA",
  options?: Intl.NumberFormatOptions
): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  return new Intl.NumberFormat(locale, defaultOptions).format(value);
};

/**
 * Format a number as currency
 *
 * Usage:
 * ```tsx
 * formatCurrency(1234.56, 'ar-QA', 'QAR') // "١٬٢٣٤٫٥٦ ر.ق."
 * formatCurrency(1234.56, 'en', 'USD')    // "$1,234.56"
 * ```
 */
export const formatCurrency = (
  value: number,
  locale: SupportedLocale = "ar-QA",
  currency: string = "QAR"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);
};

/**
 * Format a number as a percentage
 *
 * Usage:
 * ```tsx
 * formatPercentage(0.856, 'ar-QA') // "٨٥٫٦٪"
 * formatPercentage(0.856, 'en')    // "85.6%"
 * ```
 */
export const formatPercentage = (
  value: number,
  locale: SupportedLocale = "ar-QA",
  fractionDigits: number = 1
): string => {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

/**
 * Format relative time (e.g., "2 days ago", "في يومين")
 *
 * Usage:
 * ```tsx
 * formatRelativeTime(-2, 'day', 'ar-QA') // "منذ يومين"
 * formatRelativeTime(-2, 'day', 'en')    // "2 days ago"
 * formatRelativeTime(1, 'hour', 'ar-QA') // "في ساعة"
 * formatRelativeTime(1, 'hour', 'en')    // "in 1 hour"
 * ```
 */
export const formatRelativeTime = (
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: SupportedLocale = "ar-QA"
): string => {
  return new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  }).format(value, unit);
};

/**
 * Format a list of items
 *
 * Note: Intl.ListFormat is only available in ES2021+
 * For now, this is a simple implementation that joins with commas
 *
 * Usage:
 * ```tsx
 * formatList(['apple', 'banana', 'cherry']) // "apple, banana, cherry"
 * ```
 */
export const formatList = (
  items: string[],
  _locale: SupportedLocale = "ar-QA",
  _type: "conjunction" | "disjunction" = "conjunction"
): string => {
  // Simple implementation: join with commas
  // TODO: Use Intl.ListFormat when ES2021+ is available
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  const lastItem = items[items.length - 1] ?? "";
  return items.slice(0, -1).join(", ") + " and " + lastItem;
};

/**
 * Get the text direction for a locale
 *
 * Usage:
 * ```tsx
 * getTextDirection('ar-QA') // "rtl"
 * getTextDirection('en')    // "ltr"
 * ```
 */
export const getTextDirection = (locale: SupportedLocale): "ltr" | "rtl" => {
  return locale.startsWith("ar") ? "rtl" : "ltr";
};

/**
 * Get the text alignment for a locale
 *
 * Usage:
 * ```tsx
 * getTextAlign('ar-QA') // "right"
 * getTextAlign('en')    // "left"
 * ```
 */
export const getTextAlign = (locale: SupportedLocale): "left" | "right" => {
  return locale.startsWith("ar") ? "right" : "left";
};

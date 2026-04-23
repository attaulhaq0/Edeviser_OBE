import i18n from '@/lib/i18n';

const getLocale = (): string => (i18n.language === 'ar' ? 'ar-QA' : 'en-US');

/**
 * Formats a number using the active i18n locale.
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat(getLocale()).format(value);
};

/**
 * Formats a number as a percentage using the active i18n locale.
 * @param value - The percentage value (e.g. 85 for 85%)
 * @param decimals - Number of decimal places (default: 0)
 */
export const formatPercent = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat(getLocale(), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

/**
 * Formats a number in compact notation (e.g. 1.2K, 3.4M).
 */
export const formatCompact = (value: number): string => {
  return new Intl.NumberFormat(getLocale(), { notation: 'compact' }).format(value);
};

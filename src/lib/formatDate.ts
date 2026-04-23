import { format, formatDistanceToNow, type Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { ar } from 'date-fns/locale/ar';
import i18n from '@/lib/i18n';

const localeMap: Record<string, Locale> = { en: enUS, ar };

const getLocale = (): Locale => localeMap[i18n.language] || enUS;

/**
 * Formats a date using the active i18n locale.
 * @param date - Date object or ISO string
 * @param pattern - date-fns format pattern (default: 'PPP')
 */
export const formatLocalDate = (
  date: Date | string,
  pattern: string = 'PPP',
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, pattern, { locale: getLocale() });
};

/**
 * Formats a date as a relative time string (e.g. "3 hours ago").
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: getLocale() });
};

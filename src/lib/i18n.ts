import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English namespaces
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enAdmin from '@/locales/en/admin.json';
import enTeacher from '@/locales/en/teacher.json';
import enStudent from '@/locales/en/student.json';
import enCoordinator from '@/locales/en/coordinator.json';
import enGamification from '@/locales/en/gamification.json';
import enAi from '@/locales/en/ai.json';

// Arabic namespaces
import arCommon from '@/locales/ar/common.json';
import arAuth from '@/locales/ar/auth.json';
import arAdmin from '@/locales/ar/admin.json';
import arTeacher from '@/locales/ar/teacher.json';
import arStudent from '@/locales/ar/student.json';
import arCoordinator from '@/locales/ar/coordinator.json';
import arGamification from '@/locales/ar/gamification.json';
import arAi from '@/locales/ar/ai.json';

import { applyDirection } from '@/lib/directionManager';

export const defaultNS = 'common';
export const supportedLanguages = ['en', 'ar'] as const;
export const namespaces = [
  'common', 'auth', 'admin', 'teacher', 'student',
  'coordinator', 'gamification', 'ai',
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type Namespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    admin: enAdmin,
    teacher: enTeacher,
    student: enStudent,
    coordinator: enCoordinator,
    gamification: enGamification,
    ai: enAi,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    admin: arAdmin,
    teacher: arTeacher,
    student: arStudent,
    coordinator: arCoordinator,
    gamification: arGamification,
    ai: arAi,
  },
} as const;

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('edeviser-language')
  : null;

i18n.use(initReactI18next).init({
  resources,
  lng: savedLang || 'en',
  fallbackLng: 'en',
  defaultNS,
  ns: [...namespaces],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  pluralSeparator: '_',
  supportedLngs: ['en', 'ar'],
});

// Apply direction on init and on every language change
applyDirection(i18n.language);
i18n.on('languageChanged', applyDirection);

export default i18n;

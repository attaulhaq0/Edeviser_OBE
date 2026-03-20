import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from '@/locales/en/common.json';
import auth from '@/locales/en/auth.json';
import admin from '@/locales/en/admin.json';
import teacher from '@/locales/en/teacher.json';
import student from '@/locales/en/student.json';
import gamification from '@/locales/en/gamification.json';
import ai from '@/locales/en/ai.json';

export const defaultNS = 'common';
export const supportedLanguages = ['en'] as const;
export const namespaces = ['common', 'auth', 'admin', 'teacher', 'student', 'gamification', 'ai'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];
export type Namespace = (typeof namespaces)[number];

export const resources = {
  en: {
    common,
    auth,
    admin,
    teacher,
    student,
    gamification,
    ai,
  },
} as const;

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  defaultNS,
  ns: [...namespaces],
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;

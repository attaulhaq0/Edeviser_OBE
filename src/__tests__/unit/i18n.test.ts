import { describe, it, expect } from 'vitest';
import i18n, { resources, defaultNS, namespaces, supportedLanguages } from '@/lib/i18n';

describe('i18n initialization', () => {
  it('initializes i18next successfully', () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it('defaults to English language', () => {
    expect(i18n.language).toBe('en');
  });

  it('has English as fallback language', () => {
    expect(i18n.options.fallbackLng).toEqual(['en']);
  });

  it('has escapeValue set to false', () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false);
  });

  it('exports all expected namespaces', () => {
    expect(namespaces).toEqual([
      'common',
      'auth',
      'admin',
      'teacher',
      'student',
      'gamification',
      'ai',
    ]);
  });

  it('exports supported languages', () => {
    expect(supportedLanguages).toEqual(['en']);
  });

  it('uses common as default namespace', () => {
    expect(defaultNS).toBe('common');
  });

  it('loads all namespace resource bundles for English', () => {
    for (const ns of namespaces) {
      expect(resources.en[ns]).toBeDefined();
      expect(typeof resources.en[ns]).toBe('object');
      expect(Object.keys(resources.en[ns]).length).toBeGreaterThan(0);
    }
  });
});

describe('common translation keys', () => {
  it('translates nav.dashboard', () => {
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });

  it('translates buttons.save', () => {
    expect(i18n.t('buttons.save')).toBe('Save');
  });

  it('translates buttons.cancel', () => {
    expect(i18n.t('buttons.cancel')).toBe('Cancel');
  });

  it('translates buttons.delete', () => {
    expect(i18n.t('buttons.delete')).toBe('Delete');
  });

  it('translates errors.generic', () => {
    expect(i18n.t('errors.generic')).toBe('Something went wrong. Please try again.');
  });

  it('translates status.loading', () => {
    expect(i18n.t('status.loading')).toBe('Loading...');
  });

  it('translates form.required', () => {
    expect(i18n.t('form.required')).toBe('This field is required');
  });
});

describe('auth translation keys', () => {
  it('translates auth:login.title', () => {
    expect(i18n.t('login.title', { ns: 'auth' })).toBe('Sign In');
  });

  it('translates auth:logout.button', () => {
    expect(i18n.t('logout.button', { ns: 'auth' })).toBe('Sign Out');
  });

  it('translates auth:resetPassword.title', () => {
    expect(i18n.t('resetPassword.title', { ns: 'auth' })).toBe('Reset Password');
  });
});

describe('gamification translation keys', () => {
  it('translates gamification:xp.title', () => {
    expect(i18n.t('xp.title', { ns: 'gamification' })).toBe('Experience Points');
  });

  it('translates gamification:streaks.title', () => {
    expect(i18n.t('streaks.title', { ns: 'gamification' })).toBe('Login Streak');
  });

  it('translates gamification:badges.title', () => {
    expect(i18n.t('badges.title', { ns: 'gamification' })).toBe('Badges');
  });

  it('translates gamification:leaderboard.title', () => {
    expect(i18n.t('leaderboard.title', { ns: 'gamification' })).toBe('Leaderboard');
  });

  it('handles interpolation in gamification:xp.earned', () => {
    expect(i18n.t('xp.earned', { ns: 'gamification', amount: 50 })).toBe('+50 XP');
  });
});

describe('namespace-specific key existence', () => {
  it('admin namespace has dashboard keys', () => {
    expect(i18n.t('dashboard.title', { ns: 'admin' })).toBe('Admin Dashboard');
  });

  it('teacher namespace has grading keys', () => {
    expect(i18n.t('grading.title', { ns: 'teacher' })).toBe('Grading');
  });

  it('student namespace has assignments keys', () => {
    expect(i18n.t('assignments.title', { ns: 'student' })).toBe('Assignments');
  });

  it('ai namespace has suggestions keys', () => {
    expect(i18n.t('suggestions.title', { ns: 'ai' })).toBe('AI Suggestions');
  });
});

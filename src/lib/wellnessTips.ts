import type { WellnessTip, WellnessHabitType } from '@/types/habits';

// ---------------------------------------------------------------------------
// Curated wellness tips — static data, no DB table needed
// ---------------------------------------------------------------------------

export const WELLNESS_TIPS: WellnessTip[] = [
  // ── Meditation: Onboarding ──────────────────────────────────────────────
  {
    id: 'med-onboard-1',
    habitType: 'meditation',
    text: 'Start with just 2 minutes of meditation — consistency matters more than duration.',
    isOnboarding: true,
  },
  {
    id: 'med-onboard-2',
    habitType: 'meditation',
    text: 'Find a quiet spot and focus on your breathing. Even a short pause can reset your focus.',
    isOnboarding: true,
  },
  {
    id: 'med-onboard-3',
    habitType: 'meditation',
    text: 'Try meditating at the same time each day to build a routine that sticks.',
    isOnboarding: true,
  },
  // ── Meditation: Rotating ────────────────────────────────────────────────
  {
    id: 'med-rotate-1',
    habitType: 'meditation',
    text: 'Body scan meditation can help release tension you didn\'t know you were holding.',
    isOnboarding: false,
  },
  {
    id: 'med-rotate-2',
    habitType: 'meditation',
    text: 'If your mind wanders during meditation, gently bring it back — that IS the practice.',
    isOnboarding: false,
  },
  {
    id: 'med-rotate-3',
    habitType: 'meditation',
    text: 'Research suggests 10 minutes of daily meditation can improve focus and reduce stress.',
    resourceUrl: 'https://www.headspace.com/meditation/benefits',
    resourceLabel: 'Learn more about meditation benefits',
    isOnboarding: false,
  },
  {
    id: 'med-rotate-4',
    habitType: 'meditation',
    text: 'Try box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4. Repeat 4 times.',
    isOnboarding: false,
  },
  {
    id: 'med-rotate-5',
    habitType: 'meditation',
    text: 'Pair meditation with an existing habit (like after brushing teeth) to build consistency.',
    isOnboarding: false,
  },

  // ── Hydration: Onboarding ──────────────────────────────────────────────
  {
    id: 'hyd-onboard-1',
    habitType: 'hydration',
    text: 'Aim for 8 glasses of water a day. Keep a water bottle at your desk as a visual reminder.',
    isOnboarding: true,
  },
  {
    id: 'hyd-onboard-2',
    habitType: 'hydration',
    text: 'Start your morning with a glass of water — it helps kickstart your metabolism.',
    isOnboarding: true,
  },
  {
    id: 'hyd-onboard-3',
    habitType: 'hydration',
    text: 'If plain water feels boring, try adding a slice of lemon or cucumber for flavor.',
    isOnboarding: true,
  },
  // ── Hydration: Rotating ─────────────────────────────────────────────────
  {
    id: 'hyd-rotate-1',
    habitType: 'hydration',
    text: 'Even mild dehydration can impair concentration and short-term memory.',
    isOnboarding: false,
  },
  {
    id: 'hyd-rotate-2',
    habitType: 'hydration',
    text: 'Drink a glass of water before each meal — it aids digestion and helps you stay on track.',
    isOnboarding: false,
  },
  {
    id: 'hyd-rotate-3',
    habitType: 'hydration',
    text: 'Herbal teas count toward your daily water intake and add variety.',
    isOnboarding: false,
  },
  {
    id: 'hyd-rotate-4',
    habitType: 'hydration',
    text: 'Set hourly reminders to take a few sips — small amounts add up throughout the day.',
    isOnboarding: false,
  },
  {
    id: 'hyd-rotate-5',
    habitType: 'hydration',
    text: 'Proper hydration supports cognitive function during study sessions.',
    resourceUrl: 'https://www.cdc.gov/healthy-weight-growth/drinking-water/index.html',
    resourceLabel: 'CDC hydration guidelines',
    isOnboarding: false,
  },

  // ── Exercise: Onboarding ───────────────────────────────────────────────
  {
    id: 'exe-onboard-1',
    habitType: 'exercise',
    text: 'Even a 10-minute walk counts. Start small and build up gradually.',
    isOnboarding: true,
  },
  {
    id: 'exe-onboard-2',
    habitType: 'exercise',
    text: 'Pick an activity you enjoy — you\'re more likely to stick with exercise that feels fun.',
    isOnboarding: true,
  },
  {
    id: 'exe-onboard-3',
    habitType: 'exercise',
    text: 'Schedule exercise like a class — put it in your calendar to make it non-negotiable.',
    isOnboarding: true,
  },
  // ── Exercise: Rotating ──────────────────────────────────────────────────
  {
    id: 'exe-rotate-1',
    habitType: 'exercise',
    text: 'A brisk 20-minute walk can boost your mood and creativity for hours afterward.',
    isOnboarding: false,
  },
  {
    id: 'exe-rotate-2',
    habitType: 'exercise',
    text: 'Try the "exercise snack" approach: 3 sets of 10 squats spread throughout the day.',
    isOnboarding: false,
  },
  {
    id: 'exe-rotate-3',
    habitType: 'exercise',
    text: 'Regular physical activity improves sleep quality and academic performance.',
    resourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
    resourceLabel: 'WHO physical activity guidelines',
    isOnboarding: false,
  },
  {
    id: 'exe-rotate-4',
    habitType: 'exercise',
    text: 'Stretching between study sessions reduces muscle tension and refreshes your focus.',
    isOnboarding: false,
  },
  {
    id: 'exe-rotate-5',
    habitType: 'exercise',
    text: 'Find an exercise buddy — accountability partners increase consistency by up to 65%.',
    isOnboarding: false,
  },

  // ── Sleep: Onboarding ──────────────────────────────────────────────────
  {
    id: 'slp-onboard-1',
    habitType: 'sleep',
    text: 'Aim for 7–9 hours of sleep. A consistent bedtime is more important than total hours.',
    isOnboarding: true,
  },
  {
    id: 'slp-onboard-2',
    habitType: 'sleep',
    text: 'Put your phone away 30 minutes before bed — blue light disrupts your sleep cycle.',
    isOnboarding: true,
  },
  {
    id: 'slp-onboard-3',
    habitType: 'sleep',
    text: 'Track your sleep to spot patterns. Even logging the hours helps build awareness.',
    isOnboarding: true,
  },
  // ── Sleep: Rotating ─────────────────────────────────────────────────────
  {
    id: 'slp-rotate-1',
    habitType: 'sleep',
    text: 'A cool, dark room (around 65°F / 18°C) is optimal for quality sleep.',
    isOnboarding: false,
  },
  {
    id: 'slp-rotate-2',
    habitType: 'sleep',
    text: 'Avoid caffeine after 2 PM — it has a half-life of about 5 hours.',
    isOnboarding: false,
  },
  {
    id: 'slp-rotate-3',
    habitType: 'sleep',
    text: 'Students who sleep 7+ hours perform significantly better on exams.',
    resourceUrl: 'https://www.sleepfoundation.org/teens-and-sleep',
    resourceLabel: 'Sleep Foundation research',
    isOnboarding: false,
  },
  {
    id: 'slp-rotate-4',
    habitType: 'sleep',
    text: 'A short wind-down routine (reading, stretching) signals your body it\'s time to rest.',
    isOnboarding: false,
  },
  {
    id: 'slp-rotate-5',
    habitType: 'sleep',
    text: 'Naps under 20 minutes can boost alertness without affecting nighttime sleep.',
    isOnboarding: false,
  },
];

// ---------------------------------------------------------------------------
// Tip rotation (deterministic, weekly)
// ---------------------------------------------------------------------------

export function getCurrentWellnessTip(
  habitType: WellnessHabitType,
  tips: WellnessTip[],
): WellnessTip | null {
  const habitTips = tips.filter((t) => t.habitType === habitType && !t.isOnboarding);
  if (habitTips.length === 0) return null;
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return habitTips[weekNumber % habitTips.length] ?? null;
}

export function getOnboardingTip(
  habitType: WellnessHabitType,
  tips: WellnessTip[],
): WellnessTip | null {
  const onboardingTips = tips.filter((t) => t.habitType === habitType && t.isOnboarding);
  return onboardingTips.length > 0 ? (onboardingTips[0] as WellnessTip) : null;
}

// ---------------------------------------------------------------------------
// Wellness target progress computation
// ---------------------------------------------------------------------------

export function computeWellnessProgress(
  loggedValue: number,
  targetValue: number,
): number {
  if (targetValue <= 0) return loggedValue > 0 ? 100 : 0;
  return Math.min(Math.round((loggedValue / targetValue) * 100), 100);
}

// ---------------------------------------------------------------------------
// Default units per habit type
// ---------------------------------------------------------------------------

export const WELLNESS_UNITS: Record<WellnessHabitType, string> = {
  meditation: 'min',
  hydration: 'glasses',
  exercise: 'min',
  sleep: 'hours',
};

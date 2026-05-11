import type { Step } from "react-joyride";

/**
 * Student role guided tour steps.
 * Targets: top-bar → sidebar nav → welcome hero → KPI row → habits tracker → XP/streak display → badges → language/theme switcher → profile dropdown
 *
 * Design: ADR-02, §8.5
 * Requirements: 2.15
 */
export const studentTourSteps: Step[] = [
  {
    target: '[data-tour="top-bar"]',
    content: "tour.student.step1.content",
    title: "tour.student.step1.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="primary-nav"]',
    content: "tour.student.step2.content",
    title: "tour.student.step2.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="welcome-hero"]',
    content: "tour.student.step3.content",
    title: "tour.student.step3.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="kpi-row"]',
    content: "tour.student.step4.content",
    title: "tour.student.step4.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="habits-tracker"]',
    content: "tour.student.step5.content",
    title: "tour.student.step5.title",
    placement: "top",
  },
  {
    target: '[data-tour="xp-streak"]',
    content: "tour.student.step6.content",
    title: "tour.student.step6.title",
    placement: "top",
  },
  {
    target: '[data-tour="profile"]',
    content: "tour.student.step7.content",
    title: "tour.student.step7.title",
    placement: "bottom",
  },
];

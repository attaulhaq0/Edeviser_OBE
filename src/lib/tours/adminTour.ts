import type { Step } from "react-joyride";

/**
 * Admin role guided tour steps.
 * Targets: top-bar → sidebar nav → KPI row → primary action → section cards → language/theme switcher → profile dropdown
 *
 * Design: ADR-02, §8.5
 * Requirements: 2.15
 */
export const adminTourSteps: Step[] = [
  {
    target: '[data-tour="top-bar"]',
    content: "tour.admin.step1.content",
    title: "tour.admin.step1.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="primary-nav"]',
    content: "tour.admin.step2.content",
    title: "tour.admin.step2.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="kpi-row"]',
    content: "tour.admin.step3.content",
    title: "tour.admin.step3.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="primary-action"]',
    content: "tour.admin.step4.content",
    title: "tour.admin.step4.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="section-card"]',
    content: "tour.admin.step5.content",
    title: "tour.admin.step5.title",
    placement: "top",
  },
  {
    target: '[data-tour="language-switcher"]',
    content: "tour.admin.step6.content",
    title: "tour.admin.step6.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="profile"]',
    content: "tour.admin.step7.content",
    title: "tour.admin.step7.title",
    placement: "bottom",
  },
];

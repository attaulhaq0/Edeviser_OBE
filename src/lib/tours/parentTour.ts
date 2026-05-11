import type { Step } from "react-joyride";

/**
 * Parent role guided tour steps.
 * Targets: top-bar → sidebar nav → KPI row → linked students → fees/billing → planner → language/theme switcher → profile dropdown
 *
 * Design: ADR-02, §8.5
 * Requirements: 2.15
 */
export const parentTourSteps: Step[] = [
  {
    target: '[data-tour="top-bar"]',
    content: "tour.parent.step1.content",
    title: "tour.parent.step1.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="primary-nav"]',
    content: "tour.parent.step2.content",
    title: "tour.parent.step2.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="kpi-row"]',
    content: "tour.parent.step3.content",
    title: "tour.parent.step3.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="linked-students"]',
    content: "tour.parent.step4.content",
    title: "tour.parent.step4.title",
    placement: "top",
  },
  {
    target: '[data-tour="fees-billing"]',
    content: "tour.parent.step5.content",
    title: "tour.parent.step5.title",
    placement: "top",
  },
  {
    target: '[data-tour="planner"]',
    content: "tour.parent.step6.content",
    title: "tour.parent.step6.title",
    placement: "top",
  },
  {
    target: '[data-tour="profile"]',
    content: "tour.parent.step7.content",
    title: "tour.parent.step7.title",
    placement: "bottom",
  },
];

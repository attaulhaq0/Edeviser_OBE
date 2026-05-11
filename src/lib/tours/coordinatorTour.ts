import type { Step } from "react-joyride";

/**
 * Coordinator role guided tour steps.
 * Targets: top-bar → sidebar nav → KPI row → curriculum matrix → PLO management → language/theme switcher → profile dropdown
 *
 * Design: ADR-02, §8.5
 * Requirements: 2.15
 */
export const coordinatorTourSteps: Step[] = [
  {
    target: '[data-tour="top-bar"]',
    content: "tour.coordinator.step1.content",
    title: "tour.coordinator.step1.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="primary-nav"]',
    content: "tour.coordinator.step2.content",
    title: "tour.coordinator.step2.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="kpi-row"]',
    content: "tour.coordinator.step3.content",
    title: "tour.coordinator.step3.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="curriculum-matrix"]',
    content: "tour.coordinator.step4.content",
    title: "tour.coordinator.step4.title",
    placement: "top",
  },
  {
    target: '[data-tour="plo-management"]',
    content: "tour.coordinator.step5.content",
    title: "tour.coordinator.step5.title",
    placement: "top",
  },
  {
    target: '[data-tour="language-switcher"]',
    content: "tour.coordinator.step6.content",
    title: "tour.coordinator.step6.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="profile"]',
    content: "tour.coordinator.step7.content",
    title: "tour.coordinator.step7.title",
    placement: "bottom",
  },
];

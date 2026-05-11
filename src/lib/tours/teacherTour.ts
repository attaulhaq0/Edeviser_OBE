import type { Step } from "react-joyride";

/**
 * Teacher role guided tour steps.
 * Targets: top-bar → sidebar nav → KPI row → CLO creation → rubric builder → grading queue → language/theme switcher → profile dropdown
 *
 * Design: ADR-02, §8.5
 * Requirements: 2.15
 */
export const teacherTourSteps: Step[] = [
  {
    target: '[data-tour="top-bar"]',
    content: "tour.teacher.step1.content",
    title: "tour.teacher.step1.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="primary-nav"]',
    content: "tour.teacher.step2.content",
    title: "tour.teacher.step2.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="kpi-row"]',
    content: "tour.teacher.step3.content",
    title: "tour.teacher.step3.title",
    placement: "bottom",
  },
  {
    target: '[data-tour="clo-creation"]',
    content: "tour.teacher.step4.content",
    title: "tour.teacher.step4.title",
    placement: "top",
  },
  {
    target: '[data-tour="rubric-builder"]',
    content: "tour.teacher.step5.content",
    title: "tour.teacher.step5.title",
    placement: "top",
  },
  {
    target: '[data-tour="grading-queue"]',
    content: "tour.teacher.step6.content",
    title: "tour.teacher.step6.title",
    placement: "top",
  },
  {
    target: '[data-tour="language-switcher"]',
    content: "tour.teacher.step7.content",
    title: "tour.teacher.step7.title",
    placement: "bottom",
  },
];

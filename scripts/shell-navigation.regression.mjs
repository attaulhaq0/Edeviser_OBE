// Standalone real-Chromium shell/navigation regression against a temporary Vite
// production build of the ACTUAL shell, header, sidebar, bottom bar, Buttons,
// Radix primitives, navigation data, English/Arabic resources and source CSS.
// Run: node --test scripts/shell-navigation.regression.mjs
//
// Exact aliases isolate auth/data/analytics/AI/tour and expensive header widgets.
// Header notification/profile placeholders use real Buttons but DO NOT verify
// those widgets' own geometry/behavior. Font readiness is checked in Round9;
// custom-glyph proof is limited to the student-scene titles/subtitles. No general
// font-glyph, auth/route-guard, physical-notch, backend, offline/PWA or full-page
// application claim is made.
// No repository Playwright config, .env files, seeds or report directories used.
// D13 adds 10 bounded role/theme Button contrast cases plus parser sanity; the
// original 82 navigation/header cases remain. D01/D03 adds four dedicated cases.
// Contrast-only diagnostics:
// node --test --test-skip-pattern='Student actual screen|Batch8|Round9|D15 progress families|Shared patterns|D01/D03| / (en|ar) / (light|dark) /|actual wide header /' scripts/shell-navigation.regression.mjs
// Only the four D01/D03 cases (actual grid; XP/CSS-utility CONTRACT probes):
// node --test --test-skip-pattern='Student actual screen|Batch8|Round9|D15 progress families|Shared patterns|D13| / (en|ar) / (light|dark) /|actual wide header /' scripts/shell-navigation.regression.mjs
// Six shared-pattern/progress-family cases plus existing independent parser sanity:
// node --test --test-skip-pattern='Student actual screen|Batch8|Round9|D01/D03|D13 actual Button| / (en|ar) / (light|dark) /|actual wide header /' scripts/shell-navigation.regression.mjs
// Four Round9 cases only (all104 earlier tests remain in the full command):
// node --test --test-skip-pattern='Student actual screen|Batch8|D01/D03|D13|D15 progress families|Shared patterns| / (en|ar) / (light|dark) /|actual wide header /' scripts/shell-navigation.regression.mjs
// Four Batch8 cases only (all108 earlier cases preserved; full suite now114):
// node --test --test-skip-pattern='Student actual screen|Round9|D01/D03|D13|D15 progress families|Shared patterns| / (en|ar) / (light|dark) /|actual wide header /' scripts/shell-navigation.regression.mjs
// New student screen +the two updated Round9 progress groups (not the full114):
// node --test --test-skip-pattern='Batch8|Round9 onboarding|D01/D03|D13|D15 progress families|Shared patterns| / (en|ar) / (light|dark) /|actual wide header /' scripts/shell-navigation.regression.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { build, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";

const require = createRequire(import.meta.url);
const repository = fileURLToPath(new URL("../", import.meta.url));
const roles = ["student", "teacher", "coordinator", "admin", "parent"];
const widths = [320, 390, 639, 640];
const height = 844;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactAlias = (name, replacement) => ({ find: new RegExp(`^${escapeRegex(name)}$`), replacement });

function hasStandaloneUtility(css, utility) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g, '""');
  // Optimizers can group base utility selectors. Require an entire selector-list
  // member, not a suffix, variant-only class, descendant, or declaration value.
  return [...withoutComments.matchAll(/([^{}]+)\{/g)].some((rule) =>
    rule[1].split(",").some((selector) => selector.trim() === `.${utility}`));
}

function utilityDiagnostic(css, utility) {
  const index = css.indexOf(`.${utility}`);
  if (index < 0) return `No literal .${utility} occurrence in emitted CSS`;
  return css.slice(Math.max(0, index - 150), Math.min(css.length, index + utility.length + 1 + 150));
}

// Self-contained: the same numeric implementation runs in Node sanity checks
// and in Chromium through addInitScript. Backgrounds are nearest-first.
function contrastFromCssColors(foreground, backgrounds) {
  const number = (value, percentScale = 1) => {
    if (!/^[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?%?$/i.test(value)) throw new Error(`Unsupported color channel: ${value}`);
    return value.endsWith("%") ? parseFloat(value) / 100 * percentScale : parseFloat(value);
  };
  const color = (value) => {
    const input = value.trim().toLowerCase();
    if (input === "transparent") return [0, 0, 0, 0];
    const hex = input.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      const digits = hex[1].length === 3 ? hex[1].split("").map((digit) => digit + digit).join("") : hex[1];
      return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16) / 255).concat(1);
    }
    const match = input.match(/^(rgba?|color|oklab|oklch)\((.*)\)$/);
    if (!match) throw new Error(`Unsupported CSS color: ${value}`);
    let body = match[2];
    if (match[1] === "color") {
      if (!body.startsWith("srgb ")) throw new Error(`Unsupported color space: ${value}`);
      body = body.slice(5);
    }
    const slash = body.split("/");
    if (slash.length > 2) throw new Error(`Unsupported CSS color: ${value}`);
    const parts = slash[0].replace(/,/g, " ").trim().split(/\s+/);
    const alpha = slash[1] !== undefined ? number(slash[1].trim()) : parts.length === 4 ? number(parts.pop()) : 1;
    if (parts.length !== 3 || alpha < 0 || alpha > 1) throw new Error(`Unsupported CSS color: ${value}`);
    let channels;
    if (match[1].startsWith("rgb")) channels = parts.map((part) => number(part, 255) / 255);
    else if (match[1] === "color") channels = parts.map((part) => number(part));
    else {
      const lightness = number(parts[0]);
      let a = number(parts[1], 0.4);
      let b;
      if (match[1] === "oklch") {
        const hue = parts[2].match(/^([+-]?(?:\d*\.)?\d+)(deg|rad|grad|turn)?$/);
        if (!hue) throw new Error(`Unsupported hue: ${value}`);
        const radians = Number(hue[1]) * ({ deg: Math.PI / 180, rad: 1, grad: Math.PI / 200, turn: 2 * Math.PI }[hue[2] ?? "deg"]);
        b = a * Math.sin(radians);
        a *= Math.cos(radians);
      } else b = number(parts[2], 0.4);
      const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
      const encode = (linear) => linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
      channels = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(encode);
    }
    // Observed near-white CSSOM oklab serialization converts to red=1.000129911,
    // an excursion of 0.03313 of ONE 8-bit channel step. Permit at most 1/16 of
    // that step (0.000245098 normalized), then clamp ONLY near-edge channels.
    // This is not gamut mapping: larger excursions and unknown spaces fail.
    const edgeTolerance = 1 / (16 * 255);
    if (channels.some((channel) => !Number.isFinite(channel) || channel < -edgeTolerance || channel > 1 + edgeTolerance)) {
      throw new Error(`Unsupported out-of-sRGB color: ${value}; channels=${channels.join(",")}; tolerance=${edgeTolerance}`);
    }
    return channels.map((channel) => Math.max(0, Math.min(1, channel))).concat(alpha);
  };
  const over = (front, back) => {
    const alpha = front[3] + back[3] * (1 - front[3]);
    return [0, 1, 2].map((channel) => alpha === 0 ? 0 :
      (front[channel] * front[3] + back[channel] * back[3] * (1 - front[3])) / alpha).concat(alpha);
  };
  if (backgrounds.length === 0) throw new Error("No proven opaque background");
  let background = [0, 0, 0, 0];
  for (const value of backgrounds.slice().reverse()) background = over(color(value), background);
  if (background[3] < 1) throw new Error("No proven opaque background");
  const text = over(color(foreground), background);
  const luminance = (rgba) => rgba.slice(0, 3).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const a = luminance(text), b = luminance(background);
  return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), text, background };
}

// Browser-only CSSOM traversal. Never guess through gradients, group opacity,
// filters, blend modes or unknown paint. Brand logos are not sampled as text.
function readCssTextContrast(element) {
  const backgroundLayers = [];
  let reachedOpaque = false;
  for (let current = element; current; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (Number(style.opacity) !== 1 || style.filter !== "none" || style.mixBlendMode !== "normal") {
      throw new Error(`Unsupported group opacity/filter/blend on ${current.tagName}: ${style.opacity}, ${style.filter}, ${style.mixBlendMode}`);
    }
    if (!reachedOpaque) {
      if (style.backgroundImage !== "none" || style.backdropFilter !== "none" || style.backgroundClip.includes("text") || style.boxShadow.includes("inset")) {
        throw new Error(`Unsupported background paint on ${current.tagName}: ${style.backgroundImage}; backdrop=${style.backdropFilter}; shadow=${style.boxShadow}`);
      }
      for (const pseudo of ["::before", "::after"]) {
        const generated = getComputedStyle(current, pseudo);
        if (!["none", "normal"].includes(generated.content) && generated.display !== "none" && Number(generated.opacity) !== 0) {
          throw new Error(`Unsupported generated paint ${current.tagName}${pseudo}`);
        }
      }
      backgroundLayers.push(style.backgroundColor);
      try {
        window.__shellContrastMath("rgb(0, 0, 0)", backgroundLayers);
        reachedOpaque = true;
      } catch (error) {
        if (!String(error).includes("No proven opaque background")) throw error;
      }
    }
  }
  if (!reachedOpaque) throw new Error("No proven opaque ancestor background");
  const style = getComputedStyle(element);
  if (style.textShadow !== "none") throw new Error(`Unsupported text shadow: ${style.textShadow}`);
  return { ...window.__shellContrastMath(style.color, backgroundLayers), foreground: style.color,
    backgroundLayers, fontSize: parseFloat(style.fontSize), fontWeight: style.fontWeight };
}

const stubs = `
export const useAuth = () => {
  const noActor = new URL(location.href).searchParams.get("contracts") === "batch8-student" && window.__batch8?.sample === "noactor";
  return { user:noActor ? null : { id:"shell-fixture" }, institutionId:"institution-fixture", profile:noActor ? null : { id:"shell-fixture", institution_id:"institution-fixture", role:window.__shellFixture.role, full_name:"Fixture User" } };
};
export const useSurveyAssignmentsCount = () => ({ data: 2 });
export const useIntentPrefetch = () => () => ({});
export const prefetchRoute = () => {};
export const usePageViewLogger = () => {};
export const isAiSurfaceEnabled = () => false;
// Only persistence is isolated: real providers retain storage, media, direction,
// i18next and their identity-safe local update paths. No server-write claim.
export const useDebouncedProfilePreference = (ownerId) => (patch, applyLocal) => {
  window.__preferencePatches.push({ ownerId, ...patch });
  applyLocal();
};
export default function IsolatedAncillarySurface() { return null; }
`;

// Business-seam DTOs only. No component, readiness, assessment-intro, category
// percentage, option parsing, timer or motion helper is replaced by this module.
const round9Stubs = `
import enStudent from "@/locales/en/student.json";
import arStudent from "@/locales/ar/student.json";
const params = new URL(location.href).searchParams;
const sample = params.get("sample") || "regular";
const copy = params.get("language") === "ar" ? arStudent : enStudent;
const timestamp = "2020-01-06T12:00:00Z";
const result = (data, pending = false) => ({ data, isLoading:pending, isPending:pending, isFetching:false, isError:false, error:null });
const forbiddenMutation = { isPending:false, mutate:() => { throw new Error("Round9 does not authorize business mutations"); } };
export const useStudentProfile = () => result(sample === "loading" ? undefined : { profile_completeness:sample === "unknown" ? null : sample === "lower" ? -25 : sample === "upper" ? 125 : 37 }, sample === "loading");
const course = { id:"course-fixture", code:"FIX101", name:"Fixture course", institution_id:"institution-fixture" };
const counts = sample === "empty" ? { confirmed:0, inReview:0, total:0 } : sample === "ready" ? { confirmed:4, inReview:0, total:4 } : { confirmed:1, inReview:1, total:4 };
const clos = Array.from({ length:counts.total }, (_, index) => ({ id:"clo-" + index, institution_id:"institution-fixture", course_id:course.id, title:"Fixture outcome " + index, description:null, blooms_level:null, is_active:true, review_status:index < counts.confirmed ? "confirmed" : index < counts.confirmed + counts.inReview ? "in_review" : "draft", courses:{ name:course.name }, created_at:timestamp, updated_at:timestamp }));
export const useTeacherCourses = () => result({ data:[course], count:1, page:1, pageSize:25 });
export const useCLOs = () => result({ data:clos, count:clos.length, page:1, pageSize:25 });
export const useCLOReviewCounts = () => result(counts);
export const useDeleteCLO = () => forbiddenMutation;
export const useSetCLOReviewStatus = () => forbiddenMutation;
function studentScreenSummary(studentId) {
  const state = window.__batch8.sample;
  window.__batch8.queryCalls.push({ hook:"academic-summary", studentId });
  const pending = state === "pending" || state === "paused";
  const missing = ["pending", "paused", "error", "undefined", "noactor"].includes(state);
  const zero = state === "zero", unknown = state === "unrecorded", partial = state === "partial", invalid = state === "invalid";
  const name = params.get("language") === "ar" ? "تاريخ العلوم ومراجعة الأدلة التعليمية وتوثيق المصادر بالتفصيل " : "History of Science evidence review and detailed source documentation ";
  const first = { course_id:"course/one alpha", course_name:state === "missing-labels" ? " " : name.repeat(3) + "https://example.invalid/" + "unbroken-source-".repeat(8), course_code:state === "missing-labels" ? " " : "HISEVIDENCE".repeat(8), attainment_percent:zero || unknown ? 0 : invalid ? 125 : 75, attainmentRecorded:!unknown, clo_count:zero ? 0 : invalid ? -1 : 7, evidence_count:zero ? 0 : invalid ? NaN : 9 };
  const second = { course_id:"course-two", course_name:state === "missing-labels" ? "S" : params.get("language") === "ar" ? "استوديو المصادر" : "Source Studio", course_code:"SRC-2", attainment_percent:zero || unknown || partial ? 0 : 45, attainmentRecorded:!unknown && !partial, clo_count:zero ? 0 : 3, evidence_count:zero ? 0 : 2 };
  const data = state === "empty" ? { activeCourseCount:0, recordedCourseCount:0, averageMastery:0, excellentCount:0, satisfactoryCount:0, developingCount:0, notYetCount:0, perCourse:[] } : {
    activeCourseCount:invalid ? -1 : 2, recordedCourseCount:invalid ? NaN : unknown ? 0 : partial ? 1 : 2,
    averageMastery:zero || unknown ? 0 : partial ? 38 : invalid ? Infinity : 60, excellentCount:invalid ? -2 : 0, satisfactoryCount:zero || unknown ? 0 : 1, developingCount:0, notYetCount:zero || unknown ? 2 : 1, perCourse:[first, second],
    ...(["zero","focus","mismatched-focus","invalid"].includes(state) ? { weakestClo:{ cloId:"focus-row", courseId:state === "mismatched-focus" ? "unrelated-course" : first.course_id, title:"Owned lowest-outcome evidence", mastery:zero ? 0 : invalid ? NaN : 37.5 } } : {})
  };
  window.__batch8.studentData = missing ? undefined : data;
  return { data:missing ? undefined : data, isPending:pending, isLoading:pending && state !== "paused", isFetching:state === "pending", isError:state === "error", error:state === "error" ? new Error("Owned query error") : null, fetchStatus:state === "paused" ? "paused" : state === "pending" ? "fetching" : "idle", refetch:async () => { window.__batch8.retries.push("academic-summary"); return { data }; } };
}
export const useStudentAcademicSummary = (studentId) => {
  if (params.get("contracts") === "batch8-student") return studentScreenSummary(studentId);
  const data = sample === "empty" ? { activeCourseCount:0, recordedCourseCount:0, averageMastery:0, excellentCount:0, satisfactoryCount:0, developingCount:0, notYetCount:0, perCourse:[] } : { activeCourseCount:1, recordedCourseCount:1, averageMastery:37, excellentCount:0, satisfactoryCount:0, developingCount:0, notYetCount:1, weakestClo:{ cloId:"clo-0", courseId:course.id, title:"Fixture weakest outcome", mastery:37 }, perCourse:[{ course_id:course.id, course_name:course.name, course_code:course.code, attainment_percent:37, attainmentRecorded:true, clo_count:1, evidence_count:1 }] };
  return { ...result(data), fetchStatus:"idle", refetch:async () => ({ data }) };
};
const categories = sample === "empty" ? [] : sample === "zero" ? [{ source:"journal", source_label:"Journal Entry", total_xp:0, count:1 }] : [{ source:"journal", source_label:"Journal Entry", total_xp:37, count:1 }, { source:"submission", source_label:"On-time Submission", total_xp:63, count:1 }];
const transactions = categories.map((category, index) => ({ id:"tx-" + index, source:category.source, source_label:category.source_label, xp_amount:category.total_xp, reference_id:null, note:null, reference_description:"Owned fixture transaction", created_at:timestamp }));
export const useXPHistory = () => result(sample === "loading" ? undefined : transactions, sample === "loading");
export const useXPCategorySummary = () => result(sample === "loading" ? undefined : { runningTotal:sample === "empty" || sample === "zero" ? 0 : 100, categories }, sample === "loading");
const performance = { suggestionAcceptanceRate:sample === "gate" ? 0 : 50, suggestionTotal:sample === "gate" ? 0 : 100, predictionAccuracyRate:sample === "gate" ? 0 : 60, predictionTotal:sample === "gate" ? 0 : 100, draftAcceptanceRate:sample === "gate" ? 0 : 37, draftTotal:sample === "gate" ? 0 : 100 };
const analytics = { weeklyActiveLearners:[], masteryDistribution:{ excellentPercent:0, satisfactoryPercent:0, developingPercent:0, notYetPercent:0, unmeasuredPercent:0 }, retentionRisk:{ onTrack:0, watch:0, atRisk:0, total:0 }, departments:[], aiCopilotPerformance:{ ...performance, hasSufficientData:sample !== "gate" }, ploAttainment:[], calculatedAt:timestamp };
export const useAdminAnalytics = () => result(sample === "loading" ? undefined : analytics, sample === "loading");
export const useAIPerformance = () => result(performance);
export const useAdminPLOHeatmap = () => result([]);
export const useDepartmentAnalytics = () => result([]);
export const usePrograms = () => result({ data:[], count:0, page:1, pageSize:100 });
// Option text below reuses real locale resources verbatim, not invented app
// translations. These owned questionnaire DTOs do not establish assessment validity.
const questionSets = Object.fromEntries(["study_strategy", "self_efficacy", "personality", "learning_style", "baseline"].map((type) => {
  const intro = copy.onboarding.assessmentIntro[type === "baseline" ? "learning_style" : type];
  return [type, [{ id:"question-" + type, institution_id:"institution-fixture", assessment_type:type, question_text:intro.title, dimension:type === "personality" ? "openness" : type === "self_efficacy" ? "general_academic" : null, weight:1,
    options:type === "learning_style" || type === "baseline" ? [{ option_text:intro.description, modality:"visual" }, { option_text:intro.benefit1, modality:"auditory" }] : null,
    correct_option:type === "baseline" ? 1 : null, clo_id:type === "baseline" ? "clo-fixture" : null, course_id:type === "baseline" ? course.id : null, difficulty_level:null, sort_order:0, is_active:true, created_at:timestamp, updated_at:timestamp }]];
}));
const questions = (type) => result(sample === "empty" ? [] : questionSets[type], sample === "loading");
export const useStudyStrategyQuestions = () => questions("study_strategy");
export const useSelfEfficacyQuestions = () => questions("self_efficacy");
export const usePersonalityQuestions = () => questions("personality");
export const useLearningStyleQuestions = () => questions("learning_style");
export const useBaselineQuestions = () => questions("baseline");
export const useBaselineTestConfig = () => result({ time_limit_minutes:15 });
const save = { isPending:false, mutateAsync:async (payload) => { window.__round9Saves.push({ student_id:payload.student_id, assessment_type:payload.assessment_type, assessment_version:payload.assessment_version, ...(payload.course_id ? { course_id:payload.course_id } : {}), responses:payload.responses.map((response) => ({ question_id:response.question_id, selected_option:response.selected_option })) }); return []; } };
export const useSaveResponses = () => save;
`;

// Owned query DTOs; only the two queried hook exports are aliased. No builder,
// ratio/threshold, page, rail, Select, StatePanel or locale implementation is mocked.
const batch8Stubs = `
const query = (data, pending, error, owner) => ({ data, isPending:pending, isLoading:pending, isFetching:false, isError:error, error:error ? new Error("Fixture query failure") : null, refetch:async () => { window.__batch8.retries.push(owner); return { data }; } });
const children = ["Lina Evidence", "Sami Records"].map((student_name, index) => ({ student_id:"attendance-child-" + index, student_name, institution_name:"Fixture school", linked_at:"2030-02-01", current_level:2, xp_total:25, current_streak:1, enrolled_courses:2, avg_attainment:0 }));
export const useLinkedChildren = (parentId) => {
  const sample = window.__batch8.sample;
  window.__batch8.queryCalls.push({ hook:"children", parentId });
  return query(sample === "children-empty" ? [] : sample.startsWith("children-") ? undefined : children, sample === "children-pending", sample === "children-error", "children");
};
export const useParentAttendanceOverview = (childId, options) => {
  const sample = window.__batch8.sample;
  window.__batch8.queryCalls.push({ hook:"overview", childId, courseId:options?.courseId ?? null });
  const child = children.find((item) => item.student_id === childId);
  if (!child || ["overview-pending", "overview-error", "overview-undefined"].includes(sample)) return query(undefined, sample === "overview-pending", sample === "overview-error", "overview");
  const second = childId === "attendance-child-1";
  let totals = { totalSessions:8, present:3, late:1, absent:4, excused:2, attended:4, attendanceRate:50, punctualityRate:37.5, absenceRate:50 };
  let courses = [{ courseId:"history-fixture", code:"HIS-F", name:"History of Science Evidence", present:3, late:1, absent:1, excused:1, totalSessions:5, attendanceRate:80, trend:"up" }, { courseId:"studio-fixture", code:"STU-F", name:"Studio Sources and Documentation", present:0, late:0, absent:3, excused:1, totalSessions:3, attendanceRate:0, trend:"insufficient_data" }];
  if (second) { totals = { totalSessions:7, present:6, late:0, absent:1, excused:0, attended:6, attendanceRate:86, punctualityRate:86, absenceRate:14 }; courses = [{ ...courses[0], present:6, late:0, absent:1, excused:0, totalSessions:7, attendanceRate:86 }]; }
  const unmeasured = ["unmeasured", "zero-courses"].includes(sample);
  if (unmeasured) { totals = { totalSessions:0, present:0, late:0, absent:0, excused:0, attended:0, attendanceRate:100, punctualityRate:100, absenceRate:0 }; courses = sample === "zero-courses" ? [] : [{ ...courses[0], ...totals, trend:"insufficient_data" }]; }
  if (sample === "real-zero") { totals = { totalSessions:5, present:0, late:0, absent:5, excused:0, attended:0, attendanceRate:0, punctualityRate:0, absenceRate:100 }; courses = [{ ...courses[0], ...totals }]; }
  const recentExceptions = unmeasured ? [] : ["present", "late", "absent", "excused"].map((status, index) => ({ attendanceRecordId:"record-" + index, sessionId:"session-" + index, courseId:"history-fixture", courseName:courses[0].name, sessionDate:"2030-02-0" + (index + 2), sessionType:"Source workshop", topic:"Documentary evidence", status }));
  const overview = { child:{ id:sample === "wrong-child" ? "other-child" : child.student_id, name:child.student_name }, period:{ dateFrom:"2030-02-02", dateTo:"2030-02-09", label:"Owned fixture period" }, totals, courses,
    trend:unmeasured || sample === "no-trend" ? [] : [{ periodLabel:"Recorded week", periodStart:"2030-02-02", periodEnd:"2030-02-09", present:totals.present, late:totals.late, absent:totals.absent, attendanceRate:totals.attendanceRate }, { periodLabel:"No observed sessions", periodStart:"2030-02-10", periodEnd:"2030-02-16", present:0, late:0, absent:0, attendanceRate:100 }],
    recentExceptions, ...(!unmeasured && sample !== "no-attention" ? { attention:{ courseId:"history-fixture", courseName:courses[0].name, absenceCount:second ? 1 : sample === "real-zero" ? 5 : 1, message:"Unused owned DTO message" } } : {}) };
  window.__batch8.currentOverview = overview;
  return query(overview, false, false, "overview");
};
`;

const entry = `
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useNavigate, useLocation } from "react-router-dom";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { LanguageProvider, useLanguage } from "@/providers/LanguageProvider";
import AppToaster from "@/components/shared/AppToaster";
import ParentAttendancePage from "@/pages/parent/ParentAttendancePage";
import { toast } from "sonner";
import RoleAppShell from "@/app/RoleAppShell";
import HeatmapGrid from "@/components/shared/HeatmapGrid";
import PageHeader from "@/design-system/patterns/PageHeader";
import SectionHeader from "@/design-system/patterns/SectionHeader";
import PCard from "@/design-system/patterns/PCard";
import SectionCard from "@/design-system/patterns/SectionCard";
import UploadProgress from "@/components/shared/UploadProgress";
import BadgeCollection from "@/components/shared/BadgeCollection";
import BadgeSpotlightCard from "@/components/shared/BadgeSpotlightCard";
import StudentLearningProfileRail from "@/features/student/rails/StudentLearningProfileRail";
import CLOListPage from "@/pages/teacher/clos/CLOListPage";
import HabitDifficultyIndicator from "@/components/shared/HabitDifficultyIndicator";
import AdminAnalyticsPage from "@/pages/admin/analytics/AdminAnalyticsPage";
import StudentProgressNew from "@/pages/student/progress/StudentProgressNew";
import XPHistoryNew from "@/pages/student/progress/XPHistoryNew";
import { StudyStrategyStep } from "@/pages/student/onboarding/StudyStrategyStep";
import { SelfEfficacyStep } from "@/pages/student/onboarding/SelfEfficacyStep";
import { PersonalityStep } from "@/pages/student/onboarding/PersonalityStep";
import { LearningStyleStep } from "@/pages/student/onboarding/LearningStyleStep";
import { BaselineTestStep } from "@/pages/student/onboarding/BaselineTestStep";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import enStudent from "@/locales/en/student.json";
import arStudent from "@/locales/ar/student.json";
import { Button } from "@/components/ui/button";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
// Mirror main.tsx: index.css owns the single Tailwind + token import graph.
import "@/index.css";
const params = new URL(location.href).searchParams;
const role = params.get("role") || "student";
const language = params.get("language") || "en";
const theme = params.get("theme") || "light";
document.documentElement.lang = language;
document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
document.documentElement.classList.toggle("dark", theme === "dark");
// Query parameters intentionally seed the REAL preference stores for each old
// and new scene; persisted state from a previous navigation must not win.
localStorage.setItem("theme", theme);
localStorage.setItem("edeviser-language", language);
window.__preferencePatches = [];
window.__shellFixture = { role, language, theme, navigate: null, mounted: false };
window.__batch8 = { sample:params.get("sample") || "mixed", queryCalls:[], retries:[], actions:0, cancels:0, dismisses:0 };
window.__patternClicks = 0;
window.__round9Saves = [];
window.__round9Completed = 0;
const patternCopy = language === "ar" ? {
  title:"مراجعة الأدلة التعليمية والتقدم المستمر عبر مجتمع المدرسة وتخطيط الدعم المناسب للمتعلمين",
  description:"متابعة النتائج والتأمل في الأدلة وتحديد الخطوات التعليمية القادمة بوضوح.",
  first:"مراجعة الأدلة التعليمية الداعمة", second:"تخطيط متابعة التعلم", content:"محتوى البطاقة وملخص الخطوات القادمة", click:"تسجيل الاختيار"
} : {
  title:"Reviewing learning evidence and sustained progress across the school community while planning appropriate learner support",
  description:"Review outcomes, reflect on evidence, and identify the next learning steps clearly.",
  first:"Review supporting learning evidence", second:"Plan learning follow-up", content:"Card content and next steps summary", click:"Record selection"
};
function PatternIcon(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4zM8 9h8M8 14h8" /></svg>; }
function patternActions(name) { return <>
  <Button variant="outline" data-pattern-action={name}><span data-pattern-copy>{patternCopy.first}</span></Button>
  <Button variant="secondary" data-pattern-action={name}><span data-pattern-copy>{patternCopy.second}</span></Button>
</>; }
function PatternFixtures() { return <section data-shared-patterns style={{ display:"grid", gap:24, minWidth:0 }}>
  <div data-pattern-heading="page" data-expected-title={patternCopy.title}><PageHeader title={patternCopy.title} action={patternActions("page")} className="fixture-page-header" /></div>
  <div data-pattern-heading="section" data-expected-title={patternCopy.title}><SectionHeader icon={PatternIcon} title={patternCopy.title} description={patternCopy.description} action={patternActions("section")} className="fixture-section-header" /></div>
  <div data-pattern-heading="subsection" data-expected-title={patternCopy.title}><SectionHeader as="h3" title={patternCopy.title} description={patternCopy.description} className="fixture-subsection-header" /></div>
  <PCard id="pattern-native-card" data-pattern-card="default" data-passthrough="native-card" aria-label="Fixture native card" className="fixture-native-card" onClick={() => { window.__patternClicks += 1; }}>
    <div data-pattern-flow="first" data-pattern-copy>{patternCopy.content}</div>
    <div data-pattern-flow="second" data-pattern-copy>{patternCopy.content}</div>
    <Button data-pattern-click className="h-auto min-h-9 whitespace-normal"><span data-pattern-copy>{patternCopy.click}</span></Button>
  </PCard>
  <PCard data-pattern-card="custom" className="grid gap-3 p-4 fixture-custom-card" style={{ borderRadius:12 }}><div data-pattern-copy>{patternCopy.content}</div></PCard>
  <div data-pattern-heading="card" data-expected-title={patternCopy.title}><SectionCard icon={PatternIcon} title={patternCopy.title} action={patternActions("card")} className="fixture-section-card"><div data-pattern-section-body data-pattern-copy>{patternCopy.content}</div></SectionCard></div>
  <div data-pattern-depth-reference aria-hidden="true" style={{ width:1, height:1, boxShadow:"var(--depth-2)", border:"1px solid var(--border)" }} />
</section>; }
function ProgressFamilyFixtures() { return <section data-progress-families style={{ display:"grid", gap:24, minWidth:0 }}>
  <h1>Actual progress-fill families: local presentation contracts only</h1>
  <p>These checks cover three actual components, not every migrated field, route, translation, badge surface, or upload operation.</p>
  {[-25, 0, 37, 100, 125].map((progress) => <div key={progress} data-upload-sample={progress}>
    <UploadProgress progress={progress} fileName={"fixture-" + progress + ".pdf"} fileSize={1024} status="uploading" />
  </div>)}
  <BadgeCollection tieredBadges={[
    { id:"fixture-bronze", name:"steady_learner", emoji:"★", description:"Fixture", category:"academic", tier:"bronze", is_pinned:false, archived_at:null, earned_at:"2020-01-06T12:00:00Z", progress_toward_next:0.37 },
    { id:"fixture-silver", name:"steady_reader", emoji:"★", description:"Fixture", category:"academic", tier:"silver", is_pinned:false, archived_at:null, earned_at:"2020-01-07T12:00:00Z", progress_toward_next:1.25 }
  ]} />
  <BadgeSpotlightCard category="academic" currentTier="bronze" progress={0.37} daysRemaining={3} />
  <div data-progress-primary-reference aria-hidden="true" style={{ width:1, height:1, backgroundColor:"var(--primary)" }} />
  <div data-progress-muted-reference aria-hidden="true" style={{ width:1, height:1, backgroundColor:"var(--muted)" }} />
</section>; }
function Round9Fixtures() {
  const scene = params.get("scene"), sample = params.get("sample") || "regular";
  const stepProps = { isDay1:sample === "day1", studentId:"shell-fixture", assessmentVersion:7, onComplete:() => { window.__round9Completed += 1; } };
  const components = { study_strategy:StudyStrategyStep, self_efficacy:SelfEfficacyStep, personality:PersonalityStep, learning_style:LearningStyleStep };
  const Step = components[scene];
  return <section data-round9-scene={scene} style={{ minWidth:0 }}>
    <p className="text-xs text-muted-foreground mb-4">Owned local fixture DTOs only: page claims about live data, whole-page contrast, translations and authenticated persistence are not verified.</p>
    <div data-round9-subject>
      {scene === "rail" ? <StudentLearningProfileRail /> : scene === "clo" ? <CLOListPage /> : scene === "habit" ? <HabitDifficultyIndicator level={sample === "max" ? 3 : 1} habitLevelStreak={sample === "zero" ? 0 : sample === "upper" ? 10 : 3} /> : scene === "admin" ? <AdminAnalyticsPage /> : scene === "weakest" ? <StudentProgressNew /> : scene === "xp" ? <XPHistoryNew /> : scene === "baseline" ? <BaselineTestStep {...stepProps} courseIds={["course-fixture"]} /> : Step ? <Step {...stepProps} /> : null}
    </div>
    <div aria-hidden="true" style={{ display:"flex", height:1 }}>
      {["muted", "card", "primary", "accent", "accent-foreground", "muted-foreground", "text-teal", "success-foreground", "progress-attention", "xp", "tertiary-900"].map((token) => <span key={token} data-round9-palette={token} style={{ width:1, height:1, backgroundColor:"var(--" + token + ")" }} />)}
    </div>
  </section>;
}
function Batch8Fixtures() {
  const route = useLocation();
  const preferences = useTheme();
  const lang = useLanguage();
  const [shell, setShell] = useState(params.get("shell") !== "false");
  const [sample, setSample] = useState(window.__batch8.sample);
  useEffect(() => {
    window.__batch8.setTheme = preferences.setTheme;
    window.__batch8.setLanguage = lang.setLanguage;
    window.__batch8.setShell = setShell;
    window.__batch8.setSample = (next) => { window.__batch8.sample = next; setSample(next); };
    window.__batch8.preferences = { theme:preferences.theme, resolvedTheme:preferences.resolvedTheme, language:lang.language, direction:lang.direction };
    window.__batch8.notify = (kind = "info", long = false) => {
      const arabic = lang.language === "ar";
      const title = arabic ? "إشعار مراجعة الأدلة التعليمية" : "Learning evidence notification";
      const description = (arabic ? "هذه بيانات اختبار محلية وليست إجراءً على سجل متعلم. " : "Owned local fixture evidence, not a learner record operation. ") + (long ? "https://example.invalid/" + "long-record-reference-".repeat(28) : "Reference: fixture-only.");
      const action = arabic ? "مراجعة الأدلة والخطوات التالية بالتفصيل" : "Review evidence and detailed next steps";
      const cancel = arabic ? "إلغاء المراجعة والعودة إلى المحتوى" : "Cancel review and return to content";
      window.__batch8.copy = { title, description, action, cancel };
      const options = { id:"batch8-toast", duration:Infinity, description, action:{ label:action, onClick:() => { window.__batch8.actions++; } }, cancel:{ label:cancel, onClick:() => { window.__batch8.cancels++; } }, onDismiss:() => { window.__batch8.dismisses++; } };
      if (kind === "normal") toast(title, options); else toast[kind](title, options);
    };
    window.__shellFixture.mounted = true;
  }, [preferences.setTheme, preferences.theme, preferences.resolvedTheme, lang.setLanguage, lang.language, lang.direction]);
  const content = params.get("contracts") === "batch8-attendance"
    ? <div data-batch8-attendance data-batch8-sample={sample} key={sample}><ParentAttendancePage /></div>
    : params.get("contracts") === "batch8-student" ? <>
      <div data-student-screen data-student-sample={sample} tabIndex={-1} key={sample}><StudentProgressNew /></div>
      <span data-student-route hidden>{route.pathname}</span>
      {["card", "foreground", "muted-foreground", "progress-attention"].map((token) => <span key={token} data-student-palette={token} aria-hidden="true" style={{ display:"block", width:1, height:1, backgroundColor:"var(--" + token + ")" }} />)}
    </> : <div data-batch8-toast-scene style={{ minHeight:300, minWidth:0 }}><h1>Actual AppToaster fixture</h1><p>Real preference providers and notification adapter; no authenticated-route claim.</p></div>;
  return <>{shell ? <RoleAppShell userRole={role}>{content}</RoleAppShell> : <main data-batch8-no-shell style={{ padding:"1rem", minWidth:0 }}>{content}</main>}<AppToaster /></>;
}
function Fixture() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (params.get("contracts")?.startsWith("batch8-")) return;
    // Synthetic input on the actual variable-owning shell, not notch emulation.
    document.querySelector(".role-app-shell").style.setProperty("--app-mobile-nav-safe-area", "24px");
    window.__shellFixture.navigate = (path) => navigate(path);
    window.__shellFixture.mounted = true;
  }, [navigate]);
  if (params.get("contracts")?.startsWith("batch8-")) return <Batch8Fixtures />;
  return <RoleAppShell userRole={role}>
    {params.get("contrast") === "buttons" ? <div data-contrast-panel>
      {["canvas", "card"].map((surface) => <section key={surface} data-contrast-surface={surface}
        className={surface === "canvas" ? "bg-background text-foreground" : "bg-card text-card-foreground"}
        style={{ padding:24, marginBottom:24 }}>
        {["default", "destructive", "secondary", "outline", "ghost", "link", "tactile"].map((variant) =>
          <div key={variant} style={{ marginBottom:16 }}><Button variant={variant} data-contrast-button={surface + "-" + variant} style={{ fontSize:14 }}>
            <span data-contrast-label>{variant} normal label</span>
          </Button></div>)}
        <Button disabled data-contrast-disabled style={{ fontSize:14 }}>Disabled, reported separately</Button>
      </section>)}
    </div> : params.get("contracts") === "heatmap-motion" ? <section data-heatmap-motion-contracts style={{ padding:24, minWidth:0 }}>
      <h1>Actual HeatmapGrid and explicit CSS contract probes</h1>
      <HeatmapGrid
        data={[0, 1, 2, 3, 4].map((count) => ({ date:"2020-01-" + String(6 + count).padStart(2, "0"), academicCount:count, wellnessCount:0, totalCount:count, habits:[] }))}
        semesterRange={{ start:"2020-01-06", end:"2020-01-10" }}
      />
      <p>XP token-contract swatches only; these are not an application XP bar.</p>
      <div data-xp-contract="track" aria-label="XP track token-contract swatch" style={{ width:120, height:20, backgroundColor:"var(--xp-track)" }} />
      <div data-xp-contract="fill" aria-label="XP fill token-contract swatch" style={{ width:120, height:20, backgroundColor:"var(--xp-fill)" }} />
      <p>Explicit standalone CSS-utility probes, not connected agent widgets.</p>
      <div data-motion-probe="agent-ring" className="agent-ring" style={{ width:44, height:44, margin:12 }}>Ring</div>
      <div data-motion-probe="risk-dot" className="risk-dot" style={{ width:8, height:8, margin:12, backgroundColor:"var(--destructive)" }} />
      <span data-motion-probe="cursor-blink" className="cursor-blink">|</span>
      <div data-motion-static-depth aria-hidden="true" style={{ width:1, height:1, boxShadow:"var(--depth-3,none)" }} />
    </section> : params.get("contracts") === "shared-patterns" ? <PatternFixtures /> : params.get("contracts") === "progress-families" ? <ProgressFamilyFixtures /> : params.get("contracts") === "round9" ? <Round9Fixtures /> : <section data-fixture-content style={{ minHeight: 1800, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
      <div><h1>Shell navigation fixture</h1><p data-fixture-route>{location.pathname}</p></div>
      <Button id="fixture-last-action" style={{ height: 44, minWidth: 44, alignSelf: "center" }}>Last main action</Button>
    </section>}
  </RoleAppShell>;
}
async function boot() {
  const i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({ lng: language, fallbackLng: "en", defaultNS: "common", resources: { en: { common: en, student:enStudent }, ar: { common: ar, student:arStudent } }, interpolation: { escapeValue: false } });
  createRoot(document.getElementById("root")).render(<I18nextProvider i18n={i18n}><BrowserRouter><NuqsAdapter><ThemeProvider><LanguageProvider><Fixture /></LanguageProvider></ThemeProvider></NuqsAdapter></BrowserRouter></I18nextProvider>);
}
boot().catch((error) => { document.documentElement.dataset.fixtureError = String(error); throw error; });
`;

async function createFixture(directory) {
  const root = join(directory, "fixture");
  const outDir = join(directory, "dist");
  await mkdir(root, { recursive: true });
  await mkdir(join(root, "env"));
  const stubPath = join(root, "ancillary-stubs.jsx");
  await writeFile(stubPath, stubs);
  await writeFile(join(root, "entry.jsx"), entry);
  await writeFile(join(root, "index.html"), '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actual shell fixture</title></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>');
  // Keep the actual stylesheet's filesystem identity: a C: temporary CSS wrapper
  // importing F: source breaks Tailwind relative-font URL rebasing on Windows.
  // This build-only annotation preserves the existing explicit source scan, with
  // no copied CSS, font URL rewriting, replacement paint or production-file edit.
  const sourceScope = {
    name:"shell-fixture-source-scope", enforce:"pre",
    transform(code, id) {
      if (normalizePath(id.split("?")[0]) !== normalizePath(join(repository,"src/index.css"))) return;
      return code + `\n@source ${JSON.stringify(normalizePath(join(repository,"src")))};\n`;
    },
  };
  const isolated = [
    "@/hooks/useAuth", "@/hooks/useSurveyAssignmentsCount", "@/hooks/useIntentPrefetch",
    "@/lib/routePrefetch", "@/hooks/usePageViewLogger", "@/ai/lib/featureGate",
    "@/hooks/useDebouncedProfilePreference", "@/components/shared/RoleHeaderStats",
    "@/components/shared/StudentHeaderStats",
    "@/components/shared/GuidedTour", "@/components/shared/EmailVerificationBanner",
    "@/components/shared/EDeviserIntelligencePanel",
  ];
  const aliases = isolated.map((name) => exactAlias(name, stubPath));
  const batch8Path = join(root, "batch8-query-dtos.js");
  await writeFile(batch8Path, batch8Stubs);
  for (const name of ["@/hooks/useParentDashboard", "@/hooks/useAttendance"]) aliases.push(exactAlias(name, batch8Path));
  console.log("STUDENT SEAMS: actual StudentProgressNew facade/StudentProgressScreen and StatePanel; academic-summary/auth DTOs plus preference transport only. Real theme/language/i18next/router/CSS. Dedicated title/subtitle font glyph scalars; no business math, auth enforcement, deployed data or visual approval.");
  console.log("BATCH8 TOAST/ATTENDANCE SEAMS: only useLinkedChildren/useParentAttendanceOverview query DTOs and preference commit transport. Real ThemeProvider, LanguageProvider, AppToaster/Sonner, ParentAttendancePage/rail, StatePanel, Radix, locales and CSS execute. Glyph delivery, auth/backend and persisted server writes are not certified.");
  const round9Path = join(root, "round9-business-stubs.jsx");
  // Preserve the hook module's exported policy metadata without maintaining a
  // second value; cohort filtering itself is not a target of this fixture.
  const adminHook = await readFile(join(repository, "src/hooks/useAdminAnalytics.ts"), "utf8");
  const cohortConstant = adminHook.match(/export const MIN_COHORT_THRESHOLD = (\d+);/);
  assert(cohortConstant, "Cannot preserve actual admin cohort metadata export");
  await writeFile(round9Path, round9Stubs + `\nexport const MIN_COHORT_THRESHOLD = ${cohortConstant[1]};\n`);
  const round9Hooks = ["useStudentProfile", "useCourses", "useCLOs", "useStudentProgress", "useXPHistory", "useAdminAnalytics", "useAIPerformance", "useAdminPLOHeatmap", "useAdminDashboard", "usePrograms", "useOnboardingQuestions", "useOnboardingResponses", "useBaselineTests"];
  for (const hook of round9Hooks) aliases.push(exactAlias(`@/hooks/${hook}`, round9Path));
  console.log(`ROUND9 BUSINESS ALIASES (owned DTOs only): ${round9Hooks.join(", ")}; all target components, child controls, math/intro helpers and real Nuqs execute.`);
  for (const [name, label] of [
    ["@/components/shared/NotificationBell", "Fixture notifications placeholder"],
    ["@/components/shared/ProfileDropdown", "Fixture profile placeholder"],
  ]) {
    const path = join(root, `${name.split("/").at(-1)}.jsx`);
    await writeFile(path, `import React from "react"; import { Button } from "@/components/ui/button"; export default function HeaderPlaceholder() { return <Button variant="ghost" size="icon" aria-label=${JSON.stringify(label)} style={{ width:44, height:44 }}><span aria-hidden="true">•</span></Button>; }`);
    aliases.push(exactAlias(name, path));
  }
  const searchPath = join(root, "SearchCommand.jsx");
  await writeFile(searchPath, 'import React from "react"; import { Button } from "@/components/ui/button"; export default function SearchPlaceholder() { return <Button variant="outline" aria-label="Fixture search placeholder" style={{ width:"100%", height:44 }}>Search placeholder</Button>; }');
  aliases.push(exactAlias("@/components/shared/SearchCommand", searchPath));
  // The temporary root deliberately has no node_modules or environment files.
  // Resolve only required package entrypoints from this repository's install.
  for (const name of ["react", "react/jsx-runtime", "react/jsx-dev-runtime", "react-dom", "react-dom/client", "react-router-dom", "i18next", "react-i18next", "sonner", "nuqs/adapters/react-router/v7"]) {
    aliases.push(exactAlias(name, require.resolve(name)));
  }
  aliases.push({ find: "@", replacement: join(repository, "src") });
  console.log("SHELL FIXTURE SCOPE: actual shell/header/navigation/Radix/Buttons/nav data/locales/CSS; exact ancillary aliases only. Placeholder header widgets, auth, general font-glyph coverage, backend and physical notches are NOT verified; student title/subtitle glyph probes and Round9 font readiness have separately stated scopes.");
  const built = await build({
    configFile: false,
    root,
    envDir: join(root, "env"),
    envPrefix: "SHELL_FIXTURE_PUBLIC_",
    publicDir: false,
    cacheDir: join(directory, "vite-cache"),
    plugins: [react(), sourceScope, tailwindcss()],
    resolve: { alias: aliases, dedupe: ["react", "react-dom"] },
    build: { outDir, emptyOutDir: true, minify: false, sourcemap: false },
  });
  // Fail once before creating the browser cases when the actual source CSS graph
  // cannot generate semantic utilities. Keep computed-theme assertions as well:
  // selector presence alone is not proof that the browser applies the rules.
  const outputs = Array.isArray(built) ? built : [built];
  const css = outputs.flatMap((output) => output.output ?? [])
    .filter((asset) => asset.type === "asset" && asset.fileName.endsWith(".css"))
    .map((asset) => typeof asset.source === "string" ? asset.source : new TextDecoder().decode(asset.source))
    .join("\n");
  for (const utility of ["bg-background", "bg-card", "text-foreground"]) {
    assert(hasStandaloneUtility(css, utility), `CSS build preflight: missing standalone .${utility} utility; check the single Tailwind/token graph. Bounded selector context:\n${utilityDiagnostic(css, utility)}`);
  }
  console.log("CSS BUILD PREFLIGHT PASS: bg-background, bg-card and text-foreground emitted; browser theme checks still required.");
  return outDir;
}

async function serveFixture(outDir) {
  const mime = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff": "font/woff", ".woff2": "font/woff2" };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      const requested = resolve(outDir, `.${pathname}`);
      if (!requested.startsWith(outDir + sep) && requested !== outDir) {
        response.writeHead(403); response.end(); return;
      }
      const asset = pathname.startsWith("/assets/");
      const file = asset ? requested : join(outDir, "index.html");
      const content = await readFile(file);
      response.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
      response.end(content);
    } catch (error) {
      response.writeHead(error?.code === "ENOENT" ? 404 : 500);
      response.end("Fixture server error");
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert(address && typeof address === "object");
  return { server, base: `http://127.0.0.1:${address.port}` };
}

async function settleControlPaint(page, control) {
  const delay = await control.evaluate(async (element) => {
    // Let pending transitions acquire a timeline before reading currentTime.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const style = getComputedStyle(element);
    const milliseconds = (value) => parseFloat(value) * (value.trim().endsWith("ms") ? 1 : 1000);
    const durations = style.transitionDuration.split(",").map(milliseconds);
    const delays = style.transitionDelay.split(",").map(milliseconds);
    // A media change can shorten the declaration while an already-started
    // transition retains its original timing. Wait for that real paint too.
    const remaining = element.getAnimations()
      .filter((animation) => animation instanceof CSSTransition && animation.playState !== "finished" && animation.playState !== "idle")
      .map((animation) => {
        const end = animation.effect.getComputedTiming().endTime;
        if (typeof end !== "number" || typeof animation.currentTime !== "number" || animation.playbackRate <= 0 || animation.playState === "paused") {
          throw new Error("Unsupported nonfinite/paused control transition");
        }
        return (end - animation.currentTime) / animation.playbackRate;
      });
    return Math.max(0, ...remaining, ...durations.map((duration, index) => duration + delays[index % delays.length]));
  });
  assert(Number.isFinite(delay) && delay <= 1000, `Unsupported long/nonfinite control transition: ${delay}`);
  await page.waitForTimeout(delay + 40);
}

function paintedShadowLayers(shadow) {
  // Tailwind shadow utilities prepend transparent ring/inset placeholders;
  // compare real paint to the independent inline token reference, not those
  // nonpainting scaffolds. Unknown/nonzero-alpha layers are never discarded.
  if (shadow === "none") return [];
  return (shadow.match(/(?:rgba?\([^)]*\)|[^,])+/g) ?? []).map((layer) => layer.trim()).filter((layer) => {
    return !/rgba\(\s*(?:\d+(?:\.\d+)?\s*,\s*){3}0(?:\.0+)?\s*\)/.test(layer);
  });
}

async function assertSharedPatternScene(page, { theme, language, role, width, rootFont }) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const close = (actual, expected) => Math.abs(actual - expected) <= 0.75;
  const panel = page.locator("[data-shared-patterns]");
  for (const [level, count] of [[1, 1], [2, 2], [3, 1]]) await expect(panel.getByRole("heading", { level })).toHaveCount(count);
  const layout = await panel.evaluate((element) => {
    const rect = (node) => {
      const box = node.getBoundingClientRect();
      return { left:box.left, right:box.right, top:box.top, bottom:box.bottom, width:box.width, height:box.height };
    };
    return {
      rootFont:parseFloat(getComputedStyle(document.documentElement).fontSize), direction:getComputedStyle(element).direction,
      scrollWidth:element.scrollWidth, clientWidth:element.clientWidth,
      headingCounts:["h1", "h2", "h3"].map((tag) => element.querySelectorAll(tag).length),
      headings:[...element.querySelectorAll("[data-pattern-heading]")].map((group) => {
        const heading = group.querySelector("h1,h2,h3");
        const style = getComputedStyle(heading);
        const range = document.createRange();
        range.selectNodeContents(heading);
        return { name:group.dataset.patternHeading, expected:group.dataset.expectedTitle, text:heading.textContent,
          tag:heading.tagName, bounds:rect(heading), group:rect(group), fontSize:parseFloat(style.fontSize),
          overflow:style.textOverflow, whiteSpace:style.whiteSpace,
          fragments:[...range.getClientRects()].map((box) => ({left:box.left, right:box.right, top:box.top, bottom:box.bottom})),
          actions:[...group.querySelectorAll("[data-pattern-action]")].map((action) => {
            const label = document.createRange();
            label.selectNodeContents(action);
            return { ...rect(action), fragments:[...label.getClientRects()].map((box) => ({left:box.left, right:box.right, top:box.top, bottom:box.bottom})) };
          }) };
      }),
      cards:[...element.querySelectorAll("[data-pattern-card],.fixture-section-card")].map((card) => {
        const style = getComputedStyle(card);
        return { name:card.dataset.patternCard ?? "section", display:style.display, rowGap:style.rowGap, columnGap:style.columnGap,
          padding:[style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(parseFloat),
          radius:parseFloat(style.borderTopLeftRadius), background:style.backgroundColor,
          borderWidths:[style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map(parseFloat),
          borderStyle:style.borderTopStyle, borderColor:style.borderTopColor, shadow:style.boxShadow,
          duration:style.transitionDuration, bounds:rect(card) };
      }),
      nativeFlowGap:rect(element.querySelector('[data-pattern-flow="second"]')).top - rect(element.querySelector('[data-pattern-flow="first"]')).bottom,
      sectionFlowGap:rect(element.querySelector("[data-pattern-section-body]")).top - rect(element.querySelector(".fixture-section-card").firstElementChild).bottom,
      reference:{ shadow:getComputedStyle(element.querySelector("[data-pattern-depth-reference]")).boxShadow,
        border:getComputedStyle(element.querySelector("[data-pattern-depth-reference]")).borderTopColor },
    };
  });
  check(close(layout.rootFont, rootFont), `Root text size ${layout.rootFont}, expected ${rootFont}`);
  check(layout.direction === (language === "ar" ? "rtl" : "ltr"), "Pattern direction did not follow locale");
  check(layout.scrollWidth <= layout.clientWidth + 1, `Pattern panel overflows: ${layout.scrollWidth}/${layout.clientWidth}`);
  check(layout.headingCounts.join(",") === "1,2,1", `Expected h1/h2/h3 counts 1/2/1, got ${layout.headingCounts}`);
  const expectedTags = { page:"H1", section:"H2", subsection:"H3", card:"H2" };
  for (const heading of layout.headings) {
    check(heading.tag === expectedTags[heading.name], `${heading.name}: wrong heading semantics`);
    check(heading.text === heading.expected, `${heading.name}: title text was lost`);
    check(heading.overflow !== "ellipsis" && heading.whiteSpace !== "nowrap", `${heading.name}: truncation/nowrap still applied`);
    check(heading.bounds.width > 0 && heading.bounds.height > 0, `${heading.name}: heading is not rendered`);
    check(heading.fragments.length > 0 && heading.fragments.every((box) => box.left >= heading.bounds.left - 1 && box.right <= heading.bounds.right + 1 && box.top >= heading.bounds.top - 1 && box.bottom <= heading.bounds.bottom + 1), `${heading.name}: title glyphs overflow/clip its heading box`);
    check(heading.bounds.left >= -1 && heading.bounds.right <= width + 1, `${heading.name}: heading extends beyond viewport`);
    if (heading.name !== "page") check(close(heading.fontSize, rootFont), `${heading.name}: expected scalable base-size heading, got ${heading.fontSize}px`);
    if (width === 320) check(heading.fragments.length > 1, `${heading.name}: long narrow title did not wrap`);
    check(heading.actions.length === (heading.name === "subsection" ? 0 : 2), `${heading.name}: trailing action props were dropped`);
    for (const action of heading.actions) {
      check(action.width >= 44 && action.height >= 44, `${heading.name}: action target is smaller than 44px (${action.width} × ${action.height})`);
      check(action.left >= heading.group.left - 1 && action.right <= heading.group.right + 1 && action.left >= -1 && action.right <= width + 1, `${heading.name}: trailing action overflows its group/viewport`);
      check(action.top >= heading.group.top - 1 && action.bottom <= heading.group.bottom + 1, `${heading.name}: action escapes header flow`);
      check(action.fragments.length > 0 && action.fragments.every((box) => box.left >= action.left - 1 && box.right <= action.right + 1 && box.top >= action.top - 1 && box.bottom <= action.bottom + 1), `${heading.name}: action label overflows/clips its control`);
      const overlapX = Math.min(action.right, heading.bounds.right) - Math.max(action.left, heading.bounds.left);
      const overlapY = Math.min(action.bottom, heading.bounds.bottom) - Math.max(action.top, heading.bounds.top);
      check(overlapX <= 1 || overlapY <= 1, `${heading.name}: action overlaps title`);
    }
  }
  check(layout.cards.length === 3, `Expected three actual card surfaces, got ${layout.cards.length}`);
  for (const card of layout.cards) {
    check(card.background === (theme === "dark" ? "rgb(17, 30, 48)" : "rgb(255, 255, 255)"), `${card.name}: incorrect canonical card paint ${card.background}`);
    check(card.borderWidths.every((value) => close(value, 1)) && card.borderStyle === "solid" && card.borderColor === layout.reference.border, `${card.name}: canonical card border missing or changed`);
    check(paintedShadowLayers(card.shadow).join(", ") === paintedShadowLayers(layout.reference.shadow).join(", ") && paintedShadowLayers(card.shadow).length > 0, `${card.name}: noncanonical card depth ${card.shadow}`);
    const padding = card.name === "default" ? 0 : card.name === "custom" ? rootFont : rootFont * 1.5;
    check(card.padding.every((value) => close(value, padding)), `${card.name}: extra/missing card padding ${card.padding}`);
    if (card.name === "custom") {
      check(card.display === "grid" && close(parseFloat(card.rowGap), rootFont * 0.75) && close(parseFloat(card.columnGap), rootFont * 0.75), "Explicit caller grid/gap classes did not win");
      check(close(card.radius, 12), "Native inline style was not forwarded");
    } else {
      check(card.display === "block", `${card.name}: unexpected default ${card.display} layout`);
      check([card.rowGap, card.columnGap].every((value) => value === "normal" || parseFloat(value) === 0), `${card.name}: extra generated Card gap`);
    }
    check(card.bounds.left >= -1 && card.bounds.right <= width + 1, `${card.name}: card extends beyond viewport`);
    check(card.duration.split(",").every((value) => parseFloat(value) === 0), `${card.name}: unintended card transition remains (${card.duration})`);
  }
  check(close(layout.nativeFlowGap, 0), `Unrequested default child spacing ${layout.nativeFlowGap}px`);
  check(close(layout.sectionFlowGap, rootFont), `SectionCard spacing doubled/changed: ${layout.sectionFlowGap}px`);
  for (const selector of [".fixture-page-header", ".fixture-section-header", ".fixture-subsection-header", ".fixture-native-card", ".fixture-custom-card", ".fixture-section-card"]) {
    check(await panel.locator(selector).count() === 1, `Caller className lost: ${selector}`);
  }
  const native = panel.locator('#pattern-native-card[data-passthrough="native-card"][aria-label="Fixture native card"][data-slot="card"]');
  check(await native.count() === 1, "Native id/data/aria attributes not forwarded to PCard");
  const beforeClicks = await page.evaluate(() => window.__patternClicks);
  await panel.locator("[data-pattern-click]").click();
  check(await page.evaluate(() => window.__patternClicks) === beforeClicks + 1, "PCard native click callback was not forwarded");
  for (const card of await panel.locator("[data-pattern-card],.fixture-section-card").all()) {
    await card.scrollIntoViewIfNeeded();
    await page.mouse.move(1, 1);
    await settleControlPaint(page, card);
    const sample = (element) => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      return { top:box.top + scrollY, left:box.left + scrollX, width:box.width, height:box.height,
        transform:style.transform, translate:style.translate, scale:style.scale, rotate:style.rotate, shadow:style.boxShadow, background:style.backgroundColor };
    };
    const before = await card.evaluate(sample);
    await card.hover();
    await settleControlPaint(page, card);
    const after = await card.evaluate(sample);
    check(["top", "left", "width", "height"].every((key) => close(before[key], after[key])), `Card moves/resizes on hover: ${JSON.stringify({ before, after })}`);
    check(["transform", "translate", "scale", "rotate", "shadow", "background"].every((key) => before[key] === after[key]), `Card hover paint/lift remains: ${JSON.stringify({ before, after })}`);
  }
  await page.mouse.move(1, 1);
  const texts = panel.locator("h1,h2,h3,p,[data-pattern-copy]");
  check(await texts.count() === 17, "Incomplete expected heading/description/action/body text coverage (17 nodes)");
  for (const text of await texts.all()) {
    try {
      const result = await text.evaluate(readCssTextContrast);
      check(result.ratio >= 4.5, `${(await text.textContent())?.slice(0, 60)}: normal text contrast ${result.ratio}:1; ${result.foreground} over ${result.backgroundLayers.join(" over ")}`);
    } catch (error) { failures.push(`Unsupported visible text paint: ${error.message}`); }
  }
  assert.equal(failures.length, 0, `Shared patterns ${role}/${theme}/${language}/${width}px/${rootFont}px root:\n${failures.join("\n")}`);
}

const heatmapContracts = {
  light: {
    colors: ["rgb(234, 238, 242)", "rgb(187, 247, 208)", "rgb(74, 222, 128)", "rgb(22, 163, 74)", "rgb(20, 83, 45)"],
    outline: "rgba(15, 23, 42, 0.06)", hover: "rgba(15, 23, 42, 0.28)", xpTrack: "rgb(226, 232, 240)",
  },
  dark: {
    colors: ["rgb(31, 41, 55)", "rgb(15, 61, 36)", "rgb(21, 128, 61)", "rgb(34, 197, 94)", "rgb(134, 239, 172)"],
    outline: "rgba(255, 255, 255, 0.06)", hover: "rgba(226, 232, 240, 0.5)", xpTrack: "rgb(51, 65, 85)",
  },
};

function hasInsetShadow(shadow, color, spread) {
  // Split layers without splitting commas inside colors. Compare complete
  // geometry: substring matching must not accept 10px as a zero offset.
  const layers = shadow.match(/(?:rgba?\([^)]*\)|[^,])+/g) ?? [];
  const paint = `${color} 0px 0px 0px ${spread}px`;
  return layers.some((layer) => layer.trim() === `${paint} inset` || layer.trim() === `inset ${paint}`);
}

async function assertHeatmapPaint(page, theme) {
  const expected = heatmapContracts[theme];
  const failures = [];
  const equal = (actual, wanted, name) => { if (actual !== wanted) failures.push(`${name}: wanted ${wanted}; received ${actual}`); };
  const inset = (shadow, color, spread, name) => {
    if (!hasInsetShadow(shadow, color, spread)) {
      failures.push(`${name}: missing ${spread}px inset ${color}; received ${shadow}`);
    }
  };
  await expect(page.locator('[data-heatmap-motion-contracts] [role="gridcell"]')).toHaveCount(5);
  await page.mouse.move(1, 1);
  for (const level of [0, 1, 2, 3, 4]) {
    const cell = page.locator(`[role="gridcell"][data-level="${level}"]`);
    const legend = page.getByTestId(`legend-level-${level}`);
    await expect(cell).toHaveCount(1);
    await expect(legend).toHaveCount(1);
    await expect(cell).toHaveAttribute("data-future", "false");
    await settleControlPaint(page, cell);
    const before = await cell.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background:style.backgroundColor, shadow:style.boxShadow, opacity:style.opacity };
    });
    equal(before.background, expected.colors[level], `cell${level} fill`);
    equal(before.opacity, "1", `cell${level} past-date opacity`);
    inset(before.shadow, expected.outline, 1, `cell${level} outline`);
    const swatch = await legend.evaluate((element) => ({ background:getComputedStyle(element).backgroundColor, shadow:getComputedStyle(element).boxShadow }));
    equal(swatch.background, expected.colors[level], `legend${level} fill`);
    inset(swatch.shadow, expected.outline, 1, `legend${level} outline`);
    await cell.hover();
    await settleControlPaint(page, cell);
    inset(await cell.evaluate((element) => getComputedStyle(element).boxShadow), expected.hover, 2, `cell${level} hover ring`);
    await page.mouse.move(1, 1);
  }
  for (const [part, wanted] of [["track", expected.xpTrack], ["fill", "rgb(20, 184, 166)"]]) {
    const swatch = page.locator(`[data-xp-contract="${part}"]`);
    await expect(swatch).toHaveCount(1);
    equal(await swatch.evaluate((element) => getComputedStyle(element).backgroundColor), wanted, `XP ${part} TOKEN CONTRACT ONLY`);
  }
  assert.equal(failures.length, 0, `D01 ${theme} painted contract failures:\n${failures.join("\n")}`);
}

async function assertUtilityMotion(page, preference) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const samples = await page.locator("[data-motion-probe]").evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    return { probe:element.dataset.motionProbe, name:style.animationName, opacity:style.opacity, transform:style.transform, shadow:style.boxShadow,
      animations:element.getAnimations().map((animation) => ({ name:animation.animationName, state:animation.playState,
        time:animation.currentTime, duration:animation.effect.getTiming().duration, infinite:animation.effect.getTiming().iterations === Infinity })) };
  }));
  assert.equal(samples.length, 3, "Missing explicit CSS utility probes");
  const staticDepth = await page.locator("[data-motion-static-depth]").evaluate((element) => getComputedStyle(element).boxShadow);
  assert.notEqual(staticDepth, "none", "Canonical depth token did not resolve for static ring reference");
  const expected = { "agent-ring": ["agent-ring", 2400], "risk-dot": ["risk-pulse", 1600], "cursor-blink": ["cursor-blink", 1000] };
  const failures = [];
  for (const sample of samples) {
    const [name, duration] = expected[sample.probe];
    if (preference === "reduce") {
      if (sample.name !== "none" || sample.animations.length !== 0) failures.push(`${sample.probe}: reduced motion still animates: ${JSON.stringify(sample)}`);
      if (sample.opacity !== "1" || sample.transform !== "none") failures.push(`${sample.probe}: reduced indicator not visible/static: ${JSON.stringify(sample)}`);
      if (sample.probe === "agent-ring" && sample.shadow !== staticDepth) failures.push(`agent-ring lost canonical static depth: wanted ${staticDepth}; received ${sample.shadow}`);
    } else {
      const animation = sample.animations.find((item) => item.name === name);
      if (sample.name !== name || sample.animations.length !== 1 || !animation || animation.state !== "running" || animation.duration !== duration || !animation.infinite || typeof animation.time !== "number") {
        failures.push(`${sample.probe}: missing normal-motion running positive control: ${JSON.stringify(sample)}`);
      }
    }
  }
  if (preference === "no-preference" && failures.length === 0) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    for (const sample of samples) {
      const later = await page.locator(`[data-motion-probe="${sample.probe}"]`).evaluate((element) => element.getAnimations()[0]?.currentTime);
      if (!(typeof later === "number" && later > sample.animations[0].time)) failures.push(`${sample.probe}: CSS animation clock did not advance`);
    }
  }
  assert.equal(failures.length, 0, `D03 ${preference} utility contract failures:\n${failures.join("\n")}`);
}

async function assertDarkSidebar(sidebar) {
  const surface = await sidebar.evaluate((element) => {
    const style = getComputedStyle(element);
    return { image: style.backgroundImage, color: style.backgroundColor };
  });
  assert.equal(surface.image, "none", `Dark sidebar retained background image: ${surface.image}`);
  assert.notEqual(surface.color, "rgba(0, 0, 0, 0)", "Dark sidebar surface is transparent");
  const labels = sidebar.locator(".sidebar-nav-label");
  assert(await labels.count() > 0, "No actual sidebar labels measured");
  const failures = [];
  for (const label of await labels.all()) {
    const name = (await label.textContent())?.trim();
    try {
      const sample = await label.evaluate(readCssTextContrast);
      if (sample.ratio < 4.5) failures.push(`${name}: ${sample.ratio}:1; foreground=${sample.foreground}; layers=${sample.backgroundLayers.join(" over ")}`);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  }
  assert.equal(failures.length, 0, `Dark sidebar normal navigation text contrast failures:\n${failures.join("\n")}`);
}

async function assertCenterHit(locator, label) {
  const result = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return {
      ownTarget: hit === element || (hit !== null && element.contains(hit)),
      blocker: hit ? `${hit.tagName.toLowerCase()}#${hit.id}.${String(hit.className).slice(0, 150)}` : "none",
    };
  });
  assert(result.ownTarget, `${label} center is obstructed by ${result.blocker}`);
}

async function assertNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({ viewport: innerWidth, html: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert(geometry.html <= geometry.viewport + 1 && geometry.body <= geometry.viewport + 1, `Horizontal overflow: ${JSON.stringify(geometry)}`);
}

async function assertLastActionClear(page, mobile) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
  const clearance = await page.evaluate(() => {
    const action = document.getElementById("fixture-last-action");
    const actionRect = action.getBoundingClientRect();
    const nav = document.querySelector(".new-mobile-tabbar");
    const visible = nav && getComputedStyle(nav).display !== "none";
    const blockers = visible ? [nav, ...nav.querySelectorAll("a")].map((element) => element.getBoundingClientRect()) : [];
    const blockerTop = blockers.length ? Math.min(...blockers.map((rect) => rect.top)) : innerHeight;
    const grid = document.querySelector(".role-shell-grid");
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return {
      actionBottom: actionRect.bottom, actionTop: actionRect.top, blockerTop,
      hit: Boolean(document.elementFromPoint(actionRect.x + actionRect.width / 2, actionRect.y + actionRect.height / 2)?.closest("#fixture-last-action")),
      paddingBottom: parseFloat(getComputedStyle(grid).paddingBottom),
      expectedClearance: (3.25 + 1.25) * rootFont + 24,
      navHeight: visible ? nav.getBoundingClientRect().height : 0,
      expectedNavHeight: 3.25 * rootFont + 24,
    };
  });
  assert(clearance.actionTop >= 0 && clearance.actionBottom <= clearance.blockerTop + 0.5, `Last action obstructed, including raised tab: ${JSON.stringify(clearance)}`);
  assert(clearance.hit, `Last action is not the hit target: ${JSON.stringify(clearance)}`);
  if (mobile) {
    assert(Math.abs(clearance.paddingBottom - clearance.expectedClearance) <= 1, `Mobile clearance formula drift: ${JSON.stringify(clearance)}`);
    assert(Math.abs(clearance.navHeight - clearance.expectedNavHeight) <= 1, `Bottom-bar safe-area geometry drift: ${JSON.stringify(clearance)}`);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

const round9Requests = new WeakMap();

async function round9Page(context, base, failures) {
  await context.addInitScript((source) => { window.__shellContrastMath = (0, eval)("(" + source + ")"); }, contrastFromCssColors.toString());
  const page = await context.newPage();
  const requests=new Map(); round9Requests.set(page,requests);
  page.on("request", (request) => {
    let settle;
    const settled=new Promise((resolve)=>{ settle=resolve; });
    requests.set(request,{ startedAt:Date.now(), sceneUrl:page.url(), type:request.resourceType(), settled, settle });
  });
  page.on("requestfinished", (request) => { requests.get(request)?.settle(); requests.delete(request); });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}; scene=${page.url()}; at=${new Date().toISOString()}`));
  page.on("requestfailed", (request) => {
    const start=requests.get(request);
    failures.push(`request failed: ${request.url()}; error=${request.failure()?.errorText ?? "unknown"}; type=${request.resourceType()}; startedScene=${start?.sceneUrl}; currentScene=${page.url()}; startedAt=${start ? new Date(start.startedAt).toISOString() : "unknown"}; failedAt=${new Date().toISOString()}`);
    start?.settle();
    requests.delete(request);
  });
  page.on("response", (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}; scene=${page.url()}; at=${new Date().toISOString()}`); });
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin === base) return route.continue();
    failures.push(`Non-local request: ${route.request().url()}`);
    return route.abort();
  });
  return page;
}

async function settleRound9Scene(page, phase) {
  const fonts=await page.evaluate(async () => {
    // Rendering opportunities, not timed sleeps: React's committed scene and
    // responsive layout must request their faces before fonts.ready is read.
    await new Promise(requestAnimationFrame);
    document.body.getBoundingClientRect();
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    const samples=[...document.querySelectorAll("[data-round9-scene] h1,[data-round9-scene] h2,[data-round9-scene] h3,[data-round9-scene] p")]
      .filter((element)=>element.checkVisibility() && element.textContent.trim())
      .map((element)=>{ const style=getComputedStyle(element); element.getBoundingClientRect(); return { text:element.textContent, family:style.fontFamily, font:`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}` }; });
    await document.fonts.ready;
    const required=new Set();
    for (const sample of samples) {
      if (/[\u0600-\u06ff]/.test(sample.text) && sample.family.includes("Noto Sans Arabic")) required.add("Noto Sans Arabic");
      if (/[A-Za-z]/.test(sample.text)) {
        if (sample.family.includes("Plus Jakarta Sans")) required.add("Plus Jakarta Sans");
        else if (sample.family.includes("Source Sans 3")) required.add("Source Sans 3");
      }
    }
    return { status:document.fonts.status, required:[...required], loaded:[...document.fonts].filter((face)=>face.status==="loaded").map((face)=>face.family.replaceAll('"',"")), failed:[...document.fonts].filter((face)=>face.status==="error").map((face)=>face.family), unchecked:samples.filter((sample)=>!document.fonts.check(sample.font,sample.text)).map((sample)=>({family:sample.family,text:sample.text.slice(0,60)})) };
  });
  const requests=round9Requests.get(page);
  // Request lifecycle promises are resolved by finished/failed events, never a
  // retry or a network-idle delay. Failures still remain fatal in the collector.
  while (requests?.size) await Promise.all([...requests.values()].map((request)=>request.settled));
  assert.equal(fonts.status,"loaded",`${phase}: font loading did not settle at ${page.url()}`);
  assert.deepEqual(fonts.failed,[],`${phase}: failed font faces at ${page.url()}`);
  assert.deepEqual(fonts.unchecked,[],`${phase}: rendered text fonts unavailable at ${page.url()}`);
  assert(fonts.required.length>0 && fonts.required.every((family)=>fonts.loaded.includes(family)),`${phase}: used body/heading faces did not load: ${JSON.stringify(fonts)}`);
}

async function openRound9(page, base, { scene, sample = "regular", theme, language = "en", width = 1024, rootFont = 16 }) {
  if (await page.evaluate(()=>window.__shellFixture?.mounted === true)) await settleRound9Scene(page,"departure");
  const role = scene === "clo" ? "teacher" : scene === "admin" ? "admin" : "student";
  const query = new URLSearchParams({ contracts:"round9", scene, sample, theme, language, role, course:"course-fixture" });
  // Do not resize the previous baseline document: revealing its desktop brand
  // can start a Jakarta request immediately before goto destroys that document.
  await page.goto(`${base}/${role}/dashboard?${query}`, { waitUntil:"networkidle" });
  await page.waitForFunction(() => window.__shellFixture?.mounted === true);
  await expect(page.locator("[data-round9-scene]")).toHaveAttribute("data-round9-scene",scene);
  await page.setViewportSize({ width, height:1000 });
  await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, rootFont);
  await settleRound9Scene(page,"arrival after responsive layout");
  const palette = await page.locator("[data-round9-palette]").evaluateAll((elements) => Object.fromEntries(elements.map((element) => [element.dataset.round9Palette, getComputedStyle(element).backgroundColor])));
  return { subject:page.locator("[data-round9-subject]"), palette };
}

async function assertRound9Field(page, track, expected, palette) {
  await expect(track).toHaveCount(1);
  await expect(track).toBeVisible();
  const fill = track.locator(":scope > div");
  await expect(fill).toHaveCount(1);
  await track.scrollIntoViewIfNeeded();
  await settleControlPaint(page, fill);
  const field = await fill.evaluate((element) => {
    const rect = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
    const own = getComputedStyle(element), back = getComputedStyle(element.parentElement);
    return { width:rect.width, height:rect.height, trackWidth:parent.width, trackHeight:parent.height, fill:own.backgroundColor, track:back.backgroundColor, fillImage:own.backgroundImage, trackImage:back.backgroundImage };
  });
  assert(field.trackWidth > 0 && field.trackHeight > 0 && field.height > 0, `Empty target field: ${JSON.stringify(field)}`);
  assert(Math.abs(field.width - field.trackWidth * expected.percent / 100) <= 1, `Actual percentage geometry drift, wanted ${expected.percent}%: ${JSON.stringify(field)}`);
  assert.equal(field.fill, palette[expected.fill], "Actual fill token mismatch");
  assert.equal(field.track, palette[expected.track ?? "muted"], "Actual track token mismatch");
  assert.equal(field.fillImage, "none");
  assert.equal(field.trackImage, "none");
  const contrast = contrastFromCssColors(field.fill, [field.track]);
  assert(contrast.ratio >= 3, `Actual field contrast ${contrast.ratio} < 3: ${JSON.stringify(field)}`);
}

async function assertRound9Progress(page, base, config) {
  const { subject, palette } = await openRound9(page, base, config);
  const { scene, sample = "regular" } = config;
  let track, percent, fill;
  if (scene === "rail") {
    await expect(subject.getByRole("complementary")).toBeVisible();
    track = subject.getByRole("progressbar");
    if (sample === "unknown" || sample === "loading") { await expect(track).toHaveCount(0); return 0; }
    percent = sample === "lower" ? 0 : sample === "upper" ? 100 : 37;
    await expect(track).toHaveAttribute("aria-valuemin", "0");
    await expect(track).toHaveAttribute("aria-valuemax", "100");
    await expect(track).toHaveAttribute("aria-valuenow", String(percent));
    await expect(subject.locator('a[href="/student/settings/reassessment"]')).toHaveCount(percent < 100 ? 1 : 0);
    fill = "text-teal";
  } else if (scene === "clo") {
    const label = subject.getByText(/^Curriculum readiness:/);
    if (sample === "empty") { await expect(label).toHaveCount(0); return 0; }
    const wrapper = label.locator("..");
    const wrapperPaint = await wrapper.evaluate((element) => ({ background:getComputedStyle(element).backgroundColor, image:getComputedStyle(element).backgroundImage }));
    assert.equal(wrapperPaint.background, palette.card, "Readiness paired wrapper must be bg-card");
    assert.equal(wrapperPaint.image, "none");
    track = wrapper.locator(":scope > div");
    percent = sample === "ready" ? 100 : 25;
    await expect(wrapper.getByText("Curriculum ready", { exact:true })).toHaveCount(sample === "ready" ? 1 : 0);
    fill = "text-teal";
  } else if (scene === "habit") {
    if (sample === "max") { await expect(subject.getByText("Max level reached", { exact:true })).toBeVisible(); await expect(subject.locator('[style*="width:"]')).toHaveCount(0); return 0; }
    track = subject.getByText(/days? to Level 2/).locator("..").locator(":scope > div");
    percent = sample === "zero" ? 0 : sample === "upper" ? 100 : 300 / 7;
    fill = "success-foreground";
  } else if (scene === "admin") {
    const label = subject.getByText("Draft acceptance", { exact:true });
    if (sample === "loading" || sample === "gate") { await expect(label).toHaveCount(0); if (sample === "gate") await expect(subject.getByText("Not enough usage data", { exact:true })).toBeVisible(); return 0; }
    track = label.locator("../..").locator(":scope > div").nth(1);
    percent = 37; fill = "success-foreground";
  } else if (scene === "weakest") {
    const label = subject.getByRole("heading", { name:"Fixture weakest outcome", exact:true });
    await expect(subject.getByRole("progressbar")).toHaveCount(0);
    await expect(subject.locator('[style*="width:"]')).toHaveCount(0);
    if (sample === "empty") { await expect(label).toHaveCount(0); return 0; }
    const card = label.locator("xpath=ancestor::*[@data-slot='card'][1]");
    const score = label.locator("..").locator(":scope > p").first();
    await expect(score).toHaveText("37%");
    assert.equal(await score.evaluate((element) => getComputedStyle(element).color), palette["progress-attention"]);
    for (const textOwner of await card.locator("h2,h3,p").all()) {
      const text = await textOwner.evaluate(readCssTextContrast);
      assert(text.ratio >= 4.5, `Recorded outcome normal text contrast ${text.ratio} <4.5`);
    }
    // The product replaced a misleading relative bar with an actual numeric
    // outcome score. Keep the13th field assertion, now its value/text paint.
    return 1;
  } else if (scene === "xp") {
    const heading = subject.getByRole("heading", { name:"Summary", exact:true });
    if (sample === "loading") { await expect(heading).toHaveCount(0); return 0; }
    const card = heading.locator("xpath=ancestor::*[@data-slot='card'][1]");
    if (sample === "empty") { await expect(card.getByText("No transactions in this period.", { exact:true })).toBeVisible(); await expect(card.locator('[style*="width:"]')).toHaveCount(0); return 0; }
    const categories = sample === "zero" ? [["Journal Entry", 0]] : [["Journal Entry", 37], ["On-time Submission", 63]];
    for (const [label, value] of categories) {
      const categoryTrack = card.getByText(label, { exact:true }).locator("../..").locator(":scope > div").nth(1);
      await assertRound9Field(page, categoryTrack, { percent:value, fill:"xp", track:"tertiary-900" }, palette);
    }
    return categories.length;
  } else throw new Error(`Unknown Round9 progress scene ${scene}`);
  await assertRound9Field(page, track, { percent, fill }, palette);
  return 1;
}

async function assertRound9RadioPaint(page, subject, palette) {
  // REST comparison, not the deliberately translucent unselected hover state.
  await page.mouse.move(0, 0);
  const rows = subject.getByRole("radio");
  const count = await rows.count();
  assert(count >= 2, "No actual radio options rendered");
  for (let index = 0; index < count; index++) {
    const row = rows.nth(index);
    await settleControlPaint(page, row);
    const paint = await row.evaluate((element) => {
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      const ring = element.firstElementChild, ringStyle = getComputedStyle(ring), ringRect = ring.getBoundingClientRect();
      const dot = ring.firstElementChild;
      const textRects = [], walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) if (node.textContent.trim()) {
        const range = document.createRange(); range.selectNodeContents(node);
        for (const text of range.getClientRects()) textRects.push({ left:text.left, right:text.right, top:text.top, bottom:text.bottom });
      }
      return { selected:element.getAttribute("aria-checked") === "true", label:element.getAttribute("aria-label"), text:element.textContent.trim(), background:style.backgroundColor, image:style.backgroundImage, foreground:style.color, border:style.borderTopColor,
        ring:ringStyle.borderTopColor, ringWidth:parseFloat(ringStyle.borderTopWidth), dot:dot ? getComputedStyle(dot).backgroundColor : null, dotSize:dot ? { width:dot.getBoundingClientRect().width, height:dot.getBoundingClientRect().height } : null,
        rect:{ left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, width:rect.width, height:rect.height }, ringRect:{ left:ringRect.left, right:ringRect.right, top:ringRect.top, bottom:ringRect.bottom }, textRects, viewport:innerWidth };
    });
    assert.equal(paint.label, paint.text, "Actual accessible option label differs from visible copy");
    assert(paint.rect.width >= 44 && paint.rect.height >= 44, `Radio target smaller than 44px: ${JSON.stringify(paint)}`);
    assert(paint.rect.left >= -1 && paint.rect.right <= paint.viewport + 1, `Actual radio row leaves viewport: ${JSON.stringify(paint)}`);
    assert(paint.textRects.length > 0, "No actual label glyph rectangles");
    for (const rect of paint.textRects) {
      assert(rect.left >= paint.rect.left - 1 && rect.right <= paint.rect.right + 1 && rect.top >= paint.rect.top - 1 && rect.bottom <= paint.rect.bottom + 1, `Actual long label clipping: ${JSON.stringify(paint)}`);
      const overlapsRing = rect.right > paint.ringRect.left + 1 && rect.left < paint.ringRect.right - 1 && rect.bottom > paint.ringRect.top + 1 && rect.top < paint.ringRect.bottom - 1;
      assert(!overlapsRing, `Label overlaps radio indicator: ${JSON.stringify(paint)}`);
    }
    assert.equal(paint.image, "none");
    assert.equal(paint.background, paint.selected ? palette.accent : palette.card);
    assert.equal(paint.ring, paint.selected ? palette.primary : palette["muted-foreground"]);
    assert(paint.ringWidth >= 2 && contrastFromCssColors(paint.ring, [paint.background]).ratio >= 3, "Actual radio ring contrast < 3");
    if (paint.selected) {
      assert.equal(paint.border, palette.primary);
      assert.equal(paint.foreground, palette["accent-foreground"]);
      assert.equal(paint.dot, palette.primary);
      assert(paint.dotSize.width > 0 && paint.dotSize.height > 0, "Selected dot has no painted area");
      assert(contrastFromCssColors(paint.dot, [paint.background]).ratio >= 3, "Selected dot contrast < 3");
      assert(contrastFromCssColors(paint.border, [paint.background]).ratio >= 3 && contrastFromCssColors(paint.border, [palette.card]).ratio >= 3, "Selected row border contrast < 3");
      const labels = await row.evaluate((element, source) => {
        const readContrast = (0, eval)("(" + source + ")"), owners = new Set();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) if (node.textContent.trim()) owners.add(node.parentElement);
        return [...owners].map((owner) => readContrast(owner));
      }, readCssTextContrast.toString());
      assert(labels.length > 0, "No actual text-bearing label owner");
      for (const label of labels) {
        assert.equal(label.foreground, palette["accent-foreground"], "A label child overrides the selected foreground");
        assert(label.ratio >= 4.5, `Actual selected label contrast ${label.ratio} < 4.5`);
      }
    } else assert.equal(paint.dot, null, "Unselected row retained a dot");
  }
}

async function assertRound9Onboarding(page, base, config, studentResources) {
  const { subject, palette } = await openRound9(page, base, config);
  const { scene, language } = config;
  const strings = studentResources[language].onboarding;
  const keys = { study_strategy:"studyStrategy", self_efficacy:"selfEfficacy", personality:"personality", learning_style:"learningStyle" };
  if (scene !== "baseline") {
    await expect(subject.getByRole("radio")).toHaveCount(0);
    const begin = subject.getByRole("button", { name:strings.assessmentIntro.begin, exact:true });
    await expect(begin).toBeVisible();
    assert.equal(await page.evaluate(() => window.__round9Saves.length), 0, "Responses saved before actual Begin");
    await begin.click();
  }
  const rows = subject.getByRole("radio");
  await expect(rows).toHaveCount(scene === "baseline" || scene === "learning_style" ? 2 : 5);
  await expect(subject.locator('[role="radio"][aria-checked="true"]')).toHaveCount(0);
  for (const index of [0, 1]) {
    if (config.width < 640) await rows.nth(index).tap();
    else await rows.nth(index).click();
    await page.mouse.move(0, 0);
    await expect(subject.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1);
    await expect(rows.nth(index)).toHaveAttribute("aria-checked", "true");
    await assertRound9RadioPaint(page, subject, palette);
  }
  const complete = subject.getByRole("button", { name:scene === "baseline" ? "Submit" : strings[keys[scene]].complete, exact:true });
  await expect(complete).toBeEnabled();
  await complete.click();
  await page.waitForFunction(() => window.__round9Completed === 1);
  const saved = await page.evaluate(() => window.__round9Saves);
  assert.deepEqual(saved, [{ student_id:"shell-fixture", assessment_type:scene, assessment_version:7, ...(scene === "baseline" ? { course_id:"course-fixture" } : {}), responses:[{ question_id:`question-${scene}`, selected_option:scene === "baseline" || scene === "learning_style" ? 1 : 2 }] }], "Actual selected-index/save contract drift");
  await settleRound9Scene(page,"after actual completion");
}

async function assertStudentSceneFonts(page, language) {
  await page.evaluate(async () => { await document.fonts.ready; });
  const fonts = await page.locator("[data-student-screen]").evaluate((element) => ({
    heading:getComputedStyle(element.querySelector("h1")).fontFamily,
    body:getComputedStyle(element.querySelector("header > p")).fontFamily,
    loaded:[...document.fonts].filter((face) => face.status === "loaded").map((face) => face.family.replaceAll('"', "")),
    resources:performance.getEntriesByType("resource").filter((entry) => /\.woff2?(?:$|\?)/.test(entry.name)).map((entry) => ({ path:new URL(entry.name).pathname, local:new URL(entry.name).origin === location.origin, size:entry.decodedBodySize })),
  }));
  const headingFamily = language === "ar" ? "Noto Sans Arabic" : "Plus Jakarta Sans";
  const bodyFamily = language === "ar" ? "Noto Sans Arabic" : "Source Sans 3";
  assert(fonts.heading.startsWith('"'+headingFamily+'"') || fonts.heading.startsWith(headingFamily), `Heading family drift: ${JSON.stringify(fonts)}`);
  assert(fonts.body.startsWith('"'+bodyFamily+'"') || fonts.body.startsWith(bodyFamily), `Body family drift: ${JSON.stringify(fonts)}`);
  assert(fonts.loaded.includes(headingFamily) && fonts.loaded.includes(bodyFamily) && fonts.resources.length > 0 && fonts.resources.every((resource) => resource.local && resource.size > 0), `Self-hosted faces did not load: ${JSON.stringify(fonts)}`);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument");
    for (const selector of ["[data-student-screen] h1", "[data-student-screen] header > p"]) {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId:root.nodeId, selector });
      const { fonts:platformFonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      // Pinned Source Sans3 variable face reports its internal default-axis200
      // family name; this exact alias is not an OS fallback/weight waiver.
      const primary=selector.endsWith("h1")?headingFamily:bodyFamily === "Source Sans 3"?"Source Sans 3 ExtraLight":bodyFamily;
      const allowed=selector.endsWith("h1") ? [primary,...(language === "ar" ? ["Plus Jakarta Sans"] : [])] : [primary,...(language === "ar" ? ["Source Sans 3 ExtraLight"] : [])];
      const observed=platformFonts.filter((font)=>font.glyphCount>0);
      assert(observed.some((font)=>font.familyName===primary) && observed.every((font)=>font.isCustomFont && allowed.includes(font.familyName)),  `Unexpected or fallback glyphs in actual student text ${selector}: ${JSON.stringify(platformFonts)}`);
    }
  } finally { await cdp.detach(); }
}

async function assertStudentKeyboardControls(page, subject) {
  await subject.focus(); // Test entry only; never scroll/focus a target to mask Tab behavior.
  for (const control of await subject.locator("a,button").all()) {
    await page.keyboard.press("Tab");
    await settleControlPaint(page, control);
    const geometry = await control.evaluate((element) => {
      const r=element.getBoundingClientRect(), style=getComputedStyle(element);
      const ring=Math.max(0,...[...style.boxShadow.matchAll(/0px 0px 0px ([\d.]+)px/g)].map((match)=>Number(match[1])),style.outlineStyle!=="none"?parseFloat(style.outlineWidth)+parseFloat(style.outlineOffset):0);
      const points=[[r.x+r.width/2,r.y+r.height/2],[r.x+r.width/2,r.top+1],[r.x+r.width/2,r.bottom-1],[r.left+1,r.y+r.height/2],[r.right-1,r.y+r.height/2]];
      return { width:r.width, height:r.height, left:r.left, right:r.right, top:r.top, bottom:r.bottom, viewport:innerHeight, viewportWidth:innerWidth, ring, focus:document.activeElement===element, visible:element.matches(":focus-visible"), hit:points.every(([x,y])=>element.contains(document.elementFromPoint(x,y))), outline:style.outlineStyle, shadow:style.boxShadow };
    });
    assert(geometry.width >= 44 && geometry.height >= 44 && geometry.top>=geometry.ring && geometry.bottom+geometry.ring<=geometry.viewport && geometry.left>=geometry.ring && geometry.right+geometry.ring<=geometry.viewportWidth && geometry.focus && geometry.visible && geometry.hit, `Student natural keyboard target: ${JSON.stringify(geometry)}`);
    assert(geometry.outline !== "none" || geometry.shadow !== "none", `Student keyboard focus lacks painted indicator: ${JSON.stringify(geometry)}`);
    const paint = await control.evaluate(readCssTextContrast);
    assert(paint.ratio>=4.5, `Student focused control text contrast: ${JSON.stringify(paint)}`);
  }
}

async function assertStudentTouchActivate(page, control, expected) {
  // Pointer preparation is separate from the natural-keyboard proof above.
  await control.scrollIntoViewIfNeeded();
  const box=await control.boundingBox(); assert(box && box.width>=44 && box.height>=44);
  assert(await control.evaluate((element) => { const r=element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), "Student touch target obscured");
  const cdp=await page.context().newCDPSession(page);
  try {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled:true, maxTouchPoints:1 });
    await cdp.send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{ x:box.x+box.width/2, y:box.y+box.height/2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
    await page.waitForFunction((expected) => expected.path ? location.pathname===expected.path : window.__batch8.retries.length===expected.retries, expected);
  } finally { await cdp.send("Emulation.setTouchEmulationEnabled", { enabled:false }); await cdp.detach(); }
}

async function assertStudentState(page, sample, language, copy) {
  await page.evaluate((sample) => window.__batch8.setSample(sample), sample);
  const subject=page.locator("[data-student-screen]");
  await expect(subject).toHaveAttribute("data-student-sample", sample);
  await expect(subject.getByRole("heading", { level:1, name:copy.title, exact:true })).toBeVisible();
  const palette=await page.locator("[data-student-palette]").evaluateAll((elements) => Object.fromEntries(elements.map((element) => [element.dataset.studentPalette,getComputedStyle(element).backgroundColor])));
  const tutor=subject.getByRole("link", { name:copy.openTutor, exact:true });
  await expect(tutor).toHaveCount(sample === "noactor" ? 0 : 1);
  if (sample === "noactor") {
    await expect(subject.getByRole("alert")).toHaveText(copy.signInRequired);
    assert.equal(await page.evaluate(() => window.__batch8.queryCalls.at(-1).studentId), undefined);
  } else if (["pending","paused"].includes(sample)) {
    const status=subject.getByRole("status", { name:sample === "paused" ? copy.waitingConnection : copy.loading, exact:true });
    await expect(status).toHaveAttribute("aria-busy", "true");
    assert.equal(await status.evaluate((element) => getComputedStyle(element).animationName), "none");
    await expect(subject.locator("dl")).toHaveCount(0);
  } else if (["error","undefined"].includes(sample)) {
    await expect(subject.getByRole("alert")).toHaveText(sample === "error" ? copy.loadError : copy.unavailable);
    const retry=subject.getByRole("button", { name:copy.retry, exact:true });
    assert.equal(await retry.evaluate((element) => !!element.closest("[role='alert'],[role='status'],[aria-busy='true']")), false, "Retry must not live inside an announcement");
  } else if (sample === "empty") {
    await expect(subject.getByText(copy.noCourses,{exact:true})).toBeVisible();
    await expect(subject.getByRole("link", { name:copy.browseCourses, exact:true })).toHaveAttribute("href", "/student/courses");
  } else {
    const dto=await page.evaluate(() => {
      const d=window.__batch8.studentData;
      return { total:d.activeCourseCount, recorded:d.recordedCourseCount, average:d.averageMastery, excellent:d.excellentCount, courses:d.perCourse.map((c) => ({ id:c.course_id,name:c.course_name,code:c.course_code,percent:c.attainment_percent,recorded:c.attainmentRecorded,outcomes:c.clo_count,samples:c.evidence_count })), focus:d.weakestClo ? { title:d.weakestClo.title,course:d.weakestClo.courseId,mastery:d.weakestClo.mastery } : null };
    });
    const formatted=await page.evaluate(({ dto,language,unknown,partial }) => {
      const n=new Intl.NumberFormat(language), p=new Intl.NumberFormat(language,{style:"percent",maximumFractionDigits:1});
      const count=(value)=>Number.isSafeInteger(value)&&value>=0?n.format(value):unknown;
      return { metrics:[count(dto.total),count(dto.recorded),partial?unknown:p.format(dto.average/100),partial?unknown:count(dto.excellent)], rates:dto.courses.map((c)=>c.recorded&&Number.isFinite(c.percent)&&c.percent>=0&&c.percent<=100?p.format(c.percent/100):unknown), counts:dto.courses.map((c)=>[count(c.outcomes),count(c.samples)]), focus:dto.focus&&Number.isFinite(dto.focus.mastery)?p.format(dto.focus.mastery/100):null };
    }, { dto,language,unknown:copy.notMeasured,partial:["unrecorded","partial","invalid"].includes(sample) });
    assert.deepEqual(await subject.locator("dl dd").allTextContents(), formatted.metrics);
    const status=subject.locator("p[role='status']");
    await expect(status).toHaveCount(["unrecorded","partial","invalid"].includes(sample)?1:0);
    if (await status.count()) { await expect(status).toHaveAttribute("aria-live","polite"); await expect(status).toHaveAttribute("aria-atomic","true"); }
    const rows=subject.locator("ul > li"); await expect(rows).toHaveCount(2);
    for (let index=0;index<dto.courses.length;index++) {
      const course=dto.courses[index], row=rows.nth(index);
      const link=row.getByRole("link"); await expect(link).toHaveText(course.name.trim() || copy.unnamedCourse);
      await expect(row.locator("[data-slot='badge']")).toHaveCount(course.code.trim()?1:0);
      if (!course.code.trim()) await expect(link).toHaveAttribute("aria-label",copy.unnamedCourse);
      await expect(link).toHaveAttribute("href", `/student/courses/${encodeURIComponent(course.id)}`);
      await expect(row.getByText(formatted.rates[index],{exact:true})).toBeVisible();
      await expect(row.getByText(copy.outcomeCount.replace("{{value}}",formatted.counts[index][0]),{exact:true})).toBeVisible();
      await expect(row.getByText(copy.sampleCount.replace("{{value}}",formatted.counts[index][1]),{exact:true})).toBeVisible();
      const paint=await row.locator("p.text-lg").evaluate((element)=>getComputedStyle(element).color);
      assert.equal(paint,palette.foreground);
    }
    const showFocus=["zero","focus"].includes(sample);
    const focusHeading=subject.getByRole("heading",{name:"Owned lowest-outcome evidence",exact:true});
    await expect(focusHeading).toHaveCount(showFocus?1:0);
    if (showFocus) {
      const score=focusHeading.locator("..").locator(":scope > p").first();
      await expect(score).toHaveText(formatted.focus);
      assert.equal(await score.evaluate((element)=>getComputedStyle(element).color),palette["progress-attention"]);
      const paint=await score.evaluate(readCssTextContrast); assert(paint.ratio>=4.5, `Actual numeric focus score contrast: ${JSON.stringify(paint)}`);
      await expect(subject.getByRole("link",{name:copy.reviewCourse,exact:true})).toHaveAttribute("href", `/student/courses/${encodeURIComponent(dto.focus.course)}`);
    } else await expect(subject.getByText(copy.noOutcomeEvidence,{exact:true})).toBeVisible();
    await expect(subject.getByRole("progressbar")).toHaveCount(0);
    await expect(subject.locator('[style*="width:"]')).toHaveCount(0);
  }
  const paints=await subject.locator("h1,h2,h3,dt,dd,p,bdi").evaluateAll((elements,source)=>{
    const measure=(0,eval)("("+source+")");
    return elements.filter((e)=>e.checkVisibility()&&e.textContent.trim()&&!e.classList.contains("sr-only")).map((e)=>({text:e.textContent.slice(0,70),...measure(e)})).filter((value)=>value.ratio<4.5);
  },readCssTextContrast.toString());
  assert.deepEqual(paints,[],`Actual student text contrast ${sample}/${language}`);
  const cardPaints=await subject.locator("[data-slot='card']").evaluateAll((cards)=>cards.map((card)=>getComputedStyle(card).backgroundColor));
  assert(cardPaints.every((paint)=>paint===palette.card), `Student/StatePanel card pairing drift: ${JSON.stringify(cardPaints)}`);
  assert(!/20 min|5\/12|AI insights|Focus Plan/i.test(await subject.textContent()), "Retired fabricated student recommendation returned");
  await assertNoHorizontalOverflow(page);
  await assertStudentKeyboardControls(page,subject);
  if (["error","undefined"].includes(sample)) {
    const retries=await page.evaluate(()=>window.__batch8.retries.length);
    await assertStudentTouchActivate(page,subject.getByRole("button",{name:copy.retry,exact:true}),{retries:retries+1});
  }
  if (["empty","missing-labels","focus"].includes(sample)) {
    const destination=sample==="empty"?"/student/courses":"/student/courses/"+encodeURIComponent("course/one alpha");
    const control=sample==="empty"?subject.getByRole("link",{name:copy.browseCourses,exact:true}):sample==="missing-labels"?subject.locator("ul > li").first().getByRole("link"):subject.getByRole("link",{name:copy.reviewCourse,exact:true});
    const initial=new URL(page.url()).pathname;
    await assertStudentTouchActivate(page,control,{path:destination});
    await expect(page.locator("[data-student-route]")).toHaveText(destination);
    await page.evaluate(()=>history.back()); await page.waitForFunction((path)=>location.pathname===path,initial);
    await tutor.focus(); await page.keyboard.press("Enter");
    await expect(page.locator("[data-student-route]")).toHaveText("/student/tutor");
    await page.evaluate(()=>history.back()); await page.waitForFunction((path)=>location.pathname===path,initial);
  }
}

let batch8EvidenceDirectory;
async function saveBatch8Evidence(page, name) {
  batch8EvidenceDirectory ??= await mkdtemp(join(tmpdir(), "edeviser-batch8-visual-"));
  const path = join(batch8EvidenceDirectory, `${name}.png`);
  await page.screenshot({ path, fullPage:false });
  console.log(`BATCH8 ACTUAL-SCENE SCREENSHOT (retained outside fixture cleanup): ${path}`);
}

async function openBatch8(page, base, { scene, theme, language = "en", role = "parent", width = 390, rootFont = 16, shell = true, viewportHeight = 1000 }) {
  await page.setViewportSize({ width, height:viewportHeight });
  const query = new URLSearchParams({ contracts:`batch8-${scene}`, theme, language, role, shell:String(shell) });
  await page.goto(`${base}/${role}/dashboard?${query}`, { waitUntil:"networkidle" });
  await page.waitForFunction(() => window.__shellFixture?.mounted && window.__batch8?.setTheme);
  await page.evaluate(({ rootFont }) => {
    document.documentElement.style.fontSize = `${rootFont}px`;
    // Integrated root primitive: toaster is a SIBLING, not a child of the shell.
    document.documentElement.style.setProperty("--app-mobile-nav-safe-area", "24px");
  }, { rootFont });
  await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
  await expect(page.locator("html")).toHaveClass(new RegExp(theme));
}

async function assertBatch8Control(page, control, { toastFrame = false } = {}) {
  // Continue actual sequential keyboard navigation from Sonner's Alt+T list.
  // Programmatic focus after a mouse click does not establish :focus-visible.
  await page.keyboard.press("Tab");
  // Do not repair keyboard auto-scroll with a programmatic scroll operation.
  await settleControlPaint(page, control);
  const geometry = await control.evaluate((element, toastFrame) => {
    const r = element.getBoundingClientRect(), style = getComputedStyle(element);
    const card = toastFrame ? element.closest("[data-sonner-toast]") : null;
    const c = card?.getBoundingClientRect();
    return { width:r.width, height:r.height, left:r.left, right:r.right, top:r.top, bottom:r.bottom,
      hit:element.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
      focus:document.activeElement === element, outline:style.outlineStyle, outlineWidth:parseFloat(style.outlineWidth),
      contained:!c || r.left >= c.left + 1 && r.right <= c.right - 1 && r.top >= c.top && r.bottom <= c.bottom,
      ring:card ? window.__shellContrastMath(style.outlineColor, [getComputedStyle(card).backgroundColor]).ratio : null };
  }, toastFrame);
  assert(geometry.width >= 44 && geometry.height >= 44 && geometry.hit && geometry.focus && geometry.contained, `Batch8 target/focus geometry: ${JSON.stringify(geometry)}`);
  if (toastFrame) {
    assert(geometry.outline !== "none" && geometry.outlineWidth >= 2 && geometry.ring >= 3, `Toast focus indicator lacks3:1 paint: ${JSON.stringify(geometry)}`);
  }
  const text = await control.evaluate(readCssTextContrast);
  assert(text.ratio >= (await control.locator("svg").count() && !(await control.textContent()).trim() ? 3 : 4.5), `Batch8 control contrast: ${JSON.stringify(text)}`);
}

async function tapBatch8Control(page, control, session) {
  // Reachability must come from the preceding native gesture, not fixture scroll.
  const r = await control.boundingBox();
  assert(r, "Touch target missing");
  assert(await control.evaluate((element) => { const r=element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), "Native touch target was not naturally reachable");
  const key = await control.evaluate((element) => element.hasAttribute("data-action") ? "actions" : element.hasAttribute("data-cancel") ? "cancels" : "dismisses");
  const before = await page.evaluate((key) => window.__batch8[key], key);
  await page.evaluate(() => {
    window.__batch8.touchTrace=[];
    for (const type of ["pointerdown", "pointerup", "pointercancel", "touchstart", "touchend", "click"]) document.addEventListener(type, (event) => {
      const button=event.target.closest?.("button");
      window.__batch8.touchTrace.push({ type:event.type, pointer:event.pointerType ?? null, target:button?.hasAttribute("data-action") ? "action" : button?.hasAttribute("data-close-button") ? "close" : button?.hasAttribute("data-cancel") ? "cancel" : event.target.tagName });
    }, { capture:true, once:true });
  });
  const cdp = session ?? await page.context().newCDPSession(page);
  try {
    if (!session) await cdp.send("Emulation.setTouchEmulationEnabled", { enabled:true, maxTouchPoints:1 });
    await cdp.send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{ x:r.x+r.width/2, y:r.y+r.height/2 }] });
    await cdp.send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
    // Keep native touch emulation active until the compatibility click has been
    // delivered; toggling input mode immediately at touchEnd can cancel it.
    try {
      await page.waitForFunction(({ key, before }) => window.__batch8[key] === before+1, { key, before }, { timeout:5_000 });
    } catch (error) {
      const observation = await page.evaluate(() => ({ trace:window.__batch8.touchTrace, scroll:window.__batch8.scrollObservation, actions:window.__batch8.actions, dismisses:window.__batch8.dismisses }));
      throw new Error(`Native touch callback missing after settled scroll: ${JSON.stringify(observation)}`, { cause:error });
    }
  } finally {
    if (!session) {
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled:false });
      await cdp.detach();
    }
  }
}

async function assertBatch8TouchScroll(page, card) {
  await card.evaluate((element) => {
    if (!("onscrollend" in element)) throw new Error("Chromium scrollend observation unavailable");
    window.__batch8.scrollObservation = { scrolls:0, endedAt:0, ends:0 };
    element.addEventListener("scroll", () => { window.__batch8.scrollObservation.scrolls++; });
    element.addEventListener("scrollend", () => { const observed=window.__batch8.scrollObservation; observed.endedAt=observed.scrolls; observed.ends++; });
    // Preparation only: all subsequent movement/reachability is native CDP touch.
    element.scrollTop = 0;
  });
  const before = await card.evaluate((element) => {
    const r = element.getBoundingClientRect();
    return { x:r.left+r.width/2, y:r.top+r.height*0.7, top:element.scrollTop, max:element.scrollHeight-element.clientHeight, touchAction:getComputedStyle(element).touchAction };
  });
  assert(before.max > 40, `Stress toast did not exercise bounded scrolling: ${JSON.stringify(before)}`);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled:true, maxTouchPoints:1 });
    for (let gesture=0;gesture<24;gesture++) {
      await cdp.send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{ x:before.x, y:before.y }] });
      for (let step=1;step<=8;step++) {
        await cdp.send("Input.dispatchTouchEvent", { type:"touchMove", touchPoints:[{ x:before.x, y:before.y-step*14 }] });
        await page.waitForTimeout(24);
      }
      // A controlled drag-and-hold, not a fling: a tap during kinetic scrolling
      // correctly stops the fling instead of activating a button in Chromium.
      await page.waitForTimeout(250);
      await cdp.send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
      await page.waitForTimeout(140);
      if (await card.evaluate((element) => element.scrollTop >= element.scrollHeight-element.clientHeight-1)) break;
    }
    const after = await card.evaluate((element) => ({ top:element.scrollTop, removed:element.dataset.removed, swiping:element.dataset.swiping, transform:getComputedStyle(element).transform }));
    assert(after.top >= before.max-1 && after.top > before.top+20 && after.removed !== "true" && after.swiping === "false", `Native CDP vertical touch gesture did not scroll the long toast safely: ${JSON.stringify({ before, after })}`);
    // The first tap during a compositor fling stops scrolling rather than clicks.
    // Record scrollend AND independently prove stable scroll/target geometry over
    //400ms of real frames. No forced click, extra tap or programmatic correction.
    await page.waitForFunction(() => { const s=window.__batch8.scrollObservation; return s.scrolls>0 && s.ends>0 && s.endedAt===s.scrolls; }, undefined, { timeout:5_000 });
    const settled = await card.evaluate(async (element) => {
      const start=performance.now(); let lastChange=start, previous="", frames=0;
      while (performance.now()-start < 3_000) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const r=element.querySelector("[data-action]").getBoundingClientRect();
        const snapshot=[element.scrollTop,r.x,r.y,r.width,r.height].join(",");
        if (snapshot !== previous) { previous=snapshot; lastChange=performance.now(); frames=0; } else frames++;
        if (frames>=4 && performance.now()-lastChange>=400) return { ...window.__batch8.scrollObservation, stableFrames:frames, stableMs:performance.now()-lastChange, snapshot };
      }
      throw new Error("Native scroll/action geometry did not settle within3s");
    });
    assert(settled.ends>0 && settled.endedAt===settled.scrolls, `Native scroll remained active before tap: ${JSON.stringify(settled)}`);
    console.log(`Batch8 native touch reached bottom, scrollend and stable geometry: ${JSON.stringify(settled)}`);
    await tapBatch8Control(page, card.locator("[data-action]"), cdp);
  } finally {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled:false });
    await cdp.detach();
  }
}

async function assertBatch8Toast(page, { language, width, shell, long = false, kind = "info" }) {
  // Explicit pointer modality before the real keyboard shortcut, outside every
  // toast frame/control. Alt+T itself must show a visible front-card indicator.
  await page.mouse.click(1, 1);
  await page.evaluate(({ kind, long }) => window.__batch8.notify(kind, long), { kind, long });
  const toaster = page.locator("[data-sonner-toaster]"), card = toaster.locator("[data-sonner-toast][data-front='true']");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("data-mounted", "true");
  await settleControlPaint(page, card);
  await expect(toaster).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
  await expect(toaster).toHaveAttribute("data-x-position", language === "ar" ? "left" : "right");
  await expect(toaster).toHaveAttribute("data-y-position", "bottom");
  const theme = await page.evaluate(() => window.__batch8.preferences.resolvedTheme);
  await expect(toaster).toHaveAttribute("data-sonner-theme", theme);
  const bounds = await card.evaluate((element) => {
    const r = element.getBoundingClientRect(), nav = document.querySelector(".new-mobile-tabbar"), t = element.closest("[data-sonner-toaster]");
    const blockers = nav && getComputedStyle(nav).display !== "none" ? [nav, ...nav.querySelectorAll("a")].map((e) => e.getBoundingClientRect().top) : [];
    return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height,
      viewportWidth:innerWidth, viewportHeight:innerHeight, blockerTop:blockers.length ? Math.min(...blockers) : innerHeight,
      bottomOffset:innerHeight-r.bottom, z:Number(getComputedStyle(t).zIndex), expectedZ:Number(getComputedStyle(document.documentElement).getPropertyValue("--z-toast")),
      safe:getComputedStyle(document.documentElement).getPropertyValue("--app-mobile-nav-safe-area").trim(),
      overflow:getComputedStyle(element).overflowY, scrollHeight:element.scrollHeight, clientHeight:element.clientHeight,
      scrollWidth:element.scrollWidth, clientWidth:element.clientWidth };
  });
  assert(bounds.width >= 44 && bounds.height >= 44 && bounds.left >= -0.5 && bounds.right <= width + 0.5 && bounds.top >= 0 && bounds.bottom <= bounds.blockerTop - 8, `Toast overlaps viewport/raised nav: ${JSON.stringify(bounds)}`);
  assert(bounds.scrollWidth <= bounds.clientWidth + 1, `Toast contents did not wrap: ${JSON.stringify(bounds)}`);
  assert(bounds.safe === "24px" && bounds.z === 11000 && bounds.z === bounds.expectedZ, `Toast shared safe-area/layer drift: ${JSON.stringify(bounds)}`);
  if (width >= 640) assert(language === "ar" ? bounds.left < (width-bounds.right) : width-bounds.right < bounds.left, `Desktop toast is not bottom-end: ${JSON.stringify(bounds)}`);
  if (long && bounds.scrollHeight > bounds.clientHeight + 1) assert(["auto", "scroll"].includes(bounds.overflow), "Long toast cannot scroll to its controls");
  const live = await toaster.evaluate((element) => { const region = element.closest("[aria-live]"); return region && { live:region.getAttribute("aria-live"), label:region.getAttribute("aria-label") }; });
  assert(live?.live === "polite" && live.label, `Native Sonner announcement missing: ${JSON.stringify(live)}`);
  for (const selector of ["[data-title]", "[data-description]"]) {
    const paint = await card.locator(selector).evaluate(readCssTextContrast);
    assert(paint.ratio >= 4.5, `Toast normal text contrast ${selector}: ${JSON.stringify(paint)}`);
  }
  if (await card.locator("[data-icon]").count()) {
    const icon = await card.locator("[data-icon]").evaluate(readCssTextContrast);
    assert(icon.ratio >= 3, `Toast status icon contrast: ${JSON.stringify(icon)}`);
  }
  // Alt+T is Sonner's native focus path, not a fixture imitation.
  await page.keyboard.press("Alt+t");
  await expect(toaster).toBeFocused();
  const shortcutPaint = await card.evaluate((element) => {
    const style = getComputedStyle(element), list = element.closest("[data-sonner-toaster]");
    return { listFocusVisible:list.matches(":focus-visible"), style:style.outlineStyle, width:parseFloat(style.outlineWidth), contrast:window.__shellContrastMath(style.outlineColor, [style.backgroundColor]).ratio };
  });
  assert(shortcutPaint.style !== "none" && shortcutPaint.width >= 2 && shortcutPaint.contrast >= 3, `Alt+T front-toast indicator absent/inadequate from mouse modality: ${JSON.stringify(shortcutPaint)}`);
  // Sonner's card itself is the first tabindex=0 stop; then its native buttons.
  await page.keyboard.press("Tab");
  await expect(card).toBeFocused();
  const controls = card.locator("button");
  // Sonner intentionally withholds Close while a toast is loading.
  assert.equal(await controls.count(), kind === "loading" ? 2 : 3, "Native close/action/cancel controls changed");
  await expect(card.locator("[data-close-button]")).toHaveCount(kind === "loading" ? 0 : 1);
  for (const control of await controls.all()) await assertBatch8Control(page, control, { toastFrame:true });
  for (const selector of ["[data-action]", "[data-cancel]", ...(kind === "loading" ? [] : ["[data-close-button]"])]) {
    const control = card.locator(selector);
    await control.hover();
    await settleControlPaint(page, control);
    const paint = await control.evaluate(readCssTextContrast);
    assert(paint.ratio >= (selector === "[data-close-button]" ? 3 : 4.5), `Toast hover contrast ${selector}: ${JSON.stringify(paint)}`);
  }
  await assertNoHorizontalOverflow(page);
  const expectedClose = await page.evaluate(() => document.documentElement.lang === "ar" ? "ar" : "en");
  assert.equal(expectedClose, language);
  return { card, toaster, bounds, shell };
}

async function assertBatch8AttendanceState(page, sample, language, resources) {
  await page.evaluate((sample) => window.__batch8.setSample(sample), sample);
  const subject = page.locator("[data-batch8-attendance]"), copy = resources[language].parentAttendance;
  await expect(subject).toHaveAttribute("data-batch8-sample", sample);
  await expect(subject.getByRole("heading", { level:1, name:copy.title, exact:true })).toBeVisible();
  const rail = subject.getByRole("complementary", { name:copy.rail.label });
  if (["children-pending", "overview-pending"].includes(sample)) {
    await expect(subject.getByRole("status", { name:resources[language].status.loading })).toBeVisible();
    await expect(subject.getByTestId("attendance-rate")).toHaveCount(0);
    await expect(rail).toHaveCount(0);
    const animations = await subject.getByRole("status").evaluate((element) => getComputedStyle(element).animationName);
    assert.equal(animations, "none", "Actual loading StatePanel must honor reduced motion");
  } else if (["children-error", "children-undefined", "overview-error", "overview-undefined", "wrong-child"].includes(sample)) {
    const key = { "children-error":"childrenError", "children-undefined":"childrenUnavailable", "overview-error":"error", "overview-undefined":"unavailable", "wrong-child":"unavailable" }[sample];
    await expect(subject.getByRole("alert")).toHaveText(copy[key]);
    const paint = await subject.getByRole("alert").evaluate(readCssTextContrast);
    assert(paint.ratio >= 4.5, `Attendance error StatePanel contrast: ${JSON.stringify(paint)}`);
    await expect(rail).toHaveCount(0);
    const previous = await page.evaluate(() => window.__batch8.retries.length);
    await subject.getByRole("button", { name:resources[language].buttons.retry, exact:true }).click();
    assert.equal(await page.evaluate(() => window.__batch8.retries.length), previous + 1);
    assert.equal(await page.evaluate(() => window.__batch8.retries.at(-1)), sample.startsWith("children-") ? "children" : "overview", "Retry crossed query ownership");
  } else if (sample === "children-empty") {
    await expect(subject.getByTestId("attendance-rate")).toHaveCount(0);
    await expect(rail).toHaveCount(0);
    await expect(subject).toContainText(resources[language].empty.noLinkedStudents.title);
  } else {
    await expect(rail).toBeVisible();
    const dto = await page.evaluate(() => {
      const o = window.__batch8.currentOverview;
      return { rate:o.totals.attendanceRate, total:o.totals.totalSessions, courses:o.courses.map((c) => ({ name:c.name, code:c.code })), attended:o.totals.attended, absent:o.totals.absent, late:o.totals.late, excused:o.totals.excused, attention:!!o.attention };
    });
    const rate = await page.evaluate(({ dto, language, unknown }) => dto.total > 0 ? new Intl.NumberFormat(language, { style:"percent", maximumFractionDigits:0 }).format(dto.rate / 100) : unknown, { dto, language, unknown:copy.notMeasured });
    await expect(subject.getByTestId("attendance-rate")).toHaveText(rate);
    const expectedRail = await page.evaluate(({ dto, language, labels }) => Object.fromEntries([dto.total, dto.attended, dto.absent, dto.late, dto.excused, dto.courses.length].map((n,i) => [labels[i], new Intl.NumberFormat(language).format(n)])), { dto, language, labels:[copy.totalSessions, copy.attended, copy.status.absent, copy.status.late, copy.status.excused, copy.listedCourses] });
    assert.deepEqual(await rail.locator("dl > div").evaluateAll((rows) => Object.fromEntries(rows.map((row) => [row.querySelector("dt").textContent, row.querySelector("dd").textContent]))), expectedRail, `Actual rail counts changed for ${sample}`);
    if (!dto.total) {
      await expect(subject).toContainText(copy.noRecords);
      await expect(rail.locator("time")).toHaveCount(0);
      await expect(subject.getByTestId("attendance-trend-fill")).toHaveCount(0);
    } else {
      await expect(rail.locator("time")).toHaveCount(2);
      if (sample !== "no-trend") {
        await expect(subject.getByTestId("attendance-trend-fill")).toHaveCount(1);
        await expect(subject.getByRole("img", { name:new RegExp(escapeRegex(copy.notMeasured)) })).toHaveCount(1);
        const fill = await subject.getByTestId("attendance-trend-fill").evaluate((element) => ({ height:element.getBoundingClientRect().height, track:element.parentElement.getBoundingClientRect().height, contrast:window.__shellContrastMath(getComputedStyle(element).backgroundColor, [getComputedStyle(element.parentElement).backgroundColor]).ratio }));
        assert(Math.abs(fill.height-fill.track*dto.rate/100) <= 1 && fill.contrast >= 3, `Attendance trend geometry/contrast: ${JSON.stringify(fill)}`);
      }
    }
    await expect(rail.getByRole("heading", { name:copy.rail.absencesByCourse, exact:true })).toHaveCount(dto.attention ? 1 : 0);
    if (sample === "zero-courses") await expect(subject).toContainText(copy.noCourses);
    if (sample === "no-trend" || !dto.total) await expect(subject).toContainText(copy.noTrend);
    const courseRegion = subject.getByRole("region", { name:copy.byCourseTitle, exact:true });
    // Both actual responsive branches use the same DTOs, even while one is hidden.
    for (const course of dto.courses) {
      await expect(courseRegion.locator("table")).toContainText(course.name);
      await expect(courseRegion.locator("ul")).toContainText(course.name);
      await expect(courseRegion.getByText(course.name, { exact:true }).filter({ visible:true })).toHaveCount(1);
    }
    if (sample === "mixed") {
      await subject.getByRole("button", { name:copy.filters.all, exact:true }).click();
      const recent = subject.getByRole("region", { name:copy.recentTitle, exact:true });
      for (const status of ["present", "late", "absent", "excused"]) await expect(recent.locator("ul").getByText(copy.status[status], { exact:true })).toBeVisible();
      const control = subject.getByRole("combobox", { name:copy.courseFilter, exact:true });
      await control.click();
      await page.getByRole("option", { name:/HIS-F/ }).click();
      await page.waitForFunction(() => window.__batch8.queryCalls.some((q) => q.hook === "overview" && q.courseId === "history-fixture"));
      await subject.getByRole("button", { name:"Sami Records", exact:true }).click();
      await page.waitForFunction(() => window.__batch8.queryCalls.some((q) => q.hook === "overview" && q.childId === "attendance-child-1" && q.courseId === null));
      const secondRate = await page.evaluate((language) => new Intl.NumberFormat(language, { style:"percent", maximumFractionDigits:0 }).format(0.86), language);
      await expect(subject.getByTestId("attendance-rate")).toHaveText(secondRate);
      await expect(control).toHaveText(copy.allCourses);
    }
    // Actual text across page/card/status/rail, not representative token swatches.
    const failures = await subject.locator("h1,h2,h3,p,dt,dd,th,td,time,[data-slot='badge']").evaluateAll((elements, measureSource) => {
      const measure = (0, eval)("(" + measureSource + ")"), failures = [];
      for (const element of elements) {
        if (!element.checkVisibility() || !element.textContent.trim() || element.closest("[aria-hidden='true']") || element.classList.contains("sr-only")) continue;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const paint = measure(element);
        if (paint.ratio < 4.5) failures.push({ text:element.textContent.slice(0,90), ...paint });
      }
      return failures;
    }, readCssTextContrast.toString());
    assert.deepEqual(failures, [], `Actual attendance text contrast ${sample}/${language}`);
  }
  const content = await subject.textContent();
  assert(!/Aarav|MATH6|ENG7|SOC7|SCI8|Gulf Academy|4000 1234|Spring 2026|Strong attendance|Apr 7|May 18/.test(content), "Retired fabricated attendance content returned");
  await assertNoHorizontalOverflow(page);
}

async function runSuiteCase(suite, ...args) {
  // A timed-out parent is a failed run, not permission to keep scheduling
  // detached cases after a suspended machine resumes.
  suite.signal.throwIfAborted();
  await suite.test(...args);
  suite.signal.throwIfAborted();
}

// Preserve every existing per-case limit and cancellation guard. The four
// Round9 cases add bounded 90s/120s pairs to the existing 660s suite budget:
// Batch8 adds four120s groups: 1,080,000 +4*120,000 =1,560,000ms.
// Student screen adds two120s groups:1,560,000+240,000=1,800,000ms.
//114 tests total; all112 prior cases/individual budgets/strict gates preserved.
await test("actual shell/navigation Chromium matrix, wide header and normal Button contrast", { timeout: 1_800_000 }, async (suite) => {
  const directory = await mkdtemp(join(tmpdir(), "edeviser-shell-navigation-"));
  let server;
  let browser;
  const runCase = (...args) => runSuiteCase(suite, ...args);
  const abortBrowser = () => { if (browser) void browser.close().catch(() => undefined); };
  suite.signal.addEventListener("abort", abortBrowser, { once:true });
  try {
    const output = await createFixture(directory);
    const served = await serveFixture(output);
    server = served.server;
    const { base } = served;
    browser = await chromium.launch();
    const resources = {
      en: JSON.parse(await readFile(join(repository, "src/locales/en/common.json"), "utf8")),
      ar: JSON.parse(await readFile(join(repository, "src/locales/ar/common.json"), "utf8")),
    };
    const studentResources = {
      en:JSON.parse(await readFile(join(repository, "src/locales/en/student.json"), "utf8")),
      ar:JSON.parse(await readFile(join(repository, "src/locales/ar/student.json"), "utf8")),
    };
    for (const theme of ["light", "dark"]) {
      await runCase(`Student actual screen states / ${theme}`, { timeout:120_000 }, async () => {
        const context=await browser.newContext({ viewport:{width:390,height:1000}, reducedMotion:"reduce", serviceWorkers:"block" });
        const failures=[];
        try {
          const page=await round9Page(context,base,failures); let scenes=0;
          for (const language of ["en","ar"]) for (const width of [390,1280,320]) {
            suite.signal.throwIfAborted();
            await openBatch8(page,base,{scene:"student",theme,language,role:"student",width,rootFont:width===320?20:16});
            await assertStudentSceneFonts(page,language);
            for (const sample of ["pending","paused","error","undefined","noactor","empty","zero","unrecorded","partial","invalid","mismatched-focus","missing-labels","focus"]) {
              try { await assertStudentState(page,sample,language,studentResources[language].progress); scenes++; }
              catch (error) { throw new Error(`Student ${theme}/${language}/${width}/${sample}: ${error.message}`,{cause:error}); }
            }
          }
          assert.equal(scenes,78); assert.deepEqual(failures,[]);
          console.log(`Student ${theme}:78 actual screen/StatePanel states; exact44px natural keyboard+native touch, links/retry,4.5 text, paired surfaces, normal outcome SCORE (not a bar), and local title/subtitle custom-font glyph scalars. No visual approval, math/auth/backend or all-role font claim.`);
        } finally { await context.close(); }
      });
    }
    for (const theme of ["light", "dark"]) {
      await runCase(`Batch8 actual AppToaster / ${theme}`,  { timeout:120_000 }, async () => {
        const context = await browser.newContext({ viewport:{ width:390, height:1000 }, colorScheme:theme === "light" ? "dark" : "light", reducedMotion:"reduce", serviceWorkers:"block" });
        const failures = [];
        try {
          const page = await round9Page(context, base, failures);
          let scenes = 0;
          for (const language of ["en", "ar"]) for (const width of [390, 600, 601, 639, 640, 1280, 320]) {
            suite.signal.throwIfAborted();
            const shell = true;
            await openBatch8(page, base, { scene:"toast", theme, language, role:"student", width, rootFont:width === 320 ? 20 : 16, shell, viewportHeight:width === 320 ? 640 : 1000 });
            await assertBatch8Toast(page, { language, width, shell, long:width === 320 });
            const card = page.locator("[data-sonner-toast][data-front='true']");
            await expect(card.locator("[data-close-button]")).toHaveAttribute("aria-label", resources[language].buttons.close);
            assert.equal(await page.evaluate(() => localStorage.getItem("theme")), theme, "Fixture ignored actual theme storage");
            assert.equal(await page.evaluate(() => localStorage.getItem("edeviser-language")), language, "Fixture ignored actual language storage");
            if (width === 1280 && language === "en" || width === 390 && language === "ar") await saveBatch8Evidence(page, `toast-${theme}-${language}-${width}`);
            if (width === 320) {
              await assertBatch8TouchScroll(page, card);
            } else await card.locator("[data-action]").click();
            await page.waitForFunction(() => window.__batch8.actions === 1);
            scenes++;
          }
          // Same mounted adapter, native callbacks and real preference transitions.
          await openBatch8(page, base, { scene:"toast", theme, language:"en", width:390, shell:true });
          await assertBatch8Toast(page, { language:"en", width:390, shell:true });
          const before = await page.locator("[data-sonner-toast]").evaluate((element) => element.getBoundingClientRect().bottom);
          await page.evaluate(() => window.__batch8.setShell(false));
          await expect(page.locator(".role-app-shell")).toHaveCount(0);
          await settleControlPaint(page, page.locator("[data-sonner-toast]"));
          const after = await page.locator("[data-sonner-toast]").evaluate((element) => element.getBoundingClientRect().bottom);
          assert(after > before + 50, "Removing the shell did not remove mobile-nav toast clearance");
          await page.evaluate(() => { window.__batch8.setTheme("system"); window.__batch8.setLanguage("ar"); });
          const os = theme === "light" ? "dark" : "light";
          await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", os);
          await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("dir", "rtl");
          await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-x-position", "left");
          await expect(page.locator("[data-close-button]")).toHaveAttribute("aria-label", resources.ar.buttons.close);
          await page.emulateMedia({ colorScheme:theme });
          await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", theme);
          assert.deepEqual(await page.evaluate(() => window.__preferencePatches.slice(-2)), [{ ownerId:"shell-fixture", theme_preference:"system" }, { ownerId:"shell-fixture", preferred_language:"ar" }]);
          await page.locator("[data-cancel]").click();
          await page.waitForFunction(() => window.__batch8.cancels === 1);
          await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
          await assertBatch8Toast(page, { language:"ar", width:390, shell:false, kind:"warning" });
          await tapBatch8Control(page, page.locator("[data-close-button]"));
          await page.waitForFunction(() => window.__batch8.dismisses === 1);
          await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
          await assertBatch8Toast(page, { language:"ar", width:390, shell:false, kind:"success" });
          const swipe = await page.locator("[data-sonner-toast]").boundingBox();
          assert(swipe);
          await page.mouse.move(swipe.x+swipe.width*0.7, swipe.y+8);
          await page.mouse.down();
          await page.mouse.move(swipe.x+swipe.width*0.2, swipe.y+8, { steps:8 });
          await page.mouse.up();
          await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
          assert.equal(await page.evaluate(() => window.__batch8.dismisses), 2, "Native horizontal mouse swipe failed after touch-scroll policy change");
          for (const width of [600, 601]) {
            await openBatch8(page, base, { scene:"toast", theme, language:"ar", width, shell:false });
            await assertBatch8Toast(page, { language:"ar", width, shell:false });
          }
          for (const [index, role] of roles.entries()) {
            await openBatch8(page, base, { scene:"toast", theme, role, language:index % 2 ? "ar" : "en", width:390 });
            await assertBatch8Toast(page, { language:index % 2 ? "ar" : "en", width:390, shell:true, kind:["success", "error", "warning", "normal", "loading"][index] });
            if (role === "parent") {
              assert.equal(await page.locator("[data-icon] svg").evaluate((element) => getComputedStyle(element).animationName), "none", "Reduced-motion toast loader still animates");
            }
          }
          assert.equal(scenes, 14);
          assert.deepEqual(failures, []);
          console.log(`Batch8 ${theme}:14 width/locale scenes +5 actual role-shell presentations; opposing OS theme, live system/language, sibling/no-shell clearance, callbacks, Alt+T,44px targets and strict4.5/3 contrast. No auth/persistence-backend/font-delivery claim.`);
        } finally { await context.close(); }
      });
      await runCase(`Batch8 actual parent attendance / ${theme}`, { timeout:120_000 }, async () => {
        const context = await browser.newContext({ viewport:{ width:390, height:1000 }, reducedMotion:"reduce", serviceWorkers:"block" });
        const failures = [];
        try {
          const page = await round9Page(context, base, failures);
          let scenes = 0;
          for (const language of ["en", "ar"]) for (const width of [390, 1280, 320]) {
            suite.signal.throwIfAborted();
            await openBatch8(page, base, { scene:"attendance", theme, language, width, rootFont:width === 320 ? 20 : 16 });
            for (const sample of ["children-pending", "children-error", "children-undefined", "children-empty", "overview-pending", "overview-error", "overview-undefined", "wrong-child", "unmeasured", "real-zero", "zero-courses", "no-trend", "no-attention", "mixed"]) {
              await assertBatch8AttendanceState(page, sample, language, resources);
              scenes++;
            }
            if (theme === "light" && language === "en" && width === 1280 || theme === "dark" && language === "ar" && width === 390) {
              await page.evaluate(() => window.scrollTo(0,0));
              await saveBatch8Evidence(page, `attendance-${theme}-${language}-${width}`);
            }
          }
          assert.equal(scenes, 84);
          assert.deepEqual(failures, []);
          console.log(`Batch8 ${theme}:84 actual attendance page+rail+StatePanel states over EN/AR and390/1280/320-at20px. Source query DTOs only; no attendance builder/math/auth/backend attestation.`);
        } finally { await context.close(); }
      });
    }
    for (const theme of ["light", "dark"]) {
      await runCase(`Round9 progress / ${theme}`, { timeout:90_000 }, async () => {
        const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, locale:"en", reducedMotion:"no-preference", serviceWorkers:"block" });
        const failures = [];
        try {
          const page = await round9Page(context, base, failures);
          const scenes = [
            ...["regular", "lower", "upper", "unknown", "loading"].map((sample) => ({ scene:"rail", sample, width:1440 })),
            ...["regular", "ready", "empty"].map((sample) => ({ scene:"clo", sample })),
            ...["regular", "zero", "upper", "max"].map((sample) => ({ scene:"habit", sample })),
            ...["regular", "gate", "loading"].map((sample) => ({ scene:"admin", sample })),
            ...["regular", "empty"].map((sample) => ({ scene:"weakest", sample })),
            ...["regular", "zero", "empty", "loading"].map((sample) => ({ scene:"xp", sample })),
          ];
          let fields = 0;
          for (const scene of scenes) {
            suite.signal.throwIfAborted();
            try { fields += await assertRound9Progress(page, base, { ...scene, theme }); }
            catch (error) { failures.push(`${scene.scene}/${scene.sample}: ${error.message}`); }
          }
          assert.equal(fields, 13, `Incomplete Round9 actual-field checks: ${fields}; ${failures.join("\n")}`);
          console.log(`Round9 ${theme}:21 scenes/13 actual fields (12 bars +1 recorded numeric outcome score), clamps/null/loading/max gates; scoped fields only. Admin malformed legends, whole-page paint, authenticated data and dormant Habit import connectivity NOT certified.`);
          assert.equal(failures.length, 0, failures.join("\n"));
        } finally { await context.close(); }
      });
      await runCase(`Round9 onboarding / ${theme}`, { timeout:120_000 }, async () => {
        const context = await browser.newContext({ viewport:{ width:320, height:1000 }, locale:"en", hasTouch:true, reducedMotion:"no-preference", serviceWorkers:"block" });
        const failures = [];
        try {
          const page = await round9Page(context, base, failures);
          let scenes = 0;
          for (const language of ["en", "ar"]) for (const width of [320, 1024]) for (const scene of ["study_strategy", "self_efficacy", "personality", "learning_style", "baseline"]) {
            suite.signal.throwIfAborted();
            try { await assertRound9Onboarding(page, base, { scene, theme, language, width, rootFont:width === 320 ? 20 : 16 }, studentResources); scenes++; }
            catch (error) { failures.push(`${scene}/${language}/${width}: ${error.message}`); }
          }
          for (const [scene, sample] of [["baseline", "day1"], ["study_strategy", "day1"], ["learning_style", "day1"], ["self_efficacy", "empty"], ["self_efficacy", "loading"]]) {
            suite.signal.throwIfAborted();
            try {
              const { subject } = await openRound9(page, base, { scene, sample, theme });
              await expect(subject.getByRole("radio")).toHaveCount(0);
              if (scene === "baseline") await expect(subject).toBeEmpty();
              else if (sample === "loading") await expect(subject.locator(".animate-spin")).toBeVisible();
              else { await expect(subject.getByRole("heading")).toHaveCount(1); await subject.getByRole("button").click(); await page.waitForFunction(() => window.__round9Completed === 1); }
              assert.deepEqual(await page.evaluate(() => window.__round9Saves), [], "Skipped/empty/loading assessment saved responses");
              await settleRound9Scene(page,"after skip/empty/loading guard");
            } catch (error) { failures.push(`${scene}/${sample}: ${error.message}`); }
          }
          assert.equal(scenes, 20, `Incomplete actual onboarding scenes: ${scenes}; ${failures.join("\n")}`);
          console.log(`Round9 ${theme}:20 real onboarding selection/save scenes +5 guards. Actual locale labels reused, hardcoded English remains English; no full localization, clinical/scoring validity, timer-expiry or backend claim.`);
          assert.equal(failures.length, 0, failures.join("\n"));
        } finally { await context.close(); }
      });
    }
    for (const theme of ["light", "dark"]) {
      await runCase(`D15 progress families / ${theme}`, { timeout: 30_000 }, async () => {
        const context = await browser.newContext({ viewport:{ width:1024, height:1000 }, locale:"en", reducedMotion:"no-preference", serviceWorkers:"block" });
        try {
          const page = await context.newPage();
          const failures = [];
          page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
          page.on("requestfailed", (request) => failures.push(`request failed: ${request.url()}`));
          page.on("response", (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin === base) return route.continue();
            failures.push(`Non-local request: ${route.request().url()}`);
            return route.abort();
          });
          await page.goto(`${base}/student/dashboard?role=student&language=en&theme=${theme}&contracts=progress-families`, { waitUntil:"networkidle" });
          await page.waitForFunction(() => window.__shellFixture?.mounted === true);
          const panel = page.locator("[data-progress-families]");
          await expect(panel).toBeVisible();
          const primary = await panel.locator("[data-progress-primary-reference]").evaluate((element) => getComputedStyle(element).backgroundColor);
          const muted = await panel.locator("[data-progress-muted-reference]").evaluate((element) => getComputedStyle(element).backgroundColor);
          assert.notEqual(primary, "rgba(0, 0, 0, 0)");
          assert.notEqual(muted, "rgba(0, 0, 0, 0)");
          const fields = [];
          await expect(panel.getByRole("progressbar")).toHaveCount(5);
          for (const raw of [-25, 0, 37, 100, 125]) {
            const value = Math.max(0, Math.min(100, raw));
            const track = panel.locator(`[data-upload-sample="${raw}"]`).getByRole("progressbar", { name:`fixture-${raw}.pdf`, exact:true });
            await expect(track).toHaveAttribute("aria-valuemin", "0");
            await expect(track).toHaveAttribute("aria-valuemax", "100");
            await expect(track).toHaveAttribute("aria-valuenow", String(value));
            fields.push({ name:`UploadProgress ${raw}`, track, fill:track.locator(":scope > div"), value });
          }
          for (const [id, value] of [["fixture-bronze", 37], ["fixture-silver", 100]]) {
            const track = panel.getByTestId(`badge-progress-${id}`).locator(":scope > div");
            fields.push({ name:`BadgeCollection ${id}`, track, fill:track.locator(":scope > div"), value });
          }
          const spotlightTrack = panel.getByTestId("spotlight-progress").locator(":scope > div").nth(1);
          fields.push({ name:"BadgeSpotlightCard", track:spotlightTrack, fill:spotlightTrack.locator(":scope > div"), value:37 });
          assert.equal(fields.length, 8, "Incomplete actual progress-field family coverage");
          for (const { name, track, fill, value } of fields) {
            await expect(track).toHaveCount(1);
            await expect(fill).toHaveCount(1);
            await track.scrollIntoViewIfNeeded();
            await settleControlPaint(page, fill);
            const measured = await fill.evaluate((element) => {
              const own = getComputedStyle(element), parent = getComputedStyle(element.parentElement);
              const rect = element.getBoundingClientRect(), track = element.parentElement.getBoundingClientRect();
              return { width:rect.width, height:rect.height, trackWidth:track.width, trackHeight:track.height,
                fill:own.backgroundColor, track:parent.backgroundColor, fillImage:own.backgroundImage, trackImage:parent.backgroundImage };
            });
            if (!(measured.trackWidth > 0 && measured.trackHeight > 0 && measured.height > 0)) failures.push(`${name}: empty/unrendered field geometry`);
            if (Math.abs(measured.width - measured.trackWidth * value / 100) > 1) failures.push(`${name}: wrong actual fill geometry ${JSON.stringify(measured)}; wanted ${value}%`);
            if (measured.fill !== primary || measured.track !== muted || measured.fillImage !== "none" || measured.trackImage !== "none") failures.push(`${name}: semantic solid progress paint mismatch ${JSON.stringify(measured)}`);
            const { ratio: contrast } = contrastFromCssColors(measured.fill, [measured.track]);
            if (contrast < 3) failures.push(`${name}: actual fill/track contrast ${contrast}:1 is below 3:1`);
          }
          console.log(`D15 ${theme}:8 actual fields across UploadProgress/BadgeCollection/BadgeSpotlightCard; upload accessible clamping verified. Not all9source migrations, route/auth/localization or badge-card gradient certification.`);
          assert.equal(failures.length, 0, `D15 progress-family failures:\n${failures.join("\n")}`);
        } finally { await context.close(); }
      });
    }
    for (const theme of ["light", "dark"]) for (const language of ["en", "ar"]) {
      await runCase(`Shared patterns / ${theme} / ${language}`, { timeout: 120_000 }, async () => {
        // Normal motion is deliberate: reduced motion would conceal the old
        // PCard hover lift instead of verifying the static surface contract.
        const context = await browser.newContext({ viewport:{ width:1024, height:1000 }, locale:language, reducedMotion:"no-preference", serviceWorkers:"block" });
        try {
          await context.addInitScript({ content:`window.__shellContrastMath = ${contrastFromCssColors.toString()};` });
          const page = await context.newPage();
          const failures = [];
          page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
          page.on("requestfailed", (request) => failures.push(`request failed: ${request.url()}`));
          page.on("response", (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin === base) return route.continue();
            failures.push(`Non-local request: ${route.request().url()}`);
            return route.abort();
          });
          let scenes = 0;
          for (const role of roles) {
            await page.goto(`${base}/${role}/dashboard?role=${role}&language=${language}&theme=${theme}&contracts=shared-patterns`, { waitUntil:"networkidle" });
            await page.waitForFunction(() => window.__shellFixture?.mounted === true);
            await expect(page.locator(".role-app-shell")).toHaveAttribute("data-role", role);
            await expect(page.locator("[data-shared-patterns]")).toBeVisible();
            for (const width of [320, 1024]) for (const rootFont of [16, 20]) {
              scenes++;
              await page.setViewportSize({ width, height:1000 });
              await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; window.scrollTo(0, 0); }, rootFont);
              await page.mouse.move(1, 1);
              await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
              try { await assertSharedPatternScene(page, { theme, language, role, width, rootFont }); }
              catch (error) { failures.push(error.message); }
            }
          }
          assert.equal(scenes, 20, "Incomplete five-role/two-width/two-root-size pattern coverage");
          console.log(`Shared patterns ${theme}/${language}:20 scenes, actual PageHeader/SectionHeader/PCard/SectionCard; local supplied copy, not authenticated page journeys.`);
          assert.equal(failures.length, 0, `Shared pattern failures (${theme}/${language}):\n${failures.join("\n")}`);
        } finally { await context.close(); }
      });
    }
    for (const theme of ["light", "dark"]) for (const preference of ["no-preference", "reduce"]) {
      await runCase(`D01/D03 heatmap and CSS utility contracts / ${theme} / ${preference}`, { timeout: 60_000 }, async () => {
        const context = await browser.newContext({ viewport: { width:1024, height:900 }, reducedMotion:preference, serviceWorkers:"block" });
        try {
          const page = await context.newPage();
          const failures = [];
          page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
          page.on("requestfailed", (request) => failures.push(`request failed: ${request.url()}`));
          page.on("response", (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin === base) return route.continue();
            failures.push(`Non-local request: ${route.request().url()}`);
            return route.abort();
          });
          await page.goto(`${base}/student/habits?role=student&language=en&theme=${theme}&contracts=heatmap-motion`, { waitUntil:"networkidle" });
          await page.waitForFunction(() => window.__shellFixture?.mounted === true);
          await expect(page.locator("[data-heatmap-motion-contracts]")).toBeVisible();
          const check = async (label, action) => {
            try { await action(); } catch (error) { failures.push(`${label}: ${error.message}`); }
          };
          const changeTheme = async (next) => {
            await page.evaluate((value) => {
              document.documentElement.classList.toggle("dark", value === "dark");
              window.__shellFixture.theme = value;
            }, next);
            await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          };
          const changeMotion = async (next) => {
            if (next === "reduce") {
              // Seek ONLY the explicit probes to their animated midpoint before
              // switching preference. A paused blink must not masquerade as
              // disabled motion while leaving a hidden cursor or scaled dot.
              await page.locator("[data-motion-probe]").evaluateAll((elements) => {
                for (const element of elements) for (const animation of element.getAnimations()) {
                  const duration = animation.effect.getTiming().duration;
                  if (typeof duration === "number") animation.currentTime = duration / 2;
                }
              });
            }
            await page.emulateMedia({ reducedMotion:next });
          };
          await check(`initial ${theme}`, () => assertHeatmapPaint(page, theme));
          await check(`initial ${preference}`, () => assertUtilityMotion(page, preference));
          const otherTheme = theme === "light" ? "dark" : "light";
          await changeTheme(otherTheme);
          await check(`live theme ${otherTheme}`, () => assertHeatmapPaint(page, otherTheme));
          const otherPreference = preference === "reduce" ? "no-preference" : "reduce";
          await changeMotion(otherPreference);
          await check(`live media ${otherPreference}`, () => assertUtilityMotion(page, otherPreference));
          await changeTheme(theme);
          await changeMotion(preference);
          await check(`restored theme ${theme}`, () => assertHeatmapPaint(page, theme));
          await check(`restored media ${preference}`, () => assertUtilityMotion(page, preference));
          console.log(`D01/D03 ${theme}/${preference}: actual HeatmapGrid cells/legend; XP token swatches and three CSS-utility probes only; live theme/media round trips.`);
          assert.equal(failures.length, 0, `D01/D03 isolated contract failures:\n${failures.join("\n")}`);
        } finally { await context.close(); }
      });
    }
    await runCase("D13 contrast parser sanity and negative fixtures", { timeout: 15_000 }, async () => {
      let scheduled = 0;
      const cancelled = new AbortController();
      cancelled.abort();
      await assert.rejects(runSuiteCase({ signal:cancelled.signal, test:async () => { scheduled += 1; } }), { name:"AbortError" });
      assert.equal(scheduled, 0, "An aborted suite must not schedule another case");
      const duringCase = new AbortController();
      await assert.rejects(runSuiteCase({ signal:duringCase.signal, test:async () => { scheduled += 1; duringCase.abort(); } }), { name:"AbortError" });
      assert.equal(scheduled, 1, "Cancellation during a case must propagate before the next one");
      await runSuiteCase({ signal:new AbortController().signal, test:async () => { scheduled += 1; } });
      assert.equal(scheduled, 2, "An active suite still runs its case");
      const depthExample = "rgba(29, 53, 87, 0.06) 0px 1px 4px 0px";
      assert.deepEqual(paintedShadowLayers(`rgba(0, 0, 0, 0) 0px 0px 0px 0px, ${depthExample}`), paintedShadowLayers(depthExample));
      assert.notDeepEqual(paintedShadowLayers("rgba(29, 53, 87, 0.06) 10px 1px 4px 0px"), paintedShadowLayers(depthExample));
      assert.equal(paintedShadowLayers("rgba(0, 0, 0, 0.001) 0px 1px 4px 0px").length, 1);
      assert.equal(paintedShadowLayers("color(display-p3 1 0 0) 0px 1px 4px 0px").length, 1);
      assert.deepEqual(paintedShadowLayers("none"), []);
      const ringColor = "rgba(15, 23, 42, 0.06)";
      const ringPaint = `${ringColor} 0px 0px 0px 1px inset`;
      assert.equal(hasInsetShadow(`rgba(0, 0, 0, 0) 0px 0px 0px 0px, ${ringPaint}`, ringColor, 1), true);
      for (const invalid of [
        `${ringColor} 10px 0px 0px 1px inset`,
        `${ringColor} -10px 0px 0px 1px inset`,
        `${ringColor} 0px 0px 0px 2px inset`,
        `${ringColor} 0px 0px 0px 1px`,
      ]) assert.equal(hasInsetShadow(invalid, ringColor, 1), false);
      assert.equal(contrastFromCssColors("#000", ["#fff"]).ratio, 21);
      assert.equal(contrastFromCssColors("#fff", ["#fff"]).ratio, 1);
      assert(Math.abs(contrastFromCssColors("#777", ["#fff"]).ratio - 4.478089) < 0.00001);
      assert(contrastFromCssColors("#777", ["#fff"]).ratio < 4.5, "Known near-threshold bad fixture must fail");
      const alpha = contrastFromCssColors("rgba(0, 0, 0, 0.5)", ["rgb(255 255 255)"]);
      assert.deepEqual(alpha.text, [0.5, 0.5, 0.5, 1]);
      assert(Math.abs(alpha.ratio - 3.976653) < 0.00001);
      const nested = contrastFromCssColors("#fff", ["rgba(255,0,0,0.5)", "color(srgb 0 0 1 / 0.5)", "#fff"]);
      assert.deepEqual(nested.background, [0.75, 0.25, 0.5, 1]);
      const redOklab = contrastFromCssColors("oklab(0.627955 0.224863 0.125846)", ["#fff"]);
      assert(Math.abs(redOklab.ratio - contrastFromCssColors("#f00", ["#fff"]).ratio) < 0.001);
      const nearWhite = [
        { css: "oklab(0.999994 0.0000455677 0.0000200868 / 0.0152941)", alpha: 0.0152941 },
        { css: "oklab(0.999994 0.0000455678 0.0000200868 / 0.0254902)", alpha: 0.0254902 },
        { css: "oklab(0.999994 0.0000455677 0.0000200868 / 1)", alpha: 1 },
      ];
      for (const sample of nearWhite) {
        const calculated = contrastFromCssColors("#fff", [sample.css, "#0A1628"]);
        const expectedRed = sample.alpha + (1 - sample.alpha) * 10 / 255;
        assert(Math.abs(calculated.background[0] - expectedRed) < 1e-12, "Near-white alpha compositing changed");
      }
      assert.throws(() => contrastFromCssColors("color(srgb 1.0003 1 1)", ["#fff"]), /Unsupported out-of-sRGB/);
      assert.throws(() => contrastFromCssColors("oklab(1 0.1 0)", ["#fff"]), /Unsupported out-of-sRGB/);
      assert.throws(() => contrastFromCssColors("color(display-p3 1 0 0)", ["#fff"]), /Unsupported color space/);
      assert.throws(() => contrastFromCssColors("#000", ["rgba(255,255,255,0.5)"]), /No proven opaque/);
      assert.throws(() => contrastFromCssColors("#000", ["linear-gradient(white,black)"]), /Unsupported CSS color/);
      const context = await browser.newContext();
      try {
        await context.addInitScript({ content: `window.__shellContrastMath = ${contrastFromCssColors.toString()};` });
        const page = await context.newPage();
        // addInitScript is guaranteed on navigation; use an entirely local data
        // document for CSSOM sanity, never the app or a network destination.
        await page.goto('data:text/html,<html><body style="background:white"><span id="alpha" style="color:rgba(0,0,0,0.5)">Alpha</span><span id="bad" style="color:%23777">Bad</span><span id="gradient" style="background:linear-gradient(white,white)">Gradient</span><span id="opacity" style="opacity:0.5">Opacity</span></body></html>');
        const sampled = await page.locator("#alpha").evaluate(readCssTextContrast);
        assert(Math.abs(sampled.ratio - alpha.ratio) < 0.00001);
        assert((await page.locator("#bad").evaluate(readCssTextContrast)).ratio < 4.5);
        await assert.rejects(page.locator("#gradient").evaluate(readCssTextContrast), /Unsupported background paint/);
        await assert.rejects(page.locator("#opacity").evaluate(readCssTextContrast), /Unsupported group opacity/);
        // Independent reference: Chromium parses/paints these CSS colors itself.
        // Canvas readback is 8-bit, so allow <=one channel step for readback
        // quantization ONLY; the WCAG gate remains unrounded and exactly 4.5.
        const references = await page.evaluate((samples) => samples.flatMap((sample) =>
          ["#0A1628", "#111E30"].map((backdrop) => {
            if (!CSS.supports("color", sample.css)) throw new Error(`Browser does not support reference color ${sample.css}`);
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            const context = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
            if (!context) throw new Error("No independent canvas reference available");
            context.fillStyle = sample.css;
            context.fillRect(0, 0, 1, 1);
            const transparentAlpha = context.getImageData(0, 0, 1, 1).data[3];
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = backdrop;
            context.fillRect(0, 0, 1, 1);
            context.fillStyle = sample.css;
            context.fillRect(0, 0, 1, 1);
            return { ...sample, backdrop, transparentAlpha, pixel: [...context.getImageData(0, 0, 1, 1).data] };
          })), nearWhite);
        for (const reference of references) {
          const expected = contrastFromCssColors("#fff", [reference.css, reference.backdrop]).background;
          assert(Math.abs(reference.transparentAlpha - reference.alpha * 255) <= 0.5 + 1e-9, `Browser reference alpha mismatch: ${JSON.stringify(reference)}`);
          assert.equal(reference.pixel[3], 255);
          for (const channel of [0, 1, 2]) {
            assert(Math.abs(reference.pixel[channel] / 255 - expected[channel]) <= 1 / 255 + 1e-9,
              `Near-white canvas reference mismatch: ${JSON.stringify(reference)}; calculated=${expected}`);
          }
        }
      } finally { await context.close(); }
    });

    for (const role of roles) for (const theme of ["light", "dark"]) {
      await runCase(`D13 actual Button contrast / ${role} / ${theme}`, { timeout: 35_000 }, async () => {
        const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
        try {
          await context.addInitScript({ content: `window.__shellContrastMath = ${contrastFromCssColors.toString()};` });
          const page = await context.newPage();
          const failures = [];
          page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
          page.on("requestfailed", (request) => failures.push(`request failed: ${request.url()}`));
          page.on("response", (response) => { if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`); });
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin === base) return route.continue();
            failures.push(`Non-local request: ${route.request().url()}`);
            return route.abort();
          });
          await page.goto(`${base}/${role}/dashboard?role=${role}&language=en&theme=${theme}&contrast=buttons`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => window.__shellFixture?.mounted === true);
          await expect(page.locator("[data-contrast-button]")).toHaveCount(14);
          await expect(page.locator("[data-contrast-disabled]")).toHaveCount(2);
          for (const disabled of await page.locator("[data-contrast-disabled]").all()) await expect(disabled).toBeDisabled();
          let attempted = 0;
          for (const surface of ["canvas", "card"]) for (const variant of ["default", "destructive", "secondary", "outline", "ghost", "link", "tactile"]) {
            const button = page.locator(`[data-contrast-button="${surface}-${variant}"]`);
            await expect(button).toBeEnabled();
            for (const state of ["default", "hover", "active"]) {
              attempted++;
              await button.scrollIntoViewIfNeeded();
              await page.mouse.move(1, 1);
              if (state !== "default") await button.hover();
              if (state === "active") await page.mouse.down();
              try {
                await settleControlPaint(page, button);
                assert.equal(await button.evaluate((element) => element.matches(":active")), state === "active", "Requested actual active state was not reached");
                assert.equal(await button.evaluate((element) => element.matches(":hover")), state !== "default", "Requested actual hover state was not reached");
                const sample = await button.locator("[data-contrast-label]").evaluate(readCssTextContrast);
                assert(Math.abs(sample.fontSize - 14) < 0.01, `Expected normal14px label, got ${sample.fontSize}`);
                if (sample.ratio < 4.5) failures.push(`${surface}/${variant}/${state}: ${sample.ratio}:1; fg=${sample.foreground}; layers=${sample.backgroundLayers.join(" over ")}`);
              } catch (error) {
                failures.push(`${surface}/${variant}/${state}: ${error.message}`);
              } finally {
                if (state === "active") await page.mouse.up();
              }
            }
          }
          assert.equal(attempted, 42, "Incomplete enabled Button state/surface coverage");
          const scheme = await page.locator("html").evaluate((element) => getComputedStyle(element).colorScheme);
          if (scheme !== theme) failures.push(`Expected html color-scheme ${theme}, received ${scheme}`);
          console.log(`D13 ${role}/${theme}: attempted42 enabled normal14px Button states; 2 explicitly disabled samples are separate and not certified as enabled text.`);
          assert.equal(failures.length, 0, `D13 actual Button contrast failures (${role}/${theme}):\n${failures.join("\n")}`);
        } finally { await context.close(); }
      });
    }
    const lightBackgrounds = new Map();
    for (const role of roles) for (const language of ["en", "ar"]) for (const theme of ["light", "dark"]) for (const width of widths) {
      await runCase(`${role} / ${language} / ${theme} / ${width}px`, { timeout: 30_000 }, async () => {
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 640, locale: language, reducedMotion: "reduce", serviceWorkers: "block" });
        try {
          await context.addInitScript({ content: `window.__shellContrastMath = ${contrastFromCssColors.toString()};` });
          const page = await context.newPage();
          const pageErrors = [];
          const failedAssets = [];
          const outsideRequests = [];
          page.on("pageerror", (error) => pageErrors.push(error.message));
          page.on("requestfailed", (request) => failedAssets.push(`${request.url()}: ${request.failure()?.errorText}`));
          page.on("response", (response) => { if (response.status() >= 400) failedAssets.push(`${response.url()}: HTTP ${response.status()}`); });
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin === base) return route.continue();
            outsideRequests.push(route.request().url());
            return route.abort();
          });
          await page.goto(`${base}/${role}/dashboard?role=${role}&language=${language}&theme=${theme}`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => window.__shellFixture?.mounted === true);
          await expect(page.locator("#main-content")).toBeVisible();
          const primaryLabel = resources[language].header.primaryNav.label;
          const mobileLabel = resources[language].header.mobileNavLabel;
          const openLabel = resources[language].header.openNavigation;
          const closeLabel = resources[language].header.closeNavigation;
          assert.equal(typeof primaryLabel, "string");
          assert.equal(typeof mobileLabel, "string");
          assert.equal(typeof openLabel, "string");
          assert.equal(typeof closeLabel, "string");
          assert(!primaryLabel.startsWith("header.") && !closeLabel.startsWith("header."));
          await expect(page.getByRole("navigation")).toHaveCount(1);
          await expect(page.getByRole("navigation", { name: width < 640 ? mobileLabel : primaryLabel, exact: true })).toHaveCount(1);
          await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
          assert.equal(await page.locator("html").evaluate((element) => element.classList.contains("dark")), theme === "dark");
          const background = await page.locator(".role-app-shell").evaluate((element) => getComputedStyle(element).backgroundColor);
          assert.notEqual(background, "rgba(0, 0, 0, 0)", "Actual shell background CSS did not resolve");
          const themeKey = `${role}/${language}/${width}`;
          if (theme === "light") lightBackgrounds.set(themeKey, background);
          else {
            assert(lightBackgrounds.has(themeKey), "Light-theme baseline was not measured");
            assert.notEqual(background, lightBackgrounds.get(themeKey), "Dark class did not change the actual shell background");
          }
          await expect(page.locator("#mobile-navigation")).toHaveCount(0);
          // Exactly one CSS-exposed canonical brand: Header on mobile, Sidebar
          // on desktop. The hidden duplicate must not enter the accessible tree.
          const brandLink = page.getByRole("link", { name: resources[language].header.dashboardLink, exact: true });
          await expect(brandLink).toHaveCount(1);
          await expect(brandLink).toBeVisible();
          await expect(brandLink).toHaveAttribute("href", `/${role}`);
          const brandBox = await brandLink.boundingBox();
          assert(brandBox && brandBox.width >= 44 && brandBox.height >= 44, "Actual exposed brand target is undersized");
          await assertCenterHit(brandLink, "Actual exposed brand link");
          if (width < 640) {
            const tabs = await page.locator(".new-mobile-tabbar a").evaluateAll((links) => links.map((link) => {
              const rect = link.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            }));
            assert(tabs.length > 0 && tabs.every((tab) => tab.width >= 44 && tab.height >= 44), `Actual bottom targets undersized: ${JSON.stringify(tabs)}`);
          }
          await assertNoHorizontalOverflow(page);
          await assertLastActionClear(page, width < 640);

          const trigger = page.locator('header button[aria-controls="mobile-navigation"]');
          if (width >= 640) {
            await expect(trigger).toBeHidden();
            await expect(page.locator(".app-sidebar")).toBeVisible();
            if (theme === "dark") await assertDarkSidebar(page.locator(".app-sidebar"));
            await expect(page.locator(".new-mobile-tabbar")).toBeHidden();
          } else {
            await expect(page.locator(".app-sidebar a")).toHaveCount(0);
            await expect(trigger).toBeVisible();
            const triggerBox = await trigger.boundingBox();
            assert(triggerBox && triggerBox.width >= 44 && triggerBox.height >= 44, "Actual header drawer trigger is undersized");
            await expect(trigger).toHaveAccessibleName(openLabel);
            await expect(trigger).toHaveAttribute("aria-expanded", "false");
            let darkSidebarChecked = false;
            const open = async () => {
              await trigger.tap();
              const dialog = page.getByRole("dialog", { name: primaryLabel, exact: true });
              await expect(dialog).toBeVisible();
              await expect(trigger).toHaveAttribute("aria-expanded", "true");
              await expect(trigger).toHaveAttribute("aria-label", closeLabel);
              await expect(dialog).toHaveAttribute("data-role", role);
              await expect(dialog).toHaveAttribute("aria-modal", "true");
              await expect(page.getByRole("navigation", { name: primaryLabel, exact: true })).toHaveCount(1);
              await expect(page.getByRole("main")).toHaveCount(0);
              assert(await dialog.evaluate((element) => element.contains(document.activeElement)), "Initial focus did not enter drawer");
              assert(await page.locator("#main-content").evaluate((element) => !!element.closest('[aria-hidden="true"]')), "Modal background not aria-hidden");
              assert(await dialog.evaluate((element) => element.closest(".role-app-shell") === null), "Drawer must really exercise its portal");
              const box = await dialog.boundingBox();
              assert(box);
              assert(language === "ar" ? Math.abs(box.x + box.width - width) <= 1 : Math.abs(box.x) <= 1, `Wrong ${language} drawer side: ${JSON.stringify(box)}`);
              await assertNoHorizontalOverflow(page);
              if (theme === "dark" && !darkSidebarChecked) {
                await assertDarkSidebar(dialog);
                darkSidebarChecked = true;
              }
              return dialog;
            };
            const closedToOpener = async () => {
              await expect(page.locator("#mobile-navigation")).toHaveCount(0);
              await expect(trigger).toHaveAttribute("aria-expanded", "false");
              await expect(trigger).toBeFocused();
            };
            let dialog = await open();
            const focusables = dialog.locator('button:not([disabled]), a[href], [tabindex="0"]');
            await focusables.last().focus();
            await page.keyboard.press("Tab");
            await expect(focusables.first()).toBeFocused();
            await page.keyboard.press("Shift+Tab");
            await expect(focusables.last()).toBeFocused();
            await page.keyboard.press("Escape");
            await closedToOpener();

            await open();
            await page.touchscreen.tap(language === "ar" ? 2 : width - 2, 100);
            await closedToOpener();
            dialog = await open();
            await dialog.getByRole("button", { name: closeLabel, exact: true }).tap();
            await closedToOpener();

            dialog = await open();
            const destination = await dialog.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href")).find((href) => href && href !== location.pathname));
            assert(destination, "No alternative real navigation link available");
            await dialog.locator(`a[href=${JSON.stringify(destination)}]`).first().tap();
            await expect(page.locator("#mobile-navigation")).toHaveCount(0);
            await expect(page.locator("#main-content")).toBeFocused();
            assert.equal(new URL(page.url()).pathname, destination);

            await open();
            await page.evaluate((path) => window.__shellFixture.navigate(path), `/${role}/fixture-programmatic-route`);
            await expect(page.locator("#mobile-navigation")).toHaveCount(0);
            await expect(page.locator("#main-content")).toBeFocused();

            await open();
            await page.setViewportSize({ width: 640, height });
            await expect(page.locator("#mobile-navigation")).toHaveCount(0);
            await expect(page.locator("#main-content")).toBeFocused();
            await expect(page.getByRole("navigation", { name: primaryLabel, exact: true })).toHaveCount(1);
            await page.setViewportSize({ width, height });
            await expect(page.locator("#mobile-navigation")).toHaveCount(0);
            await expect(trigger).toHaveAttribute("aria-expanded", "false");
            await expect(page.locator(".app-sidebar a")).toHaveCount(0);
            await expect(page.getByRole("navigation", { name: mobileLabel, exact: true })).toHaveCount(1);
            await expect(page.getByRole("navigation")).toHaveCount(1);
          }
          await assertNoHorizontalOverflow(page);
          assert.deepEqual(outsideRequests, [], "Fixture attempted non-local network access");
          assert.deepEqual(failedAssets, [], "Actual fixture assets failed");
          assert.deepEqual(pageErrors, [], "Actual shell emitted uncaught page errors");
        } finally {
          await context.close();
        }
      });
    }
    for (const language of ["en", "ar"]) {
      await runCase(`actual wide header / ${language} / 1440px`, { timeout: 15_000 }, async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height }, locale: language, reducedMotion: "reduce", serviceWorkers: "block" });
        try {
          await context.addInitScript({ content: `window.__shellContrastMath = ${contrastFromCssColors.toString()};` });
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.message));
          page.on("requestfailed", (request) => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
          page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.url()}: HTTP ${response.status()}`); });
          await page.route("**/*", (route) => {
            if (new URL(route.request().url()).origin === base) return route.continue();
            errors.push(`Non-local request: ${route.request().url()}`);
            return route.abort();
          });
          await page.goto(`${base}/student/dashboard?role=student&language=${language}&theme=light`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => window.__shellFixture?.mounted === true);
          // SearchCommand's contents are a declared placeholder. This assertion
          // measures the real GlobalHeader wrapper responsible for RTL centering.
          const searchWrapper = page.locator("header .absolute.inset-x-0.mx-auto");
          await expect(searchWrapper).toBeVisible();
          const searchBox = await searchWrapper.boundingBox();
          assert(searchBox && searchBox.width > 0 && searchBox.height > 0, "Actual search wrapper has no rendered geometry");
          assert(Math.abs(searchBox.x + searchBox.width / 2 - 720) <= 0.5, `Actual ${language} header search is not centered: ${JSON.stringify(searchBox)}`);
          const brand = page.getByRole("link", { name: resources[language].header.dashboardLink, exact: true });
          await expect(brand).toHaveCount(1);
          await expect(brand).toBeVisible();
          await expect(brand).toHaveAttribute("href", "/student");
          const brandBox = await brand.boundingBox();
          assert(brandBox && brandBox.width >= 44 && brandBox.height >= 44, "Wide exposed brand target is undersized");
          await assertCenterHit(brand, "Actual wide exposed brand link");
          const trigger = page.locator('header button[aria-controls="mobile-navigation"]');
          await expect(trigger).toBeHidden(); // Mobile-only trigger; no fabricated desktop size claim.
          await assertNoHorizontalOverflow(page);
          assert.deepEqual(errors, [], "Actual wide-header fixture errors");
        } finally {
          await context.close();
        }
      });
    }
  } finally {
    suite.signal.removeEventListener("abort", abortBrowser);
    try {
      if (browser) await browser.close();
    } finally {
      try {
        if (server) {
          server.closeAllConnections();
          await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  }
});

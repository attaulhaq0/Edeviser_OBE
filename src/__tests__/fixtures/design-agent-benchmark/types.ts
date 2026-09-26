// Development-only presentation DTOs, not database or academic engine contracts.
export type CourseResultsLanguage = "en" | "ar";

export interface CourseResultRecord {
  readonly id: string;
  readonly name: string;
  /** null means unavailable. Numeric zero is a genuine supplied result.
   * The caller owns native formatting, scale/model context and language.
   * This panel neither normalizes values nor assigns attainment/grade bands.
   */
  readonly result: {
    readonly value: string | number;
    readonly scaleLabel: string;
  } | null;
}

export type CourseResultsState =
  | { readonly status: "loading" }
  | { readonly status: "unavailable" }
  | { readonly status: "error"; readonly onRetry: () => void }
  | { readonly status: "loaded"; readonly courses: readonly CourseResultRecord[] };

export interface CourseResultsLabels {
  readonly title: string;
  readonly description: string;
  readonly courseList: string;
  readonly result: string;
  readonly missingResult: string;
  readonly loading: string;
  readonly unavailable: string;
  readonly empty: string;
  readonly error: string;
  readonly retry: string;
}

export interface CourseResultsPanelProps {
  readonly language: CourseResultsLanguage;
  readonly labels: CourseResultsLabels;
  readonly state: CourseResultsState;
  readonly headingLevel?: "h2" | "h3";
}

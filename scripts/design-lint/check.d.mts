import type { Dirent, Stats } from "node:fs";

export type DesignCheck =
  | "icon-background"
  | "legacy-gradient"
  | "physical-css"
  | "raw-brand-gradient";

export interface DesignViolation {
  check: DesignCheck;
  file: string;
  line: number;
  match: string;
  text: string;
}

export interface DesignLintFilesystem {
  lstat(path: string): Stats;
  readdir(path: string): Dirent[];
  readFile(path: string): string;
}

export function scanSource(file: string, source: string): DesignViolation[];
export function scanDesignSystem(
  root?: string,
  io?: DesignLintFilesystem,
): { filesScanned: number; violations: DesignViolation[] };
export function run(
  argv?: string[],
  output?: { log(message: string): void; error(message: string): void },
  io?: DesignLintFilesystem,
): 0 | 1 | 2;

import type { Browser } from "@playwright/test";

export interface SmokeResult {
  rootLength: number;
  title: string;
  pageErrors: string[];
  consoleErrors: string[];
  assetErrors: string[];
  isolatedCollectorScripts: string[];
}

export interface SmokeOutput {
  log(message: string): void;
  error(message: string): void;
}

export function isLocalCollectorScript(
  requestUrl: string,
  resourceType: string,
  baseUrl: string,
  method?: string,
): boolean;
export function smokePassed(result: SmokeResult): boolean;
export function runBrowserSmoke(
  baseUrl: string,
  options?: {
    launch?: () => Promise<Pick<Browser, "newPage" | "close">>;
    waitAfterLoadMs?: number;
    timeoutMs?: number;
  },
): Promise<SmokeResult>;
export function reportSmoke(result: SmokeResult, output?: SmokeOutput): 0 | 1;
export function run(output?: SmokeOutput): Promise<number>;

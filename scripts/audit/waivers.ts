// Pre-deployment audit — waiver loader.
//
// Implements Task 20.1 / Req 16.4: audit/waivers.json provides a mechanism
// to ship a release with an active Critical finding when three named
// signers (releaseEngineer, qaLead, techLead) have explicitly approved a
// time-bounded exception.
//
// The file format intentionally mirrors the rest of the audit baselines
// (JSON, not YAML — matches codebase convention) so no new dependency is
// needed to parse it. An expiresAt in the past is treated as no waiver —
// the severityToVerdict function's own expiry check refuses stale waivers.
//
// This file is GITIGNORED when it actually contains signed waivers
// (audit/waivers.json). The committed artifact is audit/waivers.example.json.
// See docs/operations/pre-deployment-audit-howto.md for the triage flow.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Waiver } from "./verdict.ts";

interface WaiverFile {
  readonly waivers?: readonly unknown[];
}

const WAIVERS_PATH = (): string => resolve("audit", "waivers.json");

const isWaiver = (value: unknown): value is Waiver => {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.severity !== "Critical") return false;
  if (typeof v.findingId !== "string") return false;
  if (typeof v.expiresAt !== "string") return false;
  if (typeof v.rationale !== "string") return false;
  const s = v.signers as Record<string, unknown> | undefined;
  if (!s || typeof s !== "object") return false;
  if (typeof s.releaseEngineer !== "string") return false;
  if (typeof s.qaLead !== "string") return false;
  if (typeof s.techLead !== "string") return false;
  return true;
};

export interface WaiverLoadResult {
  readonly waivers: readonly Waiver[];
  /** Path the loader attempted — useful for diagnostics and the report. */
  readonly path: string;
  readonly present: boolean;
  readonly parseError: string | null;
  readonly rejectedEntries: number;
}

export const loadWaivers = (): WaiverLoadResult => {
  const path = WAIVERS_PATH();
  if (!existsSync(path)) {
    return {
      waivers: [],
      path,
      present: false,
      parseError: null,
      rejectedEntries: 0,
    };
  }

  let parsed: WaiverFile;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as WaiverFile;
  } catch (error) {
    return {
      waivers: [],
      path,
      present: true,
      parseError:
        error instanceof Error ? error.message : "Malformed waivers file",
      rejectedEntries: 0,
    };
  }

  const entries = Array.isArray(parsed.waivers) ? parsed.waivers : [];
  const waivers: Waiver[] = [];
  let rejected = 0;
  for (const entry of entries) {
    if (isWaiver(entry)) {
      waivers.push(entry);
    } else {
      rejected += 1;
    }
  }

  return {
    waivers,
    path,
    present: true,
    parseError: null,
    rejectedEntries: rejected,
  };
};

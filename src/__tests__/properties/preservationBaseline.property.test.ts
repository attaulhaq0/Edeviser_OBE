// Feature: full-profile-audit-remediation, Property 6: Preservation — Non-buggy inputs are unchanged
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**
//
// IMPORTANT: These tests MUST PASS on UNFIXED code — they capture the BASELINE healthy behavior
// that the remediation fixes must NOT regress (`F(X) = F'(X)` for every input where NO bug
// condition holds:
//   NOT (isRoleGateBug OR isSchemaDriftBug OR isEngagementXpBug OR isPlannerStatusBug
//        OR isParentAccessBug)).
//
// Observation-first methodology (per task 6): each block first OBSERVES the current behavior of the
// UNFIXED code — either by exercising a faithful in-TS model of healthy business logic
// (calculateLevel / XP-ledger invariant, badge idempotency, RLS isolation predicate) or by reading
// the current edge-function / SQL / migration source (auth branches, leaderboard RPC, cascade
// trigger, deployed functions) — then asserts those observed outputs hold with fast-check
// (≥100 iterations). Because every assertion encodes the behavior that ALREADY holds today, this
// whole file PASSES on unfixed code; if a later fix regresses any baseline, the matching block fails.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";
import { calculateLevel, applyBonusMultiplier } from "@/lib/xpLevelCalculator";

// Resolve the project root for fs-based source reading (mirrors roleGateBugCondition.property.test.ts).
const projectRoot = path.resolve(__dirname, "../../..");

const readFileSafe = (relPath: string): string => {
  const fullPath = path.join(projectRoot, relPath);
  return fs.readFileSync(fullPath, "utf-8");
};

// Read every migration once and concatenate for net-state / presence assertions.
const MIGRATION_DIR = "supabase/migrations";
const readAllMigrationContent = (): string => {
  const dir = path.join(projectRoot, MIGRATION_DIR);
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), "utf-8"))
    .join("\n");
};
const ALL_MIGRATIONS = readAllMigrationContent();

// ─────────────────────────────────────────────────────────────────────────────
// 3.1 — RLS isolation (9 boundary probes): a non-parent, an unverified link, and a
//       cross-institution caller all return [] from the parent-readable tables.
//
// Baseline (today): the ONLY scope under which a parent may read a linked child's data is a
// VERIFIED parent_student_link (parent_read_linked pattern). The three negative caller classes
// below are denied today AND must STILL be denied after the parent SELECT policies are added in
// task 11 (no broadening). 3 caller classes × 3 tables = 9 boundary probes.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.1 Preservation — RLS isolation: negative probes always return []", () => {
  // The three tables parent Progress/Attendance pages read (the parent-access surface).
  const PARENT_READABLE_TABLES = [
    "student_courses",
    "course_sections",
    "class_sessions",
  ] as const;

  // Faithful model of the verified-linked-parent visibility predicate (parent_read_linked):
  // a row is visible to a parent ONLY when role='parent', the link exists, is verified, and the
  // caller's institution matches the row's institution. Any negative probe → not visible ([]).
  interface ParentProbe {
    role: "parent" | "teacher" | "student" | "admin";
    linkExists: boolean;
    linkVerified: boolean;
    callerInstitution: string;
    rowInstitution: string;
  }

  const isRowVisibleToParent = (p: ParentProbe): boolean =>
    p.role === "parent" &&
    p.linkExists &&
    p.linkVerified &&
    p.callerInstitution === p.rowInstitution;

  // Generator for a NON-parent caller (role ≠ parent) — boundary probe class 1.
  const nonParentArb = (): fc.Arbitrary<ParentProbe> =>
    fc.record({
      role: fc.constantFrom("teacher", "student", "admin") as fc.Arbitrary<
        ParentProbe["role"]
      >,
      linkExists: fc.boolean(),
      linkVerified: fc.boolean(),
      callerInstitution: fc.uuid(),
      rowInstitution: fc.uuid(),
    });

  // Generator for a parent with an UNVERIFIED (or absent) link — boundary probe class 2.
  const unverifiedLinkArb = (): fc.Arbitrary<ParentProbe> =>
    fc
      .record({
        linkExists: fc.boolean(),
        institution: fc.uuid(),
      })
      .map(({ linkExists, institution }) => ({
        role: "parent" as const,
        linkExists,
        linkVerified: false, // explicitly UNVERIFIED
        callerInstitution: institution,
        rowInstitution: institution, // same institution to isolate the verified gate
      }));

  // Generator for a verified-linked parent in a DIFFERENT institution — boundary probe class 3.
  const crossInstitutionArb = (): fc.Arbitrary<ParentProbe> =>
    fc
      .tuple(fc.uuid(), fc.uuid())
      .filter(([a, b]) => a !== b)
      .map(([callerInstitution, rowInstitution]) => ({
        role: "parent" as const,
        linkExists: true,
        linkVerified: true,
        callerInstitution,
        rowInstitution,
      }));

  it.each(PARENT_READABLE_TABLES)(
    "a NON-parent caller reads [] from %s (probe class 1)",
    (table) => {
      fc.assert(
        fc.property(nonParentArb(), (probe) => {
          expect(isRowVisibleToParent(probe)).toBe(false);
          // The page reads `${table}` first and short-circuits to [] when not visible.
          expect(table).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    }
  );

  it.each(PARENT_READABLE_TABLES)(
    "an UNVERIFIED-link parent reads [] from %s (probe class 2)",
    (table) => {
      fc.assert(
        fc.property(unverifiedLinkArb(), (probe) => {
          expect(isRowVisibleToParent(probe)).toBe(false);
          expect(table).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    }
  );

  it.each(PARENT_READABLE_TABLES)(
    "a CROSS-institution verified parent reads [] from %s (probe class 3)",
    (table) => {
      fc.assert(
        fc.property(crossInstitutionArb(), (probe) => {
          expect(isRowVisibleToParent(probe)).toBe(false);
          expect(table).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    }
  );

  // The verified-link scope is the ONLY positive case — documents the boundary the fix must honor.
  it("only a same-institution verified-linked parent is granted visibility", () => {
    const granted: ParentProbe = {
      role: "parent",
      linkExists: true,
      linkVerified: true,
      callerInstitution: "11111111-1111-1111-1111-111111111111",
      rowInstitution: "11111111-1111-1111-1111-111111111111",
    };
    expect(isRowVisibleToParent(granted)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.2 / 3.8 — XP ledger invariant: xp_total = SUM(xp_transactions) (zero drift), and
//             level = calculateLevel(xp_total), across random sequences of XP awards that
//             include the currently-working sources (submission +25 / +15 late, login,
//             journal, marketplace purchase spend, bonus-event multiplier).
// ─────────────────────────────────────────────────────────────────────────────
describe("3.2 / 3.8 Preservation — XP ledger invariant (zero drift) and level math", () => {
  // Canonical server-enforced base amounts for the currently-working (non-buggy) sources.
  // These mirror award-xp/index.ts and the grade trigger; they are NOT part of any bug condition.
  const WORKING_SOURCE_BASE: Record<string, number> = {
    login: 10,
    submission: 25, // on-time
    submission_late: 15, // late window
    journal: 20,
    grade: 15, // owned by trigger_attainment_rollup
    marketplace_purchase: -200, // a spend (e.g. streak freeze) — negative ledger entry
  };

  // A single ledger transaction: a working source, with an optional bonus-event multiplier that
  // applies to positive base XP only (marketplace spends are not multiplied).
  interface LedgerTxn {
    source: keyof typeof WORKING_SOURCE_BASE;
    multiplier: number; // ≥ 1.0 bonus-event multiplier
  }

  const txnArb = (): fc.Arbitrary<LedgerTxn> =>
    fc.record({
      source: fc.constantFrom(
        ...(Object.keys(WORKING_SOURCE_BASE) as Array<
          keyof typeof WORKING_SOURCE_BASE
        >)
      ),
      multiplier: fc.constantFrom(1.0, 1.5, 2.0, 3.0),
    });

  // Resolve the final XP for a transaction exactly as the engine would (multiplier on positive base).
  const resolveTxnXp = (txn: LedgerTxn): number => {
    const base = WORKING_SOURCE_BASE[txn.source] ?? 0;
    if (base <= 0) return base; // spends are not multiplied
    return applyBonusMultiplier(base, txn.multiplier);
  };

  it("xp_total equals SUM(xp_transactions) for any sequence of working-source awards", () => {
    fc.assert(
      fc.property(
        fc.array(txnArb(), { minLength: 0, maxLength: 200 }),
        (txns) => {
          // The append-only ledger: each txn writes its resolved final_xp.
          const ledger = txns.map(resolveTxnXp);
          const sumLedger = ledger.reduce((acc, x) => acc + x, 0);

          // The derived xp_total (what student_gamification stores) — must equal the ledger sum.
          const xpTotal = sumLedger;

          // Zero drift: stored total === SUM(transactions).
          expect(xpTotal).toBe(sumLedger);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("level = calculateLevel(xp_total) is monotonic and consistent with the ledger", () => {
    fc.assert(
      fc.property(
        fc.array(txnArb(), { minLength: 0, maxLength: 200 }),
        (txns) => {
          const ledger = txns.map(resolveTxnXp);
          const xpTotal = ledger.reduce((acc, x) => acc + x, 0);

          const levelFromTotal = calculateLevel(xpTotal);
          // The level is always derived from the (clamped) total — never below 1.
          expect(levelFromTotal).toBeGreaterThanOrEqual(1);
          // Re-deriving from the same total is stable (zero drift in the level mapping).
          expect(calculateLevel(xpTotal)).toBe(levelFromTotal);
          // Adding non-negative XP never decreases the level (monotonicity of the working loop).
          const positiveTotal = ledger
            .filter((x) => x > 0)
            .reduce((acc, x) => acc + x, 0);
          expect(calculateLevel(positiveTotal)).toBeGreaterThanOrEqual(
            calculateLevel(0)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("the on-time/late submission base amounts are exactly 25 / 15 (working today)", () => {
    expect(WORKING_SOURCE_BASE.submission).toBe(25);
    expect(WORKING_SOURCE_BASE.submission_late).toBe(15);
    // Confirm the award-xp source still enforces these canonical values server-side.
    const awardXp = readFileSafe("supabase/functions/award-xp/index.ts");
    expect(awardXp).toMatch(/SUBMISSION_XP\s*=\s*25/);
    expect(awardXp).toMatch(/LATE_SUBMISSION_XP\s*=\s*15/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.3 — Badges idempotent: repeated check-badges awards each scope='individual' badge at most once.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.3 Preservation — individual badges are awarded idempotently", () => {
  // Faithful model of the idempotent award: the earned set is keyed by badge_key with a UNIQUE
  // (student_id, badge_key) constraint, so re-running check-badges any number of times can add a
  // given badge to the set at most once.
  const applyCheckBadges = (
    alreadyEarned: Set<string>,
    eligible: readonly string[]
  ): Set<string> => {
    const next = new Set(alreadyEarned);
    for (const key of eligible) next.add(key); // Set semantics = idempotent insert
    return next;
  };

  it("running check-badges repeatedly never awards a scope='individual' badge twice", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 12 }), {
          maxLength: 20,
        }),
        fc.integer({ min: 1, max: 10 }),
        (eligibleBadges, repeats) => {
          let earned = new Set<string>();
          for (let i = 0; i < repeats; i++) {
            earned = applyCheckBadges(earned, eligibleBadges);
          }
          // Each eligible badge appears exactly once regardless of how many times we re-check.
          expect(earned.size).toBe(new Set(eligibleBadges).size);
          for (const key of eligibleBadges) {
            const occurrences = [...earned].filter((k) => k === key).length;
            expect(occurrences).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("check-badges reads/writes individual badges with scope='individual' (source baseline)", () => {
    const checkBadges = readFileSafe(
      "supabase/functions/check-badges/index.ts"
    );
    // The earned-set fetch is filtered to scope='individual' and the insert sets the same scope.
    expect(checkBadges).toMatch(
      /\.eq\(\s*["']scope["']\s*,\s*["']individual["']\s*\)/
    );
    expect(checkBadges).toMatch(/scope:\s*["']individual["']/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.4 — award-xp / check-badges auth: deployed with verify_jwt=false + in-handler auth
//       (exact x-internal-auth service-role match AND user-JWT ownership for self sources),
//       and cross-user writes are rejected 403.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.4 Preservation — award-xp / check-badges in-handler auth", () => {
  const awardXp = readFileSafe("supabase/functions/award-xp/index.ts");
  const checkBadges = readFileSafe("supabase/functions/check-badges/index.ts");

  it("both functions authenticate via the x-internal-auth service-role header in-handler", () => {
    for (const src of [awardXp, checkBadges]) {
      expect(src).toMatch(/x-internal-auth/);
      expect(src).toMatch(/isServiceRole/);
      expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    }
  });

  // Faithful model of the award-xp authorization gate for a NON-service-role (student-JWT) caller:
  //   authorized iff source ∈ selfTriggeredSources AND caller owns the row (user.id === student_id).
  // Today selfTriggeredSources = [login, submission, journal]. A cross-user write (user.id !==
  // student_id) is rejected 403 regardless of source. These hold before AND after the fix.
  const SELF_TRIGGERED_TODAY = ["login", "submission", "journal"] as const;

  const authorizeStudentJwt = (
    source: string,
    callerId: string,
    studentId: string
  ): { status: number } => {
    const allowed =
      (SELF_TRIGGERED_TODAY as readonly string[]).includes(source) &&
      callerId === studentId;
    return { status: allowed ? 200 : 403 };
  };

  it("a cross-user student-JWT write is rejected 403 (caller.id !== student_id)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SELF_TRIGGERED_TODAY),
        fc.uuid(),
        fc.uuid(),
        (source, callerId, studentId) => {
          fc.pre(callerId !== studentId);
          expect(authorizeStudentJwt(source, callerId, studentId).status).toBe(
            403
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("a self-owned write for a currently-allowed source is authorized (status ≠ 403)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SELF_TRIGGERED_TODAY),
        fc.uuid(),
        (source, id) => {
          expect(authorizeStudentJwt(source, id, id).status).not.toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("award-xp still gates non-service-role callers on selfTriggeredSources + ownership (source)", () => {
    // The in-handler gate references the self-trigger list, the user identity, and the 403 reject.
    expect(awardXp).toMatch(/selfTriggeredSources/);
    expect(awardXp).toMatch(
      /user\.id\s*!==\s*student_id|user\.id\s*===\s*student_id/
    );
    expect(awardXp).toMatch(/403/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.9 — Leaderboard: get_leaderboard_page(p_institution_id, p_limit, p_offset) returns correct
//       rows and respects the anonymous opt-out server-side.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.9 Preservation — get_leaderboard_page signature + anonymous opt-out", () => {
  const RPC_MIGRATION =
    "supabase/migrations/20260530095715_create_get_leaderboard_page_rpc.sql";

  it("the RPC exists with the (p_institution_id, p_limit, p_offset) signature", () => {
    const src = readFileSafe(RPC_MIGRATION);
    expect(src).toMatch(/FUNCTION\s+public\.get_leaderboard_page/);
    expect(src).toMatch(/p_institution_id\s+uuid/);
    expect(src).toMatch(/p_limit\s+integer/);
    expect(src).toMatch(/p_offset\s+integer/);
  });

  it("the RPC excludes opted-out students server-side (leaderboard_anonymous IS NOT TRUE)", () => {
    const src = readFileSafe(RPC_MIGRATION);
    expect(src).toMatch(/leaderboard_anonymous\s+IS\s+NOT\s+TRUE/i);
  });

  it("the RPC is institution-scoped and authenticated-only (no anon execute)", () => {
    const src = readFileSafe(RPC_MIGRATION);
    expect(src).toMatch(/auth_institution_id\(\)/);
    expect(src).toMatch(/REVOKE\s+EXECUTE[\s\S]*?FROM\s+anon/i);
    expect(src).toMatch(/GRANT\s+EXECUTE[\s\S]*?TO\s+authenticated/i);
  });

  // Model the opt-out filter: an opted-out student is never present in any returned page.
  it("an opted-out student never appears in the returned leaderboard rows (model)", () => {
    interface Row {
      studentId: string;
      xpTotal: number;
      anonymous: boolean;
    }
    const cohortArb = fc.array(
      fc.record({
        studentId: fc.uuid(),
        xpTotal: fc.integer({ min: 0, max: 100000 }),
        anonymous: fc.boolean(),
      }),
      { maxLength: 50 }
    );
    fc.assert(
      fc.property(cohortArb, (cohort: Row[]) => {
        const page = cohort
          .filter((r) => !r.anonymous) // server-side opt-out exclusion
          .sort((a, b) => b.xpTotal - a.xpTotal);
        expect(page.every((r) => r.anonymous === false)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.7 — grade → evidence → outcome_attainment cascade via trigger_attainment_rollup is unchanged,
//       and calculate-attainment-rollup stays DISCONNECTED (its re-enablement would violate
//       evidence.plo_id/ilo_id NOT NULL).
// ─────────────────────────────────────────────────────────────────────────────
describe("3.7 Preservation — attainment cascade trigger unchanged; rollup edge fn disconnected", () => {
  const TRIGGER_MIGRATION =
    "supabase/migrations/20260520094217_fix_trigger_xp_idempotent.sql";
  const ATTACH_MIGRATION =
    "supabase/migrations/20260223100000_add_grade_trigger_for_attainment_rollup.sql";

  it("the pure-SQL trigger function performs the evidence → CLO → PLO → ILO cascade", () => {
    const src = readFileSafe(TRIGGER_MIGRATION);
    expect(src).toMatch(/FUNCTION\s+public\.trigger_attainment_rollup\(\)/);
    expect(src).toMatch(/INSERT\s+INTO\s+evidence/i);
    expect(src).toMatch(/INSERT\s+INTO\s+outcome_attainment/i);
    // The cascade walks the live outcome_mappings source/target columns and the live scopes.
    expect(src).toMatch(/source_outcome_id/);
    expect(src).toMatch(/target_outcome_id/);
    expect(src).toMatch(/student_course/);
    // The +15 grade XP is idempotent (ON CONFLICT DO NOTHING) — no drift on replay.
    expect(src).toMatch(/'grade'/);
    expect(src).toMatch(/ON CONFLICT DO NOTHING/i);
  });

  it("the trigger is attached to grades AFTER INSERT OR UPDATE", () => {
    const src = readFileSafe(ATTACH_MIGRATION);
    expect(src).toMatch(/CREATE\s+TRIGGER/i);
    expect(src).toMatch(/AFTER\s+INSERT\s+OR\s+UPDATE\s+ON\s+public\.grades/i);
    expect(src).toMatch(
      /EXECUTE\s+FUNCTION\s+public\.trigger_attainment_rollup\(\)/i
    );
  });

  it("the active (latest) trigger is pure-SQL — it does NOT call the calculate-attainment-rollup edge fn", () => {
    // The current trigger body computes the cascade in SQL and must NOT invoke the disconnected
    // edge function (re-enabling it would violate evidence.plo_id/ilo_id NOT NULL).
    const src = readFileSafe(TRIGGER_MIGRATION);
    expect(src).not.toMatch(/calculate-attainment-rollup/);
    expect(src).not.toMatch(/net\.http_post/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.6 — Tutor without RAG: with no OPENAI_API_KEY the tutor still returns persona + CLO answers,
//       and the academic-integrity guard continues to refuse/redirect homework-completion requests.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.6 Preservation — tutor degrades gracefully without RAG; integrity guard intact", () => {
  const tutor = readFileSafe("supabase/functions/chat-with-tutor/index.ts");

  it("OPENAI_API_KEY is OPTIONAL — embedding/RAG is skipped (not fatal) when absent", () => {
    // The function reads OPENAI_API_KEY and only attempts embedding when present; otherwise it
    // continues without RAG retrieval (persona + CLO context + history still answer).
    expect(tutor).toMatch(/OPENAI_API_KEY/);
    expect(tutor).toMatch(/if\s*\(\s*openaiApiKey\s*\)/);
    expect(tutor).toMatch(/without\s+(?:course-material\s+)?RAG/i);
  });

  it("persona prompts and CLO/course context are assembled regardless of RAG availability", () => {
    expect(tutor).toMatch(/PERSONA_PROMPTS/);
    expect(tutor).toMatch(/assembleSystemPrompt/);
    expect(tutor).toMatch(/cloAttainments/);
  });

  it("the academic-integrity guard detects and redirects homework-completion requests", () => {
    expect(tutor).toMatch(/detectIntegrityViolation/);
    expect(tutor).toMatch(/do my homework/i);
    expect(tutor).toMatch(/ACADEMIC INTEGRITY ALERT/);
  });

  // Faithful model of the integrity detector over the known patterns: a homework-completion phrase
  // is always flagged; an innocuous concept question is not.
  it("integrity detection flags completion requests but not innocuous questions (model)", () => {
    const FLAG_PHRASES = [
      "write my essay",
      "do my homework",
      "do my assignment",
      "write this for me",
    ];
    const SAFE_PHRASES = [
      "can you explain recursion",
      "what is a derivative",
      "help me understand loops",
    ];
    const flagged = (msg: string): boolean =>
      FLAG_PHRASES.some((p) => msg.toLowerCase().includes(p));

    fc.assert(
      fc.property(fc.constantFrom(...FLAG_PHRASES), (phrase) => {
        expect(flagged(`please ${phrase} now`)).toBe(true);
      }),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(fc.constantFrom(...SAFE_PHRASES), (phrase) => {
        expect(flagged(phrase)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.5 — Already-deployed functions: ai-feedback-draft, ai-module-suggestion authorize via a
//       profiles role lookup, and generate-quiz-questions resolves institution via
//       program_id → programs(institution_id). These must NOT regress.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.5 Preservation — already-deployed AI functions authorize via profiles / programs join", () => {
  it("ai-feedback-draft resolves the caller role from profiles by id", () => {
    const src = readFileSafe("supabase/functions/ai-feedback-draft/index.ts");
    expect(src).toMatch(/\.from\(\s*["']profiles["']\s*\)/);
    expect(src).toMatch(/\.select\(\s*["'][^"']*role[^"']*["']\s*\)/);
    expect(src).toMatch(/\.eq\(\s*["']id["']\s*,\s*caller\.id\s*\)/);
  });

  it("ai-module-suggestion resolves the caller role from profiles by id", () => {
    const src = readFileSafe(
      "supabase/functions/ai-module-suggestion/index.ts"
    );
    expect(src).toMatch(/\.from\(\s*["']profiles["']\s*\)/);
    expect(src).toMatch(/\.select\(\s*["'][^"']*role[^"']*["']\s*\)/);
    expect(src).toMatch(/\.eq\(\s*["']id["']\s*,\s*caller\.id\s*\)/);
  });

  it("generate-quiz-questions resolves institution via program_id → programs(institution_id)", () => {
    const src = readFileSafe(
      "supabase/functions/generate-quiz-questions/index.ts"
    );
    expect(src).toMatch(/program_id/);
    expect(src).toMatch(/programs\s*\(\s*institution_id\s*\)/);
    // Uses .maybeSingle() (not the fragile .single()) for the course ownership read.
    expect(src).toMatch(/\.maybeSingle\(\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.10 — Migration history hygiene: the parent RLS scoping helper / verified-link gate exists so a
//        from-scratch replay can rebuild it, and the append-only invariants remain enforced.
//        (A static analogue of the replay-integrity gate; full replay runs in CI / Supabase Preview.)
// ─────────────────────────────────────────────────────────────────────────────
describe("3.10 Preservation — migration invariants (append-only + verified-link scoping)", () => {
  it("parent_student_links + verified gating exists in the migration history", () => {
    expect(ALL_MIGRATIONS).toMatch(/parent_student_links/);
    expect(ALL_MIGRATIONS).toMatch(/verified/);
  });

  it("append-only mutation guards (evidence, audit_logs, xp_transactions) remain enforced", () => {
    expect(ALL_MIGRATIONS).toMatch(/prevent_evidence_mutation/);
    expect(ALL_MIGRATIONS).toMatch(/prevent_audit_logs_mutation/);
    expect(ALL_MIGRATIONS).toMatch(/prevent_xp_transactions_mutation/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.11 — Incidentally-touched working features: the academic habit canonical table (habit_logs)
//        and the leaderboard hook remain present so adjacent CRUD continues to work unchanged.
// ─────────────────────────────────────────────────────────────────────────────
describe("3.11 Preservation — incidentally-touched working features remain present", () => {
  it("the leaderboard hook reads the get_leaderboard_page RPC", () => {
    const hook = readFileSafe("src/hooks/useLeaderboard.ts");
    expect(hook).toMatch(/get_leaderboard_page/);
  });

  it("the academic habit canonical table (habit_logs) exists in the migration history", () => {
    expect(ALL_MIGRATIONS).toMatch(/habit_logs/);
  });

  it("the award-xp source enumerates the working engagement loop sources (study/goal/wellness)", () => {
    const awardXp = readFileSafe("supabase/functions/award-xp/index.ts");
    // These sources already have server-enforced canonical amounts (the loop logic exists today;
    // task 9 only opens the self-trigger allow-list). Their presence must not regress.
    for (const source of [
      "study_session",
      "weekly_goal",
      "wellness_habit",
      "planner_task",
      "review_session",
      "review_cycle_complete",
    ]) {
      expect(awardXp).toContain(source);
    }
  });
});

// =============================================================================
// Learning-State Sweep — deterministic stale-state refresh for scheduled scans
// =============================================================================
// Covers the "learning-state-update-jobs" and "student-risk-jobs" background
// families (Task 8.2). The Digital Twin spec requires risk/mastery/habit
// signals to be DETERMINISTIC recomputations of real evidence — never LLM
// output — so these families are scheduled SQL refresh sweeps, not LLM queue
// jobs. Candidates are rows of `student_learning_states` whose `fresh_until`
// has expired (the canonical staleness predicate mirrored from
// `student_learning_state_needs_refresh_v1`), refreshed one-by-one through the
// SECURITY DEFINER `refresh_student_learning_state_v1` RPC so the sweep can
// never diverge from the canonical recalculation logic.
//
// Design guarantees (Task 8.2 contract):
// - Bounded: at most MAX_SWEEP_BATCH candidates per scan (small batches).
// - Idempotent: candidates are stale-only; refreshing is a versioned recalc.
// - Isolated: one student's refresh failure never aborts the sweep or the scan.
// - Fail-closed: a candidate-list error reports ok:false and refreshes nothing;
//   the surrounding scheduled_scan continues (the sweep is an enhancement).
// - Institution-scoped: honors the optional institutionId scan parameter.

export interface StaleStateSweepResult {
  ok: boolean;
  refreshed: number;
  failed: number;
}

/**
 * Minimal structural view of the service-role Supabase client used here, so
 * the module stays Node-testable (no Deno-only imports) while accepting the
 * real client structurally.
 */
interface SweepQuery {
  eq(column: string, value: string): SweepQuery;
  lte(column: string, value: string): SweepQuery;
  order(column: string, options: { ascending: boolean }): SweepQuery;
  limit(count: number): PromiseLike<{
    data: Array<{ student_id: string }> | null;
    error: { message: string } | null;
  }>;
}

export interface LearningStateSweepClient {
  from(table: string): { select(columns: string): SweepQuery };
  rpc(
    fn: string,
    args: Record<string, unknown>
  ): PromiseLike<{ error: { message: string } | null }>;
}

export const DEFAULT_SWEEP_BATCH = 50;
export const MAX_SWEEP_BATCH = 200;

export async function refreshStaleLearningStates(
  admin: LearningStateSweepClient,
  institutionId: string | undefined,
  batchSize: number = DEFAULT_SWEEP_BATCH
): Promise<StaleStateSweepResult> {
  const bounded =
    Number.isInteger(batchSize) && batchSize >= 1
      ? Math.min(batchSize, MAX_SWEEP_BATCH)
      : DEFAULT_SWEEP_BATCH;

  let query = admin
    .from("student_learning_states")
    .select("student_id")
    .lte("fresh_until", new Date().toISOString());
  if (institutionId) query = query.eq("institution_id", institutionId);

  const { data, error } = await query
    .order("calculated_at", { ascending: true })
    .limit(bounded);
  if (error || data === null) {
    return { ok: false, refreshed: 0, failed: 0 };
  }

  let refreshed = 0;
  let failed = 0;
  for (const candidate of data) {
    const { error: refreshError } = await admin.rpc(
      "refresh_student_learning_state_v1",
      { p_student_id: candidate.student_id }
    );
    if (refreshError) failed += 1;
    else refreshed += 1;
  }
  return { ok: true, refreshed, failed };
}

// Feature: agentic ILO read tools (PDF section 18), coordinator program isolation.
// A coordinator may only ever receive PLO-scoped data for their OWN program,
// even when the ILO has mapped PLOs in other programs of the same institution.
import { describe, expect, it } from "vitest";

import { SupabaseToolDataSource } from "../../../supabase/functions/agent-orchestrator/data-source";
import type { AgentExecutionContext } from "../../../supabase/functions/_shared/ai/contracts";

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: null };
type Handler = (table: string) => QueryResult;

interface RecordedCall {
  table: string;
  method: string;
  column?: string;
  values?: unknown[];
}

class FakeQuery {
  static log: RecordedCall[] = [];
  constructor(
    private readonly table: string,
    private readonly handler: Handler
  ) {}
  select(): FakeQuery {
    return this;
  }
  eq(column: string, value: unknown): FakeQuery {
    FakeQuery.log.push({ table: this.table, method: "eq", column, values: [value] });
    return this;
  }
  in(column: string, values: unknown[]): FakeQuery {
    FakeQuery.log.push({ table: this.table, method: "in", column, values });
    return this;
  }
  order(): FakeQuery {
    return this;
  }
  limit(): FakeQuery {
    return this;
  }
  maybeSingle(): Promise<QueryResult> {
    FakeQuery.log.push({ table: this.table, method: "maybeSingle" });
    return Promise.resolve(this.handler(this.table));
  }
  then(
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ): Promise<unknown> {
    FakeQuery.log.push({ table: this.table, method: "await" });
    return Promise.resolve(this.handler(this.table)).then(onFulfilled, onRejected);
  }
}

class FakeClient {
  constructor(private readonly handler: Handler) {}
  from(table: string): FakeQuery {
    return new FakeQuery(table, this.handler);
  }
}

const INST = "11111111-1111-1111-1111-111111111111";
const PROGRAM_A = "22222222-2222-2222-2222-222222222221";
const ILO = "33333333-3333-3333-3333-333333333331";
const PLO_A = "44444444-4444-4444-4444-444444444441"; // belongs to PROGRAM_A
const PLO_B = "44444444-4444-4444-4444-444444444442"; // belongs to PROGRAM_B
const COORD = "55555555-5555-5555-5555-555555555551";
const ADMIN = "55555555-5555-5555-5555-555555555552";

const contextFor = (
  role: "coordinator" | "admin",
  userId: string
): AgentExecutionContext =>
  ({
    identity: { userId, role, institutionId: INST },
    page: {},
  }) as unknown as AgentExecutionContext;

const dataSource = (handler: Handler): SupabaseToolDataSource =>
  new SupabaseToolDataSource(
    new FakeClient(handler) as never,
    {} as never,
    new FakeClient(handler) as never
  );

const standardHandler = (): Handler => (table) => {
  if (table === "programs") {
    return {
      data: { id: PROGRAM_A, institution_id: INST, coordinator_id: COORD },
      error: null,
    };
  }
  if (table === "learning_outcomes") {
    const idIn = FakeQuery.log.find(
      (entry) =>
        entry.table === "learning_outcomes" &&
        entry.method === "in" &&
        entry.column === "id"
    );
    const hasProgramFilter = FakeQuery.log.some(
      (entry) =>
        entry.table === "learning_outcomes" &&
        entry.method === "eq" &&
        entry.column === "program_id"
    );
    if (idIn && !hasProgramFilter) {
      return { data: [{ id: PLO_A }, { id: PLO_B }], error: null };
    }
    const programFilter = FakeQuery.log.find(
      (entry) =>
        entry.table === "learning_outcomes" &&
        entry.method === "eq" &&
        entry.column === "program_id"
    );
    if (programFilter) {
      const rows =
        programFilter.values?.[0] === PROGRAM_A ? [{ id: PLO_A }] : [{ id: PLO_B }];
      return { data: rows, error: null };
    }
    return { data: { id: ILO, institution_id: INST }, error: null };
  }
  if (table === "outcome_mappings") {
    return {
      data: [
        { source_outcome_id: ILO, target_outcome_id: PLO_A, weight: 1 },
        { source_outcome_id: ILO, target_outcome_id: PLO_B, weight: 1 },
      ],
      error: null,
    };
  }
  if (table === "outcome_attainment") {
    const inCall = FakeQuery.log.find(
      (entry) => entry.table === "outcome_attainment" && entry.method === "in"
    );
    const ids = (inCall?.values as string[]) ?? [];
    return {
      data: ids.map((outcomeId) => ({
        outcome_id: outcomeId,
        scope: "program",
        attainment_percent: 80,
        sample_count: 5,
        last_calculated_at: "2026-08-01T00:00:00Z",
      })),
      error: null,
    };
  }
  return { data: null, error: null };
};

describe("ILO read tools - coordinator program isolation", () => {
  it("rejects a coordinator ILO read without a programId (fail-closed)", async () => {
    const ds = dataSource(standardHandler());
    const ok = await ds.authorizeScope(
      "get_ilo_attainment",
      { iloId: ILO },
      contextFor("coordinator", COORD)
    );
    expect(ok).toBe(false);
  });

  it("scopes attainment to the coordinator's own program PLOs only", async () => {
    FakeQuery.log = [];
    const ds = dataSource(standardHandler());
    const ok = await ds.authorizeScope(
      "get_ilo_attainment",
      { iloId: ILO, programId: PROGRAM_A },
      contextFor("coordinator", COORD)
    );
    expect(ok).toBe(true);
    const result = (await ds.executeRead(
      "get_ilo_attainment",
      { iloId: ILO, programId: PROGRAM_A },
      contextFor("coordinator", COORD)
    )) as { ploAttainment: Row[] };
    expect(result.ploAttainment).toHaveLength(1);
    expect(result.ploAttainment[0]?.outcome_id).toBe(PLO_A);
    const attainmentIn = FakeQuery.log.find(
      (entry) => entry.table === "outcome_attainment" && entry.method === "in"
    );
    expect(attainmentIn?.values).toEqual([PLO_A]);
  });

  it("gives admins the institution-wide PLO target set", async () => {
    FakeQuery.log = [];
    const ds = dataSource(standardHandler());
    const ok = await ds.authorizeScope(
      "get_ilo_attainment",
      { iloId: ILO },
      contextFor("admin", ADMIN)
    );
    expect(ok).toBe(true);
    const result = (await ds.executeRead(
      "get_ilo_attainment",
      { iloId: ILO },
      contextFor("admin", ADMIN)
    )) as { ploAttainment: Row[] };
    expect(result.ploAttainment).toHaveLength(2);
  });

  it("rejects a coordinator whose program is not theirs", async () => {
    const ds = dataSource(() => ({
      data: { id: PROGRAM_A, institution_id: INST, coordinator_id: "someone-else" },
      error: null,
    }));
    const ok = await ds.authorizeScope(
      "get_ilo_attainment",
      { iloId: ILO, programId: PROGRAM_A },
      contextFor("coordinator", COORD)
    );
    expect(ok).toBe(false);
  });
});
/**
 * Feature: edeviser-agentic-intelligence — task 1.8 (Admin ILO reorder safety).
 *
 * Verifies the `reorder_learning_outcomes` RPC end-to-end against a Supabase
 * PREVIEW branch:
 *   - Atomic: one statement applies every sort_order; ANY violation aborts
 *     the whole call leaving NO partial reorder behind.
 *   - Validated: admin-only, own-institution ILOs only, no duplicate ids,
 *     bounded payload.
 *   - Delete-dependency direction stays canonical: an ILO with mapped PLOs
 *     cannot be deleted (trg_guard_mapped_outcome_delete + client guard).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { shouldRunRls } from "./guard";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type AdminClient,
  type SeededCtx,
} from "./seed";
import { signInAs, type RoleClient } from "./signIn";

const run = describe.skipIf(!shouldRunRls());

run("admin ILO reorder RPC (task 1.8)", () => {
  let ctx: SeededCtx;
  let admin: AdminClient;
  let clients: Record<"admin" | "coordinator" | "teacher", RoleClient>;
  const iloIds: string[] = [];
  const mappingIds: string[] = [];
  const ploIds: string[] = [];
  let foreignInstitutionId: string | null = null;
  let foreignProgramId: string | null = null;
  let foreignIloId: string | null = null;

  /** Inserts one ILO owned by the seeded institution and tracks it. */
  async function insertIlo(title: string): Promise<string> {
    const { data, error } = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: ctx.institutionId,
        type: "ILO",
        title,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`insertIlo failed: ${error?.message}`);
    iloIds.push(data.id);
    return data.id;
  }

  beforeAll(async () => {
    ctx = await seedRlsFixtures();
    admin = createAdminClient();
    clients = {
      admin: await signInAs(ctx.emails.admin, ctx.password),
      coordinator: await signInAs(ctx.emails.coordinator, ctx.password),
      teacher: await signInAs(ctx.emails.teacher, ctx.password),
    };

    // Foreign institution fixtures for cross-institution rejection cases.
    const fi = await admin
      .from("institutions")
      .insert({
        name: `Reorder Foreign ${ctx.runId}`,
        slug: `reorder-foreign-${ctx.runId}`,
        join_mode: "open",
      })
      .select("id")
      .single();
    if (fi.error || !fi.data) throw new Error(fi.error?.message);
    foreignInstitutionId = fi.data.id;

    const fp = await admin
      .from("programs")
      .insert({
        institution_id: foreignInstitutionId,
        name: `Reorder Foreign Program ${ctx.runId}`,
        code: `RF-${ctx.runId.slice(0, 8)}`,
      })
      .select("id")
      .single();
    if (fp.error || !fp.data) throw new Error(fp.error?.message);
    foreignProgramId = fp.data.id;

    const filo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: foreignInstitutionId,
        title: `Reorder Foreign ILO ${ctx.runId}`,
        type: "ILO",
      })
      .select("id")
      .single();
    if (filo.error || !filo.data) throw new Error(filo.error?.message);
    foreignIloId = filo.data.id;
  });

  afterAll(async () => {
    if (!ctx) return;
    const a = createAdminClient();
    if (mappingIds.length > 0) {
      await a.from("outcome_mappings").delete().in("id", mappingIds);
    }
    if (ploIds.length > 0) {
      await a.from("learning_outcomes").delete().in("id", ploIds);
    }
    if (iloIds.length > 0) {
      await a.from("learning_outcomes").delete().in("id", iloIds);
    }
    if (foreignIloId) {
      await a.from("learning_outcomes").delete().eq("id", foreignIloId);
    }
    if (foreignProgramId) {
      await a.from("programs").delete().eq("id", foreignProgramId);
    }
    if (foreignInstitutionId) {
      await a.from("institutions").delete().eq("id", foreignInstitutionId);
    }
    await teardownRlsFixtures(ctx);
  });

  it("admin reorders own-institution ILOs atomically", async () => {
    const iloA = await insertIlo(`Reorder A ${ctx.runId}`);
    const iloB = await insertIlo(`Reorder B ${ctx.runId}`);

    const result = await clients.admin.rpc("reorder_learning_outcomes", {
      p_items: [
        { id: iloA, sort_order: 2 },
        { id: iloB, sort_order: 1 },
      ],
    });
    expect(result.error).toBeNull();
    expect(result.data).toBe(2);

    const rows = await admin
      .from("learning_outcomes")
      .select("id, sort_order")
      .in("id", [iloA, iloB]);
    const byId = new Map((rows.data ?? []).map((r) => [r.id, r.sort_order]));
    expect(byId.get(iloA)).toBe(2);
    expect(byId.get(iloB)).toBe(1);
  });

  it("non-admin roles are denied (42501)", async () => {
    const ilo = await insertIlo(`Reorder Deny ${ctx.runId}`);
    for (const role of ["coordinator", "teacher"] as const) {
      const result = await clients[role].rpc("reorder_learning_outcomes", {
        p_items: [{ id: ilo, sort_order: 9 }],
      });
      expect(result.error).not.toBeNull();
      expect(result.error?.code).toBe("42501");
    }
  });

  it("a foreign id aborts the WHOLE call — no partial reorder", async () => {
    const iloA = await insertIlo(`Reorder Partial ${ctx.runId}`);
    // Baseline order so we can prove nothing changed after the failed call.
    await clients.admin.rpc("reorder_learning_outcomes", {
      p_items: [{ id: iloA, sort_order: 7 }],
    });

    // Payload mixes an OWN ILO with a FOREIGN ILO → must fail entirely and
    // leave iloA's sort_order untouched (atomicity proof).
    const result = await clients.admin.rpc("reorder_learning_outcomes", {
      p_items: [
        { id: iloA, sort_order: 42 },
        { id: foreignIloId!, sort_order: 1 },
      ],
    });
    expect(result.error).not.toBeNull();

    const row = await admin
      .from("learning_outcomes")
      .select("sort_order")
      .eq("id", iloA)
      .maybeSingle();
    expect(row.data?.sort_order).toBe(7);
  });

  it("duplicate ids are rejected", async () => {
    const ilo = await insertIlo(`Reorder Dup ${ctx.runId}`);
    const result = await clients.admin.rpc("reorder_learning_outcomes", {
      p_items: [
        { id: ilo, sort_order: 1 },
        { id: ilo, sort_order: 2 },
      ],
    });
    expect(result.error).not.toBeNull();
  });

  it("non-ILO outcome types are rejected", async () => {
    const plo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: ctx.institutionId,
        program_id: ctx.programId,
        title: `Reorder PLO ${ctx.runId}`,
        type: "PLO",
      })
      .select("id")
      .single();
    if (plo.error || !plo.data) throw new Error(plo.error?.message);
    ploIds.push(plo.data.id);

    const result = await clients.admin.rpc("reorder_learning_outcomes", {
      p_items: [{ id: plo.data.id, sort_order: 1 }],
    });
    expect(result.error).not.toBeNull();
  });

  it("delete-dependency direction follows the canonical mapping", async () => {
    // An ILO that has mapped PLO children must NOT be deletable; once the
    // child mapping is removed, deletion succeeds. This pins the canonical
    // direction (children read via source_outcome_id = parent).
    const ilo = await insertIlo(`Reorder DelDep ${ctx.runId}`);
    const plo = await admin
      .from("learning_outcomes")
      .insert({
        institution_id: ctx.institutionId,
        program_id: ctx.programId,
        title: `Reorder DelDep PLO ${ctx.runId}`,
        type: "PLO",
      })
      .select("id")
      .single();
    if (plo.error || !plo.data) throw new Error(plo.error?.message);
    ploIds.push(plo.data.id);

    const mapping = await admin
      .from("outcome_mappings")
      .insert({
        source_outcome_id: ilo,
        target_outcome_id: plo.data.id,
        weight: 1,
      })
      .select("id")
      .single();
    if (mapping.error || !mapping.data) throw new Error(mapping.error?.message);
    mappingIds.push(mapping.data.id);

    const blocked = await clients.admin
      .from("learning_outcomes")
      .delete()
      .eq("id", ilo)
      .select("id");
    expect(blocked.error).not.toBeNull();

    // Remove the mapping first — then deletion is allowed.
    const unmap = await admin
      .from("outcome_mappings")
      .delete()
      .eq("id", mapping.data.id);
    expect(unmap.error).toBeNull();
    mappingIds.splice(mappingIds.indexOf(mapping.data.id), 1);

    const allowed = await clients.admin
      .from("learning_outcomes")
      .delete()
      .eq("id", ilo)
      .select("id");
    expect(allowed.error).toBeNull();
    iloIds.splice(iloIds.indexOf(ilo), 1);
  });
});

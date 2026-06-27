/**
 * Feature: coordinator timetable management — RLS write policy.
 *
 * Deny-side RLS cases for INSERT on public.timetable_slots, guarding migration
 * 20260821000020_add_coordinator_timetable_slots_write.sql.
 *
 * Background: the coordinator TimetableManager (/coordinator/timetable) inserts
 * timetable_slots, but the table only had timetable_slots_admin_write, so
 * coordinator inserts were rejected with 42501 (verified in the coordinator
 * HAR). The migration adds an institution-scoped coordinator ALL-policy.
 *
 * Cases (allowed AND denied per role × table):
 *   1. coordinator inserts a slot for a section in their institution → success.
 *   2. teacher inserts a slot → rejected (no teacher write policy).
 *   3. student inserts a slot → rejected (no student write policy).
 *
 * Skip-safety: runRlsCases wraps everything in describe.skipIf(!shouldRunRls()),
 * so with no preview secrets nothing connects and `npm run test:rls` exits 0.
 *
 * Teardown note: timetable_slots.section_id references course_sections(id). The
 * default teardown deletes the seeded course_section, which would be blocked by
 * the row the coordinator case inserts. So teardown is wrapped to delete the
 * seeded section's timetable_slots BEFORE delegating to the default teardown.
 */
import { runRlsCases, type RLSCase } from "./runner";
import { createAdminClient, teardownRlsFixtures, type SeededCtx } from "./seed";

const RLS_CASES: readonly RLSCase[] = [
  {
    table: "timetable_slots",
    description:
      "coordinator inserts a slot for a section in their institution",
    asRole: "coordinator",
    expect: "success",
    action: async (ctx, client) => {
      const { error } = await client.from("timetable_slots").insert({
        section_id: ctx.sectionId,
        day_of_week: 1,
        start_time: "09:00",
        end_time: "10:00",
        room: "RLS-101",
        slot_type: "lecture",
      });
      return { error };
    },
  },
  {
    table: "timetable_slots",
    description: "teacher cannot insert a slot (no teacher write policy)",
    asRole: "teacher",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client.from("timetable_slots").insert({
        section_id: ctx.sectionId,
        day_of_week: 2,
        start_time: "09:00",
        end_time: "10:00",
        room: "RLS-102",
        slot_type: "lecture",
      });
      return { error };
    },
  },
  {
    table: "timetable_slots",
    description: "student cannot insert a slot (no student write policy)",
    asRole: "student",
    expect: "rejected",
    action: async (ctx, client) => {
      const { error } = await client.from("timetable_slots").insert({
        section_id: ctx.sectionId,
        day_of_week: 3,
        start_time: "09:00",
        end_time: "10:00",
        room: "RLS-103",
        slot_type: "lecture",
      });
      return { error };
    },
  },
];

/**
 * Deletes the slot(s) the coordinator case inserts (scoped to the seeded
 * section) before the default teardown removes the section. Best-effort: a
 * delete failure must not stop the rest of teardown.
 */
const teardownWithInsertedSlots = async (ctx: SeededCtx): Promise<void> => {
  try {
    const admin = createAdminClient();
    await admin
      .from("timetable_slots")
      .delete()
      .eq("section_id", ctx.sectionId);
  } catch (error) {
    console.warn(
      `[rls-smoke teardown] pre-clean of inserted timetable_slots skipped: ${String(
        error
      )}`
    );
  }
  await teardownRlsFixtures(ctx);
};

runRlsCases(RLS_CASES, {
  suiteName: "RLS — timetable_slots coordinator write (migration …020)",
  teardown: teardownWithInsertedSlots,
});

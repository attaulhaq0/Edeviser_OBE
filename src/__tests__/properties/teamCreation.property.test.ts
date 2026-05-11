// Feature: team-challenges, Property 1: Team creation assigns captain
// Feature: team-challenges, Property 2: One active team per student per course
// Feature: team-challenges, Property 3: Team size bounds 2-6
// **Validates: Requirements 1.1, 1.2, 1.5, 2.2, 2.3, 2.6**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createTeamSchema } from "@/lib/schemas/team";

// ── Pure logic under test ────────────────────────────────────────────────────

interface TeamMember {
  student_id: string;
  role: "captain" | "member";
  left_at: string | null;
}

interface Team {
  id: string;
  course_id: string;
  captain_id: string;
  members: TeamMember[];
}

function createTeam(
  teamId: string,
  courseId: string,
  memberIds: string[]
): Team {
  if (memberIds.length < 2 || memberIds.length > 6) {
    throw new Error("Team must have 2-6 members");
  }
  const captainId = memberIds[0]!;
  return {
    id: teamId,
    course_id: courseId,
    captain_id: captainId,
    members: memberIds.map((sid, i) => ({
      student_id: sid,
      role: i === 0 ? "captain" : "member",
      left_at: null,
    })),
  };
}

function canAddStudentToTeam(
  existingTeams: Team[],
  studentId: string,
  courseId: string
): boolean {
  return !existingTeams.some(
    (t) =>
      t.course_id === courseId &&
      t.members.some((m) => m.student_id === studentId && m.left_at === null)
  );
}

function getActiveMembers(team: Team): TeamMember[] {
  return team.members.filter((m) => m.left_at === null);
}

// ── Generators ───────────────────────────────────────────────────────────────

const memberIdsArb = fc
  .uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 })
  .filter((ids) => ids.length >= 2 && ids.length <= 6);

// ── Property Tests ───────────────────────────────────────────────────────────

describe("Property 1: Team creation assigns captain", () => {
  it("the first member is always assigned captain role", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        memberIdsArb,
        (teamId, courseId, memberIds) => {
          const team = createTeam(teamId, courseId, memberIds);
          expect(team.captain_id).toBe(memberIds[0]);
          const captainMember = team.members.find((m) => m.role === "captain");
          expect(captainMember).toBeDefined();
          expect(captainMember!.student_id).toBe(memberIds[0]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("exactly one captain exists per team", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        memberIdsArb,
        (teamId, courseId, memberIds) => {
          const team = createTeam(teamId, courseId, memberIds);
          const captains = team.members.filter((m) => m.role === "captain");
          expect(captains.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 2: One active team per student per course", () => {
  it("student already on a team in the same course is rejected", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        memberIdsArb,
        (teamId, courseId, studentId, otherMembers) => {
          const existingTeam = createTeam(teamId, courseId, [
            studentId,
            ...otherMembers.slice(0, 1),
          ]);
          const canAdd = canAddStudentToTeam(
            [existingTeam],
            studentId,
            courseId
          );
          expect(canAdd).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("student can join a team in a different course", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        memberIdsArb,
        (teamId, courseId1, courseId2, studentId, otherMembers) => {
          fc.pre(courseId1 !== courseId2);
          const existingTeam = createTeam(teamId, courseId1, [
            studentId,
            ...otherMembers.slice(0, 1),
          ]);
          const canAdd = canAddStudentToTeam(
            [existingTeam],
            studentId,
            courseId2
          );
          expect(canAdd).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 3: Team size bounds 2-6", () => {
  it("schema rejects teams with fewer than 2 members", () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (courseId, memberId) => {
        const result = createTeamSchema.safeParse({
          name: "Test Team",
          course_id: courseId,
          member_ids: [memberId],
        });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("schema rejects teams with more than 6 members", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uniqueArray(fc.uuid(), { minLength: 7, maxLength: 10 }),
        (courseId, memberIds) => {
          const result = createTeamSchema.safeParse({
            name: "Test Team",
            course_id: courseId,
            member_ids: memberIds,
          });
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("schema accepts teams with 2-6 members", () => {
    fc.assert(
      fc.property(fc.uuid(), memberIdsArb, (courseId, memberIds) => {
        const result = createTeamSchema.safeParse({
          name: "Test Team",
          course_id: courseId,
          member_ids: memberIds,
        });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("active member count is always between 2 and 6", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        memberIdsArb,
        (teamId, courseId, memberIds) => {
          const team = createTeam(teamId, courseId, memberIds);
          const activeCount = getActiveMembers(team).length;
          expect(activeCount).toBeGreaterThanOrEqual(2);
          expect(activeCount).toBeLessThanOrEqual(6);
        }
      ),
      { numRuns: 100 }
    );
  });
});

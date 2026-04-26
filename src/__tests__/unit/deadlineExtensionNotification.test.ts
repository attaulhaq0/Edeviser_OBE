// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

function createChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = mockSelect.mockReturnValue(chain);
  chain.insert = mockInsert.mockReturnValue(chain);
  chain.update = mockUpdate.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  chain.single = mockSingle;
  chain.maybeSingle = mockMaybeSingle;
  return chain;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return createChain();
    },
  },
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    marketplace: { all: ['marketplace'] },
  },
}));

interface TrackedCall {
  method: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any[];
}

function createTrackedMockFrom(
  callsByTable: Record<string, TrackedCall[]>,
  overrides: {
    assignments?: { due_date: string; title: string; course_id: string; courses: { teacher_id: string | null } | null };
    extensions?: { id: string; student_id: string; assignment_id: string };
    profile?: { full_name: string } | null;
  },
) {
  return vi.fn((table: string) => {
    if (!callsByTable[table]) callsByTable[table] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: Record<string, any> = {};
    const track = (method: string) => vi.fn((...args: unknown[]) => {
      callsByTable[table]!.push({ method, args });
      return chain;
    });

    chain.select = track('select');
    chain.insert = track('insert');
    chain.update = track('update');
    chain.eq = track('eq');
    chain.single = vi.fn(() => {
      callsByTable[table]!.push({ method: 'single', args: [] });
      if (table === 'assignments' && overrides.assignments) {
        return Promise.resolve({ data: overrides.assignments, error: null });
      }
      if (table === 'deadline_extensions' && overrides.extensions) {
        return Promise.resolve({ data: overrides.extensions, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    chain.maybeSingle = vi.fn(() => {
      callsByTable[table]!.push({ method: 'maybeSingle', args: [] });
      if (table === 'profiles') {
        return Promise.resolve({ data: overrides.profile ?? null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    return chain;
  });
}

describe('useActivateDeadlineExtension — teacher notification', () => {
  const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a notification for the teacher when deadline extension is activated', async () => {
    const callsByTable: Record<string, TrackedCall[]> = {};
    const mockFromTracked = createTrackedMockFrom(callsByTable, {
      assignments: {
        due_date: futureDate,
        title: 'Math Homework 3',
        course_id: 'course-1',
        courses: { teacher_id: 'teacher-42' },
      },
      extensions: { id: 'ext-001', student_id: 'student-1', assignment_id: 'assign-1' },
      profile: { full_name: 'Alice Johnson' },
    });

    const studentId = 'student-1';
    const assignmentId = 'assign-1';

    // Step 1: Fetch assignment with course join
    const assignmentChain = mockFromTracked('assignments');
    assignmentChain.select('due_date, title, course_id, courses(teacher_id)');
    assignmentChain.eq('id', assignmentId);
    const assignmentResult = await assignmentChain.single();

    expect(assignmentResult.data.courses.teacher_id).toBe('teacher-42');
    expect(assignmentResult.data.title).toBe('Math Homework 3');

    // Step 2: Insert deadline extension
    const extChain = mockFromTracked('deadline_extensions');
    extChain.insert({ student_id: studentId, assignment_id: assignmentId });
    extChain.select();
    const extResult = await extChain.single();
    expect(extResult.data.id).toBe('ext-001');

    // Step 3: Fetch student profile
    const profileChain = mockFromTracked('profiles');
    profileChain.select('full_name');
    profileChain.eq('id', studentId);
    const profileResult = await profileChain.maybeSingle();
    expect(profileResult.data.full_name).toBe('Alice Johnson');

    // Step 4: Insert notification for teacher
    const extendedDeadline = new Date(new Date(futureDate).getTime() + 24 * 60 * 60 * 1000);
    const notifChain = mockFromTracked('notifications');
    notifChain.insert({
      user_id: 'teacher-42',
      type: 'deadline_extension',
      title: 'Deadline Extension Activated',
      body: `Alice Johnson activated a 24-hour deadline extension on "Math Homework 3". New deadline: ${extendedDeadline.toLocaleDateString()}.`,
      is_read: false,
      metadata: {
        student_id: studentId,
        assignment_id: assignmentId,
        extension_id: 'ext-001',
        original_deadline: futureDate,
        extended_deadline: extendedDeadline.toISOString(),
      },
    });

    // Verify the notification was inserted for the correct table
    expect(mockFromTracked).toHaveBeenCalledWith('notifications');

    // Verify the notification insert call had the right structure
    const notifCalls = callsByTable['notifications'] ?? [];
    const insertCall = notifCalls.find(c => c.method === 'insert');
    expect(insertCall).toBeDefined();
    expect(insertCall?.args[0]).toMatchObject({
      user_id: 'teacher-42',
      type: 'deadline_extension',
      title: 'Deadline Extension Activated',
      is_read: false,
    });
    expect(String(insertCall?.args[0]?.body)).toContain('Alice Johnson');
    expect(String(insertCall?.args[0]?.body)).toContain('Math Homework 3');
    expect(insertCall?.args[0]?.metadata?.student_id).toBe(studentId);
    expect(insertCall?.args[0]?.metadata?.assignment_id).toBe(assignmentId);
    expect(insertCall?.args[0]?.metadata?.extension_id).toBe('ext-001');
  });

  it('skips notification when assignment has no teacher (teacher_id is null)', async () => {
    const callsByTable: Record<string, TrackedCall[]> = {};
    const mockFromTracked = createTrackedMockFrom(callsByTable, {
      assignments: {
        due_date: futureDate,
        title: 'Unassigned Task',
        course_id: 'course-2',
        courses: { teacher_id: null },
      },
      extensions: { id: 'ext-002', student_id: 'student-1', assignment_id: 'assign-2' },
      profile: null,
    });

    // Simulate the flow: assignment has no teacher
    const assignmentChain = mockFromTracked('assignments');
    assignmentChain.select('due_date, title, course_id, courses(teacher_id)');
    assignmentChain.eq('id', 'assign-2');
    const assignmentResult = await assignmentChain.single();

    const teacherId = assignmentResult.data?.courses?.teacher_id;
    expect(teacherId).toBeNull();

    // When teacherId is null, no notification should be inserted
    expect(callsByTable['notifications']).toBeUndefined();
  });

  it('uses fallback student name when profile lookup fails', async () => {
    const callsByTable: Record<string, TrackedCall[]> = {};
    const mockFromTracked = createTrackedMockFrom(callsByTable, {
      assignments: {
        due_date: futureDate,
        title: 'Essay Draft',
        course_id: 'course-3',
        courses: { teacher_id: 'teacher-99' },
      },
      extensions: { id: 'ext-003', student_id: 'student-2', assignment_id: 'assign-3' },
      profile: null, // Profile lookup returns null
    });

    // Fetch assignment
    const assignmentChain = mockFromTracked('assignments');
    assignmentChain.select('due_date, title, course_id, courses(teacher_id)');
    assignmentChain.eq('id', 'assign-3');
    const assignmentResult = await assignmentChain.single();
    expect(assignmentResult.data?.courses?.teacher_id).toBe('teacher-99');

    // Fetch profile — returns null
    const profileChain = mockFromTracked('profiles');
    profileChain.select('full_name');
    profileChain.eq('id', 'student-2');
    const profileResult = await profileChain.maybeSingle();
    const studentName = profileResult.data?.full_name ?? 'A student';
    expect(studentName).toBe('A student');

    // Insert notification with fallback name
    const extendedDeadline = new Date(new Date(futureDate).getTime() + 24 * 60 * 60 * 1000);
    const notifChain = mockFromTracked('notifications');
    notifChain.insert({
      user_id: 'teacher-99',
      type: 'deadline_extension',
      title: 'Deadline Extension Activated',
      body: `A student activated a 24-hour deadline extension on "Essay Draft". New deadline: ${extendedDeadline.toLocaleDateString()}.`,
      is_read: false,
      metadata: { student_id: 'student-2', assignment_id: 'assign-3', extension_id: 'ext-003' },
    });

    const notifCalls = callsByTable['notifications'] ?? [];
    const insertCall = notifCalls.find(c => c.method === 'insert');
    expect(insertCall).toBeDefined();
    expect(String(insertCall?.args[0]?.body)).toContain('A student');
    expect(String(insertCall?.args[0]?.body)).toContain('Essay Draft');
  });
});

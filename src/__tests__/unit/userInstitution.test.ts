import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  },
}));

import { fetchUserInstitutionId } from "@/lib/userInstitution";

describe("fetchUserInstitutionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the profile institution_id for the authenticated user", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: { institution_id: "inst-1" },
      error: null,
    });

    await expect(fetchUserInstitutionId()).resolves.toBe("inst-1");
  });

  it("returns null when unauthenticated (fail-closed)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(fetchUserInstitutionId()).resolves.toBeNull();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("returns null when the auth call errors", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "session expired" },
    });

    await expect(fetchUserInstitutionId()).resolves.toBeNull();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("returns null when the profile row is missing", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchUserInstitutionId()).resolves.toBeNull();
  });

  it("returns null when the profile has no institution (fail-closed)", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: { institution_id: null },
      error: null,
    });

    await expect(fetchUserInstitutionId()).resolves.toBeNull();
  });

  it("returns null when the profile query errors", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(fetchUserInstitutionId()).resolves.toBeNull();
  });
});

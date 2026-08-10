import { describe, expect, it } from "vitest";
import { mapSignupError } from "@/lib/authErrors";

describe("auth onboarding policy errors", () => {
  it("maps missing institution and database trigger failures safely", () => {
    expect(mapSignupError("institution selection required")).toContain("valid institution");
    expect(mapSignupError("Database error saving new user")).toContain("temporarily unavailable");
  });

  it("maps join policy failures without exposing SQL details", () => {
    expect(mapSignupError("student invitation required for this institution")).toContain("requires an invitation");
    expect(mapSignupError("email domain is not allowed for this institution")).toContain("not allowed");
    expect(mapSignupError("invalid input syntax for type uuid")).not.toContain("uuid");
  });

  it("never turns an arbitrary role into an authorization message", () => {
    const message = mapSignupError("role=admin");
    expect(message).not.toContain("admin");
    expect(message).toContain("could not create");
  });
});

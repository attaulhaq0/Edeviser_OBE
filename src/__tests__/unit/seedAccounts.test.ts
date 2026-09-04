import { describe, it, expect } from "vitest";
import {
  SEED_EMAIL_DOMAINS,
  SEED_INSTITUTION_IDS,
  getEmailDomain,
  isSeedAccount,
} from "@/lib/seedAccounts";

describe("seedAccounts", () => {
  describe("getEmailDomain", () => {
    it("extracts the domain from a standard email", () => {
      expect(getEmailDomain("student01@noor-international.edu")).toBe(
        "noor-international.edu"
      );
    });

    it("returns null for invalid or missing input", () => {
      expect(getEmailDomain(null)).toBeNull();
      expect(getEmailDomain(undefined)).toBeNull();
      expect(getEmailDomain("")).toBeNull();
      expect(getEmailDomain("no-at-sign")).toBeNull();
      expect(getEmailDomain("trailing@")).toBeNull();
      expect(getEmailDomain("@leading")).toBe("leading");
    });

    it("is case-insensitive", () => {
      expect(getEmailDomain("Student01@Noor-International.EDU")).toBe(
        "noor-international.edu"
      );
    });
  });

  describe("isSeedAccount", () => {
    it("classifies seed accounts by email domain", () => {
      expect(isSeedAccount("admin@demo.com")).toBe(true);
      expect(isSeedAccount("student01@noor-international.edu")).toBe(true);
    });

    it("classifies by institution ID when email is absent/unknown", () => {
      expect(isSeedAccount(null, "00000000-0000-0000-0000-000000000001")).toBe(
        true
      );
      expect(isSeedAccount(null, "4de6a0a2-758b-47f3-ab7e-984bb974d88b")).toBe(
        true
      );
    });

    it("does not classify real users as seed", () => {
      expect(isSeedAccount("atta@edeviser.com")).toBe(false);
      expect(isSeedAccount("realstudent@university.edu")).toBe(false);
      expect(isSeedAccount("user@demo.com.attack.local")).toBe(false);
    });

    it("treats missing data as non-seed", () => {
      expect(isSeedAccount()).toBe(false);
      expect(isSeedAccount(null, null)).toBe(false);
      expect(isSeedAccount(undefined, undefined)).toBe(false);
    });
  });

  it("registry sets are non-empty and stable", () => {
    expect(SEED_EMAIL_DOMAINS).toContain("demo.com");
    expect(SEED_EMAIL_DOMAINS).toContain("noor-international.edu");
    expect(SEED_INSTITUTION_IDS).toContain(
      "00000000-0000-0000-0000-000000000001"
    );
  });
});

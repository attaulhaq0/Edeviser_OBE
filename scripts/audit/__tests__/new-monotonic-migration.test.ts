import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  assertMigrationName,
  createMonotonicMigration,
  nextMigrationVersion,
} from "../../new-monotonic-migration.mjs";

const createdDirectories: string[] = [];
const fixtureDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), "edeviser-migration-"));
  createdDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("monotonic migration version generator", () => {
  it("uses the current timestamp when it exceeds the tail", () => {
    expect(
      nextMigrationVersion(
        ["20260830000002_existing.sql"],
        new Date("2026-09-01T12:34:56Z")
      )
    ).toBe("20260901123456");
  });

  it("uses one greater than a future-dated tail and ignores malformed filenames", () => {
    expect(
      nextMigrationVersion(
        ["20260830000002_existing.sql", "invalid.sql", "20260830_short.sql"],
        new Date("2026-08-18T00:00:00Z")
      )
    ).toBe("20260830000003");
  });

  it("creates consecutive versions without overwriting", async () => {
    const directory = await fixtureDirectory();
    const now = new Date("2026-08-18T00:00:00Z");
    await writeFile(
      join(directory, "20260830000002_existing.sql"),
      "-- existing\n"
    );
    const first = await createMonotonicMigration({
      migrationsDirectory: directory,
      name: "first_change",
      now,
    });
    const second = await createMonotonicMigration({
      migrationsDirectory: directory,
      name: "second_change",
      now,
    });
    expect(first.version).toBe("20260830000003");
    expect(second.version).toBe("20260830000004");
    expect(await readdir(directory)).toContain(first.filename);
  });

  it("creates distinct monotonic versions under concurrent requests", async () => {
    const directory = await fixtureDirectory();
    const now = new Date("2026-08-18T00:00:00Z");
    const attempts = await Promise.allSettled([
      createMonotonicMigration({
        migrationsDirectory: directory,
        name: "valid_name",
        now,
      }),
      createMonotonicMigration({
        migrationsDirectory: directory,
        name: "valid_name",
        now,
      }),
    ]);
    const successful = attempts.filter(
      (attempt): attempt is PromiseFulfilledResult<{
        version: string;
        filename: string;
        target: string;
      }> => attempt.status === "fulfilled"
    );
    expect(successful.length).toBeGreaterThanOrEqual(1);
    expect(successful.length).toBeLessThanOrEqual(2);
    if (successful.length === 2) {
      expect(new Set(successful.map((attempt) => attempt.value.filename)).size).toBe(2);
      expect(new Set(successful.map((attempt) => attempt.value.version)).size).toBe(2);
    }
    expect(() => assertMigrationName("Not valid")).toThrow(
      "lowercase snake_case"
    );
  });

  it("handles an empty or missing migration directory", async () => {
    const directory = join(await fixtureDirectory(), "migrations");
    await expect(
      createMonotonicMigration({
        migrationsDirectory: directory,
        name: "initial_schema",
        now: new Date("2026-08-18T00:00:00Z"),
      })
    ).resolves.toMatchObject({ version: "20260818000000" });
  });
});

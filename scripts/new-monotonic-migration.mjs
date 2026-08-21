import { mkdir, open, readdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^(\d{14})_.+\.sql$/;
const NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

export const utcVersion = (date = new Date()) =>
  date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

export const migrationVersions = (filenames) =>
  filenames.flatMap((filename) => {
    const match = VERSION_PATTERN.exec(filename);
    return match ? [BigInt(match[1])] : [];
  });

export const nextMigrationVersion = (filenames, now = new Date()) => {
  const highest = migrationVersions(filenames).reduce(
    (current, version) => (version > current ? version : current),
    0n
  );
  const current = BigInt(utcVersion(now));
  return (current > highest ? current : highest + 1n).toString();
};

export const assertMigrationName = (name) => {
  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    throw new Error(
      "Migration name must be lowercase snake_case and start with a letter"
    );
  }
};

export const createMonotonicMigration = async ({
  migrationsDirectory,
  name,
  now = new Date(),
}) => {
  assertMigrationName(name);
  await mkdir(migrationsDirectory, { recursive: true });
  const filenames = await readdir(migrationsDirectory);
  const version = nextMigrationVersion(filenames, now);
  const filename = `${version}_${name}.sql`;
  const target = join(migrationsDirectory, filename);
  let handle;
  try {
    handle = await open(target, "wx");
    await handle.writeFile(`-- ${name.replaceAll("_", " ")}\n`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new Error(`Refusing to overwrite existing migration: ${filename}`);
    }
    throw error;
  } finally {
    await handle?.close();
  }
  return { version, filename, target };
};

const isEntrypoint =
  resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const [name] = process.argv.slice(2);
  if (!name || process.argv.length !== 3) {
    throw new Error(
      "Usage: npm run migration:new -- <lowercase_snake_case_name>"
    );
  }
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const result = await createMonotonicMigration({
    migrationsDirectory: join(repositoryRoot, "supabase", "migrations"),
    name,
  });
  process.stdout.write(`${basename(result.target)}\n`);
}

/**
 * Provision the database trigger credential into Supabase Vault.
 *
 * This script is intentionally server-only and reads secrets from the process
 * environment. It never loads .env files, prints secret values, or writes a
 * credential to disk.
 *
 * Required environment:
 *   SUPABASE_DB_URL                 PostgreSQL connection string
 *   EDEVISER_VAULT_SERVICE_ROLE_KEY Replacement runtime key
 *   SUPABASE_DB_ENV                 staging | preview | production
 *
 * Production requires the explicit confirmation:
 *   CONFIRM_PRODUCTION_VAULT_PROVISIONING=YES
 *
 * Usage:
 *   SUPABASE_DB_ENV=staging npx tsx scripts/provision-vault-secret.ts
 */

import { Client } from "pg";

const secretName = "service_role_key";
const databaseUrl = process.env.SUPABASE_DB_URL;
const replacementSecret = process.env.EDEVISER_VAULT_SERVICE_ROLE_KEY;
const targetEnvironment = process.env.SUPABASE_DB_ENV;

if (!databaseUrl || !replacementSecret || !targetEnvironment) {
  throw new Error(
    "SUPABASE_DB_URL, EDEVISER_VAULT_SERVICE_ROLE_KEY, and SUPABASE_DB_ENV are required"
  );
}

if (!["staging", "preview", "production"].includes(targetEnvironment)) {
  throw new Error("SUPABASE_DB_ENV must be staging, preview, or production");
}

if (
  targetEnvironment === "production" &&
  process.env.CONFIRM_PRODUCTION_VAULT_PROVISIONING !== "YES"
) {
  throw new Error(
    "Production provisioning requires CONFIRM_PRODUCTION_VAULT_PROVISIONING=YES"
  );
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const existing = await client.query<{ id: string }>(
    "select id::text from vault.secrets where name = $1 limit 1",
    [secretName]
  );

  if (existing.rows[0]?.id) {
    await client.query("select vault.update_secret($1::uuid, $2, null, null)", [
      existing.rows[0].id,
      replacementSecret,
    ]);
  } else {
    await client.query("select vault.create_secret($1, $2, $3)", [
      replacementSecret,
      secretName,
      "Runtime key for server-side trigger calls; provisioned operationally",
    ]);
  }

  const verification = await client.query<{ id: string; name: string }>(
    "select id::text, name from vault.secrets where name = $1 limit 1",
    [secretName]
  );

  if (!verification.rows[0]?.id || verification.rows[0].name !== secretName) {
    throw new Error("Vault verification did not find the expected secret name");
  }

  console.log(
    JSON.stringify({
      status: "provisioned",
      environment: targetEnvironment,
      secretName: verification.rows[0].name,
      secretId: verification.rows[0].id,
    })
  );
} finally {
  await client.end().catch(() => undefined);
}

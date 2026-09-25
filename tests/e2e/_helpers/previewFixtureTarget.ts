// Read-only Supabase Management API proof BEFORE any E2E fixture mutation.
// https://supabase.com/docs/reference/api/v1-list-all-branches
// Git-linked branch identity is git_branch + pr_number, never an environment label.
export interface PreviewFixtureEnvironment {
  E2E_FIXTURES_ENABLED?: string;
  SUPABASE_DB_ENV?: string;
  SUPABASE_ACCESS_TOKEN?: string;
  SUPABASE_PARENT_PROJECT_REF?: string;
  SUPABASE_PREVIEW_REF?: string;
  SUPABASE_PREVIEW_BRANCH?: string;
  SUPABASE_PREVIEW_PR_NUMBER?: string;
  GITHUB_HEAD_REF?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

interface PreviewInputs {
  parentRef: string;
  ref: string;
  branch: string;
  prNumber: string;
  url: string;
  managementToken: string;
  anonKey: string;
}

const refIsSafe = (value: string) => /^[a-z0-9]{8,32}$/.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Default legacy collection never requires or creates authenticated fixtures. */
export const fixtureProjectMode = (
  projects: readonly string[]
): "legacy" | "audit" => {
  if (projects.length === 1 && projects[0] === "legacy-smoke") return "legacy";
  const auditProjects = new Set([
    "admin",
    "coordinator",
    "teacher",
    "student",
    "parent",
    "cross-role",
    "rtl-ar",
  ]);
  if (
    projects.length > 0 &&
    projects.every(
      (name) => name === "legacy-smoke" || auditProjects.has(name)
    ) &&
    projects.some((name) => auditProjects.has(name))
  )
    return "audit";
  throw new Error(
    "Unknown or empty Playwright project selection; refusing fixture provisioning"
  );
};

export function validatePreviewInputs(
  env: PreviewFixtureEnvironment
): PreviewInputs {
  if (env.E2E_FIXTURES_ENABLED !== "true" || env.SUPABASE_DB_ENV !== "preview")
    throw new Error(
      "Authenticated audit projects require explicit Preview fixture authorization"
    );
  const parentRef = env.SUPABASE_PARENT_PROJECT_REF ?? "";
  const ref = env.SUPABASE_PREVIEW_REF ?? "";
  const branch = env.SUPABASE_PREVIEW_BRANCH ?? "";
  const prNumber = env.SUPABASE_PREVIEW_PR_NUMBER ?? "";
  const managementToken = env.SUPABASE_ACCESS_TOKEN ?? "";
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? "";
  if (
    !refIsSafe(parentRef) ||
    !refIsSafe(ref) ||
    ref === parentRef ||
    !branch.trim() ||
    !/^[1-9]\d*$/.test(prNumber) ||
    !managementToken ||
    !anonKey ||
    (env.GITHUB_HEAD_REF && env.GITHUB_HEAD_REF !== branch)
  )
    throw new Error(
      "Missing or inconsistent Git-linked Preview identity, PR or credentials"
    );
  let parsed: URL;
  try {
    parsed = new URL(env.VITE_SUPABASE_URL ?? "");
  } catch {
    throw new Error("Preview API URL is missing or invalid");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.host !== `${ref}.supabase.co` ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/" ||
    parsed.port
  )
    throw new Error(
      "Preview API URL must match the exact selected HTTPS Preview ref"
    );
  return {
    parentRef,
    ref,
    branch,
    prNumber,
    url: parsed.origin,
    managementToken,
    anonKey,
  };
}

export async function verifyGitLinkedPreview(
  env: PreviewFixtureEnvironment,
  fetchBranches: typeof fetch = fetch
): Promise<{ ref: string; url: string; branch: string; prNumber: string }> {
  const input = validatePreviewInputs(env); // Nothing touches the network before this.
  const response = await fetchBranches(
    `https://api.supabase.com/v1/projects/${input.parentRef}/branches`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${input.managementToken}` },
      signal: AbortSignal.timeout(10_000),
    }
  );
  if (!response.ok)
    throw new Error(
      `Supabase Preview branch lookup failed with HTTP ${response.status}`
    );
  const value: unknown = await response.json();
  if (!Array.isArray(value))
    throw new Error("Preview branch lookup returned an invalid list");
  const matches = value.filter(
    (row: unknown) =>
      isRecord(row) &&
      row.project_ref === input.ref &&
      row.git_branch === input.branch &&
      String(row.pr_number) === input.prNumber &&
      row.status === "FUNCTIONS_DEPLOYED"
  );
  if (matches.length !== 1)
    throw new Error(
      "No unique FUNCTIONS_DEPLOYED Git-linked Preview matching both branch and PR number"
    );
  return {
    ref: input.ref,
    url: input.url,
    branch: input.branch,
    prNumber: input.prNumber,
  };
}

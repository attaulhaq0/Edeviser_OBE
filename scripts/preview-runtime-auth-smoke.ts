import { randomUUID } from "node:crypto";
import {
  assertNotProduction,
  extractProjectRef,
  readRlsEnv,
  rlsSkipReason,
} from "../src/__tests__/integration-rls/guard";
import {
  seedRlsFixtures,
  teardownRlsFixtures,
  type SeededCtx,
} from "../src/__tests__/integration-rls/seed";
import { signInAs } from "../src/__tests__/integration-rls/signIn";

type FunctionName = "award-xp" | "check-badges" | "ai-at-risk-prediction";

interface SmokeCase {
  readonly name: string;
  readonly functionName: FunctionName;
  readonly body: (ctx: SeededCtx) => Record<string, unknown>;
  readonly headers?: (studentAccessToken: string) => Record<string, string>;
  readonly expectedStatus: number | readonly number[];
}

const INVALID_CREDENTIAL = `invalid-runtime-auth-${randomUUID()}`;
const NONEXISTENT_STUDENT_ID = randomUUID();

const cases: readonly SmokeCase[] = [
  {
    name: "award-xp / no auth",
    functionName: "award-xp",
    body: () => ({
      student_id: NONEXISTENT_STUDENT_ID,
      xp_amount: 1,
      source: "admin_adjustment",
    }),
    expectedStatus: [401, 403],
  },
  {
    name: "award-xp / invalid auth",
    functionName: "award-xp",
    body: () => ({
      student_id: NONEXISTENT_STUDENT_ID,
      xp_amount: 1,
      source: "admin_adjustment",
    }),
    headers: () => ({ Authorization: `Bearer ${INVALID_CREDENTIAL}` }),
    expectedStatus: [401, 403],
  },
  {
    name: "award-xp / student cannot award another student",
    functionName: "award-xp",
    body: (ctx) => ({
      student_id: ctx.otherStudentId,
      xp_amount: 10,
      source: "login",
    }),
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    expectedStatus: 403,
  },
  {
    name: "award-xp / student cannot self-award admin_adjustment",
    functionName: "award-xp",
    body: (ctx) => ({
      student_id: ctx.studentId,
      xp_amount: 1,
      source: "admin_adjustment",
    }),
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    expectedStatus: 403,
  },
  {
    name: "check-badges / no auth",
    functionName: "check-badges",
    body: () => ({
      student_id: NONEXISTENT_STUDENT_ID,
      trigger: "xp_award",
    }),
    expectedStatus: 401,
  },
  {
    name: "check-badges / invalid auth",
    functionName: "check-badges",
    body: () => ({
      student_id: NONEXISTENT_STUDENT_ID,
      trigger: "xp_award",
    }),
    headers: () => ({ Authorization: `Bearer ${INVALID_CREDENTIAL}` }),
    expectedStatus: 401,
  },
  {
    name: "check-badges / student A cannot process student B",
    functionName: "check-badges",
    body: (ctx) => ({
      student_id: ctx.otherStudentId,
      trigger: "xp_award",
    }),
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    expectedStatus: 403,
  },
  {
    name: "ai-at-risk-prediction / no auth",
    functionName: "ai-at-risk-prediction",
    body: () => ({}),
    expectedStatus: 401,
  },
  {
    name: "ai-at-risk-prediction / invalid cron secret",
    functionName: "ai-at-risk-prediction",
    body: () => ({}),
    headers: () => ({ "x-cron-secret": INVALID_CREDENTIAL }),
    expectedStatus: 401,
  },
  {
    name: "ai-at-risk-prediction / normal user JWT",
    functionName: "ai-at-risk-prediction",
    body: () => ({}),
    headers: (token) => ({ Authorization: `Bearer ${token}` }),
    expectedStatus: 401,
  },
];

const assertPreviewTarget = (): ReturnType<typeof readRlsEnv> => {
  const env = readRlsEnv();
  assertNotProduction(env);

  const skipReason = rlsSkipReason(env);
  if (skipReason !== null) {
    throw new Error(
      `[runtime-auth] Preview configuration is invalid: ${skipReason}`
    );
  }
  if (process.env.GITHUB_EVENT_NAME !== "pull_request") {
    throw new Error(
      "[runtime-auth] Refusing to run outside a pull_request workflow"
    );
  }

  const expectedPreviewRef = process.env.SUPABASE_PREVIEW_REF;
  const actualPreviewRef = extractProjectRef(env.supabaseUrl);
  if (!expectedPreviewRef || actualPreviewRef !== expectedPreviewRef) {
    throw new Error(
      "[runtime-auth] SUPABASE_URL does not match the PR Preview resolved by CI"
    );
  }

  return env;
};

const statusMatches = (
  actual: number,
  expected: SmokeCase["expectedStatus"]
): boolean =>
  typeof expected === "number"
    ? actual === expected
    : expected.includes(actual);

const main = async (): Promise<void> => {
  const env = assertPreviewTarget();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("[runtime-auth] Preview URL or publishable key is missing");
  }

  const ctx = await seedRlsFixtures(env);
  let studentClient: Awaited<ReturnType<typeof signInAs>> | null = null;

  try {
    studentClient = await signInAs(ctx.emails.student, ctx.password, env);
    const session = (await studentClient.auth.getSession()).data.session;
    if (!session?.access_token) {
      throw new Error("[runtime-auth] Student Preview session is missing");
    }

    for (const smokeCase of cases) {
      const response = await fetch(
        `${env.supabaseUrl}/functions/v1/${smokeCase.functionName}`,
        {
          method: "POST",
          headers: {
            apikey: env.supabaseAnonKey,
            "Content-Type": "application/json",
            ...smokeCase.headers?.(session.access_token),
          },
          body: JSON.stringify(smokeCase.body(ctx)),
        }
      );

      if (!statusMatches(response.status, smokeCase.expectedStatus)) {
        const expected =
          typeof smokeCase.expectedStatus === "number"
            ? String(smokeCase.expectedStatus)
            : smokeCase.expectedStatus.join(" or ");
        throw new Error(
          `[runtime-auth] FAIL ${smokeCase.name}: expected HTTP ${expected}, received ${response.status}`
        );
      }

      console.log(
        `[runtime-auth] PASS ${smokeCase.name}: HTTP ${response.status}`
      );
    }

    console.log(`[runtime-auth] ${cases.length}/${cases.length} PASS`);
  } finally {
    try {
      await studentClient?.auth.signOut();
    } finally {
      await teardownRlsFixtures(ctx, env);
    }
  }
};

await main();

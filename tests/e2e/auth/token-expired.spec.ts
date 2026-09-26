// Hermetic browser proof of the actual Supabase JS localStorage refresh path,
// AuthProvider session publication and RouteGuard. No Preview seeder or cookies.
// Run ONLY with playwright.auth-local.config.ts; normal root config has seed hooks.
import { test, expect, type BrowserContext } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const sourceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const FAKE_AUTH_ORIGIN = "http://127.0.0.1:54321";
const STORAGE_KEY = "sb-127-auth-token"; // actual supabase-js key for this fake host
const USER_ID = "a1111111-1111-4111-8111-111111111111";
const INSTITUTION_ID = "b2222222-2222-4222-8222-222222222222";
const user = {
  id: USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const profile = {
  id: USER_ID,
  institution_id: INSTITUTION_ID,
  email: user.email,
  full_name: "Controlled teacher fixture",
  role: "teacher",
  is_active: true,
  onboarding_completed: true,
  theme_preference: "light",
  preferred_language: "en",
};
const expiredSession = () => ({
  access_token: "expired-fixture-access",
  refresh_token: "refresh-fixture-only",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) - 3600,
  user,
});
const renewedSession = () => ({
  access_token: "renewed-fixture-access",
  refresh_token: "renewed-fixture-refresh",
  token_type: "bearer",
  expires_in: 3600,
  user,
});
const entry = `
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import RouteGuard from "@/router/RouteGuard";
const Protected=()=>{const {user,role}=useAuth();return <main><h1>Teacher protected route</h1><output data-testid="actor" data-user={user?.id??"none"} data-role={role??"none"}/></main>};
createRoot(document.getElementById("root")).render(<BrowserRouter><AuthProvider><Routes>
  <Route path="/teacher/dashboard" element={<RouteGuard allowedRoles={["teacher"]}><Protected/></RouteGuard>}/>
  <Route path="/login" element={<main><h1>Login required</h1></main>}/>
  <Route path="*" element={<main><h1>Unexpected route</h1></main>}/>
</Routes></AuthProvider></BrowserRouter>);
`;

let directory: string;
let server: Server;
let baseURL: string;

test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "edeviser-auth-expiry-"));
  const fixtureRoot = join(directory, "fixture");
  const outDir = join(directory, "dist");
  await mkdir(fixtureRoot, { recursive: true });
  await writeFile(
    join(fixtureRoot, "index.html"),
    '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>'
  );
  await writeFile(join(fixtureRoot, "entry.jsx"), entry);
  const aliases = [
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom",
    "react-dom/client",
    "react-router-dom",
    "i18next",
    "react-i18next",
    "@supabase/supabase-js",
  ].map((name) => ({
    find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
    replacement: require.resolve(name),
  }));
  aliases.push({ find: "@", replacement: join(sourceRoot, "src") });
  await build({
    root: fixtureRoot,
    configFile: false,
    envDir: fixtureRoot,
    publicDir: false,
    plugins: [react()],
    resolve: { alias: aliases, dedupe: ["react", "react-dom"] },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(FAKE_AUTH_ORIGIN),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
        "fake-auth-expiry-key"
      ),
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  });
  server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url ?? "/", "http://fixture").pathname;
      const file = resolve(
        outDir,
        `.${path === "/" ? "/index.html" : decodeURIComponent(path)}`
      );
      if (!file.startsWith(outDir + sep))
        throw new Error("Path outside fixture");
      let bytes: Buffer;
      try {
        bytes = await readFile(file);
      } catch {
        if (path.startsWith("/assets/")) {
          response.statusCode = 404;
          response.end("Missing asset");
          return;
        }
        bytes = await readFile(join(outDir, "index.html"));
      }
      response.setHeader("Cache-Control", "no-store");
      response.setHeader(
        "Content-Type",
        (
          {
            ".js": "application/javascript",
            ".html": "text/html",
            ".css": "text/css",
          } as Record<string, string>
        )[extname(file)] ?? "text/html"
      );
      response.end(bytes);
    } catch (error) {
      response.statusCode = 500;
      response.end(String(error));
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No local fixture port");
  baseURL = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  if (server) await new Promise<void>((done) => server.close(() => done()));
  if (directory) await rm(directory, { recursive: true, force: true });
});

interface Boundaries {
  refresh: number;
  profile: number;
  unexpected: string[];
}
async function isolate(
  context: BrowserContext,
  refreshSucceeds: boolean
): Promise<Boundaries> {
  const state: Boundaries = { refresh: 0, profile: 0, unexpected: [] };
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === baseURL) {
      await route.continue();
      return;
    }
    if (url.origin !== FAKE_AUTH_ORIGIN) {
      state.unexpected.push(
        `${request.method()} unexpected origin ${url.origin}`
      );
      await route.abort();
      return;
    }
    if (
      url.pathname === "/auth/v1/token" &&
      url.searchParams.get("grant_type") === "refresh_token" &&
      request.method() === "POST"
    ) {
      state.refresh++;
      const body = request.postDataJSON() as { refresh_token?: string };
      if (body.refresh_token !== "refresh-fixture-only")
        state.unexpected.push("Unexpected refresh credential");
      await route.fulfill(
        refreshSucceeds
          ? {
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(renewedSession()),
            }
          : {
              status: 401,
              contentType: "application/json",
              body: JSON.stringify({
                error: "invalid_grant",
                error_description: "Controlled revoked refresh token",
              }),
            }
      );
      return;
    }
    if (url.pathname === "/auth/v1/user" && request.method() === "GET") {
      if (request.headers().authorization !== "Bearer renewed-fixture-access")
        state.unexpected.push("User request did not adopt refreshed token");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(user),
      });
      return;
    }
    if (url.pathname === "/rest/v1/profiles" && request.method() === "GET") {
      state.profile++;
      if (request.headers().authorization !== "Bearer renewed-fixture-access")
        state.unexpected.push("Profile request used expired token");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(profile),
      });
      return;
    }
    state.unexpected.push(
      `${request.method()} unexpected API path ${url.pathname}`
    );
    await route.abort();
  });
  return state;
}

async function seedExpiredSession(context: BrowserContext): Promise<void> {
  await context.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
    },
    { key: STORAGE_KEY, session: expiredSession() }
  );
}

test("13.6.1 expired localStorage session refreshes once before protected access", async ({
  page,
  context,
}) => {
  const state = await isolate(context, true);
  await seedExpiredSession(context);
  await page.goto(`${baseURL}/teacher/dashboard`);
  await expect(
    page.getByRole("heading", { name: "Teacher protected route" })
  ).toBeVisible();
  await expect(page.getByTestId("actor")).toHaveAttribute("data-user", USER_ID);
  expect(new URL(page.url()).pathname).toBe("/teacher/dashboard");
  expect(state.refresh).toBe(1);
  // The current cold-load can request the profile twice while INITIAL_SESSION and
  // TOKEN_REFRESHED settle; record that separately from the exact refresh count.
  expect(state.profile).toBeGreaterThanOrEqual(1);
  expect(state.unexpected).toEqual([]);
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY
  );
  expect(JSON.parse(stored ?? "null")).toMatchObject({
    access_token: "renewed-fixture-access",
    refresh_token: "renewed-fixture-refresh",
  });
});

test("13.6.2 revoked refresh signs out before protected route is visible", async ({
  page,
  context,
}) => {
  const state = await isolate(context, false);
  await seedExpiredSession(context);
  await page.goto(`${baseURL}/teacher/dashboard`);
  await expect(page).toHaveURL(`${baseURL}/login`);
  await expect(
    page.getByRole("heading", { name: "Login required" })
  ).toBeVisible();
  expect(state.refresh).toBe(1);
  expect(state.profile).toBe(0);
  expect(state.unexpected).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Teacher protected route" })
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  ).toBeNull();
});

test("13.6.3 empty browser storage rejects protected route without refresh", async ({
  page,
  context,
}) => {
  const state = await isolate(context, false);
  await page.goto(`${baseURL}/teacher/dashboard`);
  await expect(page).toHaveURL(`${baseURL}/login`);
  await expect(
    page.getByRole("heading", { name: "Login required" })
  ).toBeVisible();
  expect(state.refresh).toBe(0);
  expect(state.profile).toBe(0);
  expect(state.unexpected).toEqual([]);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  ).toBeNull();
});

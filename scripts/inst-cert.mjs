// Ultimate Institution-by-Institution Live Certification
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdlgtbvxlxjpcddjazzx.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const PW = process.env.CERT_DEMO_PASSWORD || "";
if (!ANON_KEY || !PW) { console.error("Set SUPABASE_ANON_KEY and CERT_DEMO_PASSWORD"); process.exit(1); }
const RUN = `INST_CERT_${Date.now()}`;
const R = [];
function L(tag, status, msg = "") { const e = { tag, status, msg, ts: new Date().toISOString() }; R.push(e); console.log(`[${status}] ${tag}${msg ? ": " + msg : ""}`); }

async function auth(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!r.ok) throw new Error(`Auth ${r.status}`);
  return (await r.json()).access_token;
}

async function callOrch(token, specialist, msg) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: ANON_KEY },
    body: JSON.stringify({ message: `${RUN}: ${msg}`, specialist, requestId: crypto.randomUUID() }),
  });
  const t = await r.text();
  try { const d = JSON.parse(t); return { ok: r.ok, status: r.status, data: d }; }
  catch { return { ok: r.ok, status: r.status, data: t.slice(0, 200) }; }
}

async function main() {
  console.log(`=== INSTITUTION CERTIFICATION: ${RUN} ===\n`);

  // ─── PHASE 1: NOOR INTERNATIONAL (FULL DATA) ───
  console.log("─── NOOR INTERNATIONAL SCHOOL (IB, 68 users, 4 courses) ───");

  const noorAccounts = {
    admin: "principal@noor-international.edu",
    coordinator: "curriculum@noor-international.edu",
    teacher: "okonkwo@noor-international.edu",
    student: "student01@noor-international.edu",
    parent: "parent01@noor-international.edu",
  };

  const sessions = {};
  for (const [role, email] of Object.entries(noorAccounts)) {
    try {
      sessions[role] = await auth(email);
      L(`Noor|Auth:${role}`, "PASS", email);
    } catch (e) { L(`Noor|Auth:${role}`, "FAIL", e.message); }
  }

  // AI specialists
  if (sessions.teacher) {
    for (const spec of ["teacher", "coordinator", "tutor", "parent"]) {
      try {
        const res = await callOrch(sessions.teacher, spec, `Noor IB ${spec} verification.`);
        L(`Noor|AI:${spec}`, res.ok ? "PASS" : "FAIL", res.ok ? `model=${res.data.model}` : `HTTP ${res.status}`);
      } catch (e) { L(`Noor|AI:${spec}`, "FAIL", e.message); }
    }
  }

  // ─── PHASE 2: DEMO UNIVERSITY ───
  console.log("\n─── DEMO UNIVERSITY (ABET, 5 users) ───");
  try {
    const dt = await auth("teacher@demo.com");
    L("Demo|Auth:teacher", "PASS");
    const res = await callOrch(dt, "teacher", `Demo ABET teacher verification.`);
    L("Demo|AI:teacher", res.ok ? "PASS" : "FAIL", res.ok ? `model=${res.data.model}` : `HTTP ${res.status}`);
  } catch (e) { L("Demo|Auth", "FAIL", e.message); }

  // ─── PHASE 3: GULF ACADEMY ───
  console.log("\n─── GULF ACADEMY OF EXCELLENCE (QNSA, 3 programs) ───");
  try {
    const ga = await auth("principal@gulf-academy.test");
    L("Gulf|Auth:principal", "PASS");
  } catch (e) { L("Gulf|Auth", "FAIL", e.message); }

  // ─── PHASE 4: SHELL INSTITUTIONS ───
  console.log("\n─── SHELL INSTITUTIONS ───");
  for (const inst of ["IB MYP Academy", "IGCSE British School", "Multi-Track Academy", "Qatar National School"]) {
    L(`Shell:${inst}`, "WARN", "0 users, 0 courses — cannot test");
  }

  // ─── RESULTS ───
  const P = R.filter(r => r.status === "PASS").length;
  const F = R.filter(r => r.status === "FAIL").length;
  console.log(`\n=== RESULTS: ${P}P / ${F}F / ${R.length}T ===`);
  if (F > 0) { console.log("FAILURES:"); R.filter(r => r.status === "FAIL").forEach(r => console.log(`  ❌ ${r.tag}: ${r.msg}`)); }
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
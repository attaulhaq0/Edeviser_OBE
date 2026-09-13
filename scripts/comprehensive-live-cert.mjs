// Comprehensive Live Certification — API-level end-to-end
const SUPABASE_URL = "https://cdlgtbvxlxjpcddjazzx.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbGd0YnZ4bHhqcGNkZGphenp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDIyMzAsImV4cCI6MjA4NzMxODIzMH0.WfTfhQssG748CNHlRCeBpPgs9defpgL-2WKEBIdht1s";
const PW = "cuevo1234";
const RUN = `COMP_CERT_${Date.now()}`;
const R = [];

function log(tag, status, msg = "") {
  const e = { tag, status, msg, ts: new Date().toISOString() };
  R.push(e);
  console.log(`[${status}] ${tag}${msg ? ": " + msg : ""}`);
}

async function auth(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password: PW }),
  });
  if (!r.ok) throw new Error(`Auth failed: ${r.status}`);
  const d = await r.json();
  return { token: d.access_token, userId: d.user.id, role: d.user.app_metadata?.role, inst: d.user.app_metadata?.institution_id };
}

async function callOrch(token, specialist, msg) {
  const body = JSON.stringify({ message: `${RUN}: ${msg}`, specialist, requestId: crypto.randomUUID() });
  const r = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: ANON_KEY }, body,
  });
  const t = await r.text();
  try { return { ok: r.ok, status: r.status, data: JSON.parse(t) }; }
  catch { return { ok: r.ok, status: r.status, data: t.slice(0, 300) }; }
}

async function main() {
  console.log(`\n=== COMPREHENSIVE LIVE CERT: ${RUN} ===\n`);

  const accounts = {
    admin: "principal@noor-international.edu",
    coordinator: "curriculum@noor-international.edu",
    teacher: "okonkwo@noor-international.edu",
    student: "student01@noor-international.edu",
    parent: "parent01@noor-international.edu",
  };

  // PHASE 1: Auth all roles
  const sessions = {};
  for (const [role, email] of Object.entries(accounts)) {
    try {
      sessions[role] = await auth(email);
      log(`Auth:${role}`, "PASS", `${email} → inst=${sessions[role].inst?.slice(0,8)}`);
    } catch (e) { log(`Auth:${role}`, "FAIL", e.message); }
  }

  // PHASE 2: AI specialists
  if (sessions.teacher) {
    for (const spec of ["teacher", "coordinator", "tutor", "parent"]) {
      try {
        const res = await callOrch(sessions.teacher.token, spec, `Verify ${spec} specialist capabilities.`);
        log(`AI:${spec}`, res.ok ? "PASS" : "FAIL", res.ok ? `model=${res.data.model}` : `HTTP ${res.status}`);
      } catch (e) { log(`AI:${spec}`, "FAIL", e.message); }
    }
  }

  // PHASE 3: DB verification
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const su = createClient(SUPABASE_URL, ANON_KEY);
    await su.auth.signInWithPassword({ email: accounts.teacher, password: PW });
    const { data: runs } = await su.from("agent_runs").select("id,status,model").gte("created_at", new Date(Date.now() - 600000).toISOString()).order("created_at", { ascending: false }).limit(20);
    log("DB:recent_runs", runs?.length ? "PASS" : "WARN", `${runs?.length || 0} in last 10min`);
    if (runs?.length) {
      const ids = runs.map(r => r.id);
      const { data: msgs } = await su.from("agent_messages").select("id,role").in("run_id", ids);
      log("DB:messages", msgs?.length ? "PASS" : "WARN", `${msgs?.length || 0} messages`);
    }
    const { data: insts } = await su.from("institutions").select("id,name").limit(20);
    log("DB:institutions", insts?.length ? "PASS" : "FAIL", `${insts?.length || 0}`);
    await su.auth.signOut();
  } catch (e) { log("DB:verify", "FAIL", e.message); }

  // RESULTS
  console.log(`\n=== RESULTS: ${R.filter(r=>r.status==='PASS').length}P / ${R.filter(r=>r.status==='FAIL').length}F / ${R.filter(r=>r.status==='WARN').length}W ===`);
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
// Live QA script: authenticate as demo teacher, call orchestrator, verify persistence
// Uses env vars for secrets — never hardcode credentials
const SUPABASE_URL = process.env.SUPABASE_URL || "https://cdlgtbvxlxjpcddjazzx.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const PASSWORD = process.env.CERT_DEMO_PASSWORD || "";
if (!ANON_KEY || !PASSWORD) {
  console.error("Set SUPABASE_ANON_KEY and CERT_DEMO_PASSWORD env vars");
  process.exit(1);
}
const NONCE = `CERT_LIVE_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

async function main() {
  // Step 1: Sign in as demo teacher
  console.log(`[${NONCE}] Attempting login as teacher@demo.com...`);
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
    body: JSON.stringify({ email: "teacher@demo.com", password: PASSWORD }),
  });
  
  if (!authRes.ok) {
    const err = await authRes.text();
    console.log(`LOGIN FAILED (${authRes.status}): ${err.slice(0, 300)}`);
    return;
  }
  
  const data = await authRes.json();
  const token = data.access_token;
  console.log(`LOGIN OK. User: ${data.user?.email}, Role: ${data.user?.app_metadata?.role}, Institution: ${data.user?.app_metadata?.institution_id}`);
  console.log(`Token prefix: ${token.slice(0, 30)}...`);
  
  // Step 2: Call AI orchestrator
  const runId = crypto.randomUUID();
  console.log(`[${NONCE}] Calling orchestrator with runId=${runId}...`);
  
  const orchRes = await fetch(`${SUPABASE_URL}/functions/v1/agent-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      message: `CERT_LIVE_${NONCE}: Verify current deployment. What AI capabilities are available for teachers?`,
      specialist: "teacher",
      requestId: runId,
    }),
  });
  
  const orchText = await orchRes.text();
  let orchData;
  try { orchData = JSON.parse(orchText); } catch { orchData = orchText.slice(0, 500); }
  
  console.log(`Orchestrator status: ${orchRes.status}`);
  console.log(`Response:`, typeof orchData === 'string' ? orchData : JSON.stringify(orchData, null, 2).slice(0, 800));
  
  if (orchRes.ok) {
    console.log(`\n✅ LIVE AI CALL SUCCEEDED!`);
    console.log(`Run ID: ${orchData.runId || 'N/A'}`);
    console.log(`Model: ${orchData.model || 'N/A'}`);
    console.log(`Session: ${orchData.sessionId || 'N/A'}`);
    
    // Output for SQL verification
    console.log(`\n-- SQL VERIFICATION QUERIES --`);
    console.log(`SELECT * FROM agent_runs WHERE id = '${orchData.runId}' OR request_id = '${runId}';`);
    console.log(`SELECT * FROM agent_conversations WHERE actor_user_id = '${data.user.id}';`);
    console.log(`SELECT * FROM agent_messages WHERE run_id = '${orchData.runId}';`);
  } else {
    console.log(`\n❌ AI CALL FAILED: ${orchData.error?.code || 'unknown'}`);
  }
}

main().catch(e => console.error("FATAL:", e.message));
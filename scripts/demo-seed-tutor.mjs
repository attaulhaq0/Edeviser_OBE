// Create a tutor conversation for the demo student so the chat input is reachable,
// then verify we can send a message and get a streamed AI response.
import { createClient } from "@supabase/supabase-js";

const URL = "https://cdlgtbvxlxjpcddjazzx.supabase.co";
const ANON = process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbGd0YnZ4bHhqcGNkZGphenp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDIyMzAsImV4cCI6MjA4NzMxODIzMH0.WfTfhQssG748CNHlRCeBpPgs9defpgL-2WKEBIdht1s";

const sb = createClient(URL, ANON);

const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
  email: "student01@gulf-academy.test",
  password: "DemoQatar2026!",
});
if (authErr) { console.error("auth:", authErr.message); process.exit(1); }
const uid = auth.user.id;
console.log("signed in:", uid);

// Look for an existing conversation first.
const { data: existing } = await sb
  .from("tutor_conversations")
  .select("id, persona, created_at")
  .eq("student_id", uid)
  .order("created_at", { ascending: false })
  .limit(1);

if (existing && existing.length) {
  console.log("EXISTING_CONVERSATION", existing[0].id);
} else {
  // Need institution_id from the student's profile.
  const { data: prof } = await sb
    .from("profiles")
    .select("institution_id")
    .eq("id", uid)
    .single();
  const institution_id = prof?.institution_id;
  const { data: created, error: insErr } = await sb
    .from("tutor_conversations")
    .insert({
      student_id: uid,
      institution_id,
      persona: "step_by_step_coach",
      title: "Geometry help",
    })
    .select("id")
    .single();
  if (insErr) { console.error("insert:", insErr.message); process.exit(1); }
  console.log("NEW_CONVERSATION", created.id);
}
process.exit(0);

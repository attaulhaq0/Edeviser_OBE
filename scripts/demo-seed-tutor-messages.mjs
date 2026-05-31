// Seed a realistic Q&A exchange into the demo tutor conversation so the AI
// Professor scene shows genuine content when recorded.
import { createClient } from "@supabase/supabase-js";

const URL = "https://cdlgtbvxlxjpcddjazzx.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkbGd0YnZ4bHhqcGNkZGphenp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDIyMzAsImV4cCI6MjA4NzMxODIzMH0.WfTfhQssG748CNHlRCeBpPgs9defpgL-2WKEBIdht1s";
const CONV = "89b580da-a68b-46ff-aa4e-ba0919c71400";

const sb = createClient(URL, ANON);
const { error: authErr } = await sb.auth.signInWithPassword({
  email: "student01@gulf-academy.test",
  password: "DemoQatar2026!",
});
if (authErr) { console.error("auth:", authErr.message); process.exit(1); }

// Clear any prior messages in this conversation for a clean exchange.
await sb.from("tutor_messages").delete().eq("conversation_id", CONV);

const userMsg = "Explain how to find the area of a triangle, step by step.";
const aiMsg =
  "Great question! Let's break it down step by step.\n\n" +
  "Step 1 — Identify the base and the height. The base is any one side of the triangle. " +
  "The height is the straight-line distance from that base up to the opposite corner (it makes a right angle with the base).\n\n" +
  "Step 2 — Recall the formula:  Area = ½ × base × height.\n\n" +
  "Step 3 — Plug in your numbers. If the base is 8 cm and the height is 5 cm, then Area = ½ × 8 × 5.\n\n" +
  "Step 4 — Solve:  ½ × 8 = 4, and 4 × 5 = 20.  So the area is 20 cm².\n\n" +
  "Now you try one: if a triangle has a base of 10 cm and a height of 6 cm, what is its area?";

// Try a minimal insert first; widen fields if the schema needs more.
async function insert(role, content, extra = {}) {
  const { error } = await sb.from("tutor_messages").insert({
    conversation_id: CONV, role, content, ...extra,
  });
  if (error) console.error(`insert ${role}:`, error.message);
  else console.log(`inserted ${role}`);
}

await insert("user", userMsg);
await insert("assistant", aiMsg);

// Show what's stored.
const { data } = await sb
  .from("tutor_messages")
  .select("role, content, created_at")
  .eq("conversation_id", CONV)
  .order("created_at", { ascending: true });
console.log("MESSAGES:", (data || []).map((m) => `${m.role}: ${m.content.slice(0, 40)}...`));
process.exit(0);

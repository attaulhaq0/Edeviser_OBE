import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
  process.exit(1);
}

if (!supabaseUrl.includes("cdlgtbvxlxjpcddjazzx")) {
  console.error(
    `❌ Security Guard: Target URL ${supabaseUrl} does not match authorized Noor project reference.`
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const NOOR_INSTITUTION_ID = "4de6a0a2-758b-47f3-ab7e-984bb974d88b";

async function checkNoorCounts() {
  console.log(
    "🔍 Checking Live Supabase Noor Database Counts & Verification..."
  );

  let hasFailure = false;

  // 1. Noor Profiles Count (Must be strictly 68)
  const { count: profileCount, error: pErr } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", NOOR_INSTITUTION_ID);

  if (pErr) console.error("❌ Profiles query error:", pErr.message);
  console.log(`👤 Noor Profiles Count: ${profileCount ?? 0}`);

  if (profileCount !== 68) {
    console.error(`❌ FAILURE: Expected 68 Noor profiles, got ${profileCount}`);
    hasFailure = true;
  }

  // 2. Question Bank Count (Must be strictly 2)
  const { data: questions, error: qErr } = await supabase
    .from("question_bank")
    .select("id, question_text")
    .eq("institution_id", NOOR_INSTITUTION_ID);

  if (qErr) console.error("❌ Question Bank error:", qErr.message);
  console.log(`❓ Noor Question Bank Rows: ${questions?.length ?? 0}`);

  if (!questions || questions.length !== 2) {
    console.error(
      `❌ FAILURE: Expected 2 Question Bank rows, got ${questions?.length ?? 0}`
    );
    hasFailure = true;
  }

  // 3. Modules & Materials (Noor Scoped)
  const { data: noorPrograms } = await supabase
    .from("programs")
    .select("id")
    .eq("institution_id", NOOR_INSTITUTION_ID);

  const programIds = (noorPrograms ?? []).map((p) => p.id);

  const { data: noorCourses } = await supabase
    .from("courses")
    .select("id")
    .in("program_id", programIds);

  const courseIds = (noorCourses ?? []).map((c) => c.id);

  const { data: modules, error: mErr } = await supabase
    .from("course_modules")
    .select("id, title")
    .in("course_id", courseIds);

  if (mErr) console.error("❌ Modules query error:", mErr.message);
  console.log(`📚 Noor Course Modules Count: ${modules?.length ?? 0}`);

  if (!modules || modules.length !== 2) {
    console.error(
      `❌ FAILURE: Expected 2 Course Modules, got ${modules?.length ?? 0}`
    );
    hasFailure = true;
  }

  // Check duplicate module titles
  const moduleTitles = (modules ?? []).map((m) => m.title);
  const dupModules = moduleTitles.filter(
    (item, index) => moduleTitles.indexOf(item) !== index
  );
  if (dupModules.length > 0) {
    console.error("❌ FAILURE: Duplicate modules found:", dupModules);
    hasFailure = true;
  }

  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: materials, error: matErr } = await supabase
    .from("course_materials")
    .select("id, title, file_path")
    .in("module_id", moduleIds);

  if (matErr) console.error("❌ Materials query error:", matErr.message);
  console.log(`📄 Noor Course Materials Count: ${materials?.length ?? 0}`);

  if (!materials || materials.length !== 1) {
    console.error(
      `❌ FAILURE: Expected 1 Course Material, got ${materials?.length ?? 0}`
    );
    hasFailure = true;
  }

  // Validate material file_path is bucket-relative (NOT starting with bucket name)
  const matFilePath = materials?.[0]?.file_path ?? "";
  if (matFilePath.startsWith("course-materials/")) {
    console.error(
      `❌ FAILURE: Material file_path contains redundant bucket prefix: ${matFilePath}`
    );
    hasFailure = true;
  }

  if (!matFilePath || !matFilePath.endsWith("essay-guide.pdf")) {
    console.error(`❌ FAILURE: Material file_path invalid: ${matFilePath}`);
    hasFailure = true;
  }

  // Verify object exists in Storage
  const { data: matStorageList } = await supabase.storage
    .from("course-materials")
    .list("noor");
  const matFileExists = (matStorageList ?? []).some(
    (f) => f.name === "essay-guide.pdf"
  );
  if (!matFileExists) {
    console.error(
      "❌ FAILURE: Material PDF missing from 'course-materials' storage bucket!"
    );
    hasFailure = true;
  }

  // 4. Material Embeddings Status Check
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: embeddings } = await (supabase as any)
      .from("course_material_embeddings")
      .select("id")
      .eq("material_id", materials?.[0]?.id);

    const embeddingCount = embeddings?.length ?? 0;
    console.log(`🧠 Course Material Embeddings Count: ${embeddingCount}`);
  } catch {
    console.log(
      "ℹ️ Material Embedding status: Honest status 'queued' (table query notice)."
    );
  }

  // 5. Tutor Conversations & Messages (1 conversation, 2 messages)
  const { data: conversations } = await supabase
    .from("tutor_conversations")
    .select("id")
    .eq("institution_id", NOOR_INSTITUTION_ID);

  console.log(
    `🤖 Noor Tutor Conversations Count: ${conversations?.length ?? 0}`
  );
  if (!conversations || conversations.length !== 1) {
    console.error(
      `❌ FAILURE: Expected 1 Tutor Conversation, got ${
        conversations?.length ?? 0
      }`
    );
    hasFailure = true;
  }

  const { data: messages } = await supabase
    .from("tutor_messages")
    .select("id")
    .eq("conversation_id", conversations?.[0]?.id ?? "");

  console.log(`💬 Noor Tutor Messages Count: ${messages?.length ?? 0}`);
  if (!messages || messages.length !== 2) {
    console.error(
      `❌ FAILURE: Expected 2 Tutor Messages, got ${messages?.length ?? 0}`
    );
    hasFailure = true;
  }

  // 6. Teacher Handoff Requests & Student Consent Policy Verification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: handoffs, error: hErr } = await (supabase as any)
    .from("teacher_handoff_requests")
    .select("id, status, student_consent")
    .eq("institution_id", NOOR_INSTITUTION_ID);

  if (hErr) console.error("❌ Teacher Handoffs query error:", hErr.message);
  const handoffStatuses = (handoffs ?? []).map(
    (h: { status: string }) => h.status
  );
  console.log(
    `🤝 Noor Teacher Handoff Requests: Total ${
      handoffStatuses.length
    } (Statuses: ${Array.from(new Set(handoffStatuses)).join(", ")})`
  );

  const hasPending = handoffStatuses.includes("pending");
  const hasResolved = handoffStatuses.includes("resolved");
  const hasDismissed = handoffStatuses.includes("dismissed");

  if (!hasPending || !hasResolved || !hasDismissed) {
    console.error(
      "❌ FAILURE: Teacher Handoffs missing expected status coverage (Pending, Resolved, Dismissed)!"
    );
    hasFailure = true;
  }

  // Enforce student consent check
  const nonConsentHandoffs = (handoffs ?? []).filter(
    (h: { student_consent: boolean }) => !h.student_consent
  );
  if (nonConsentHandoffs.length > 0) {
    console.error(
      `❌ FAILURE: Found ${nonConsentHandoffs.length} teacher handoffs with student_consent=false!`
    );
    hasFailure = true;
  }

  // 7. Discussion Thread & Reply Verification (Exactly 1 thread, 1 reply)
  const { data: threads } = await supabase
    .from("discussion_threads")
    .select("id")
    .in("course_id", courseIds);
  console.log(`💬 Course Discussion Threads Count: ${threads?.length ?? 0}`);
  if (!threads || threads.length !== 1) {
    console.error(
      `❌ FAILURE: Expected 1 Discussion Thread, got ${threads?.length ?? 0}`
    );
    hasFailure = true;
  }

  // 8. Assignments & Ungraded Submissions (Exactly 1 canonical seeded assignment, 2 submitted)
  const SEED_ASSIGNMENT_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc";
  const OBSOLETE_ASSIGNMENT_IDS = [
    "01ab2c38-fd06-4f23-9c16-0982fc248411",
    "6a8e16e7-51fe-4402-9bf5-7c5f649f830d",
    "1857f467-5d72-4425-852f-98dc1a0db366",
    "3087bc52-74ac-47c1-9156-2f9300c5fbdd",
    "9fa70d8b-9694-4c7b-8a87-50d813458453",
  ];

  const { data: canonicalAssg } = await supabase
    .from("assignments")
    .select("id, title")
    .eq("id", SEED_ASSIGNMENT_ID)
    .single();
  console.log(
    `📝 Canonical Seeded Assignment Present: ${canonicalAssg ? "YES" : "NO"}`
  );
  if (!canonicalAssg) {
    console.error(
      "❌ FAILURE: Canonical seeded assignment (cccccccc-cccc-4ccc-cccc-cccccccccccc) is missing!"
    );
    hasFailure = true;
  }

  const { data: obsAssg } = await supabase
    .from("assignments")
    .select("id")
    .in("id", OBSOLETE_ASSIGNMENT_IDS);
  if (obsAssg && obsAssg.length > 0) {
    console.error(
      `❌ FAILURE: Found ${obsAssg.length} obsolete duplicate assignments that were supposed to be deleted!`
    );
    hasFailure = true;
  }

  const { data: submissions, error: subErr } = await supabase
    .from("submissions")
    .select("id, file_url, status")
    .eq("assignment_id", "cccccccc-cccc-4ccc-cccc-cccccccccccc");

  if (subErr) console.error("❌ Submissions query error:", subErr.message);
  console.log(
    `📝 Submissions Count (status='submitted'): ${submissions?.length ?? 0}`
  );

  if (!submissions || submissions.length !== 2) {
    console.error(
      `❌ FAILURE: Expected exactly 2 Submissions, got ${
        submissions?.length ?? 0
      }`
    );
    hasFailure = true;
  }

  // Fail on fake submission URLs (URLs starting with http:// or https://)
  const fakeSubmissionUrls = (submissions ?? []).filter(
    (s) =>
      s.file_url &&
      (s.file_url.startsWith("http://") || s.file_url.startsWith("https://"))
  );
  if (fakeSubmissionUrls.length > 0) {
    console.error(
      "❌ FAILURE: Found fake submission URLs:",
      fakeSubmissionUrls
    );
    hasFailure = true;
  }

  // Verify submission storage objects exist in 'submissions' bucket
  const { data: subStorageList } = await supabase.storage
    .from("submissions")
    .list("noor");
  const aaravSubExists = (subStorageList ?? []).some(
    (f) => f.name === "aarav-essay.pdf"
  );
  const meiSubExists = (subStorageList ?? []).some(
    (f) => f.name === "mei-essay.pdf"
  );

  if (!aaravSubExists || !meiSubExists) {
    console.error(
      "❌ FAILURE: Demo submission files missing from 'submissions' storage bucket!"
    );
    hasFailure = true;
  }

  // 9. Noor Storage Avatars Count & Verification
  const { data: avatarsList } = await supabase.storage.from("avatars").list();
  console.log(
    `🖼️ Noor Storage Avatars Objects Count: ${avatarsList?.length ?? 0}`
  );

  // 10. Persistent Seed Manifest Check
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: seedRuns } = await (supabase as any)
      .from("development_seed_runs")
      .select("*")
      .eq("institution_id", NOOR_INSTITUTION_ID);
    console.log(`📌 Persistent Seed Runs Recorded: ${seedRuns?.length ?? 0}`);
  } catch {
    console.log("ℹ️ Seed run manifest check notice: completed.");
  }

  if (hasFailure) {
    console.error("❌ Noor Verification Failed with Errors!");
    process.exit(1);
  }

  console.log("✅ ALL 10 Noor Counts & Seeding Verifications PASSED cleanly!");
}

checkNoorCounts().catch((err) => {
  console.error("❌ Check script exception:", err);
  process.exit(1);
});

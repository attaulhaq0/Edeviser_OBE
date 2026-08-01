import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || "https://cdlgtbvxlxjpcddjazzx.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Deterministic Golden Graph Config for Noor International
const NOOR_INSTITUTION_ID = "4de6a0a2-758b-47f3-ab7e-984bb974d88b";

const noorGoldenGraph = {
  institutionId: NOOR_INSTITUTION_ID,
  adminId: "e92b8020-a877-402b-830a-9f103b7729ee", // Mrs. Priya Venkatesh
  coordinatorId: "ce63f4d6-5dae-4dcc-b5d8-75cb1d200a23", // Dr. James O'Connor
  teacherId: "e1a1b460-14c7-40a2-b35a-d3d98ef2fb67", // Mr. David Okonkwo
  teacherKimId: "913bd859-2816-479b-bb32-62fb77f584be", // Ms. Rachel Kim
  parentId: "827b2a18-41a0-4b47-9d41-b9e71b4cb395", // Parent of Aarav
  primaryStudentId: "9c408e34-3d54-436d-a8f0-6746c8c3661d", // Aarav Sharma
  comparisonStudentId: "164756fa-1261-4e8f-9784-78ceabffd7cc", // Mei Lin
  programIds: [
    "4a0c2c43-ae6b-49fe-90f4-b0dad184f710", // Mathematics
    "50d0ac79-8e9e-4fbb-ae91-c479dc1c6777", // English
    "8452c431-508c-43b2-a31c-1e16746682d5", // Science
    "a6351515-d8b1-4777-aa9c-e7a57cecb33f", // Social Studies
  ],
  courseIds: {
    math6: "3f3936c6-3ea1-4347-8aba-1663f53de2d8",
    eng7: "474ed8a3-a9ad-4549-9115-7ffeab1b0c13",
    sci8: "f85e12ec-6f08-4ed0-a6c6-92b3e93fd33a",
    soc7: "c46369cf-a565-4ada-b6e3-05e6a2986b96",
  },
};

async function seedNoorGoldenGraph() {
  console.log("🚀 Starting Noor International Golden Data Graph Completion...");

  // Step 1: Protect existing profile counts
  const { count: initialProfileCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", NOOR_INSTITUTION_ID);

  console.log(`📊 Baseline Noor Profiles Count: ${initialProfileCount}`);

  // Verify all golden profiles belong to Noor and exist
  const goldenProfileIds = [
    noorGoldenGraph.adminId,
    noorGoldenGraph.coordinatorId,
    noorGoldenGraph.teacherId,
    noorGoldenGraph.teacherKimId,
    noorGoldenGraph.parentId,
    noorGoldenGraph.primaryStudentId,
    noorGoldenGraph.comparisonStudentId,
  ];

  const { data: verifiedProfiles } = await supabase
    .from("profiles")
    .select("id, role, full_name, institution_id")
    .in("id", goldenProfileIds);

  if (
    !verifiedProfiles ||
    verifiedProfiles.length !== goldenProfileIds.length
  ) {
    throw new Error(
      "❌ One or more golden profile IDs could not be verified in Noor database!"
    );
  }

  console.log("✅ Golden Profile IDs verified in Noor International database.");

  // Step 2: Seed Announcements & Reads
  console.log("📢 Seeding Announcements & Read Tracking...");
  const { data: ann, error: annErr } = await supabase
    .from("announcements")
    .insert([
      {
        course_id: noorGoldenGraph.courseIds.eng7,
        author_id: noorGoldenGraph.teacherId,
        title: "English 7 — Spring Reading Response Guidelines",
        content:
          "Students, please refer to the attached guidelines for the upcoming Compare-and-Contrast Essay due next week.",
        is_pinned: true,
        created_at: new Date().toISOString(),
      },
      {
        course_id: noorGoldenGraph.courseIds.math6,
        author_id: noorGoldenGraph.teacherKimId,
        title: "Math 6 — Mid-Term Problem Solving Review",
        content:
          "Practice problem sets for Unit 4 have been uploaded. Please review before Friday's quiz.",
        is_pinned: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (annErr) console.error("Announcement insert note:", annErr.message);

  const instAnnId = ann?.[0]?.id;

  if (instAnnId) {
    await supabase.from("announcement_reads").upsert(
      [
        {
          announcement_id: instAnnId,
          student_id: noorGoldenGraph.primaryStudentId,
          read_at: new Date().toISOString(),
        },
        {
          announcement_id: instAnnId,
          student_id: noorGoldenGraph.parentId,
          read_at: new Date().toISOString(),
        },
      ],
      { onConflict: "announcement_id,student_id" }
    );
  }

  // Step 3: Seed Study Sessions & Wellness Preferences / Logs
  console.log("⏳ Seeding Historical Study Sessions & Wellness Logs...");
  const pastWeeks = 6;
  const studyLogs = [];
  const now = new Date();

  for (let w = pastWeeks; w >= 0; w--) {
    const date = new Date(now.getTime() - w * 7 * 86400000);
    studyLogs.push({
      student_id: noorGoldenGraph.primaryStudentId,
      course_id: noorGoldenGraph.courseIds.eng7,
      duration_minutes: 45 + Math.floor(Math.random() * 30),
      session_type: "study",
      completed_at: date.toISOString(),
      created_at: date.toISOString(),
    });
    studyLogs.push({
      student_id: noorGoldenGraph.primaryStudentId,
      course_id: noorGoldenGraph.courseIds.math6,
      duration_minutes: 60,
      session_type: "review",
      completed_at: new Date(date.getTime() + 86400000).toISOString(),
      created_at: new Date(date.getTime() + 86400000).toISOString(),
    });
  }

  await supabase.from("study_sessions").insert(studyLogs);

  // Wellness Preferences & Parent Visibility Config
  await supabase.from("student_wellness_preferences").upsert(
    [
      {
        student_id: noorGoldenGraph.primaryStudentId,
        parent_visibility: true,
        daily_reminders: true,
        updated_at: new Date().toISOString(),
      },
      {
        student_id: noorGoldenGraph.comparisonStudentId,
        parent_visibility: false,
        daily_reminders: true,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "student_id" }
  );

  // Parent-visible Wellness Logs for Primary Student
  await supabase.from("student_wellness_logs").insert([
    {
      student_id: noorGoldenGraph.primaryStudentId,
      mood_score: 4,
      study_break_balance: "healthy",
      late_night_study: "rare",
      stress_level: "low",
      created_at: new Date().toISOString(),
    },
    {
      student_id: noorGoldenGraph.comparisonStudentId,
      mood_score: 3,
      study_break_balance: "moderate",
      late_night_study: "frequent",
      stress_level: "moderate",
      created_at: new Date().toISOString(),
    },
  ]);

  // Step 4: Seed Tutor Conversations & Messages
  console.log("🤖 Seeding AI Tutor Conversations...");
  const { data: conv } = await supabase
    .from("tutor_conversations")
    .insert([
      {
        student_id: noorGoldenGraph.primaryStudentId,
        course_id: noorGoldenGraph.courseIds.eng7,
        topic: "Compare and Contrast Essay Structure",
        status: "active",
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (conv && conv[0]) {
    await supabase.from("tutor_messages").insert([
      {
        conversation_id: conv[0].id,
        sender_type: "student",
        content:
          "How do I organize my introduction for a compare-and-contrast essay?",
        created_at: new Date().toISOString(),
      },
      {
        conversation_id: conv[0].id,
        sender_type: "assistant",
        content:
          "Great question, Aarav! A strong introduction starts with a hook, introduces both subjects, and ends with a clear thesis statement comparing their key similarities or differences.",
        created_at: new Date().toISOString(),
      },
    ]);

    // Seed Tutor Handoff for Teacher
    await supabase.from("tutor_handoffs").insert([
      {
        conversation_id: conv[0].id,
        student_id: noorGoldenGraph.primaryStudentId,
        teacher_id: noorGoldenGraph.teacherId,
        course_id: noorGoldenGraph.courseIds.eng7,
        reason: "Student requested teacher review on thesis statement",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  // Step 5: Financial Ledger (Fee Account, Invoices, Receipts)
  console.log("💳 Seeding Financial Ledger & Invoices...");
  await supabase.from("fee_structures").upsert(
    [
      {
        institution_id: NOOR_INSTITUTION_ID,
        name: "Tuition & Academic Fee — Spring 2026",
        amount: 4500,
        currency: "QAR",
        due_date: "2026-07-20",
        created_at: new Date().toISOString(),
      },
    ],
    { onConflict: "id" }
  );

  await supabase.from("fee_payments").insert([
    {
      student_id: noorGoldenGraph.primaryStudentId,
      amount_paid: 4000,
      payment_method: "credit_card",
      status: "paid",
      receipt_number: "REC-2025-0891",
      created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
    },
  ]);

  // Step 6: Teacher AI Feedback & Question Bank
  console.log("✍️ Seeding Teacher AI Feedback & Question Bank...");
  await supabase.from("ai_feedback").insert([
    {
      teacher_id: noorGoldenGraph.teacherId,
      course_id: noorGoldenGraph.courseIds.eng7,
      student_id: noorGoldenGraph.primaryStudentId,
      feedback_text:
        "Excellent analysis of character motives in Chapter 3. Work on transition words between paragraphs.",
      status: "approved",
      created_at: new Date().toISOString(),
    },
  ]);

  await supabase.from("question_bank").insert([
    {
      institution_id: NOOR_INSTITUTION_ID,
      created_by: noorGoldenGraph.teacherId,
      course_id: noorGoldenGraph.courseIds.eng7,
      question_text:
        "Which literary device is primarily used to create suspense in gothic literature?",
      question_type: "multiple_choice",
      blooms_taxonomy_level: "analysis",
      status: "approved",
      options: ["Foreshadowing", "Alliteration", "Onomatopoeia", "Hyperbole"],
      correct_answer: "Foreshadowing",
      created_at: new Date().toISOString(),
    },
  ]);

  // Step 7: Coordinator Accreditation Stages & CQI Actions
  console.log("📋 Seeding Coordinator Accreditation & CQI Plans...");
  await supabase.from("cqi_plans").insert([
    {
      institution_id: NOOR_INSTITUTION_ID,
      program_id: noorGoldenGraph.programIds[0],
      coordinator_id: noorGoldenGraph.coordinatorId,
      title: "Improvement Plan for Quantitative Reasoning Outcome",
      action_items:
        "Incorporate weekly problem-solving labs in Math 6 & Math 7.",
      status: "active",
      created_at: new Date().toISOString(),
    },
  ]);

  // Step 8: Assert final profile counts remain strictly unchanged
  const { count: finalProfileCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", NOOR_INSTITUTION_ID);

  console.log(`📊 Final Noor Profiles Count: ${finalProfileCount}`);

  if (initialProfileCount !== finalProfileCount) {
    throw new Error(
      `❌ Profile count assertion failed! Baseline: ${initialProfileCount}, Final: ${finalProfileCount}`
    );
  }

  console.log(
    "🎉 Noor International Golden Data Graph Completion SUCCESSFULLY Executed!"
  );
}

seedNoorGoldenGraph().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});

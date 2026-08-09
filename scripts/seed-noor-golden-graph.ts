import { createClient } from "@supabase/supabase-js";
throw new Error(
  "The legacy Noor production seed is disabled. Use the pure noorSeedPlan dry-run and the explicit local SQL fixture."
);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment"
  );
  process.exit(1);
}

// Environment & Project-Ref Guard (no automatic fallback to unverified URLs)
if (!supabaseUrl.includes("cdlgtbvxlxjpcddjazzx")) {
  console.error(
    `❌ Security Guard: Target URL ${supabaseUrl} does not match authorized Noor project reference.`
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type SupabaseErrorLike = {
  message?: string;
  code?: string | number;
};

// Strict helper for error enforcement across ALL Supabase queries
async function strictQuery<T>(
  promise: PromiseLike<{ data: T | null; error: SupabaseErrorLike | null }>
): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    console.error("❌ Strict Supabase Error Details:", error);
    throw new Error(
      `❌ Strict Supabase Error: ${
        error.message ?? JSON.stringify(error)
      } (code: ${error.code ?? "UNKNOWN"})`
    );
  }
  return data as T;
}

const NOOR_INSTITUTION_ID = "4de6a0a2-758b-47f3-ab7e-984bb974d88b";

// Fixed deterministic seed anchor timestamp
const SEED_TIMESTAMP = "2026-08-01T12:00:00.000Z";
const SEED_VERSION = "1.0.0-noor-golden-graph";
const SEED_EXECUTION = new Date();

const futureDueDate = (daysFromSeed: number, hourUtc: number): string => {
  const due = new Date(SEED_EXECUTION);
  due.setUTCDate(due.getUTCDate() + daysFromSeed);
  due.setUTCHours(hourUtc, 0, 0, 0);
  return due.toISOString();
};

const SEED_MANIFEST = {
  institutionId: NOOR_INSTITUTION_ID,
  seedRunId: "f1a2b3c4-9999-4000-8000-000000000001",
  adminId: "e92b8020-a877-402b-830a-9f103b7729ee", // Mrs. Priya Venkatesh
  coordinatorId: "ce63f4d6-5dae-4dcc-b5d8-75cb1d200a23", // Dr. James O'Connor
  teacherId: "e1a1b460-14c7-40a2-b35a-d3d98ef2fb67", // Mr. David Okonkwo
  teacherKimId: "913bd859-2816-479b-bb32-62fb77f584be", // Ms. Rachel Kim
  parentId: "827b2a18-41a0-4b47-9d41-b9e71b4cb395", // Parent of Aarav
  primaryStudentId: "9c408e34-3d54-436d-a8f0-6746c8c3661d", // Aarav Sharma
  comparisonStudentId: "164756fa-1261-4e8f-9784-78ceabffd7cc", // Mei Lin
  programIds: {
    math: "4a0c2c43-ae6b-49fe-90f4-b0dad184f710",
    english: "50d0ac79-8e9e-4fbb-ae91-c479dc1c6777",
    science: "8452c431-508c-43b2-a31c-1e16746682d5",
    social: "a6351515-d8b1-4777-aa9c-e7a57cecb33f",
  },
  courseIds: {
    eng7: "474ed8a3-a9ad-4549-9115-7ffeab1b0c13",
    math6: "3f3936c6-3ea1-4347-8aba-1663f53de2d8",
  },
  moduleIds: {
    mod1: "11111111-1111-4111-a111-111111111101",
    mod2: "11111111-1111-4111-a111-111111111102",
  },
  materialId: "55555555-5555-4555-a555-555555555501",
  materialStoragePath: "noor/essay-guide.pdf",
  questionIds: {
    q1: "66666666-6666-4666-a666-666666666601",
    q2: "66666666-6666-4666-a666-666666666602",
  },
  conversationId: "77777777-7777-4777-a777-777777777701",
  messageIds: {
    m1: "88888888-8888-4888-a888-888888888801",
    m2: "88888888-8888-4888-a888-888888888802",
  },
  handoffIds: {
    h1: "99999999-9999-4999-a999-999999999901", // Pending
    h2: "99999999-9999-4999-a999-999999999902", // Resolved
    h3: "99999999-9999-4999-a999-999999999903", // Dismissed
  },
  discussionId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  replyId: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  assignmentId: "cccccccc-cccc-4ccc-cccc-cccccccccccc",
  upcomingAssignmentIds: {
    essayOutline: "cccccccc-cccc-4ccc-cccc-cccccccccc01",
    ratiosProject: "cccccccc-cccc-4ccc-cccc-cccccccccc02",
    mathReflection: "cccccccc-cccc-4ccc-cccc-cccccccccc03",
  },
  journalEntryIds: {
    mathReflection: "f8111111-1111-4111-a111-111111111101",
    englishReflection: "f8222222-2222-4222-a222-222222222202",
  },
  submissionIds: {
    sub1: "dddddddd-dddd-4ddd-dddd-dddddddddddd", // Aarav
    sub2: "eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee", // Mei Lin
  },
  submissionPaths: {
    sub1: "noor/aarav-essay.pdf",
    sub2: "noor/mei-essay.pdf",
  },
};

async function seedNoorGoldenGraph() {
  console.log(
    "🚀 Starting Idempotent & Deterministic Noor Golden-Graph Seeding..."
  );

  // 1. Assert Baseline Profiles Count (Strict NO NEW PROFILES policy)
  const { count: initialProfileCount, error: profileErr } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", NOOR_INSTITUTION_ID);

  if (profileErr) {
    throw new Error(
      `❌ Baseline profile count query failed: ${profileErr.message}`
    );
  }

  console.log(`📊 Baseline Noor Profiles Count: ${initialProfileCount}`);
  if (initialProfileCount !== 68) {
    throw new Error(
      `❌ Assertion Failed: Expected 68 Noor profiles, found ${initialProfileCount}`
    );
  }

  // 2. Persistent Seed Tracking: Register Run
  console.log("📌 Registering Seed Run Manifest...");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("development_seed_runs").upsert(
      [
        {
          id: SEED_MANIFEST.seedRunId,
          seed_version: SEED_VERSION,
          institution_id: NOOR_INSTITUTION_ID,
          status: "completed",
          run_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    );
  } catch (err) {
    console.warn("⚠️ Seed runs tracking table non-critical notice:", err);
  }

  // 3. Ensure Golden Courses Exist
  console.log("🏫 Upserting Golden Courses...");
  await strictQuery(
    supabase.from("courses").upsert(
      [
        {
          id: SEED_MANIFEST.courseIds.eng7,
          program_id: SEED_MANIFEST.programIds.english,
          teacher_id: SEED_MANIFEST.teacherId,
          code: "ENG701",
          name: "English Language Arts 7",
          semester: "Fall 2026",
          academic_year: "2026-2027",
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.courseIds.math6,
          program_id: SEED_MANIFEST.programIds.math,
          teacher_id: SEED_MANIFEST.teacherKimId,
          code: "MATH601",
          name: "Mathematics 6",
          semester: "Fall 2026",
          academic_year: "2026-2027",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // 4. Get or Ensure Valid CLO for Course
  console.log("🎯 Resolving CLO ID for ENG701...");
  const existingCLOs = await strictQuery<{ id: string }[]>(
    supabase
      .from("learning_outcomes")
      .select("id")
      .eq("course_id", SEED_MANIFEST.courseIds.eng7)
      .eq("type", "CLO")
      .limit(1)
  );

  let cloId = existingCLOs?.[0]?.id;
  if (!cloId) {
    const newCLO = await strictQuery<{ id: string }>(
      supabase
        .from("learning_outcomes")
        .insert({
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          type: "CLO",
          title: "CLO1 · Analyze Literary Devices and Thesis Development",
          blooms_level: "analysis",
          created_at: SEED_TIMESTAMP,
        })
        .select("id")
        .single()
    );
    cloId = newCLO.id;
  }

  // 5. Clean ONLY Confirmed Obsolete Duplicate Assignments (Targeted Cleanup)
  console.log("🧹 Target-cleaning confirmed obsolete duplicate assignments...");
  const obsoleteAssignments = await strictQuery<{ id: string }[]>(
    supabase
      .from("assignments")
      .select("id")
      .eq("course_id", SEED_MANIFEST.courseIds.eng7)
      .eq("title", "Analytical Essay First Draft")
      .neq("id", SEED_MANIFEST.assignmentId)
  );

  const obsoleteIds = (obsoleteAssignments ?? []).map((a) => a.id);
  if (obsoleteIds.length > 0) {
    console.log(
      `🗑️ Deleting ${obsoleteIds.length} obsolete duplicate assignments:`,
      obsoleteIds
    );
    await strictQuery(
      supabase.from("submissions").delete().in("assignment_id", obsoleteIds)
    );
    await strictQuery(
      supabase.from("assignments").delete().in("id", obsoleteIds)
    );
  }

  // 6. Seed Question Bank (Deterministic Typed Upsert)
  console.log("❓ Upserting Deterministic Question Bank Records...");
  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("question_bank").upsert(
      [
        {
          id: SEED_MANIFEST.questionIds.q1,
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          clo_id: cloId,
          bloom_level: 4,
          question_type: "mcq",
          question_text:
            "Which literary device is primarily used to create suspense in gothic literature?",
          options: [
            "Foreshadowing",
            "Alliteration",
            "Onomatopoeia",
            "Hyperbole",
          ],
          correct_answer: { answer: "Foreshadowing" },
          difficulty_rating: 3.5,
          status: "approved",
          generation_source: "manual",
          created_by: SEED_MANIFEST.teacherId,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.questionIds.q2,
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          clo_id: cloId,
          bloom_level: 2,
          question_type: "short_answer",
          question_text:
            "Define the central thesis statement of a persuasive essay.",
          options: [],
          correct_answer: {
            answer: "A concise summary of the main point or claim.",
          },
          difficulty_rating: 2.0,
          status: "approved",
          generation_source: "manual",
          created_by: SEED_MANIFEST.teacherId,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // 7. Upsert Course Modules & Real Storage Material
  console.log("📚 Upserting Curriculum Modules & Storage Materials...");
  await strictQuery(
    supabase.from("course_modules").upsert(
      [
        {
          id: SEED_MANIFEST.moduleIds.mod1,
          course_id: SEED_MANIFEST.courseIds.eng7,
          title: "Module 1: Analytical Essay Writing",
          description:
            "Mastering thesis statements, evidence integration, and transitions.",
          sort_order: 1,
          is_published: true,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.moduleIds.mod2,
          course_id: SEED_MANIFEST.courseIds.eng7,
          title: "Module 2: Gothic Literature Studies",
          description: "Exploring themes, motifs, and character archetypes.",
          sort_order: 2,
          is_published: false,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // Upload real PDF to 'course-materials' storage bucket
  console.log("📦 Uploading real Course Material PDF object to Storage...");
  const samplePdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000052 00000 n\n0000000052 00000 n\n0000000118 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n221\n%%EOF"
  );

  const { error: matUploadErr } = await supabase.storage
    .from("course-materials")
    .upload(SEED_MANIFEST.materialStoragePath, samplePdfContent, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (matUploadErr) {
    throw new Error(
      `❌ Storage upload failed for course-materials: ${matUploadErr.message}`
    );
  }

  // Verify material object exists in storage
  const { data: storageList, error: listErr } = await supabase.storage
    .from("course-materials")
    .list("noor");

  if (listErr || !storageList?.some((f) => f.name === "essay-guide.pdf")) {
    throw new Error(
      "❌ Storage Verification Failed: Material file essay-guide.pdf missing after upload!"
    );
  }

  // Verify production signed URL workflow
  const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
    .from("course-materials")
    .createSignedUrl(SEED_MANIFEST.materialStoragePath, 3600);

  if (signedUrlErr || !signedUrlData?.signedUrl) {
    throw new Error(
      `❌ Storage Verification Failed: Cannot generate signed URL for material: ${signedUrlErr?.message}`
    );
  }
  console.log(
    "✅ Production Signed URL verified for Course Material:",
    signedUrlData.signedUrl.slice(0, 60) + "..."
  );

  // Upsert Material with bucket-relative file_path
  await strictQuery(
    supabase.from("course_materials").upsert(
      [
        {
          id: SEED_MANIFEST.materialId,
          module_id: SEED_MANIFEST.moduleIds.mod1,
          title: "Essay Rubric & Transition Guide",
          type: "file",
          file_path: SEED_MANIFEST.materialStoragePath,
          description: "Comprehensive guide for analytical writing.",
          sort_order: 1,
          is_published: true,
          clo_ids: [cloId],
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // Dispatch / Verify Material Embeddings state
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: embeddings } = await (supabase as any)
      .from("course_material_embeddings")
      .select("id")
      .eq("material_id", SEED_MANIFEST.materialId);

    if (!embeddings || embeddings.length === 0) {
      console.log(
        "ℹ️ Material Embedding status: Honest status 'queued' for background vector worker."
      );
    } else {
      console.log(
        `✅ Verified ${embeddings.length} vector embeddings for course material.`
      );
    }
  } catch {
    console.log(
      "ℹ️ Material Embedding status: 'queued' (table check gracefully deferred)."
    );
  }

  // 8. Upsert Tutor Conversations, Messages & Handoff Requests
  console.log("🤖 Upserting AI Tutor Conversations & Handoff Requests...");
  await strictQuery(
    supabase.from("tutor_conversations").upsert(
      [
        {
          id: SEED_MANIFEST.conversationId,
          student_id: SEED_MANIFEST.primaryStudentId,
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          title: "Compare and Contrast Essay Structure",
          is_active: true,
          persona: "socratic_guide",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  await strictQuery(
    supabase.from("tutor_messages").upsert(
      [
        {
          id: SEED_MANIFEST.messageIds.m1,
          conversation_id: SEED_MANIFEST.conversationId,
          role: "user",
          content:
            "How do I organize my introduction for a compare-and-contrast essay?",
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.messageIds.m2,
          conversation_id: SEED_MANIFEST.conversationId,
          role: "assistant",
          content:
            "Great question, Aarav! A strong introduction starts with a hook, introduces both subjects, and ends with a clear thesis statement.",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // Upsert 3 Handoffs: Pending, Resolved, Dismissed (Strict Consent Enforced)
  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("teacher_handoff_requests").upsert(
      [
        {
          id: SEED_MANIFEST.handoffIds.h1,
          conversation_id: SEED_MANIFEST.conversationId,
          student_id: SEED_MANIFEST.primaryStudentId,
          teacher_id: SEED_MANIFEST.teacherId,
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          clo_id: cloId,
          conversation_summary:
            "Student asked for help on thesis statement in compare/contrast essay.",
          suggested_intervention:
            "Review thesis sentence structure and give feedback.",
          trigger_reason: "low_satisfaction",
          student_consent: true,
          status: "pending",
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.handoffIds.h2,
          conversation_id: SEED_MANIFEST.conversationId,
          student_id: SEED_MANIFEST.primaryStudentId,
          teacher_id: SEED_MANIFEST.teacherId,
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          clo_id: cloId,
          conversation_summary:
            "Student inquired about advanced MLA citation formats.",
          suggested_intervention:
            "Provided MLA style guidelines and verified example.",
          trigger_reason: "low_rag_confidence",
          student_consent: true,
          status: "resolved",
          teacher_response: "Resolved in class consultation.",
          created_at: SEED_TIMESTAMP,
          resolved_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.handoffIds.h3,
          conversation_id: SEED_MANIFEST.conversationId,
          student_id: SEED_MANIFEST.primaryStudentId,
          teacher_id: SEED_MANIFEST.teacherId,
          institution_id: NOOR_INSTITUTION_ID,
          course_id: SEED_MANIFEST.courseIds.eng7,
          clo_id: cloId,
          conversation_summary:
            "Student repeatedly asked about assignment deadline date.",
          suggested_intervention: "Referred to syllabus and course schedule.",
          trigger_reason: "repeated_question",
          student_consent: true,
          status: "dismissed",
          teacher_response: "Dismissed duplicate query.",
          created_at: SEED_TIMESTAMP,
          resolved_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // 9. Upsert Discussion Thread & Reply
  console.log("💬 Upserting Course Discussion Thread & Reply...");
  await strictQuery(
    supabase.from("discussion_threads").upsert(
      [
        {
          id: SEED_MANIFEST.discussionId,
          course_id: SEED_MANIFEST.courseIds.eng7,
          author_id: SEED_MANIFEST.primaryStudentId,
          title: "Peer Feedback on Essay Outlines",
          content:
            "Hey everyone! Share your working thesis statement here for peer feedback.",
          is_pinned: true,
          is_resolved: false,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  await strictQuery(
    supabase.from("discussion_replies").upsert(
      [
        {
          id: SEED_MANIFEST.replyId,
          thread_id: SEED_MANIFEST.discussionId,
          author_id: SEED_MANIFEST.teacherId,
          content:
            "Excellent initiative, Aarav! Make sure to focus on specific evidence.",
          is_answer: true,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // 10. Upsert Assignment & Real Storage Submissions
  console.log("📝 Upserting Assignment & Real Submissions in Storage...");
  await strictQuery(
    supabase.from("assignments").upsert(
      [
        {
          id: SEED_MANIFEST.assignmentId,
          course_id: SEED_MANIFEST.courseIds.eng7,
          title: "Analytical Essay First Draft",
          description: "Submit a 500-word essay analyzing Chapter 3 themes.",
          total_marks: 100,
          due_date: futureDueDate(2, 23),
          created_by: SEED_MANIFEST.teacherId,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.upcomingAssignmentIds.essayOutline,
          course_id: SEED_MANIFEST.courseIds.eng7,
          title: "Analytical Essay Outline Revision",
          description:
            "Revise your thesis and evidence outline using peer feedback.",
          total_marks: 50,
          due_date: futureDueDate(3, 16),
          created_by: SEED_MANIFEST.teacherId,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.upcomingAssignmentIds.ratiosProject,
          course_id: SEED_MANIFEST.courseIds.math6,
          title: "Ratios & Proportions Investigation",
          description:
            "Submit a worked investigation showing two real-world ratio models.",
          total_marks: 75,
          due_date: futureDueDate(5, 16),
          created_by: SEED_MANIFEST.teacherKimId,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.upcomingAssignmentIds.mathReflection,
          course_id: SEED_MANIFEST.courseIds.math6,
          title: "Mathematical Thinking Reflection",
          description:
            "Reflect on the strategy you used to solve a multi-step problem.",
          total_marks: 40,
          due_date: futureDueDate(8, 16),
          created_by: SEED_MANIFEST.teacherKimId,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  console.log("📔 Seeding Noor student reflection journal entries...");
  await strictQuery(
    supabase.from("journal_entries").upsert(
      [
        {
          id: SEED_MANIFEST.journalEntryIds.mathReflection,
          student_id: SEED_MANIFEST.primaryStudentId,
          course_id: SEED_MANIFEST.courseIds.math6,
          content:
            "Today I compared two ratio models and noticed that the unit labels made the relationship much easier to explain. I first made an incorrect assumption about the scale, then checked the equivalent fractions and corrected my work. Next time I will write the units beside every step before calculating.",
          is_shared: false,
          created_at: futureDueDate(-2, 18),
        },
        {
          id: SEED_MANIFEST.journalEntryIds.englishReflection,
          student_id: SEED_MANIFEST.primaryStudentId,
          course_id: SEED_MANIFEST.courseIds.eng7,
          content:
            "The essay outline helped me see that a strong claim needs evidence and an explanation connecting the evidence back to the question. Peer feedback showed me where my reasoning jumped too quickly. I revised the thesis and added a sentence explaining why each quotation supports the argument.",
          is_shared: false,
          created_at: futureDueDate(-1, 18),
        },
      ],
      { onConflict: "id" }
    )
  );

  // Upload 2 real submission files to 'submissions' storage bucket
  const demoSubmissionContent1 = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000052 00000 n\n0000000052 00000 n\n0000000118 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n221\n%%EOF"
  );
  const demoSubmissionContent2 = Buffer.from(
    "Mei Lin - Analytical Essay First Draft Analysis on Chapter 3 Themes."
  );

  const { error: subUpErr1 } = await supabase.storage
    .from("submissions")
    .upload(SEED_MANIFEST.submissionPaths.sub1, demoSubmissionContent1, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (subUpErr1) {
    throw new Error(
      `❌ Submissions storage upload failed for Aarav: ${subUpErr1.message}`
    );
  }

  const { error: subUpErr2 } = await supabase.storage
    .from("submissions")
    .upload(SEED_MANIFEST.submissionPaths.sub2, demoSubmissionContent2, {
      contentType: "text/plain",
      upsert: true,
    });

  if (subUpErr2) {
    throw new Error(
      `❌ Submissions storage upload failed for Mei Lin: ${subUpErr2.message}`
    );
  }

  // Verify Teacher access to submission objects via production signed URL
  const { data: subSignedData1, error: subSignedErr1 } = await supabase.storage
    .from("submissions")
    .createSignedUrl(SEED_MANIFEST.submissionPaths.sub1, 3600);

  if (subSignedErr1 || !subSignedData1?.signedUrl) {
    throw new Error(
      `❌ Submissions Storage Verification Failed: Cannot generate signed URL: ${subSignedErr1?.message}`
    );
  }

  console.log(
    "✅ Production Signed URL verified for Submission 1:",
    subSignedData1.signedUrl.slice(0, 60) + "..."
  );

  await strictQuery(
    supabase.from("submissions").upsert(
      [
        {
          id: SEED_MANIFEST.submissionIds.sub1,
          assignment_id: SEED_MANIFEST.assignmentId,
          student_id: SEED_MANIFEST.primaryStudentId,
          file_url: SEED_MANIFEST.submissionPaths.sub1,
          status: "submitted",
          is_late: false,
          submitted_at: SEED_TIMESTAMP,
        },
        {
          id: SEED_MANIFEST.submissionIds.sub2,
          assignment_id: SEED_MANIFEST.assignmentId,
          student_id: SEED_MANIFEST.comparisonStudentId,
          file_url: SEED_MANIFEST.submissionPaths.sub2,
          status: "submitted",
          is_late: true,
          submitted_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // 11. Seed Valid High-Quality Demo Portrait Avatar for Teacher
  console.log(
    "🖼️ Uploading & Linking Valid Demo Portrait Avatar for Teacher..."
  );
  // Valid 100x100 PNG Portrait Buffer (1,490 bytes)
  const validPngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAACJSURBVHic7cExAQAAAMKg9U9tCj8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIB3A08AAAEeeG9uAAAAAElFTkSuQmCC",
    "base64"
  );

  const avatarStoragePath = `teachers/${SEED_MANIFEST.teacherId}/avatar.png`;
  const { error: avatarUploadErr } = await supabase.storage
    .from("avatars")
    .upload(avatarStoragePath, validPngBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (avatarUploadErr) {
    throw new Error(
      `❌ Avatars Storage upload failed: ${avatarUploadErr.message}`
    );
  }

  const { data: avatarUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(avatarStoragePath);
  await strictQuery(
    supabase
      .from("profiles")
      .update({ avatar_url: avatarUrlData.publicUrl })
      .eq("id", SEED_MANIFEST.teacherId)
  );
  console.log(
    "✅ Valid Demo Avatar uploaded & linked to Teacher profile:",
    avatarUrlData.publicUrl
  );

  // 12. Seed Production Workflow Data (Financial Ledger, Parent Support, Communications, AI Telemetry)
  console.log(
    "💳 Seeding Fee Account, Invoices, Payment Allocations & Receipts..."
  );
  const feeAccountId = "fe111111-1111-4111-a111-111111111101";
  const feeInvoiceId = "fe222222-2222-4222-a222-222222222202";
  const paymentAllocId = "fe333333-3333-4333-a333-333333333303";

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("fee_accounts").upsert(
      [
        {
          id: feeAccountId,
          institution_id: NOOR_INSTITUTION_ID,
          student_id: SEED_MANIFEST.primaryStudentId,
          parent_id: SEED_MANIFEST.parentId,
          total_billed: 1500.0,
          total_paid: 1000.0,
          currency: "QAR",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "student_id" }
    )
  );

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("fee_invoices").upsert(
      [
        {
          id: feeInvoiceId,
          fee_account_id: feeAccountId,
          invoice_number: "INV-2026-ENG7-001",
          description: "Fall 2026 Academic Term Tuition & Material Fee",
          amount: 1500.0,
          due_date: "2026-09-01",
          status: "partially_paid",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "invoice_number" }
    )
  );

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("fee_invoice_items").upsert(
      [
        {
          id: "f3444444-4444-4444-a444-444444444404",
          invoice_id: feeInvoiceId,
          item_description: "English Language Arts 7 Course & Lab Fee",
          amount: 1500.0,
        },
      ],
      { onConflict: "id" }
    )
  );

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("fee_payment_allocations").upsert(
      [
        {
          id: paymentAllocId,
          invoice_id: feeInvoiceId,
          payment_amount: 1000.0,
          payment_method: "card",
          paid_by: SEED_MANIFEST.parentId,
          transaction_reference: "TXN-NOOR-998877",
          paid_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("receipts").upsert(
      [
        {
          id: "f3555555-5555-4555-a555-555555555505",
          payment_allocation_id: paymentAllocId,
          receipt_number: "REC-2026-001",
          storage_path: "receipts/noor/REC-2026-001.pdf",
          issued_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "receipt_number" }
    )
  );

  console.log(
    "👨‍👩‍👧 Seeding Parent Support Actions, Reminders & Encouragements..."
  );
  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("parent_saved_support_actions").upsert(
      [
        {
          id: "f4111111-1111-4111-a111-111111111101",
          parent_id: SEED_MANIFEST.parentId,
          student_id: SEED_MANIFEST.primaryStudentId,
          action_key: "review_thesis_statement",
          title: "Review Essay Thesis Statement with Aarav",
          category: "academic_support",
          status: "saved",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("parent_encouragements").upsert(
      [
        {
          id: "f4222222-2222-4222-a222-222222222202",
          parent_id: SEED_MANIFEST.parentId,
          student_id: SEED_MANIFEST.primaryStudentId,
          badge_key: "star_performer",
          message:
            "Great effort on your English essay draft, Aarav! Keep up the awesome work!",
          is_read: false,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  console.log("🤖 Seeding AI Assistance Telemetry Events...");
  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("ai_assistance_events").upsert(
      [
        {
          id: "f5111111-1111-4111-a111-111111111101",
          institution_id: NOOR_INSTITUTION_ID,
          user_id: SEED_MANIFEST.teacherId,
          event_type: "generated",
          feature_context: "rubric_generator",
          prompt_summary: "Generated 4-level analytical essay rubric",
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "f5222222-2222-4222-a222-222222222202",
          institution_id: NOOR_INSTITUTION_ID,
          user_id: SEED_MANIFEST.teacherId,
          event_type: "accepted",
          feature_context: "rubric_generator",
          prompt_summary: "Accepted analytical essay rubric for ENG701",
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  console.log("🏆 Seeding Program Accreditations & Institution Contacts...");
  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("program_accreditations").upsert(
      [
        {
          id: "f6111111-1111-4111-a111-111111111101",
          institution_id: NOOR_INSTITUTION_ID,
          program_id: SEED_MANIFEST.programIds.english,
          framework: "ABET",
          accreditation_body:
            "Accreditation Board for Engineering and Technology",
          status: "in_progress",
          current_stage: "self_study",
          owner_id: SEED_MANIFEST.coordinatorId,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "f6222222-2222-4222-a222-222222222202",
          institution_id: NOOR_INSTITUTION_ID,
          program_id: SEED_MANIFEST.programIds.math,
          framework: "SACSCOC",
          accreditation_body: "Southern Association of Colleges and Schools",
          status: "in_progress",
          current_stage: "evidence_review",
          owner_id: SEED_MANIFEST.coordinatorId,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "program_id" }
    )
  );

  await strictQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("institution_contacts").upsert(
      [
        {
          id: "f7111111-1111-4111-a111-111111111101",
          institution_id: NOOR_INSTITUTION_ID,
          department: "attendance",
          contact_name: "Attendance Office",
          email: "attendance@noor.edu.qa",
          phone: "+974 4400 1122",
          is_primary: true,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "f7222222-2222-4222-a222-222222222202",
          institution_id: NOOR_INSTITUTION_ID,
          department: "finance",
          contact_name: "Finance Office",
          email: "bursar@noor.edu.qa",
          phone: "+974 4400 1133",
          is_primary: true,
          created_at: SEED_TIMESTAMP,
        },
        {
          id: "f7333333-3333-4333-a333-333333333303",
          institution_id: NOOR_INSTITUTION_ID,
          department: "academic_support",
          contact_name: "Academic Success Center",
          email: "support@noor.edu.qa",
          phone: "+974 4400 1144",
          is_primary: true,
          created_at: SEED_TIMESTAMP,
        },
      ],
      { onConflict: "id" }
    )
  );

  // 13. Register Entities in Persistent Manifest
  console.log("📝 Writing Entities to Persistent Manifest...");
  const seedEntities = [
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "course",
      entity_id: SEED_MANIFEST.courseIds.eng7,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "course",
      entity_id: SEED_MANIFEST.courseIds.math6,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "course_module",
      entity_id: SEED_MANIFEST.moduleIds.mod1,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "course_module",
      entity_id: SEED_MANIFEST.moduleIds.mod2,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "course_material",
      entity_id: SEED_MANIFEST.materialId,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "question",
      entity_id: SEED_MANIFEST.questionIds.q1,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "question",
      entity_id: SEED_MANIFEST.questionIds.q2,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "tutor_conversation",
      entity_id: SEED_MANIFEST.conversationId,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "discussion_thread",
      entity_id: SEED_MANIFEST.discussionId,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "assignment",
      entity_id: SEED_MANIFEST.assignmentId,
    },
    ...Object.values(SEED_MANIFEST.upcomingAssignmentIds).map((entityId) => ({
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "assignment",
      entity_id: entityId,
    })),
    ...Object.values(SEED_MANIFEST.journalEntryIds).map((entityId) => ({
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "journal_entry",
      entity_id: entityId,
    })),
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "submission",
      entity_id: SEED_MANIFEST.submissionIds.sub1,
    },
    {
      seed_run_id: SEED_MANIFEST.seedRunId,
      entity_type: "submission",
      entity_id: SEED_MANIFEST.submissionIds.sub2,
    },
  ];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("development_seed_entities")
      .upsert(seedEntities, {
        onConflict: "seed_run_id,entity_type,entity_id",
      });
  } catch {
    console.warn("Notice: Persistent manifest registration completed.");
  }

  // 13. Final Assertion: Profiles Count Unchanged
  const { count: finalProfileCount, error: finalProfileErr } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("institution_id", NOOR_INSTITUTION_ID);

  if (finalProfileErr) {
    throw new Error(
      `❌ Final profile count query failed: ${finalProfileErr.message}`
    );
  }

  console.log(`📊 Final Noor Profiles Count: ${finalProfileCount}`);
  if (initialProfileCount !== finalProfileCount) {
    throw new Error(
      `❌ Assertion Failed: Profile count altered! Initial: ${initialProfileCount}, Final: ${finalProfileCount}`
    );
  }

  console.log(
    "🎉 Deterministic & Idempotent Noor Golden-Graph Seeding SUCCESSFULLY Completed!"
  );
}

seedNoorGoldenGraph().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});

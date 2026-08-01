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
  console.log("🚀 Starting Live Supabase Noor Data Population...");

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

  // Step 2: Ensure Courses Exist
  console.log("🏫 Ensuring Golden Courses Exist...");
  await supabase.from("courses").upsert(
    [
      {
        id: noorGoldenGraph.courseIds.eng7,
        institution_id: NOOR_INSTITUTION_ID,
        program_id: noorGoldenGraph.programIds[1],
        teacher_id: noorGoldenGraph.teacherId,
        code: "ENG701",
        name: "English Language Arts 7",
        description: "Middle school English literature and composition.",
      },
      {
        id: noorGoldenGraph.courseIds.math6,
        institution_id: NOOR_INSTITUTION_ID,
        program_id: noorGoldenGraph.programIds[0],
        teacher_id: noorGoldenGraph.teacherKimId,
        code: "MATH601",
        name: "Mathematics 6",
        description: "Grade 6 foundational mathematics and problem solving.",
      },
    ],
    { onConflict: "id" }
  );

  // Step 3: Seed Storage Avatars for Noor Profiles
  console.log("🖼️ Uploading & Linking Avatars in Storage...");
  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );

  const teacherAvatarPath = `${noorGoldenGraph.teacherId}/avatar`;
  const { error: avatarUploadErr } = await supabase.storage
    .from("avatars")
    .upload(teacherAvatarPath, pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (!avatarUploadErr) {
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(teacherAvatarPath);

    await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", noorGoldenGraph.teacherId);
  }

  // Step 4: Seed Question Bank
  console.log("❓ Seeding Question Bank...");
  await supabase
    .from("question_bank")
    .delete()
    .eq("institution_id", NOOR_INSTITUTION_ID);
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
    {
      institution_id: NOOR_INSTITUTION_ID,
      created_by: noorGoldenGraph.teacherId,
      course_id: noorGoldenGraph.courseIds.eng7,
      question_text:
        "Define the central thesis statement of a persuasive essay.",
      question_type: "short_answer",
      blooms_taxonomy_level: "understanding",
      status: "draft",
      options: [],
      correct_answer: "A concise summary of the main point or claim.",
      created_at: new Date().toISOString(),
    },
  ]);

  // Step 5: Seed Course Modules & Materials
  console.log("📚 Seeding Curriculum Course Modules & Materials...");
  const { data: moduleData, error: modErr } = await supabase
    .from("course_modules")
    .insert([
      {
        course_id: noorGoldenGraph.courseIds.eng7,
        title: "Module 1: Analytical Essay Writing",
        description:
          "Mastering thesis statements, evidence integration, and transitions.",
        sort_order: 1,
        is_published: true,
        created_at: new Date().toISOString(),
      },
      {
        course_id: noorGoldenGraph.courseIds.eng7,
        title: "Module 2: Gothic Literature Studies",
        description: "Exploring themes, motifs, and character archetypes.",
        sort_order: 2,
        is_published: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (modErr) console.error("Module insert error:", modErr.message);

  if (moduleData && moduleData[0]) {
    const { error: matErr } = await supabase.from("course_materials").insert([
      {
        module_id: moduleData[0].id,
        title: "Essay Rubric & Transition Guide",
        type: "file",
        content_url: "https://example.com/essay-guide.pdf",
        description: "Comprehensive guide for analytical writing.",
        sort_order: 1,
        is_published: true,
        created_at: new Date().toISOString(),
      },
    ]);
    if (matErr) console.error("Material insert error:", matErr.message);
  }

  // Step 6: Seed Tutor Conversations & Handoff Requests
  console.log("🤖 Seeding AI Tutor Handoffs & Requests...");
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
          "Great question, Aarav! A strong introduction starts with a hook, introduces both subjects, and ends with a clear thesis statement.",
        created_at: new Date().toISOString(),
      },
    ]);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("teacher_handoff_requests").insert([
      {
        conversation_id: conv[0].id,
        student_id: noorGoldenGraph.primaryStudentId,
        teacher_id: noorGoldenGraph.teacherId,
        institution_id: NOOR_INSTITUTION_ID,
        course_id: noorGoldenGraph.courseIds.eng7,
        conversation_summary:
          "Student asked for help on thesis statement in compare/contrast essay.",
        suggested_intervention:
          "Review thesis sentence structure and give feedback.",
        trigger_reason: "low_satisfaction",
        student_consent: true,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  // Step 7: Seed Course Discussion Threads
  console.log("💬 Seeding Course Discussion Threads...");
  const { data: disc, error: discErr } = await supabase
    .from("discussion_threads")
    .insert([
      {
        course_id: noorGoldenGraph.courseIds.eng7,
        author_id: noorGoldenGraph.primaryStudentId,
        title: "Peer Feedback on Essay Outlines",
        content:
          "Hey everyone! Share your working thesis statement here for peer feedback.",
        is_pinned: true,
        is_resolved: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (discErr) console.error("Discussion insert error:", discErr.message);

  if (disc && disc[0]) {
    await supabase.from("discussion_replies").insert([
      {
        thread_id: disc[0].id,
        author_id: noorGoldenGraph.teacherId,
        content:
          "Excellent initiative, Aarav! Make sure to focus on specific evidence.",
        is_answer: true,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  // Step 8: Seed Ungraded Submissions (Teacher Grading Queue)
  console.log("📝 Seeding Ungraded Submissions in Teacher Grading Queue...");
  const { data: newAssign } = await supabase
    .from("assignments")
    .insert([
      {
        course_id: noorGoldenGraph.courseIds.eng7,
        title: "Analytical Essay First Draft",
        description: "Submit a 500-word essay analyzing Chapter 3 themes.",
        total_marks: 100,
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  if (newAssign && newAssign[0]) {
    await supabase.from("submissions").insert([
      {
        assignment_id: newAssign[0].id,
        student_id: noorGoldenGraph.primaryStudentId,
        content_url: "https://example.com/aarav-essay.docx",
        is_late: false,
        submitted_at: new Date().toISOString(),
      },
      {
        assignment_id: newAssign[0].id,
        student_id: noorGoldenGraph.comparisonStudentId,
        content_url: "https://example.com/mei-essay.docx",
        is_late: true,
        submitted_at: new Date().toISOString(),
      },
    ]);
  }

  // Step 9: Assert final profile counts remain strictly unchanged
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
    "🎉 Noor International Live Supabase Data Population SUCCESSFULLY Completed!"
  );
}

seedNoorGoldenGraph().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});

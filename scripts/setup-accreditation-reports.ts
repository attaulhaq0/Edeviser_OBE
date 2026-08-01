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

const SEED_IDS = {
  adminId: "e92b8020-a877-402b-830a-9f103b7729ee",
  coordinatorId: "ce63f4d6-5dae-4dcc-b5d8-75cb1d200a23",
  programs: {
    english: "f612d4a2-1111-4000-8000-000000000001",
    math: "f612d4a2-2222-4000-8000-000000000002",
    science: "f612d4a2-3333-4000-8000-000000000003",
    social: "f612d4a2-4444-4000-8000-000000000004",
  },
  initialJobId: "a1b2c3d4-5555-4444-8888-999999999999",
  initialReportId: "e5f6g7h8-6666-4444-8888-999999999999",
};

async function setupAccreditationBackend() {
  console.log(
    "🚀 Setting up Live Supabase Accreditation Backend & Seeding Noor..."
  );

  // 1. Ensure 'reports' bucket exists in Supabase Storage
  const { data: buckets } = await supabase.storage.listBuckets();
  const hasReportsBucket = (buckets ?? []).some((b) => b.name === "reports");
  if (!hasReportsBucket) {
    console.log("📦 Creating 'reports' Storage Bucket...");
    const { error: bErr } = await supabase.storage.createBucket("reports", {
      public: false,
    });
    if (bErr) console.warn("⚠️ Warning creating reports bucket:", bErr.message);
  } else {
    console.log("📦 'reports' Storage Bucket exists.");
  }

  // 2. Upload initial demo report document
  const samplePdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000118 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n221\n%%EOF"
  );

  const storagePath = `noor/ABET_English_7_Report.pdf`;
  const { error: upErr } = await supabase.storage
    .from("reports")
    .upload(storagePath, samplePdfContent, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    console.warn("⚠️ Warning uploading initial sample PDF:", upErr.message);
  } else {
    console.log(
      `📄 Uploaded initial sample PDF to reports bucket: ${storagePath}`
    );
  }

  // 3. Query real Noor Program IDs
  const { data: noorPrograms } = await supabase
    .from("programs")
    .select("id, code, name")
    .eq("institution_id", NOOR_INSTITUTION_ID);

  console.log("🏫 Real Noor Programs:", noorPrograms);

  if (noorPrograms && noorPrograms.length > 0) {
    for (const prog of noorPrograms) {
      console.log(
        `✅ Upserting Accreditation Approval Stages for Program (${prog.code}):`,
        prog.id
      );
      const approvalStages = [
        {
          institution_id: NOOR_INSTITUTION_ID,
          program_id: prog.id,
          stage: "coordinator",
          sort_order: 1,
          status: "done",
          approver_id: SEED_IDS.coordinatorId,
          notes: "Draft signed off by Program Coordinator.",
          decided_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
        {
          institution_id: NOOR_INSTITUTION_ID,
          program_id: prog.id,
          stage: "hod",
          sort_order: 2,
          status: "current",
          approver_id: null,
          notes: "Under review by Head of Department.",
          decided_at: null,
        },
        {
          institution_id: NOOR_INSTITUTION_ID,
          program_id: prog.id,
          stage: "qa",
          sort_order: 3,
          status: "pending",
          approver_id: null,
          notes: "Pending QA Office review.",
          decided_at: null,
        },
        {
          institution_id: NOOR_INSTITUTION_ID,
          program_id: prog.id,
          stage: "office",
          sort_order: 4,
          status: "pending",
          approver_id: null,
          notes: "Pending Accreditation Office final sign-off.",
          decided_at: null,
        },
      ];

      for (const st of approvalStages) {
        const { error } = await supabase
          .from("accreditation_approvals" as never)
          .upsert(st as never, { onConflict: "program_id, stage" } as never);
        if (error)
          console.warn(
            `⚠️ Warning upserting approval stage ${st.stage}:`,
            error.message
          );
      }
    }
  }

  // 4. Verify Noor Evidence readiness
  const { data: readinessData, error: readErr } = await supabase.rpc(
    "get_coordinator_accreditation_readiness" as never
  );
  if (readErr) console.warn("⚠️ Readiness RPC note:", readErr.message);
  else console.log("📊 Live Noor Accreditation Readiness:", readinessData);

  console.log(
    "🎉 Noor Accreditation Backend Setup & Seeding SUCCESSFULLY Completed!"
  );
}

setupAccreditationBackend().catch((err) => {
  console.error("❌ Accreditation setup exception:", err);
  process.exit(1);
});

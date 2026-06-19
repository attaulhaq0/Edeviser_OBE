import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2";
import { z } from "https://esm.sh/zod@3.23.8";
import {
  authenticateRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "../_shared/auth.ts";

const PayloadSchema = z.object({
  payment_id: z.string().min(1),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // Caller check (Req 18): require a valid JWT before any service-role work.
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return unauthorizedResponse(auth.error ?? "Unauthorized");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { payment_id } = parsed.data;

    // Fetch payment details
    const { data: payment, error: payErr } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("id", payment_id)
      .maybeSingle();

    if (payErr) throw new Error(payErr.message);
    if (!payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch student profile
    const { data: student } = await supabase
      .from("profiles")
      .select("full_name, email, institution_id")
      .eq("id", payment.student_id)
      .maybeSingle();

    // Authorization (Req 18): the owning student may fetch their own receipt;
    // admins/coordinators may fetch any receipt within their institution.
    const isStaff = ["admin", "coordinator"].includes(auth.user.role);
    const isOwner = auth.user.id === payment.student_id;
    const sameInstitution =
      (student as { institution_id?: string } | null)?.institution_id ===
      auth.user.institution_id;
    if (!isOwner && !(isStaff && sameInstitution)) {
      return forbiddenResponse(
        "Forbidden: not authorized to access this receipt"
      );
    }

    // Fetch fee structure
    const { data: feeStructure } = await supabase
      .from("fee_structures")
      .select("title, amount, due_date, program_id")
      .eq("id", payment.fee_structure_id)
      .maybeSingle();

    // Build PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = new jsPDF() as any;
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Fee Receipt", 14, 18);
    doc.setFontSize(9);
    doc.text(
      `Receipt #${payment.receipt_number ?? payment_id.slice(0, 8)}`,
      pw - 14,
      12,
      { align: "right" }
    );
    doc.text(
      `Date: ${
        payment.paid_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
      }`,
      pw - 14,
      20,
      { align: "right" }
    );

    doc.setTextColor(0, 0, 0);
    let y = 45;

    // Student info
    doc.setFontSize(11);
    doc.text("Student Information", 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Name: ${student?.full_name ?? "Unknown"}`, 14, y);
    y += 6;
    doc.text(`Email: ${student?.email ?? "N/A"}`, 14, y);
    y += 12;

    // Fee details
    doc.setFontSize(11);
    doc.text("Payment Details", 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Fee: ${feeStructure?.title ?? "N/A"}`, 14, y);
    y += 6;
    doc.text(`Fee Amount: $${feeStructure?.amount ?? 0}`, 14, y);
    y += 6;
    doc.text(`Amount Paid: $${payment.amount_paid}`, 14, y);
    y += 6;
    doc.text(`Payment Method: ${payment.payment_method ?? "N/A"}`, 14, y);
    y += 6;
    doc.text(`Status: ${payment.status}`, 14, y);
    y += 6;
    doc.text(`Due Date: ${feeStructure?.due_date ?? "N/A"}`, 14, y);
    y += 12;

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "This is a computer-generated receipt. No signature required.",
      14,
      y
    );

    const pdfBytes = doc.output("arraybuffer") as Uint8Array;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `fee-receipts/${payment.student_id.slice(0, 8)}_${ts}.pdf`;

    await supabase.storage
      .createBucket("fee-receipts", { public: false })
      .catch(() => {});
    const { error: uploadErr } = await supabase.storage
      .from("fee-receipts")
      .upload(fileName, pdfBytes, { contentType: "application/pdf" });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: signedUrl } = await supabase.storage
      .from("fee-receipts")
      .createSignedUrl(fileName, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrl?.signedUrl,
        file_name: fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

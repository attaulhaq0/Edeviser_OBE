// Task 114.4: CSV import Edge Function for competency frameworks
// Parses CSV, builds three-level hierarchy: Domain → Competency → Indicator

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  authenticateRequest,
  unauthorizedResponse,
  forbiddenResponse,
} from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CSVRow {
  domain_code: string;
  domain_title: string;
  competency_code: string;
  competency_title: string;
  indicator_code: string;
  indicator_title: string;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = [
    "domain_code",
    "domain_title",
    "competency_code",
    "competency_title",
    "indicator_code",
    "indicator_title",
  ];

  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new Error(`Missing required CSV header: ${req}`);
    }
  }

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    if (!row.domain_code || !row.indicator_code) continue;

    rows.push({
      domain_code: row.domain_code,
      domain_title: row.domain_title,
      competency_code: row.competency_code,
      competency_title: row.competency_title,
      indicator_code: row.indicator_code,
      indicator_title: row.indicator_title,
    });
  }

  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Caller check (Req 18): competency-framework import is an admin/coordinator
    // curriculum action and runs with the service-role client, so authorize the
    // caller in-handler.
    const auth = await authenticateRequest(req);
    if (!auth.user) {
      return unauthorizedResponse(auth.error ?? "Unauthorized");
    }
    if (!["admin", "coordinator"].includes(auth.user.role)) {
      return forbiddenResponse("Forbidden: admin or coordinator role required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { framework_id, csv_content } = await req.json();

    if (!framework_id || !csv_content) {
      return new Response(
        JSON.stringify({ error: "framework_id and csv_content are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Tenant scope: the framework must belong to the caller's institution.
    const { data: framework } = await supabase
      .from("competency_frameworks")
      .select("institution_id")
      .eq("id", framework_id)
      .maybeSingle();
    if (!framework) {
      return new Response(JSON.stringify({ error: "Framework not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      (framework as { institution_id: string }).institution_id !==
      auth.user.institution_id
    ) {
      return forbiddenResponse(
        "Forbidden: framework belongs to another institution"
      );
    }

    const rows = parseCSV(csv_content);
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid rows found in CSV" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build hierarchy: track domains and competencies by code
    const domainMap = new Map<string, string>(); // code → id
    const competencyMap = new Map<string, string>(); // code → id
    const errors: string[] = [];
    let imported = 0;
    let sortOrder = 0;

    for (const row of rows) {
      try {
        // Upsert domain
        if (!domainMap.has(row.domain_code)) {
          const { data: domain, error: domErr } = await supabase
            .from("competency_items")
            .upsert(
              {
                framework_id,
                parent_id: null,
                level: "domain",
                code: row.domain_code,
                title: row.domain_title,
                sort_order: sortOrder++,
              },
              { onConflict: "framework_id,code" }
            )
            .select("id")
            .single();

          if (domErr) {
            errors.push(`Domain ${row.domain_code}: ${domErr.message}`);
            continue;
          }
          domainMap.set(row.domain_code, domain.id);
        }

        // Upsert competency
        const domainId = domainMap.get(row.domain_code)!;
        if (!competencyMap.has(row.competency_code)) {
          const { data: comp, error: compErr } = await supabase
            .from("competency_items")
            .upsert(
              {
                framework_id,
                parent_id: domainId,
                level: "competency",
                code: row.competency_code,
                title: row.competency_title,
                sort_order: sortOrder++,
              },
              { onConflict: "framework_id,code" }
            )
            .select("id")
            .single();

          if (compErr) {
            errors.push(
              `Competency ${row.competency_code}: ${compErr.message}`
            );
            continue;
          }
          competencyMap.set(row.competency_code, comp.id);
        }

        // Upsert indicator
        const competencyId = competencyMap.get(row.competency_code)!;
        const { error: indErr } = await supabase
          .from("competency_items")
          .upsert(
            {
              framework_id,
              parent_id: competencyId,
              level: "indicator",
              code: row.indicator_code,
              title: row.indicator_title,
              sort_order: sortOrder++,
            },
            { onConflict: "framework_id,code" }
          );

        if (indErr) {
          errors.push(`Indicator ${row.indicator_code}: ${indErr.message}`);
        } else {
          imported++;
        }
      } catch (rowErr) {
        errors.push(`Row error: ${(rowErr as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        domains: domainMap.size,
        competencies: competencyMap.size,
        errors,
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { getManagedServerKey } from "../_shared/serverSecret.ts";

const RequestSchema = z.object({
  institution_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  full_name: z.string().trim().min(2).max(100).default("Institution Administrator"),
  locale: z.string().trim().max(10).default("en"),
}).strict();

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("FIRST_ADMIN_BOOTSTRAP_SECRET");
  const configuredEmail = Deno.env.get("FIRST_ADMIN_BOOTSTRAP_EMAIL")?.trim().toLowerCase();
  if (!expectedSecret || req.headers.get("x-first-admin-bootstrap-secret") !== expectedSecret) {
    return response({ error: "Unauthorized" }, 401);
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(await req.json());
  } catch {
    return response({ error: "Invalid bootstrap request" }, 400);
  }
  if (!configuredEmail || input.email.toLowerCase() !== configuredEmail) {
    return response({ error: "Bootstrap email is not authorized" }, 403);
  }

  const service = createClient(Deno.env.get("SUPABASE_URL")!, getManagedServerKey());
  const { data: institution, error: institutionError } = await service
    .from("institutions").select("id").eq("id", input.institution_id).maybeSingle();
  if (institutionError || !institution) return response({ error: "Institution not found" }, 404);

  const { data: existingAdmin } = await service.from("profiles")
    .select("id,email,role,institution_id").eq("institution_id", input.institution_id)
    .eq("role", "admin").limit(1).maybeSingle();
  if (existingAdmin && existingAdmin.email?.toLowerCase() !== configuredEmail) {
    return response({ error: "Institution already has an administrator" }, 409);
  }
  if (existingAdmin) return response({ success: true, idempotent: true });

  const { data: request, error: requestError } = await service
    .from("admin_bootstrap_requests")
    .insert({ institution_id: input.institution_id, email: configuredEmail })
    .select("id")
    .single();
  if (requestError || !request) return response({ error: "Bootstrap is unavailable" }, 503);

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: configuredEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      institution_id: input.institution_id,
      locale: input.locale,
      bootstrap_request_id: request.id,
    },
  });
  if (createError || !created.user) return response({ error: "Bootstrap could not create the account" }, 409);

  const userId = created.user.id;
  const { error: profileError } = await service.from("profiles").update({
    role: "admin", institution_id: input.institution_id, status: "active", email_verified_at: new Date().toISOString(),
  }).eq("id", userId);
  if (profileError) {
    await service.auth.admin.deleteUser(userId);
    return response({ error: "Bootstrap could not provision the account" }, 500);
  }
  const { error: metadataError } = await service.auth.admin.updateUserById(userId, {
    app_metadata: { institution_id: input.institution_id, user_role: "admin" },
  });
  if (metadataError) {
    await service.auth.admin.deleteUser(userId);
    return response({ error: "Bootstrap could not finalize the account" }, 500);
  }
  await service.from("audit_logs").insert({
    actor_id: userId, action: "first_admin_bootstrapped", target_type: "profile", target_id: userId,
    diff: { institution_id: input.institution_id, email: configuredEmail },
  });
  return response({ success: true, idempotent: false });
});

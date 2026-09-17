import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCronSecret } from "../_utils/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      return res.status(500).json({ error: "Missing SUPABASE_URL" });
    }

    // This handler calls a DB RPC directly (no Edge Function wrapper).
    // Preview deploys use the legacy service-role key which is the only
    // credential that has RPC execute privileges on the Preview branch.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return res
        .status(500)
        .json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.rpc(
      "deactivate_expired_ai_sessions"
    );
    if (error) throw error;

    const expired = typeof data === "number" ? data : 0;
    console.log(`AI testing auto-expiry: ${expired} session(s) expired`);
    return res.status(200).json({ success: true, expired });
  } catch (err) {
    console.error("AI testing auto-expiry failed:", err);
    const message = err instanceof Error ? err.message : "Expiry check failed";
    return res.status(500).json({ error: message });
  }
}

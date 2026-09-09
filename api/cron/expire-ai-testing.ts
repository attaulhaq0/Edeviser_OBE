import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify Vercel cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase.rpc("deactivate_expired_ai_sessions");
    if (error) throw error;

    const expired = typeof data === "number" ? data : 0;
    console.log(`AI testing auto-expiry: ${expired} session(s) expired`);
    return res.status(200).json({ success: true, expired });
  } catch (err) {
    console.error("AI testing auto-expiry failed:", err);
    return res.status(500).json({ error: "Expiry check failed" });
  }
}

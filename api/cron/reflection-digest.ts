import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyCronSecret, invokeEdgeFunction } from "../_utils/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!verifyCronSecret(req, res)) return;

  try {
    const { status, data } = await invokeEdgeFunction(
      "generate-reflection-digest"
    );
    const isOk = status >= 200 && status < 300;
    const payload =
      typeof data === "object" && data !== null
        ? { ok: isOk, ...(data as Record<string, unknown>) }
        : { ok: isOk };
    res.status(status).json(payload);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

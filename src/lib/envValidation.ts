import { z } from "zod";

/**
 * Validates required VITE_ environment variables at app startup.
 * Throws a descriptive error if any required variable is missing.
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url(
      "VITE_SUPABASE_URL must be a valid URL (e.g. https://your-project.supabase.co)"
    ),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "VITE_SUPABASE_ANON_KEY is required"),
  VITE_SENTRY_DSN: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(): AppEnv {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  });

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const msg = `[Edeviser] Missing or invalid environment variables:\n${missing}\n\nCopy .env.example to .env.local and fill in the values.`;
    console.error(msg);
    throw new Error(msg);
  }

  return result.data;
}

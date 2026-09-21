import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/auth.ts";
import { handleCourseFile, type Database } from "./handler.ts";
import { renderCourseFile } from "./pdf.ts";

function callerDatabase(request: Request): Database {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: { Authorization: request.headers.get("Authorization") ?? "" },
      },
    }
  );
  // Erase the SDK's recursive select-string generics at this narrow adapter only.
  // The port uses standard PostgREST methods and unknown result data; handler readers
  // check errors, arrays, exact counts and scope before report contract construction.
  return client as unknown as Database;
}

serve((req) =>
  handleCourseFile(req, {
    authenticate: authenticateRequest,
    // Retain RLS for every academic read, in addition to explicit role/tenant/program checks.
    database: callerDatabase,
    render: renderCourseFile,
    now: () => new Date(),
  })
);

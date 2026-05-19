import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  institution_id: string;
  invites: Array<{
    email: string;
    role: string;
  }>;
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing environment variables",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: InviteRequest = await req.json();
    const { institution_id, invites } = body;

    if (!institution_id || !invites || invites.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Missing institution_id or invites",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch institution details
    const { data: institution, error: institutionError } = await supabase
      .from("institutions")
      .select("name, slug")
      .eq("id", institution_id)
      .single();

    if (institutionError || !institution) {
      return new Response(
        JSON.stringify({
          error: "Institution not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: InviteResult[] = [];

    // Process each invite
    for (const invite of invites) {
      try {
        // Generate a secure token (using crypto.getRandomValues)
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const token = Array.from(tokenBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Insert invitation record
        const { data: invitationData, error: insertError } = await supabase
          .from("invitations")
          .insert({
            institution_id,
            email: invite.email,
            role: invite.role,
            token,
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            created_by: "system", // In production, this should be the authenticated user
          })
          .select()
          .single();

        if (insertError) {
          results.push({
            email: invite.email,
            success: false,
            error: insertError.message,
          });
          continue;
        }

        // Build invitation link
        const inviteLink = `${supabaseUrl.replace(
          "/rest/v1",
          ""
        )}/accept-invite/${token}`;

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "noreply@edeviser.com",
            to: invite.email,
            subject: `You're invited to join ${institution.name} on Edeviser`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #14B8A6 0%, #0382BD 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Welcome to Edeviser</h1>
                </div>
                <div style="background: white; padding: 40px 20px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
                  <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                    Hello,
                  </p>
                  <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                    You've been invited to join <strong>${institution.name}</strong> on Edeviser as a <strong>${invite.role}</strong>.
                  </p>
                  <p style="color: #374151; font-size: 16px; margin: 0 0 30px 0;">
                    Click the button below to accept your invitation and create your account:
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #14B8A6 0%, #0382BD 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      Accept Invitation
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0;">
                    Or copy and paste this link in your browser:
                  </p>
                  <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
                    ${inviteLink}
                  </p>
                  <p style="color: #6b7280; font-size: 12px; margin: 30px 0 0 0;">
                    This invitation expires in 7 days.
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const emailError = await emailResponse.json();
          results.push({
            email: invite.email,
            success: false,
            error: `Email send failed: ${emailError.message}`,
          });
          continue;
        }

        results.push({
          email: invite.email,
          success: true,
        });
      } catch (error) {
        results.push({
          email: invite.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

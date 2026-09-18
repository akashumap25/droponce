import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "../_shared/cors.ts";
import { MAX_SESSION_QUOTA_BYTES } from "../_shared/constants.ts";
import { errorResponse, parseSessionId, ValidationError } from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return errorResponse("Method not allowed.", 405, corsHeaders);
  try {
    const sessionId = parseSessionId(new URL(req.url).searchParams.get("sessionId"));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("get_session_reserved_bytes", { check_session_id: sessionId });
    if (error) {
      console.error("Session quota fetch failed:", error);
      return errorResponse("Unable to retrieve session quota.", 500, corsHeaders);
    }
    return new Response(JSON.stringify({ usedBytes: data ?? 0, maxBytes: MAX_SESSION_QUOTA_BYTES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, 400, corsHeaders);
    console.error("Session quota error:", error);
    return errorResponse("Unable to retrieve session quota.", 500, corsHeaders);
  }
});

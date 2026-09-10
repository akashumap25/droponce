import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { createPresignedUploadUrl } from "../_shared/r2.ts";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_SESSION_QUOTA = 100 * 1024 * 1024; // 100 MB

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { filename, sizeBytes, mimeType, isOneTime, sessionId } = await req.json();

    if (!filename || !sizeBytes || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing required upload parameters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sizeBytes > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File exceeds the 100 MB maximum size limit." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check session quota from database
    const { data: usedBytes, error: quotaError } = await supabase.rpc("get_session_active_bytes", {
      check_session_id: sessionId,
    });

    if (quotaError) {
      console.error("Quota check error:", quotaError);
    } else if ((usedBytes || 0) + sizeBytes > MAX_SESSION_QUOTA) {
      return new Response(
        JSON.stringify({ error: "Anonymous session quota exceeded (100 MB max). Wait for existing files to expire or be consumed." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 256-bit CSPRNG token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (b) => ("0" + b.toString(16)).slice(-2)).join("");

    // Compute SHA-256 hash of token
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    // Generate isolated storage key
    const storageKey = `temporary-files/${crypto.randomUUID()}`;

    // Generate R2 presigned upload URL
    const uploadUrl = await createPresignedUploadUrl(storageKey, mimeType || "application/octet-stream");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        uploadUrl,
        token,
        tokenHash,
        storageKey,
        expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Initialize upload error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to initialize upload" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

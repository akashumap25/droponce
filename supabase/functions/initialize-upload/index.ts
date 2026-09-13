import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { createSignedUploadUrl } from "../_shared/storage.ts";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (Supabase Storage free tier)
const MAX_SESSION_QUOTA = 200 * 1024 * 1024; // 200 MB session quota

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { filename, sizeBytes, mimeType, isOneTime, sessionId } = await req.json();

    if (!filename || !sizeBytes || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing required upload parameters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sizeBytes > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File exceeds the 50 MB maximum size limit." }), {
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
        JSON.stringify({ error: "Session quota exceeded (200 MB max). Wait for existing files to expire or be downloaded." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 256-bit CSPRNG token (never stored raw)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes, (b) => ("0" + b.toString(16)).slice(-2)).join("");

    // Compute SHA-256 hash of token — only the hash goes to the database
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    // Isolated storage path (UUID prevents enumeration)
    const storagePath = `temporary-files/${crypto.randomUUID()}`;

    // Generate Supabase Storage signed upload URL (15 minute validity)
    const uploadUrl = await createSignedUploadUrl(storagePath);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return new Response(
      JSON.stringify({
        uploadUrl,
        token,
        tokenHash,
        storageKey: storagePath,
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

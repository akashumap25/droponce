import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { storageKey, token, filename, sizeBytes, mimeType, isOneTime, sessionId } = await req.json();

    if (!storageKey || !token || !filename || !sizeBytes || !sessionId) {
      return new Response(JSON.stringify({ error: "Missing required metadata parameters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute token hash to store in database (never store raw token)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    // Sanitize filename
    const sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\.{2,}/g, ".")
      .trim()
      .slice(0, 255) || "unnamed_file";

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("files").insert({
      token_hash: tokenHash,
      original_filename: filename,
      sanitized_filename: sanitized,
      storage_key: storageKey,
      mime_type: mimeType || "application/octet-stream",
      size_bytes: sizeBytes,
      session_id: sessionId,
      is_one_time: Boolean(isOneTime),
      status: "active",
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to persist file record." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Complete upload error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to complete upload" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

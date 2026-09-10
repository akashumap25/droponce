import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token parameter." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute SHA-256 hash of token
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: file, error } = await supabase
      .from("files")
      .select("original_filename, sanitized_filename, mime_type, size_bytes, expires_at, is_one_time, status, created_at")
      .eq("token_hash", tokenHash)
      .single();

    if (error || !file) {
      return new Response(JSON.stringify({ error: "This temporary file link does not exist or has been deleted." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const isExpired = new Date(file.expires_at).getTime() <= now;

    if (isExpired || file.status === "expired") {
      return new Response(JSON.stringify({ error: "This temporary link has expired. The file has been permanently deleted." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.status === "downloaded" && file.is_one_time) {
      return new Response(JSON.stringify({ error: "This temporary file was configured for one-time use and has already been downloaded." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.status !== "active") {
      return new Response(JSON.stringify({ error: "This file is no longer available." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        originalFilename: file.original_filename,
        sanitizedFilename: file.sanitized_filename,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
        expiresAt: file.expires_at,
        isOneTime: file.is_one_time,
        status: file.status,
        createdAt: file.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Get file info error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to retrieve file info" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

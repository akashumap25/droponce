import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { createPresignedDownloadUrl, deleteR2Object } from "../_shared/r2.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token parameter." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute SHA-256 hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call atomic stored procedure to consume file and avoid race conditions
    const { data, error } = await supabase.rpc("consume_one_time_file", {
      lookup_hash: tokenHash,
    });

    if (error || !data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: "This link is invalid, expired, or has already been consumed." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const file = data[0];

    // Generate short-lived presigned GET URL for Cloudflare R2
    const downloadUrl = await createPresignedDownloadUrl(file.storage_key, file.sanitized_filename);

    // If one-time file, schedule or delete R2 object
    if (file.is_one_time) {
      // Background delete after slight delay so download stream can start
      setTimeout(async () => {
        try {
          await deleteR2Object(file.storage_key);
          console.log(`Purged R2 object for one-time file: ${file.storage_key}`);
        } catch (err) {
          console.error("Failed to delete consumed R2 object:", err);
        }
      }, 30000); // 30s buffer for browser to establish stream
    }

    return new Response(
      JSON.stringify({
        downloadUrl,
        filename: file.sanitized_filename,
        mimeType: file.mime_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Download file error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to authorize download." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { createSignedDownloadUrl, deleteStorageFile } from "../_shared/storage.ts";

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

    // Compute SHA-256 hash of the raw token — look up only by hash, never by raw token
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Atomically consume the file — prevents race conditions on concurrent requests
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

    // Generate short-lived signed download URL from Supabase Storage (60 seconds)
    const downloadUrl = await createSignedDownloadUrl(
      file.storage_key,
      file.sanitized_filename,
      60,
    );

    // For one-time files: delete from storage after 30s buffer so browser stream can start
    if (file.is_one_time) {
      setTimeout(async () => {
        try {
          await deleteStorageFile(file.storage_key);
          console.log(`Purged storage object for one-time file: ${file.storage_key}`);
        } catch (err) {
          console.error("Failed to delete consumed storage file:", err);
        }
      }, 30000);
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

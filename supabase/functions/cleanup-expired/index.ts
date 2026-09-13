import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders } from "../_shared/cors.ts";
import { deleteStorageFile } from "../_shared/storage.ts";

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

    // Call stored procedure to find and mark expired files in the database
    const { data: expiredFiles, error } = await supabase.rpc("mark_expired_files");

    if (error) {
      console.error("Failed to fetch expired files:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let deletedCount = 0;
    if (expiredFiles && expiredFiles.length > 0) {
      for (const item of expiredFiles) {
        try {
          await deleteStorageFile(item.expired_storage_key);
          deletedCount++;
        } catch (delErr) {
          console.error(`Failed to delete storage file ${item.expired_storage_key}:`, delErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        purgedFiles: deletedCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Cleanup expired error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to cleanup expired files" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

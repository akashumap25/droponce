import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "../_shared/cors.ts";
import { deleteStorageFile, storageObjectExists } from "../_shared/storage.ts";
import { errorResponse } from "../_shared/validation.ts";

type CleanupItem = { id: string; storageKey: string; pending: boolean };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405, corsHeaders);

  const cleanupSecret = Deno.env.get("CLEANUP_SECRET");
  if (!cleanupSecret) {
    console.error("CLEANUP_SECRET is not configured.");
    return errorResponse("Cleanup is unavailable.", 500, corsHeaders);
  }
  if (req.headers.get("x-cleanup-secret") !== cleanupSecret) {
    return errorResponse("Unauthorized.", 401, corsHeaders);
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const [expiredResult, consumedResult, pendingResult] = await Promise.all([
      supabase.rpc("get_expired_files_for_cleanup"),
      supabase.rpc("get_consumed_files_for_cleanup"),
      supabase.rpc("get_expired_pending_uploads_for_cleanup"),
    ]);
    if (expiredResult.error || consumedResult.error || pendingResult.error) {
      console.error("Cleanup queue lookup failed:", expiredResult.error ?? consumedResult.error ?? pendingResult.error);
      return errorResponse("Unable to prepare cleanup.", 500, corsHeaders);
    }

    const items: CleanupItem[] = [
      ...(expiredResult.data ?? []).map((row) => ({ id: row.expired_id, storageKey: row.expired_storage_key, pending: false })),
      ...(consumedResult.data ?? []).map((row) => ({ id: row.consumed_id, storageKey: row.consumed_storage_key, pending: false })),
      ...(pendingResult.data ?? []).map((row) => ({ id: row.pending_id, storageKey: row.pending_storage_key, pending: true })),
    ];
    let purgedFiles = 0;
    let purgedPendingUploads = 0;

    for (const item of items) {
      try {
        // A missing object is an expected abandoned-upload case and is safe to reconcile.
        if (await storageObjectExists(item.storageKey)) await deleteStorageFile(item.storageKey);
        const { data: marked, error } = item.pending
          ? await supabase.rpc("delete_pending_upload_after_storage", { p_pending_id: item.id })
          : await supabase.rpc("mark_file_deleted_after_storage", { p_file_id: item.id });
        if (error) {
          console.error("Cleanup database reconciliation failed:", error);
          continue;
        }
        if (marked) {
          if (item.pending) purgedPendingUploads++;
          else purgedFiles++;
        }
      } catch (error) {
        // Do not change database state when Storage inspection/deletion failed.
        console.error("Storage cleanup failed:", error);
      }
    }

    return new Response(JSON.stringify({ success: true, purgedFiles, purgedPendingUploads, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return errorResponse("Cleanup failed.", 500, corsHeaders);
  }
});

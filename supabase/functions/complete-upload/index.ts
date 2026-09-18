import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "../_shared/cors.ts";
import { MAX_FILE_SIZE_BYTES } from "../_shared/constants.ts";
import { getStorageObjectMetadata } from "../_shared/storage.ts";
import { errorResponse, hashToken, parseFilename, parseIsOneTime, parseMimeType, parseSessionId, parseSizeBytes, parseStorageKey, parseToken, requireObject, ValidationError } from "../_shared/validation.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405, corsHeaders);

  try {
    const body = requireObject(await req.json());
    const storageKey = parseStorageKey(body.storageKey);
    const token = parseToken(body.token);
    const filename = parseFilename(body.filename);
    const sizeBytes = parseSizeBytes(body.sizeBytes);
    const mimeType = parseMimeType(body.mimeType);
    const isOneTime = parseIsOneTime(body.isOneTime);
    const sessionId = parseSessionId(body.sessionId);
    const object = await getStorageObjectMetadata(storageKey);
    if (object.sizeBytes > MAX_FILE_SIZE_BYTES || object.sizeBytes !== sizeBytes || object.mimeType !== mimeType) {
      return errorResponse("Uploaded object does not match its authorization.", 409, corsHeaders);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("finalize_pending_upload", {
      p_token_hash: await hashToken(token), p_storage_key: storageKey, p_original_filename: filename,
      p_mime_type: mimeType, p_size_bytes: sizeBytes, p_session_id: sessionId, p_is_one_time: isOneTime,
      p_actual_size_bytes: object.sizeBytes, p_actual_mime_type: object.mimeType,
    });
    if (error) {
      console.error("Pending upload finalization failed:", error);
      return errorResponse("Unable to finalize upload.", 500, corsHeaders);
    }
    if (!data?.length) return errorResponse("Upload authorization is expired, invalid, or already completed.", 409, corsHeaders);

    return new Response(JSON.stringify({ success: true, expiresAt: data[0].expires_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, error.message.includes("50 MB") ? 413 : 400, corsHeaders);
    console.error("Complete upload error:", error);
    return errorResponse("Unable to finalize upload.", 500, corsHeaders);
  }
});

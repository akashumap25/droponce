import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "../_shared/cors.ts";
import { PENDING_UPLOAD_LIFETIME_SECONDS, UPLOAD_PREFIX } from "../_shared/constants.ts";
import { createSignedUploadUrl } from "../_shared/storage.ts";
import { errorResponse, hashToken, parseFilename, parseIsOneTime, parseMimeType, parseSessionId, parseSizeBytes, requireObject, sanitizeFilename, ValidationError } from "../_shared/validation.ts";

function generateShareCode(length = 10): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";

  const randomBytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(
    randomBytes,
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed.", 405, corsHeaders);

  try {
    const body = requireObject(await req.json());
    const filename = parseFilename(body.filename);
    const sizeBytes = parseSizeBytes(body.sizeBytes);
    const mimeType = parseMimeType(body.mimeType);
    const isOneTime = parseIsOneTime(body.isOneTime);
    const sessionId = parseSessionId(body.sessionId);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const shareCode = generateShareCode();
    const storageKey = `${UPLOAD_PREFIX}/${crypto.randomUUID()}`;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const { data: pending, error: pendingError } = await supabase.rpc("initialize_pending_upload", {
      p_token_hash: await hashToken(token), p_storage_key: storageKey, p_original_filename: filename,
      p_sanitized_filename: sanitizeFilename(filename), p_mime_type: mimeType, p_size_bytes: sizeBytes,
      p_session_id: sessionId, p_is_one_time: isOneTime,
      p_share_code: shareCode,
    });
    if (pendingError) {
      console.error("Pending upload reservation failed:", pendingError);
      return errorResponse("Unable to authorize upload.", 500, corsHeaders);
    }
    if (!pending?.length) return errorResponse("Session quota exceeded (100 MB maximum).", 429, corsHeaders);

    try {
      const upload = await createSignedUploadUrl(storageKey);
      return new Response(JSON.stringify({
        uploadToken: upload.token, storageKey: upload.path, token, shareCode,
        uploadExpiresAt: new Date(Date.now() + PENDING_UPLOAD_LIFETIME_SECONDS * 1000).toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (error) {
      console.error("Signed upload authorization failed:", error);
      return errorResponse("Unable to authorize upload.", 500, corsHeaders);
    }
  } catch (error) {
    if (error instanceof ValidationError) return errorResponse(error.message, error.message.includes("50 MB") ? 413 : 400, corsHeaders);
    console.error("Initialize upload error:", error);
    return errorResponse("Failed to initialize upload.", 500, corsHeaders);
  }
});

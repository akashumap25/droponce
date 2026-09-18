import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { corsHeaders } from "../_shared/cors.ts";
import { DOWNLOAD_URL_LIFETIME_SECONDS } from "../_shared/constants.ts";
import {
  errorResponse,
  parseShareCode,
  requireObject,
  ValidationError,
} from "../_shared/validation.ts";
import { createSignedDownloadUrl } from "../_shared/storage.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed.", 405, corsHeaders);
  }

  try {
    const shareCode = parseShareCode(
      requireObject(await req.json()).shareCode,
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Read metadata before consuming the one-time authorization.
    const { data: candidate, error: candidateError } = await supabase
      .from("files")
      .select(
        "storage_key, sanitized_filename, mime_type, expires_at, status, is_one_time",
      )
      .eq("share_code", shareCode)
      .single();

    if (
      candidateError ||
      !candidate ||
      candidate.status !== "active" ||
      new Date(candidate.expires_at).getTime() <= Date.now()
    ) {
      return errorResponse(
        "This link is invalid, expired, or has already been consumed.",
        410,
        corsHeaders,
      );
    }

    const remainingSeconds = Math.floor(
      (new Date(candidate.expires_at).getTime() - Date.now()) / 1000,
    );

    if (remainingSeconds < 1) {
      return errorResponse("This link has expired.", 410, corsHeaders);
    }

    // Create the signed URL before consuming the one-time authorization.
    const downloadUrl = await createSignedDownloadUrl(
      candidate.storage_key,
      candidate.sanitized_filename,
      Math.min(DOWNLOAD_URL_LIFETIME_SECONDS, remainingSeconds),
    );

    // Atomic database authorization.
    const { data: authorized, error: authorizationError } =
      await supabase.rpc("authorize_file_download", {
        lookup_share_code: shareCode,
      });

    if (authorizationError) {
      console.error(
        "Download authorization failed:",
        authorizationError,
      );

      return errorResponse(
        "Unable to authorize download.",
        500,
        corsHeaders,
      );
    }

    if (!authorized?.length) {
      return errorResponse(
        "This link is invalid, expired, or has already been consumed.",
        410,
        corsHeaders,
      );
    }

    return new Response(
      JSON.stringify({
        downloadUrl,
        filename: candidate.sanitized_filename,
        mimeType: candidate.mime_type,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message, 400, corsHeaders);
    }

    console.error("Download file error:", error);

    return errorResponse(
      "Unable to authorize download.",
      500,
      corsHeaders,
    );
  }
});
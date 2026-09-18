import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  errorResponse,
  parseShareCode,
  ValidationError,
} from "../_shared/validation.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "GET") {
    return errorResponse("Method not allowed.", 405, corsHeaders);
  }

  try {
    const shareCode = parseShareCode(
      new URL(req.url).searchParams.get("shareCode"),
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false,
        },
      },
    );

    const { data: file, error } = await supabase
      .from("files")
      .select(
        "original_filename, sanitized_filename, mime_type, size_bytes, expires_at, is_one_time, status, created_at",
      )
      .eq("share_code", shareCode)
      .single();

    if (error || !file) {
      return errorResponse(
        "This temporary file link does not exist or has been deleted.",
        404,
        corsHeaders,
      );
    }

    if (
      file.status !== "active" ||
      new Date(file.expires_at).getTime() <= Date.now()
    ) {
      return errorResponse(
        file.status === "downloaded" && file.is_one_time
          ? "This temporary file was configured for one-time use and has already been downloaded."
          : "This temporary link is no longer available.",
        410,
        corsHeaders,
      );
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
      {
        status: 200,
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

    console.error("Get file info error:", error);

    return errorResponse(
      "Unable to retrieve file information.",
      500,
      corsHeaders,
    );
  }
});
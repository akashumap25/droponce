// Supabase Storage helper for Deno / Supabase Edge Functions
// Replaces the previous Cloudflare R2 helper — no external credentials needed.
// The Supabase Admin client uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
// which are automatically injected by the Edge Function runtime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BUCKET_NAME = "droponce-files";

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Generate a signed upload URL for direct browser → Supabase Storage PUT upload.
 * Valid for 15 minutes. The browser XHRs a PUT to this URL with the raw file body.
 */
export async function createSignedUploadUrl(storagePath: string): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Generate a short-lived signed download URL (default: 60 seconds).
 * Sets Content-Disposition so the browser downloads with the correct filename.
 */
export async function createSignedDownloadUrl(
  storagePath: string,
  filename: string,
  expiresIn = 60,
): Promise<string> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn, {
      download: filename,
    });

  if (error || !data) {
    throw new Error(`Failed to create signed download URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Permanently delete a file from Supabase Storage.
 * Used by download-file (one-time files) and cleanup-expired (expired files).
 */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete storage file "${storagePath}": ${error.message}`);
  }
}

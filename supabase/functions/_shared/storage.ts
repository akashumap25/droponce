// Supabase Storage helper for Deno / Supabase Edge Functions
// The Supabase Admin client uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
// which are automatically injected by the Edge Function runtime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";
import { BUCKET_NAME } from "./constants.ts";

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Generate a signed upload URL for direct browser → Supabase Storage upload.
 * The pending-upload record separately limits how long the upload can be finalized.
 */
export async function createSignedUploadUrl(storagePath: string): Promise<{ signedUrl: string; token: string; path: string }> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new Error(`Failed to create signed upload URL: ${error?.message ?? "unknown error"}`);
  }

  if (!data.signedUrl || !data.token || !data.path) {
    throw new Error("Storage did not return a complete signed upload authorization.");
  }
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

export async function getStorageObjectMetadata(storagePath: string): Promise<{ sizeBytes: number; mimeType: string }> {
  const separator = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, separator);
  const objectName = storagePath.slice(separator + 1);
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 100, search: objectName });
  if (error || !data) throw new Error("Failed to inspect uploaded storage object.");

  const object = data.find((entry) => entry.name === objectName);
  const size = Number(object?.metadata?.size);
  const mimeType = object?.metadata?.mimetype;
  if (!object || !Number.isSafeInteger(size) || size <= 0 || typeof mimeType !== "string") {
    throw new Error("Uploaded storage object is missing valid metadata.");
  }
  return { sizeBytes: size, mimeType: mimeType.toLowerCase() };
}

export async function storageObjectExists(storagePath: string): Promise<boolean> {
  const separator = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, separator);
  const objectName = storagePath.slice(separator + 1);
  const supabase = getAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 100, search: objectName });
  if (error || !data) throw new Error("Failed to inspect storage object.");
  return data.some((entry) => entry.name === objectName);
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

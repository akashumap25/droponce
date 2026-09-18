import {
  MAX_FILE_SIZE_BYTES,
} from "./constants.ts";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      error: message,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

export function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError("Invalid request body.");
  }

  return value as Record<string, unknown>;
}

export function parseToken(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 32 ||
    value.length > 512
  ) {
    throw new ValidationError("Invalid security token.");
  }

  return value;
}

const SHARE_CODE_PATTERN = /^[A-Za-z0-9]{10}$/;

export function parseShareCode(value: unknown): string {
  if (
    typeof value !== "string" ||
    !SHARE_CODE_PATTERN.test(value)
  ) {
    throw new ValidationError("Invalid share code.");
  }

  return value;
}

export function parseSessionId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[a-zA-Z0-9_-]{16,128}$/.test(value)
  ) {
    throw new ValidationError("Invalid session ID.");
  }

  return value;
}

export function parseStorageKey(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 512 ||
    value.includes("..") ||
    value.startsWith("/") ||
    value.includes("\\")
  ) {
    throw new ValidationError("Invalid storage key.");
  }

  return value;
}

export function parseFilename(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255
  ) {
    throw new ValidationError("Invalid filename.");
  }

  return value;
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255) || "download";
}

export function parseMimeType(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255 ||
    !/^[\w.+-]+\/[\w.+-]+$/.test(value)
  ) {
    throw new ValidationError("Invalid MIME type.");
  }

  return value;
}

export function parseSizeBytes(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > MAX_FILE_SIZE_BYTES
  ) {
    throw new ValidationError(
      `File exceeds the maximum allowed size of 50 MB.`,
    );
  }

  return value;
}

export function parseIsOneTime(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError("Invalid one-time download setting.");
  }

  return value;
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(
    new Uint8Array(hashBuffer),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}
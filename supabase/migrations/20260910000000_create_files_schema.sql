-- DROPONCE — Production Supabase PostgreSQL Schema
-- Ephemeral File Sharing Vault with Atomic Single-Use Invalidation & Expiration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum or Check constraint for file lifecycle status
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,          -- SHA-256 hash of the 256-bit unguessable client token
    original_filename TEXT NOT NULL,
    sanitized_filename TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,         -- Cloudflare R2 object path: temporary-files/<uuid>
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 104857600), -- Max 100 MB
    session_id TEXT NOT NULL,                -- Anonymous browser session ID for 100 MB quota tracking
    is_one_time BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'downloaded', 'expired', 'deleted')),
    download_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    downloaded_at TIMESTAMPTZ
);

-- Fast lookup on the hashed token
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_token_hash ON public.files (token_hash);

-- Fast index for background cleanup of expired active files
CREATE INDEX IF NOT EXISTS idx_files_cleanup ON public.files (expires_at) WHERE status = 'active';

-- Fast index for anonymous session quota calculation
CREATE INDEX IF NOT EXISTS idx_files_session_quota ON public.files (session_id, status);

-- Enable Row Level Security
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Anonymous users cannot directly query or tamper with files table;
-- all operations are gated behind Edge Functions with service-role security.
CREATE POLICY "Deny direct public table access"
    ON public.files
    FOR ALL
    TO anon
    USING (false);

-- Atomic Single-Use Download Function (Prevents Race Conditions)
-- Executes an atomic UPDATE returning the file metadata only if active and not expired.
-- Hardened with explicit search_path to prevent security definer escalation.
CREATE OR REPLACE FUNCTION public.consume_one_time_file(lookup_hash TEXT)
RETURNS TABLE (
    id UUID,
    storage_key TEXT,
    sanitized_filename TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    is_one_time BOOLEAN,
    status TEXT
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.files
    SET status = CASE WHEN files.is_one_time THEN 'downloaded' ELSE files.status END,
        download_count = files.download_count + 1,
        downloaded_at = NOW()
    WHERE files.token_hash = lookup_hash
      AND files.status = 'active'
      AND files.expires_at > NOW()
    RETURNING 
        files.id, 
        files.storage_key, 
        files.sanitized_filename, 
        files.mime_type, 
        files.size_bytes, 
        files.is_one_time, 
        files.status;
END;
$$;

-- Function to calculate active usage for an anonymous session
-- Hardened with explicit search_path.
CREATE OR REPLACE FUNCTION public.get_session_active_bytes(check_session_id TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    total_bytes BIGINT;
BEGIN
    SELECT COALESCE(SUM(size_bytes), 0)
    INTO total_bytes
    FROM public.files
    WHERE session_id = check_session_id
      AND status = 'active'
      AND expires_at > NOW();
      
    RETURN total_bytes;
END;
$$;

-- Stored procedure for scheduled cleanup of expired files
-- Hardened with explicit search_path.
CREATE OR REPLACE FUNCTION public.mark_expired_files()
RETURNS TABLE (
    expired_id UUID,
    expired_storage_key TEXT
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.files
    SET status = 'expired'
    WHERE files.status = 'active'
      AND files.expires_at <= NOW()
    RETURNING files.id, files.storage_key;
END;
$$;

-- Optional pg_cron automated schedule for Supabase (if pg_cron extension is enabled):
-- SELECT cron.schedule('droponce_purge_expired', '*/15 * * * *', 'SELECT public.mark_expired_files();');

-- Server-owned upload authorization, quota reservations, and lifecycle RPCs.
-- All functions below are callable only by the service_role used by Edge Functions.

CREATE TABLE IF NOT EXISTS public.pending_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    sanitized_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
    session_id TEXT NOT NULL,
    is_one_time BOOLEAN NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'deleted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);

-- NOT VALID preserves any historical records while enforcing these invariants for
-- every new row; pending_uploads is created with the equivalent server checks.
ALTER TABLE public.files
    ADD CONSTRAINT files_token_hash_sha256_check
    CHECK (token_hash ~ '^[0-9a-f]{64}$') NOT VALID,
    ADD CONSTRAINT files_storage_key_uploads_check
    CHECK (storage_key ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') NOT VALID;

ALTER TABLE public.pending_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.files, public.pending_uploads FROM anon, authenticated, PUBLIC;
GRANT ALL ON TABLE public.files, public.pending_uploads TO service_role;

CREATE INDEX IF NOT EXISTS idx_pending_uploads_session_status
    ON public.pending_uploads (session_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_uploads_expires_at
    ON public.pending_uploads (expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_files_status_expires_at
    ON public.files (status, expires_at);

CREATE OR REPLACE FUNCTION public.initialize_pending_upload(
    p_token_hash TEXT,
    p_storage_key TEXT,
    p_original_filename TEXT,
    p_sanitized_filename TEXT,
    p_mime_type TEXT,
    p_size_bytes BIGINT,
    p_session_id TEXT,
    p_is_one_time BOOLEAN
)
RETURNS TABLE (pending_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reserved_bytes BIGINT;
BEGIN
    -- Serializes reservations for one anonymous session without globally locking uploads.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_session_id, 0));

    SELECT COALESCE(SUM(size_bytes), 0) INTO reserved_bytes
    FROM (
        SELECT size_bytes FROM public.files
        WHERE session_id = p_session_id AND status = 'active' AND expires_at > NOW()
        UNION ALL
        SELECT size_bytes FROM public.pending_uploads
        WHERE session_id = p_session_id AND status = 'pending' AND expires_at > NOW()
    ) reservations;

    IF reserved_bytes + p_size_bytes > 104857600 THEN
        RETURN;
    END IF;

    RETURN QUERY
    INSERT INTO public.pending_uploads (
        token_hash, storage_key, original_filename, sanitized_filename, mime_type,
        size_bytes, session_id, is_one_time, expires_at
    ) VALUES (
        p_token_hash, p_storage_key, p_original_filename, p_sanitized_filename, p_mime_type,
        p_size_bytes, p_session_id, p_is_one_time, NOW() + INTERVAL '15 minutes'
    )
    RETURNING id, pending_uploads.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_pending_upload(
    p_token_hash TEXT,
    p_storage_key TEXT,
    p_original_filename TEXT,
    p_mime_type TEXT,
    p_size_bytes BIGINT,
    p_session_id TEXT,
    p_is_one_time BOOLEAN,
    p_actual_size_bytes BIGINT,
    p_actual_mime_type TEXT
)
RETURNS TABLE (file_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pending_row public.pending_uploads%ROWTYPE;
    created_file_id UUID;
    created_expires_at TIMESTAMPTZ;
BEGIN
    -- Lock the exact authorization so only one concurrent finalizer can convert it.
    SELECT * INTO pending_row
    FROM public.pending_uploads
    WHERE token_hash = p_token_hash
      AND storage_key = p_storage_key
      AND original_filename = p_original_filename
      AND mime_type = p_mime_type
      AND size_bytes = p_size_bytes
      AND session_id = p_session_id
      AND is_one_time = p_is_one_time
      AND status = 'pending'
      AND expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- complete-upload obtains actual values from the private Storage object before
    -- calling this RPC. A failed check leaves this authorization retryable.
    IF p_actual_size_bytes IS NULL
       OR p_actual_mime_type IS NULL
       OR p_actual_size_bytes <> pending_row.size_bytes
       OR p_actual_size_bytes <= 0
       OR p_actual_size_bytes > 52428800
       OR p_actual_mime_type <> pending_row.mime_type THEN
        RETURN;
    END IF;

    INSERT INTO public.files (
        token_hash, original_filename, sanitized_filename, storage_key, mime_type,
        size_bytes, session_id, is_one_time, status, expires_at
    ) VALUES (
        pending_row.token_hash, pending_row.original_filename, pending_row.sanitized_filename,
        pending_row.storage_key, pending_row.mime_type, pending_row.size_bytes,
        pending_row.session_id, pending_row.is_one_time, 'active', NOW() + INTERVAL '24 hours'
    )
    RETURNING files.id, files.expires_at INTO created_file_id, created_expires_at;

    -- INSERT and DELETE share this function transaction. If either fails, PostgreSQL
    -- rolls back both changes, preserving the pending authorization.
    DELETE FROM public.pending_uploads
    WHERE id = pending_row.id
      AND status = 'pending';

    file_id := created_file_id;
    expires_at := created_expires_at;
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_session_reserved_bytes(check_session_id TEXT)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(size_bytes), 0)::BIGINT
    FROM (
        SELECT size_bytes FROM public.files
        WHERE session_id = check_session_id AND status = 'active' AND expires_at > NOW()
        UNION ALL
        SELECT size_bytes FROM public.pending_uploads
        WHERE session_id = check_session_id AND status = 'pending' AND expires_at > NOW()
    ) reservations;
$$;

-- Signed URLs are created first in the Edge Function. This atomic update is only
-- performed after signing succeeds, so a signing failure never consumes a one-time file.
CREATE OR REPLACE FUNCTION public.authorize_file_download(lookup_hash TEXT)
RETURNS TABLE (
    id UUID,
    storage_key TEXT,
    sanitized_filename TEXT,
    mime_type TEXT,
    expires_at TIMESTAMPTZ,
    is_one_time BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.files
    SET status = CASE WHEN files.is_one_time THEN 'downloaded' ELSE files.status END,
        download_count = files.download_count + 1,
        downloaded_at = CASE WHEN files.is_one_time THEN NOW() ELSE files.downloaded_at END
    WHERE files.token_hash = lookup_hash
      AND files.status = 'active'
      AND files.expires_at > NOW()
    RETURNING files.id, files.storage_key, files.sanitized_filename, files.mime_type,
              files.expires_at, files.is_one_time;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expired_files_for_cleanup()
RETURNS TABLE (expired_id UUID, expired_storage_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, storage_key FROM public.files
    WHERE status IN ('active', 'expired') AND expires_at <= NOW();
$$;

CREATE OR REPLACE FUNCTION public.get_consumed_files_for_cleanup()
RETURNS TABLE (consumed_id UUID, consumed_storage_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, storage_key FROM public.files
    WHERE status = 'downloaded' AND is_one_time = true
      AND downloaded_at <= NOW() - INTERVAL '60 seconds';
$$;

CREATE OR REPLACE FUNCTION public.get_expired_pending_uploads_for_cleanup()
RETURNS TABLE (pending_id UUID, pending_storage_key TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, storage_key FROM public.pending_uploads
    WHERE status = 'pending' AND expires_at <= NOW();
$$;

CREATE OR REPLACE FUNCTION public.mark_file_deleted_after_storage(p_file_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH updated AS (
        UPDATE public.files
        SET status = 'deleted'
        WHERE id = p_file_id
          AND (
            (status IN ('active', 'expired') AND expires_at <= NOW())
            OR (status = 'downloaded' AND is_one_time = true AND downloaded_at <= NOW() - INTERVAL '60 seconds')
          )
        RETURNING 1
    ) SELECT EXISTS (SELECT 1 FROM updated);
$$;

CREATE OR REPLACE FUNCTION public.delete_pending_upload_after_storage(p_pending_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH deleted AS (
        DELETE FROM public.pending_uploads
        WHERE id = p_pending_id AND status = 'pending' AND expires_at <= NOW()
        RETURNING 1
    ) SELECT EXISTS (SELECT 1 FROM deleted);
$$;

REVOKE ALL ON FUNCTION public.consume_one_time_file(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_session_active_bytes(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_expired_files() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_expired_files_for_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_consumed_files_for_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_pending_upload(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_pending_upload(TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_session_reserved_bytes(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.authorize_file_download(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_expired_pending_uploads_for_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_file_deleted_after_storage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_pending_upload_after_storage(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.initialize_pending_upload(TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_pending_upload(TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_session_reserved_bytes(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.authorize_file_download(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expired_files_for_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_consumed_files_for_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_expired_pending_uploads_for_cleanup() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_file_deleted_after_storage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_pending_upload_after_storage(UUID) TO service_role;

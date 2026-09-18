CREATE OR REPLACE FUNCTION public.initialize_pending_upload(
    p_token_hash TEXT,
    p_storage_key TEXT,
    p_original_filename TEXT,
    p_sanitized_filename TEXT,
    p_mime_type TEXT,
    p_size_bytes BIGINT,
    p_session_id TEXT,
    p_is_one_time BOOLEAN,
    p_share_code TEXT
)
RETURNS TABLE (pending_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reserved_bytes BIGINT;
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended(p_session_id, 0)
    );

    SELECT COALESCE(SUM(reservations.size_bytes), 0)
    INTO reserved_bytes
    FROM (
        SELECT public.files.size_bytes
        FROM public.files
        WHERE public.files.session_id = p_session_id
          AND public.files.status = 'active'
          AND public.files.expires_at > NOW()

        UNION ALL

        SELECT public.pending_uploads.size_bytes
        FROM public.pending_uploads
        WHERE public.pending_uploads.session_id = p_session_id
          AND public.pending_uploads.status = 'pending'
          AND public.pending_uploads.expires_at > NOW()
    ) AS reservations;

    IF reserved_bytes + p_size_bytes > 104857600 THEN
        RETURN;
    END IF;

    RETURN QUERY
    INSERT INTO public.pending_uploads (
        token_hash,
        storage_key,
        original_filename,
        sanitized_filename,
        mime_type,
        size_bytes,
        session_id,
        is_one_time,
        share_code,
        expires_at
    )
    VALUES (
        p_token_hash,
        p_storage_key,
        p_original_filename,
        p_sanitized_filename,
        p_mime_type,
        p_size_bytes,
        p_session_id,
        p_is_one_time,
        p_share_code,
        NOW() + INTERVAL '15 minutes'
    )
    RETURNING
        public.pending_uploads.id,
        public.pending_uploads.expires_at;
END;
$$;
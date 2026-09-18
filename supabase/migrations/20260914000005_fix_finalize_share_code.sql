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
    SELECT *
    INTO pending_row
    FROM public.pending_uploads
    WHERE public.pending_uploads.token_hash = p_token_hash
      AND public.pending_uploads.storage_key = p_storage_key
      AND public.pending_uploads.original_filename = p_original_filename
      AND public.pending_uploads.mime_type = p_mime_type
      AND public.pending_uploads.size_bytes = p_size_bytes
      AND public.pending_uploads.session_id = p_session_id
      AND public.pending_uploads.is_one_time = p_is_one_time
      AND public.pending_uploads.status = 'pending'
      AND public.pending_uploads.expires_at > NOW()
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_actual_size_bytes IS NULL
       OR p_actual_mime_type IS NULL
       OR p_actual_size_bytes <> pending_row.size_bytes
       OR p_actual_size_bytes <= 0
       OR p_actual_size_bytes > 52428800
       OR p_actual_mime_type <> pending_row.mime_type THEN
        RETURN;
    END IF;

    INSERT INTO public.files (
        token_hash,
        share_code,
        original_filename,
        sanitized_filename,
        storage_key,
        mime_type,
        size_bytes,
        session_id,
        is_one_time,
        status,
        expires_at
    )
    VALUES (
        pending_row.token_hash,
        pending_row.share_code,
        pending_row.original_filename,
        pending_row.sanitized_filename,
        pending_row.storage_key,
        pending_row.mime_type,
        pending_row.size_bytes,
        pending_row.session_id,
        pending_row.is_one_time,
        'active',
        NOW() + INTERVAL '24 hours'
    )
    RETURNING
        public.files.id,
        public.files.expires_at
    INTO created_file_id, created_expires_at;

    DELETE FROM public.pending_uploads
    WHERE public.pending_uploads.id = pending_row.id
      AND public.pending_uploads.status = 'pending';

    file_id := created_file_id;
    expires_at := created_expires_at;

    RETURN NEXT;
END;
$$;
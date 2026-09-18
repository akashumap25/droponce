DROP FUNCTION IF EXISTS public.authorize_file_download(TEXT);

CREATE FUNCTION public.authorize_file_download(
    lookup_share_code TEXT
)
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
    SET
        status = CASE
            WHEN public.files.is_one_time THEN 'downloaded'
            ELSE public.files.status
        END,
        download_count = public.files.download_count + 1,
        downloaded_at = CASE
            WHEN public.files.is_one_time THEN NOW()
            ELSE public.files.downloaded_at
        END
    WHERE public.files.share_code = lookup_share_code
      AND public.files.status = 'active'
      AND public.files.expires_at > NOW()
    RETURNING
        public.files.id,
        public.files.storage_key,
        public.files.sanitized_filename,
        public.files.mime_type,
        public.files.expires_at,
        public.files.is_one_time;
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_file_download(TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.authorize_file_download(TEXT)
TO service_role;
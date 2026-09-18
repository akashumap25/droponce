-- Cleanup helpers for DROPONCE lifecycle management.
-- Storage objects are deleted by the cleanup Edge Function.
-- Database rows are marked "deleted" only after Storage deletion succeeds.

-- Find active files whose 24-hour lifetime has expired.
CREATE OR REPLACE FUNCTION public.get_expired_files_for_cleanup()
RETURNS TABLE (
    expired_id UUID,
    expired_storage_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        files.id,
        files.storage_key
    FROM public.files
    WHERE files.status = 'active'
      AND files.expires_at <= NOW();
END;
$$;


-- Find one-time files that were successfully consumed
-- and have passed the signed-URL grace period.
CREATE OR REPLACE FUNCTION public.get_consumed_files_for_cleanup()
RETURNS TABLE (
    consumed_id UUID,
    consumed_storage_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        files.id,
        files.storage_key
    FROM public.files
    WHERE files.status = 'downloaded'
      AND files.is_one_time = true
      AND files.downloaded_at IS NOT NULL
      AND files.downloaded_at <= NOW() - INTERVAL '1 minute';
END;
$$;
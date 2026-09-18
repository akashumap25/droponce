-- Align database limits with the DROPONCE product limits.
-- Maximum individual file size: 50 MB.
-- Anonymous session quota: 100 MB is enforced separately.

ALTER TABLE public.files
DROP CONSTRAINT IF EXISTS files_size_bytes_check;

ALTER TABLE public.files
ADD CONSTRAINT files_size_bytes_check
CHECK (size_bytes > 0 AND size_bytes <= 52428800);

-- Update the storage_key documentation to reflect Supabase Storage.
COMMENT ON COLUMN public.files.storage_key IS
'Supabase Storage object path in the private droponce-files bucket.';
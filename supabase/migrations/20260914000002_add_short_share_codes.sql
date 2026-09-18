ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS share_code TEXT;

ALTER TABLE public.pending_uploads
ADD COLUMN IF NOT EXISTS share_code TEXT;

ALTER TABLE public.files
ADD CONSTRAINT files_share_code_format
CHECK (
    share_code IS NULL
    OR share_code ~ '^[A-Za-z0-9]{10}$'
);

ALTER TABLE public.pending_uploads
ADD CONSTRAINT pending_uploads_share_code_format
CHECK (
    share_code IS NULL
    OR share_code ~ '^[A-Za-z0-9]{10}$'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_files_share_code
ON public.files (share_code)
WHERE share_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_uploads_share_code
ON public.pending_uploads (share_code)
WHERE share_code IS NOT NULL;
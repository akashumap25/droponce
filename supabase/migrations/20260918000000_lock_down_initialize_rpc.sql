REVOKE EXECUTE
ON FUNCTION public.initialize_pending_upload(
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    BIGINT,
    TEXT,
    BOOLEAN,
    TEXT
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.initialize_pending_upload(
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    BIGINT,
    TEXT,
    BOOLEAN,
    TEXT
)
TO service_role;
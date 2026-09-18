# DROPONCE

Upload. Share. Gone.

DROPONCE is an anonymous, temporary file-sharing application built with React, Vite, Supabase Edge Functions, PostgreSQL, and private Supabase Storage.

## Security model

- Storage uses the private `droponce-files` Supabase Storage bucket. Cloudflare R2 is not used.
- Files are limited to 50 MB and anonymous sessions have a server-enforced 100 MB active/reserved quota.
- A finalized file expires 24 hours after finalization.
- Share links use a server-generated 256-bit random token. PostgreSQL stores only `SHA-256(token)`.
- Upload metadata, quota reservations, expiration, and storage paths are server-owned.
- Downloads are authorized by Edge Functions and return a signed URL valid for at most 60 seconds.
- One-time downloads are atomically authorized once; cleanup removes the physical object after the signed URL grace period.
- Incomplete uploads expire after 15 minutes and are cleaned from Storage and PostgreSQL.

The client has no service-role credential. Only public `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_API_BASE_URL` belong in the frontend environment.

## Local development

```bash
npm ci
npm run build
npm run dev
```

The default UI can use its local mock mode. Set `VITE_USE_MOCK_API=false` and configure the public Supabase variables to use the deployed Edge Functions.

## Backend lifecycle

```text
initialize-upload -> pending_uploads reservation -> signed upload
  -> complete-upload verifies Storage metadata -> files (active, 24 hours)
  -> download-file signs then atomically authorizes -> downloaded (one-time only)
  -> cleanup deletes Storage first -> database row deleted
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for migration, secret, function, and scheduled-cleanup setup.

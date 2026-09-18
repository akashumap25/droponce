# DROPONCE deployment

## Supabase

1. Link the intended project and inspect pending migrations.

   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase migration list
   ```

2. Review and apply migrations, including `20260913000002_secure_pending_upload_lifecycle.sql`.

   ```bash
   npx supabase db push
   ```

   The migration keeps RLS enabled, creates the private `droponce-files` bucket configuration from the existing migration, adds `pending_uploads`, and restricts privileged RPC execution to `service_role`.

3. Configure server-only Edge Function secrets in Supabase. `SUPABASE_URL` is provided by the runtime; set `SUPABASE_SERVICE_ROLE_KEY` and a high-entropy `CLEANUP_SECRET` as Edge Function secrets. Never put a service-role or secret key in any `VITE_*` value.

4. Set `ALLOWED_ORIGIN` to the canonical production Vercel origin. Leaving it unset preserves the current permissive CORS behavior for development.

5. Deploy the six functions only after local checks pass.

   ```bash
   npx supabase functions deploy initialize-upload --no-verify-jwt
   npx supabase functions deploy complete-upload --no-verify-jwt
   npx supabase functions deploy get-file-info --no-verify-jwt
   npx supabase functions deploy download-file --no-verify-jwt
   npx supabase functions deploy get-session-quota --no-verify-jwt
   npx supabase functions deploy cleanup-expired --no-verify-jwt
   ```

`--no-verify-jwt` is intentional only because DROPONCE is anonymous; each function performs its own validation and uses server-side database authorization.

## Frontend environment

```env
VITE_USE_MOCK_API=false
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<PUBLIC_ANON_KEY>
VITE_API_BASE_URL=https://<PROJECT_REF>.supabase.co/functions/v1
```

Only public URL and anon key values belong in Vercel. Do not configure Storage access keys or Cloudflare R2 credentials; DROPONCE uses Supabase Storage only.

## Cleanup schedule

Invoke `cleanup-expired` from a protected scheduler (for example Supabase Cron plus an authenticated HTTP invocation) at least every 15 minutes with `x-cleanup-secret: <CLEANUP_SECRET>`. The function deletes the Storage object first, then records `deleted` only when physical deletion or confirmed absence succeeded. It also removes expired pending uploads.

## Production verification

- Bucket `droponce-files` is private and has a 50 MB object limit.
- No direct `anon` or `authenticated` policies allow reads/writes to DROPONCE objects or application tables.
- 50 MB file maximum, 100 MB anonymous session quota, and 24-hour final file lifetime behave as expected.
- A one-time link returns exactly one authorization under concurrent requests.
- A signed download URL is valid for at most 60 seconds and never longer than the file's remaining lifetime.
- The production frontend bundle contains no `SUPABASE_SERVICE_ROLE_KEY` or privileged `VITE_*` value.

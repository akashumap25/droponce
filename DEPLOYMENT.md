# DROPONCE — Production Deployment Guide

> **Upload. Share. Gone.**
>
> Production-oriented deployment guide for the DROPONCE temporary file-sharing MVP.

---

## 1. Production Architecture

DROPONCE uses a single Supabase backend for PostgreSQL, private file storage, and Edge Functions.

```text
                         INTERNET
                            │
                            ▼
                  ┌──────────────────┐
                  │ React + Vite     │
                  │ Vercel           │
                  └────────┬─────────┘
                           │ HTTPS
                           ▼
              ┌──────────────────────────┐
              │ Supabase Edge Functions  │
              │                          │
              │ initialize-upload        │
              │ complete-upload          │
              │ get-file-info            │
              │ download-file            │
              │ get-session-quota        │
              │ cleanup-expired          │
              └───────────┬───────┬──────┘
                          │       │
                 ┌────────▼───┐ ┌─▼────────────────┐
                 │ PostgreSQL │ │ Supabase Storage │
                 │            │ │                  │
                 │ Metadata   │ │ Private files    │
                 │ Tokens     │ │ temporary-files  │
                 │ Expiry     │ │                  │
                 │ Quota      │ │                  │
                 └────────────┘ └──────────────────┘
```

### Technology stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Frontend hosting | Vercel or Cloudflare Pages |
| Backend | Supabase Edge Functions |
| Database | Supabase PostgreSQL |
| File storage | **Supabase Storage** |
| Authentication | Anonymous/session-based |
| Maximum individual file | **50 MB** |
| Anonymous session quota | **100 MB** |
| Default lifetime | **24 hours** |
| Public file bucket | **Disabled** |

### Important

Cloudflare R2 is **not used** by the current architecture.

Do not configure, document, or deploy R2 credentials.

---

# 2. Prerequisites

Install:

- Node.js
- npm
- Git
- Supabase CLI

Verify:

```bash
node --version
npm --version
git --version
npx supabase --version
```

From the project directory:

```bash
npm install
```

Run the application locally:

```bash
npm run dev
```

---

# 3. Project Structure

The expected structure is approximately:

```text
droponce/
├── src/
│   ├── components/
│   ├── context/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   └── main.tsx
│
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   ├── initialize-upload/
│   │   ├── complete-upload/
│   │   ├── download-file/
│   │   ├── get-file-info/
│   │   ├── get-session-quota/
│   │   └── cleanup-expired/
│   │
│   └── migrations/
│
├── public/
├── .env.example
├── vercel.json
├── package.json
└── DEPLOYMENT.md
```

---

# 4. Supabase Project Setup

Create a production Supabase project.

Use a strong database password and select a region appropriate for your users.

After creating the project, record:

```text
Project URL
Project Reference ID
Anon / Publishable key
```

Do not publish or commit privileged keys.

---

# 5. Database Setup

The database stores file metadata, token hashes, expiration information, download state, and anonymous-session quota information.

Expected conceptual schema:

```text
files
├── id
├── token_hash
├── original_filename
├── storage_key
├── mime_type
├── size_bytes
├── created_at
├── expires_at
├── downloaded_at
├── status
└── download_count
```

Recommended states:

```text
active
consumed
expired
deleted
```

Run the migration from the repository.

If using the Supabase CLI:

```bash
npx supabase login
```

Link the local project:

```bash
npx supabase link --project-ref <your-project-ref>
```

Push migrations:

```bash
npx supabase db push
```

Alternatively, execute the migration SQL in the Supabase SQL Editor.

## Database security requirements

Verify that:

- Row Level Security is enabled where required.
- Anonymous users cannot directly modify file metadata.
- Sensitive metadata is not publicly queryable.
- Token hashes have an appropriate unique index.
- Expiration queries are indexed.
- The one-time consumption operation is atomic.
- Session quota calculations are server-side.
- Storage keys are not exposed unnecessarily.

---

# 6. Supabase Storage Setup

Open:

```text
Supabase Dashboard
→ Storage
→ New Bucket
```

Create:

```text
Bucket name: temporary-files
Public: OFF
```

The bucket must remain **private**.

Expected structure:

```text
temporary-files/
├── random-storage-key-1
├── random-storage-key-2
└── random-storage-key-3
```

Do not use predictable storage keys.

Good:

```text
7d9c1a2f-.../random-object
```

Bad:

```text
file-1.pdf
file-2.pdf
user123.pdf
```

## Storage security

The browser must not receive unrestricted bucket access.

The backend should control:

- Upload authorization
- Storage object creation
- Storage object verification
- Download authorization
- Object deletion

Do not make the bucket public merely to simplify downloads.

---

# 7. File Limits

DROPONCE currently uses:

```text
Maximum individual file: 50 MB
Maximum anonymous session quota: 100 MB
```

The frontend may validate 50 MB for better UX, but the backend must enforce it independently.

Example:

```ts
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
```

The backend must reject:

```text
51 MB ❌
```

A session may theoretically contain:

```text
50 MB + 50 MB = 100 MB
```

but must reject usage above:

```text
100 MB
```

Do not use `localStorage` or a frontend counter as the authoritative quota.

---

# 8. Frontend Environment Variables

Create a local `.env` file for development.

Example:

```env
VITE_USE_MOCK_API=false
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-public-anon-key>
VITE_API_BASE_URL=https://<your-project-ref>.supabase.co/functions/v1
```

### Public frontend variables

The following may be present in the browser:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_BASE_URL
VITE_USE_MOCK_API
```

The Supabase anon/publishable key is intended for client-side use, subject to correct RLS and backend authorization.

### NEVER expose

Do not put any of these in Vite variables:

```text
SUPABASE_SERVICE_ROLE_KEY
```

Do not create:

```env
VITE_SUPABASE_SERVICE_ROLE_KEY=...
```

Never commit secrets to Git.

---

# 9. Supabase Edge Function Secrets

Because the architecture now uses Supabase Storage, **no Cloudflare R2 secrets are required**.

Do not configure:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

Server-side functions may use the Supabase environment/configuration available to Edge Functions.

If your implementation requires an explicit server-side service-role secret, configure it only as a Supabase Edge Function secret and never expose it to the frontend.

Example:

```bash
npx supabase secrets set ALLOWED_ORIGIN="https://<your-production-domain>"
```

If you use multiple production domains, configure the CORS strategy accordingly.

---

# 10. CORS Configuration

Your Edge Functions should allow requests only from the production frontend origin.

Example:

```text
https://droponce.vercel.app
```

or your custom domain:

```text
https://yourdomain.com
```

Do not use:

```text
*
```

for production CORS if the application can use a specific origin.

Handle:

```http
OPTIONS
```

requests correctly.

Verify that `cors.ts` uses the configured production origin.

---

# 11. Edge Functions

Deploy the functions:

```bash
npx supabase functions deploy initialize-upload --no-verify-jwt
npx supabase functions deploy complete-upload --no-verify-jwt
npx supabase functions deploy get-file-info --no-verify-jwt
npx supabase functions deploy download-file --no-verify-jwt
npx supabase functions deploy get-session-quota --no-verify-jwt
npx supabase functions deploy cleanup-expired --no-verify-jwt
```

## Why `--no-verify-jwt`?

DROPONCE supports anonymous users, so the Supabase gateway cannot require a normal logged-in user JWT for these public application endpoints.

This does **not** mean the endpoints should blindly trust requests.

The Edge Functions must still enforce:

- Token validation
- File size validation
- Quota
- Expiration
- File status
- Atomic one-time use
- Storage authorization
- Abuse/rate-limit controls
- Safe request validation

If an endpoint does not actually need anonymous public access, consider normal JWT verification instead.

---

# 12. Backend Upload Flow

The production upload flow should be:

```text
User selects file
        ↓
Frontend validates for UX
        ↓
initialize-upload
        ↓
Backend validates:
  • size <= 50 MB
  • allowed type
  • quota <= 100 MB
  • request validity
        ↓
Generate cryptographically random token
        ↓
Hash token
        ↓
Generate unpredictable storage key
        ↓
Prepare private Supabase Storage upload
        ↓
Return upload authorization
        ↓
Browser uploads file
        ↓
complete-upload
        ↓
Backend verifies upload
        ↓
Persist/activate file metadata
        ↓
Return secure sharing token
```

The frontend must not be responsible for deciding whether an upload is authorized.

---

# 13. Secure Token Requirements

Public links should look like:

```text
https://yourdomain.com/s/7fK9xP2mQ8vL...
```

Do not expose:

```text
/s/1
/s/2
/s/12345
```

Use a cryptographically secure random token.

Recommended properties:

- At least 256 bits of entropy where practical.
- Generated server-side.
- Never predictable.
- Never sequential.
- Never derived from the database ID.

Store:

```text
SHA-256(token)
```

instead of the raw token where appropriate.

Access flow:

```text
Raw token from URL
        ↓
SHA-256
        ↓
Database lookup
        ↓
Check status
        ↓
Check expires_at
        ↓
Authorize access
```

---

# 14. Download Flow

Recipient:

```text
https://yourdomain.com/s/<token>
```

Frontend requests metadata:

```text
get-file-info
```

Backend checks:

```text
Token
Status
Expiration
Storage state
```

If valid:

```text
Download authorized
```

If invalid:

```text
Link not found
Link expired
Link already used
File deleted
```

Never let the frontend decide whether a token is valid.

---

# 15. One-Time Download

One-time links require an atomic backend operation.

Correct conceptual flow:

```text
Download request
      ↓
Validate token
      ↓
Atomic consume/claim
      ↓
Prevent second concurrent request
      ↓
Authorize controlled storage access
      ↓
Download
      ↓
Delete/mark storage object according to lifecycle
```

Two simultaneous requests must not both receive successful one-time authorization.

Do not implement one-time security using React state or `localStorage`.

### Important implementation detail

If `download-file` returns a signed Storage URL, the backend cannot inherently know that the browser completed every byte of the download.

Therefore distinguish between:

```text
Download authorization
```

and:

```text
Successful transfer completion
```

If the product requires strict post-transfer deletion, use a backend-controlled streaming/confirmation architecture rather than claiming that a signed URL confirms successful completion.

---

# 16. Expiration

Every file should have an expiration timestamp:

```text
expires_at
```

Default lifetime:

```text
24 hours
```

Backend rule:

```text
current_time >= expires_at
        ↓
reject download
```

The frontend countdown is only a visual indicator.

Even if the browser shows:

```text
Expires in 5 minutes
```

the backend remains authoritative.

After expiration:

```text
Link → unavailable
Storage object → cleanup
Database record → expired/deleted according to lifecycle
```

---

# 17. Cleanup Function

The cleanup function:

```text
cleanup-expired
```

should:

```text
Find expired files
       ↓
Delete objects from Supabase Storage
       ↓
Update database lifecycle state
       ↓
Record cleanup result
```

It must be safe to retry.

A storage deletion failure should not silently be treated as a successful deletion.

Avoid logging:

- Raw tokens
- Private credentials
- Full sensitive URLs
- Unnecessary file contents

---

# 18. Scheduling Cleanup

The cleanup function must run automatically in production.

Use a scheduler/cron mechanism supported by your Supabase project.

Recommended behavior:

```text
Every few minutes / hourly
        ↓
cleanup-expired
        ↓
Process expired and consumed objects
```

The exact cadence can be tuned for the desired deletion latency.

Remember:

**Expiration enforcement happens during access validation.**

The cleanup job is responsible for physical storage cleanup; it is not the only mechanism protecting expired files.

---

# 19. Anonymous Session Quota

The MVP allows uploads without an account.

The frontend can maintain an anonymous session identifier:

```text
sessionId
```

but the server remains authoritative.

Do not trust:

```text
localStorage
frontend counters
hidden form fields
```

The backend should calculate active usage from trusted database records.

Example:

```text
Active file A = 40 MB
Active file B = 35 MB

Usage = 75 MB

Remaining = 25 MB
```

After a file expires or is consumed and is removed from the active lifecycle:

```text
Quota becomes available again
```

Implement atomic or otherwise race-safe quota checks to reduce concurrent upload bypasses.

---

# 20. Security Headers

For the frontend, configure appropriate security headers in `vercel.json` or the equivalent hosting configuration.

Recommended baseline:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

Also consider an appropriate Content Security Policy after verifying compatibility with your Vite build, Supabase endpoints, fonts, analytics, and other resources.

Do not blindly copy a restrictive CSP without testing it.

---

# 21. Cache Control

Temporary file pages and download-related responses should not be cached publicly.

Use appropriate:

```http
Cache-Control: no-store
```

for sensitive dynamic responses where applicable.

Do not rely only on frontend JavaScript to prevent caching.

---

# 22. Robots / Search Engine Protection

Temporary sharing routes should not be indexed.

For example:

```text
/s/*
```

should not be intended for search-engine discovery.

Use appropriate:

```text
robots.txt
```

and page-level directives where applicable.

Important:

`robots.txt` is **not a security control**.

A private token must remain secure even if a crawler ignores robots rules.

---

# 23. Filename and MIME Validation

Backend validation should include:

```text
File size
MIME type
Extension
Filename
Empty file handling
```

Sanitize filenames before displaying or storing them.

Do not construct storage paths directly from an arbitrary user filename.

Use a server-generated storage key.

Example:

```text
User filename:
my report (final).pdf

Storage key:
8c1d.../a7f4...
```

---

# 24. Allowed File Types

The initial application supports:

```text
Images
PDF
DOC
DOCX
XLS
XLSX
PPT
PPTX
ZIP
TXT
CSV
Other reasonable document/archive formats
```

The backend must perform its own validation.

Client-side MIME checks are only for UX.

Be careful with MIME type alone because it can be spoofed.

---

# 25. Abuse Protection

Anonymous uploads are vulnerable to abuse.

Before public launch, implement or plan:

```text
Rate limiting
Request throttling
Upload frequency limits
Session quota
Maximum file size
Token entropy
Concurrent request protection
```

Consider infrastructure-level protections such as:

```text
Vercel / Cloudflare rate limiting
Supabase controls
IP-based abuse controls
CAPTCHA / Turnstile for suspicious traffic
```

Do not claim that rate limiting exists until it is actually implemented.

---

# 26. Frontend Deployment — Vercel

### Option A — Vercel CLI

From the project root:

```bash
npx vercel
```

Follow the prompts.

Then configure production environment variables:

```bash
npx vercel env add VITE_USE_MOCK_API production
```

Value:

```text
false
```

Then:

```bash
npx vercel env add VITE_SUPABASE_URL production
```

Value:

```text
https://<your-project-ref>.supabase.co
```

Then:

```bash
npx vercel env add VITE_SUPABASE_ANON_KEY production
```

Value:

```text
<your-public-anon-key>
```

Then:

```bash
npx vercel env add VITE_API_BASE_URL production
```

Value:

```text
https://<your-project-ref>.supabase.co/functions/v1
```

Deploy:

```bash
npx vercel --prod
```

---

# 27. Frontend Deployment — Vercel Dashboard

Alternatively:

```text
Vercel
→ Add New
→ Project
→ Import GitHub repository
```

Configure:

```text
Framework: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
```

Add:

```text
VITE_USE_MOCK_API=false
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-public-anon-key>
VITE_API_BASE_URL=https://<your-project-ref>.supabase.co/functions/v1
```

Deploy.

---

# 28. Custom Domain

After the first successful deployment:

```text
Vercel
→ Project
→ Settings
→ Domains
```

Add your custom domain.

Then update:

```text
ALLOWED_ORIGIN
```

on Supabase Edge Functions to the exact production origin.

Example:

```text
https://droponce.com
```

Do not accidentally configure:

```text
https://droponce.com/
```

if your CORS implementation performs exact string matching.

---

# 29. Local Production Test

Before deploying:

```bash
npm run build
```

Then preview:

```bash
npm run preview
```

Verify:

```text
Homepage
Upload UI
File selection
Drag/drop
50 MB validation
Upload progress
Secure link generation
Copy link
Download page
Expiration display
Error states
Mobile layout
```

---

# 30. End-to-End Production Test

## Test 1 — Normal upload

Use a small file:

```text
1 MB PDF
```

Expected:

```text
Select
 ↓
Initialize
 ↓
Upload
 ↓
Complete
 ↓
Secure link
```

Open the link in another browser/private window.

Verify:

```text
File metadata appears
Download works
```

---

# 31. Test 2 — 50 MB Limit

Test:

```text
49 MB → allowed
50 MB → allowed
>50 MB → rejected
```

Test both:

```text
Frontend
Backend
```

The backend must reject oversized requests even if the frontend is bypassed.

---

# 32. Test 3 — 100 MB Session Quota

Example:

```text
40 MB
+
40 MB
+
20 MB
=
100 MB
```

Then attempt another upload.

Expected:

```text
Rejected
```

After expired/consumed files are cleaned up, verify that the appropriate quota becomes available again.

---

# 33. Test 4 — Invalid Token

Try:

```text
/s/not-a-real-token
```

Expected:

```text
Link not found
```

Do not reveal:

```text
Database ID
Storage key
SQL error
Stack trace
```

---

# 34. Test 5 — Expiration

Create a test file with a short test expiration in a development/test environment.

After expiration:

```text
Open link
     ↓
Backend rejects
     ↓
Expired page
```

Verify the storage object is eventually deleted by cleanup.

Do not depend on the frontend countdown for this test.

---

# 35. Test 6 — One-Time Link

Create:

```text
One-time = ON
```

Expected:

```text
First authorized download
        ↓
Link consumed
        ↓
Second request
        ↓
Rejected
```

Test two simultaneous requests to ensure only one can successfully claim the link.

---

# 36. Test 7 — Private Storage

Attempt to access the Storage bucket directly.

Expected:

```text
Direct public access → DENIED
```

The bucket must not expose arbitrary files.

---

# 37. Test 8 — Secret Exposure

Inspect the production frontend bundle and browser environment.

Confirm there is no:

```text
SUPABASE_SERVICE_ROLE_KEY
```

and no:

```text
R2_SECRET_ACCESS_KEY
```

Also confirm there are no R2 credentials anywhere in the repository.

Search:

```bash
git grep -n "R2_SECRET"
git grep -n "R2_ACCESS"
git grep -n "SERVICE_ROLE"
```

Review the results before launch.

---

# 38. Git Security

Before pushing:

```bash
git status
```

Ensure `.env` is ignored.

Example `.gitignore`:

```gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
```

Do not commit:

```text
.env
.env.local
service-role keys
private credentials
```

If a secret was accidentally committed, rotating/deleting the file is not enough. Rotate the compromised secret.

---

# 39. Production Monitoring

Monitor:

```text
Edge Function errors
Database errors
Storage failures
Upload failures
Download failures
Cleanup failures
Quota rejection rate
Abuse/rate-limit events
```

Do not log:

```text
Raw tokens
Service-role keys
Storage credentials
File contents
Sensitive user information
```

Use identifiers that cannot be used to access a file.

---

# 40. Final Production Security Checklist

### Architecture

- [ ] React + Vite deployed
- [ ] Supabase PostgreSQL configured
- [ ] Supabase Storage configured
- [ ] Supabase Storage bucket is private
- [ ] Edge Functions deployed
- [ ] No Cloudflare R2 dependency remains

### Frontend

- [ ] `VITE_USE_MOCK_API=false`
- [ ] Correct production Supabase URL
- [ ] Correct public anon/publishable key
- [ ] Correct Edge Function URL
- [ ] No service-role key in frontend
- [ ] No storage secret in frontend

### Upload

- [ ] Maximum individual file = 50 MB
- [ ] Backend enforces 50 MB
- [ ] Session quota = 100 MB
- [ ] Backend enforces quota
- [ ] File types validated server-side
- [ ] Filename sanitized
- [ ] Storage key generated server-side

### Token

- [ ] Cryptographically secure random token
- [ ] Sufficient token entropy
- [ ] No sequential IDs
- [ ] SHA-256 token hash stored where appropriate
- [ ] Raw token not stored unnecessarily
- [ ] Token validation occurs server-side

### Download

- [ ] Token validated server-side
- [ ] Expiration checked server-side
- [ ] Status checked server-side
- [ ] One-time consumption is atomic
- [ ] Concurrent download race tested
- [ ] Private Storage access enforced
- [ ] No direct public bucket access

### Expiration / Cleanup

- [ ] Default expiration = 24 hours
- [ ] Backend rejects expired links
- [ ] Cleanup function deployed
- [ ] Cleanup runs automatically
- [ ] Storage objects are deleted
- [ ] Database lifecycle state is updated
- [ ] Cleanup is retry-safe

### Security

- [ ] RLS configured
- [ ] CORS restricted to production origin
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] `Cache-Control: no-store` where appropriate
- [ ] Temporary routes excluded from indexing
- [ ] Rate limiting/abuse protection implemented or explicitly documented
- [ ] No secrets in Git
- [ ] No sensitive information in logs

### UX

- [ ] Upload state works
- [ ] Progress works
- [ ] Success state works
- [ ] Copy link works
- [ ] Download state works
- [ ] Expired state works
- [ ] Already-used state works
- [ ] Error states work
- [ ] Mobile tested
- [ ] Keyboard navigation tested
- [ ] Reduced-motion support tested

---

# 41. Final Launch Flow

The final production system should behave like this:

```text
                    USER
                      │
                      ▼
               DROPONCE WEBSITE
                      │
                      ▼
                 Select File
                      │
                      ▼
              initialize-upload
                      │
          ┌───────────┴───────────┐
          │                       │
       Validate                Generate
       50 MB                    token
       quota                    storage key
          │                       │
          └───────────┬───────────┘
                      ▼
             Supabase Storage
                      │
                      ▼
              complete-upload
                      │
                      ▼
              Secure Share Link
                      │
                      ▼
             Recipient opens /s/*
                      │
                      ▼
               get-file-info
                      │
              ┌───────┴───────┐
              │               │
            Valid          Invalid
              │               │
              ▼               ▼
        Download Page     Error Page
              │
              ▼
         download-file
              │
              ▼
       Atomic one-time check
              │
              ▼
       Controlled file access
              │
              ▼
       Consume/Delete lifecycle
              │
              ▼
          FILE GONE
```

---

# 42. Launch Principle

The production priority is:

```text
1. Security
2. Correct file lifecycle
3. Data integrity
4. Upload/download reliability
5. Expiration/deletion
6. Performance
7. Accessibility
8. UX
9. Visual polish
```

The core promise remains:

# **UPLOAD. SHARE. GONE.**

A visually polished interface is not considered production-ready until the backend independently enforces file size, quota, token validation, expiration, private storage access, and one-time-use behavior.

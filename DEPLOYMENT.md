# DROPONCE — Production Launch & Full Security Checklist

Follow this streamlined 3-step guide to launch DROPONCE with full production security.

---

## 🔒 Security Architecture Reminder

```
┌────────────────────────────────────────────────────────────────────────┐
│ PUBLIC FRONTEND (Vercel)                                               │
│ • VITE_USE_MOCK_API=false                                              │
│ • VITE_SUPABASE_URL=https://<your-project>.supabase.co                 │
│ • VITE_SUPABASE_ANON_KEY=<public-anon-key>                             │
│ ❌ NEVER expose: SUPABASE_SERVICE_ROLE_KEY or R2_SECRET_ACCESS_KEY     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND GATEWAY (Supabase Edge Functions)                              │
│ • Stores R2_ACCESS_KEY_ID & R2_SECRET_ACCESS_KEY as encrypted secrets  │
│ • Performs 100 MB quota check & cryptographic token generation         │
│ • Generates short-lived (60s) presigned URLs for private R2 files      │
└──────────────────┬───────────────────────────────┬─────────────────────┘
                   │                               │
                   ▼                               ▼
┌───────────────────────────────┐ ┌──────────────────────────────────────┐
│ DATABASE (Supabase PostgreSQL)│ │ OBJECT STORAGE (Cloudflare R2)       │
│ • Row-Level Security ENABLED  │ │ • Public Access DISABLED (Private)   │
│ • Stores SHA-256(token) only  │ │ • Files purged upon 1st download/24h │
│ • Atomic single-use function  │ └──────────────────────────────────────┘
└───────────────────────────────┘
```

---

## STEP 1: Cloudflare R2 (Private File Storage)

Cloudflare R2 provides zero-egress fee private S3-compatible storage.

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in.
2. In the left sidebar, click **R2 Object Storage**.
3. Click **Create bucket**:
   - Bucket name: `droponce-files`
   - Location: Choose your preferred region or **Automatic**.
   - Click **Create Bucket**.
4. **Important Security Check**: Go to the bucket's **Settings** tab and confirm **Public Access** is **Disabled / Not Allowed**.
5. Create API Token:
   - On the main R2 page, click **Manage R2 API Tokens** (right sidebar).
   - Click **Create API Token**.
   - Name: `droponce-edge-token`
   - Permissions: **Object Read & Write**
   - Apply to specific bucket: select `droponce-files`
   - TTL: Leave forever or as desired.
   - Click **Create API Token**.
6. **Save these values safely** (you will only see the secret once):
   - **Account ID** (found on the right sidebar of the R2 overview page)
   - **Access Key ID**
   - **Secret Access Key**
   - **Bucket Name**: `droponce-files`

---

## STEP 2: Supabase (Database & Edge Functions)

Supabase handles metadata, token hashing, and server-side authorization.

### A. Create Project & Database
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Name it `droponce`, set a strong database password, and choose your region.
3. In the left menu, click **SQL Editor**.
4. Click **New query**, paste the entire contents of:
   `supabase/migrations/20260910000000_create_files_schema.sql`
5. Click **Run**.
   *(This creates the `files` table, RLS denial policies, unique token hash indexes, and atomic functions `consume_one_time_file` and `get_session_active_bytes`).*

### B. Configure Edge Function Secrets
From your terminal in the `droponce` directory:
```bash
# 1. Log in to Supabase CLI
npx supabase login

# 2. Link your local project to your remote Supabase project
# (Find your Project Ref in Supabase: Project Settings -> General -> Reference ID)
npx supabase link --project-ref <your-project-ref>

# 3. Securely set Cloudflare R2 secrets in Supabase Edge Functions:
npx supabase secrets set R2_ACCOUNT_ID="<your-cloudflare-account-id>"
npx supabase secrets set R2_ACCESS_KEY_ID="<your-r2-access-key-id>"
npx supabase secrets set R2_SECRET_ACCESS_KEY="<your-r2-secret-access-key>"
npx supabase secrets set R2_BUCKET_NAME="droponce-files"
npx supabase secrets set ALLOWED_ORIGIN="https://your-vercel-domain.vercel.app"
```

### C. Deploy the Edge Functions
Deploy all 6 backend functions with one command each:
```bash
npx supabase functions deploy initialize-upload --no-verify-jwt
npx supabase functions deploy complete-upload --no-verify-jwt
npx supabase functions deploy get-file-info --no-verify-jwt
npx supabase functions deploy download-file --no-verify-jwt
npx supabase functions deploy get-session-quota --no-verify-jwt
npx supabase functions deploy cleanup-expired --no-verify-jwt
```
*(Note: `--no-verify-jwt` is used because DROPONCE supports anonymous sessions without user logins; security is enforced via 256-bit unguessable tokens and server-side rate limits).*

---

## STEP 3: Vercel (Frontend Deployment)

### Option A: Using Vercel CLI (Fastest)
From the `droponce` folder:
```bash
npx vercel
```
Follow the interactive prompts:
- Set up and deploy? **Yes**
- Link to existing project? **No**
- Project name: `droponce`
- In which directory is your code located? `./`
- Want to modify build settings? **No**

After initial deploy, add your production environment variables:
```bash
npx vercel env add VITE_USE_MOCK_API production
# Enter value: false

npx vercel env add VITE_SUPABASE_URL production
# Enter value: https://<your-project-id>.supabase.co

npx vercel env add VITE_SUPABASE_ANON_KEY production
# Enter value: <your-supabase-anon-key>

npx vercel env add VITE_API_BASE_URL production
# Enter value: https://<your-project-id>.supabase.co/functions/v1
```
Then trigger the final production build:
```bash
npx vercel --prod
```

### Option B: Using Vercel Web Dashboard (GitHub)
1. Push this repository to your GitHub account (`git push origin master`).
2. Go to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
3. Import your `droponce` GitHub repository.
4. Framework Preset: **Vite**
5. Root Directory: `./`
6. Expand **Environment Variables** and add:
   - `VITE_USE_MOCK_API` = `false`
   - `VITE_SUPABASE_URL` = `https://<your-project-id>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-anon-key>`
   - `VITE_API_BASE_URL` = `https://<your-project-id>.supabase.co/functions/v1`
7. Click **Deploy**.

---

## 🛡️ Production Security Verification Checklist

- [x] **robots.txt**: Temporary links (`/s/*`) blocked from search engine crawlers.
- [x] **Security Headers (`vercel.json`)**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] **Cache Control**: Download links set to `no-store, no-cache, max-age=0`.
- [x] **Token Hashing**: Tokens are 256-bit CSPRNG; only `SHA-256(token)` is stored in PostgreSQL.
- [x] **No Secret Leakage**: Only public Anon Key and Supabase URL in client bundle.
- [x] **Private Storage**: Cloudflare R2 bucket has public access disabled.
- [x] **Atomic Consumption**: Stored procedure `consume_one_time_file` prevents race conditions.

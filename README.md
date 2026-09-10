# DROPONCE — Hyper-Premium Secure Temporary File-Sharing Platform

> **Upload. Share. Gone.**  
> *Private file sharing, without the permanent footprint.*

DROPONCE is an ultra-premium, Apple-level temporary file-sharing web application built with **React**, **Vite**, **Tailwind CSS**, **Supabase PostgreSQL**, **Supabase Edge Functions**, and **Cloudflare R2**.

---

## ⚡ Highlights

- **Awwwards & Apple-Level Aesthetic**: Deep monochromatic dark palette (`#050505`), kinetic reactive cursor radial glow, smooth dropzone animations, and particle dissolution storytelling.
- **True Ephemeral Lifecycle**: Files are automatically destroyed after **24 hours** or immediately upon **first successful download** (atomic single-use consumption).
- **Zero-Knowledge Security Design**: Generates 256-bit unguessable CSPRNG tokens (`crypto.getRandomValues`). The server hashes tokens using **SHA-256** prior to database persistence, ensuring database read leaks cannot compromise active links.
- **Private Isolated Storage**: Cloudflare R2 bucket is private and never exposed to the public internet. Transfers operate strictly through time-limited presigned URLs.
- **Anonymous Session Quota**: 100 MB per user session, authoritative on the server, paired with an elegant client quota meter.
- **Dual Mode Architecture**: Operates out-of-the-box with high-fidelity in-browser Web Crypto + IndexedDB simulation for instant local testing, and connects seamlessly to Supabase and Cloudflare R2 for production deployment.

---

## 🏛️ Architecture Overview

```
                          [ Client Browser ]
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
       [ Landing / Upload Hero ]       [ Download Route /s/:token ]
                    │                             │
                    ▼                             ▼
           [ FileService Layer ]        [ FileService Layer ]
                    │                             │
      (VITE_USE_MOCK_API=false)        (VITE_USE_MOCK_API=true)
                    │                             │
                    ▼                             ▼
     [ Supabase Edge Functions ]       [ In-Browser Simulation ]
        /                 \             • Web Crypto 256-bit CSPRNG
       /                   \            • SHA-256 Hashing Engine
      ▼                     ▼           • IndexedDB Binary Store
[ Supabase PostgreSQL ]  [ Cloudflare R2 ]
(Metadata & Hash Index)  (Private Objects)
```

---

## 🚀 Quick Start (Local Development)

The application starts immediately with zero external credential requirements thanks to its built-in client simulation engine.

```bash
# 1. Navigate to project directory
cd droponce

# 2. Install dependencies (if not already installed)
npm install

# 3. Start development server
npm run dev

# 4. Build production bundle
npm run build
```

Open `http://localhost:5173` in your browser.

---

## 🌐 Production Deployment Guide

### 1. Cloudflare R2 Setup

1. Sign in to your **Cloudflare Dashboard** → **R2 Object Storage**.
2. Create a private bucket named: `droponce-files`.
3. In bucket settings, ensure **Public Access** remains **Disabled**.
4. Go to **Manage R2 API Tokens** and create an API token with **Object Read & Write** permissions for `droponce-files`.
5. Note down:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME` (`droponce-files`)

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** in Supabase and run the migration file located at:
   `supabase/migrations/20260910000000_create_files_schema.sql`
3. Set your Supabase Edge Function secrets via the Supabase CLI:
   ```bash
   supabase secrets set R2_ACCOUNT_ID="your-account-id" \
                        R2_ACCESS_KEY_ID="your-access-key-id" \
                        R2_SECRET_ACCESS_KEY="your-secret-access-key" \
                        R2_BUCKET_NAME="droponce-files"
   ```
4. Deploy the Edge Functions:
   ```bash
   supabase functions deploy initialize-upload
   supabase functions deploy complete-upload
   supabase functions deploy get-file-info
   supabase functions deploy download-file
   supabase functions deploy cleanup-expired
   supabase functions deploy get-session-quota
   ```

### 3. Frontend Deployment (Vercel / Cloudflare Pages)

1. Set `.env` (or environment variables in your deployment dashboard):
   ```env
   VITE_USE_MOCK_API=false
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   VITE_API_BASE_URL=https://<your-project-id>.supabase.co/functions/v1
   ```
2. Build command: `npm run build`
3. Output directory: `dist`

---

## 🔐 Security & Threat Model

| Vector | Mitigation in DROPONCE |
| :--- | :--- |
| **Token Guessing / Enumeration** | 256-bit cryptographically secure random values generated with CSPRNG. |
| **Database Compromise** | Raw tokens are **never stored** in PostgreSQL. Only irreversible `SHA-256(token)` is indexed. |
| **Direct S3 Bucket Scraping** | Cloudflare R2 bucket is strictly private. URLs are signed server-side with 60s validity. |
| **Single-Use Race Conditions** | PostgreSQL atomic conditional update with `WHERE status = 'active' RETURNING ...`. Only 1 thread can succeed. |
| **Client-Side Tampering** | Browser state is treated as visual feedback only; expiration and quota are strictly verified server-side. |
| **Denial of Service** | Strict 100 MB per-file and per-session quotas calculated server-side from active records. |

---

## 📄 License

MIT © 2026 DROPONCE. Designed and engineered for privacy.

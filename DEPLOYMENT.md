# POD Atlas API — Deployment Guide

End-to-end deployment guide for the POD Atlas backend API.

The target stack:

- **Database:** Supabase (PostgreSQL)
- **Object storage:** Supabase Storage (S3-compatible)
- **Email:** SMTP (Gmail App Password or any SMTP provider)
- **Runtime:** Vercel Serverless Functions
- **Region:** Choose the Supabase region closest to your Vercel region (latency)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Provision Supabase](#2-provision-supabase)
3. [Configure Object Storage](#3-configure-object-storage)
4. [Configure SMTP](#4-configure-smtp)
5. [Prepare Local Environment](#5-prepare-local-environment)
6. [Push the Schema](#6-push-the-schema)
7. [Migrate Existing Data](#7-migrate-existing-data)
8. [Seed Initial Reference Data](#8-seed-initial-reference-data)
9. [Bootstrap the First Admin](#9-bootstrap-the-first-admin)
10. [Deploy to Vercel](#10-deploy-to-vercel)
11. [Configure Production Environment Variables](#11-configure-production-environment-variables)
12. [Post-Deployment Validation](#12-post-deployment-validation)
13. [Rollback](#13-rollback)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.x or higher | Build and CLI tools |
| npm | 10.x or higher | Package manager |
| Git | latest | Source control |
| Vercel CLI | latest | `npm install -g vercel` |
| Supabase project | — | Provisioned for the customer |
| GitHub repository access | — | `PODTECH-IO/POD-Atlas-API` |

---

## 2. Provision Supabase

1. Sign in at [supabase.com](https://supabase.com/) and create a new project.
2. Choose a strong database password and **store it in your password manager** — Supabase will not show it again.
3. Pick the region geographically closest to where the API will run (typically the same region as Vercel).
4. Wait for the project to finish provisioning (~2 minutes).
5. Navigate to **Project Settings → Database → Connection string** and copy two URLs:

   | Variable | Pooler | Port | Use |
   |---|---|---|---|
   | `DATABASE_URL` | Transaction pooler | 6543 | Runtime (Prisma queries on Vercel) |
   | `DIRECT_URL` | Session pooler / direct | 5432 | Schema migrations only |

   The connection string template looks like:

   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   For `DATABASE_URL` (transaction pooler) append `?pgbouncer=true&connection_limit=1` to disable prepared statements. Prisma requires this when running against PgBouncer in transaction mode.

---

## 3. Configure Object Storage

The API uses Supabase Storage via its S3-compatible API for KRA, certifications, and announcement attachments.

1. In Supabase, open **Storage → Buckets** and create a bucket named `atlas-files`.
2. Set it to **public** (read-only) so generated URLs are accessible to authenticated clients.
3. Open **Project Settings → Storage → S3 connection** and generate an **Access Key**. Record:

   | Field | Maps to env var |
   |---|---|
   | Endpoint | `SUPABASE_S3_ENDPOINT` |
   | Region | `SUPABASE_S3_REGION` |
   | Access Key ID | `SUPABASE_S3_ACCESS_KEY_ID` |
   | Secret Access Key | `SUPABASE_S3_SECRET_ACCESS_KEY` |

4. Record the bucket's public base URL (visible under **Storage → Settings**) as `SUPABASE_PUBLIC_URL`.

---

## 4. Configure SMTP

Outgoing email (OTP codes, welcome emails, leave notifications) is sent over SMTP.

For Gmail:

1. Enable 2-Step Verification on the sender Google account.
2. Visit **Google Account → Security → App passwords** and generate a 16-character password for "Mail".
3. Use these values:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=<sender@gmail.com>
   SMTP_PASS=<16-char app password>
   SMTP_FROM="POD Atlas <sender@gmail.com>"
   ```

Any other SMTP provider (SendGrid, Mailgun, Postmark, AWS SES, Office 365) works equivalently — adjust host and port.

---

## 5. Prepare Local Environment

```bash
git clone https://github.com/PODTECH-IO/POD-Atlas-API.git api
cd api
npm install
cp .env.example .env
```

Fill in `.env` with the values from steps 2–4. Generate fresh JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run twice — use one value for JWT_ACCESS_SECRET, another for JWT_REFRESH_SECRET
```

Reference values:

```env
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

JWT_ACCESS_SECRET=<64+ random hex chars>
JWT_REFRESH_SECRET=<64+ random hex chars, different from above>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

OTP_EXPIRES_MINUTES=10

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<smtp username>
SMTP_PASS=<smtp password>
SMTP_FROM="POD Atlas <no-reply@example.com>"

NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001

SUPABASE_S3_ENDPOINT=<from step 3>
SUPABASE_S3_REGION=<region>
SUPABASE_S3_ACCESS_KEY_ID=<from step 3>
SUPABASE_S3_SECRET_ACCESS_KEY=<from step 3>
SUPABASE_STORAGE_BUCKET=atlas-files
SUPABASE_PUBLIC_URL=<bucket public URL>
```

> **Never commit `.env`.** It is already listed in `.gitignore`. Production values belong in the Vercel dashboard (step 11).

---

## 6. Push the Schema

Apply the Prisma schema to the new Supabase database. This creates every table, enum, and index defined in [prisma/schema.prisma](prisma/schema.prisma).

```bash
npx prisma generate
npx prisma db push
```

Verify success in the Supabase dashboard under **Database → Tables** — you should see ~22 tables.

---

## 7. Migrate Existing Data

If you have an existing database to migrate from, use the included migration script. It copies every business table (in foreign-key-safe order) and is idempotent — re-running it skips rows that already exist.

### Step 7.1 — Set the source connection string

PowerShell:

```powershell
$env:SOURCE_DATABASE_URL = "postgresql://<user>:<password>@<source-host>:6543/postgres?pgbouncer=true"
```

Bash:

```bash
export SOURCE_DATABASE_URL="postgresql://<user>:<password>@<source-host>:6543/postgres?pgbouncer=true"
```

### Step 7.2 — Run the migration

```bash
npm run db:migrate
```

The script will:

1. Smoke-test connectivity to both databases.
2. Copy reference data: `Department`, `LeaveType`, `Holiday`.
3. Copy RBAC: `CustomRole`, `RoleModulePermission`.
4. Copy `User` in two passes (manager FK is patched after all users exist).
5. Copy profile data: `UserProfile`, `Skill`, `Certification`, `KRADocument`.
6. Copy operational data: `Attendance`, `AttendanceRegularization`, `Leave`, `CompOff`.
7. Copy onboarding: `OnboardingTask`, `Asset`, `AssetAssignment`, `ITProvision`.
8. Copy `Announcement`, `AuditLog`, `ErrorLog`.

`OTP` and `RefreshToken` rows are intentionally **not** copied — users will receive a fresh OTP at their next sign-in, and existing JWTs become invalid (which is the desired behaviour after a database swap).

Expected output:

```
Atlas data migration
────────────────────
  Source:  postgresql://user:***@source-host:6543/postgres
  Target:  postgresql://postgres.abc:***@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

▸ Reference data
  Department                   4 row(s) copied
  LeaveType                    6 row(s) copied
  Holiday                      15 row(s) copied
...
✓ Migration complete.
```

### Step 7.3 — Verify row counts

Open Supabase **SQL Editor** and run:

```sql
SELECT 'User'           AS table, count(*) FROM "User"
UNION ALL SELECT 'Department',          count(*) FROM "Department"
UNION ALL SELECT 'Leave',               count(*) FROM "Leave"
UNION ALL SELECT 'Attendance',          count(*) FROM "Attendance"
UNION ALL SELECT 'Announcement',        count(*) FROM "Announcement"
UNION ALL SELECT 'CustomRole',          count(*) FROM "CustomRole";
```

Cross-check against the same query run on the source database — counts must match.

---

## 8. Seed Initial Reference Data

If you have **no source database** to migrate from, use the bundled seed script instead.

```bash
npx prisma db seed
```

This creates default departments, leave types, and onboarding templates. See [prisma/seed.ts](prisma/seed.ts) for the exact data.

---

## 9. Bootstrap the First Admin

For a fresh installation, create the first Admin user directly in Supabase so the customer can log in to the portal.

**Supabase SQL Editor → New query:**

```sql
INSERT INTO "User" (
  id, "employeeId", email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'EMP001',
  'admin@example.com',
  'Atlas',
  'Admin',
  'ADMIN',
  true,
  now(),
  now()
);
```

Use the customer's real email — the OTP login flow requires the email to exist before sign-in is allowed.

---

## 10. Deploy to Vercel

### One-time setup

1. Push the codebase to GitHub (the `dev` branch is the default working branch; merge to `main` for production).
2. In the Vercel dashboard, click **Add New → Project** and import `PODTECH-IO/POD-Atlas-API`.
3. **Framework Preset:** Other.
4. **Root Directory:** leave as the repository root.
5. **Build Command:** `npm run build` (already configured in [package.json](package.json)).
6. **Output Directory:** leave blank — the API is serverless, not static.
7. Skip the first deployment until environment variables are configured (step 11).

### CLI deployment

```bash
npm install -g vercel
vercel login
vercel link
vercel --prod
```

The Vercel routing configuration in [vercel.json](vercel.json) maps all traffic to the serverless entry point at [api/index.ts](api/index.ts).

---

## 11. Configure Production Environment Variables

In **Vercel → Project → Settings → Environment Variables**, set the following for the **Production** environment:

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler URL (port 6543) with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase direct connection URL (port 5432) |
| `JWT_ACCESS_SECRET` | 64+ random hex chars, unique per environment |
| `JWT_REFRESH_SECRET` | 64+ random hex chars, unique per environment, different from above |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `OTP_EXPIRES_MINUTES` | `10` |
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password / app password |
| `SMTP_FROM` | Display From header |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | Production frontend origin (e.g. `https://atlas.example.com`) |
| `FRONTEND_URL` | Production frontend origin — used to build links in outbound emails |
| `SUPABASE_S3_ENDPOINT` | From Supabase Storage S3 connection |
| `SUPABASE_S3_REGION` | e.g. `eu-west-1` |
| `SUPABASE_S3_ACCESS_KEY_ID` | From Supabase Storage |
| `SUPABASE_S3_SECRET_ACCESS_KEY` | From Supabase Storage |
| `SUPABASE_STORAGE_BUCKET` | `atlas-files` |
| `SUPABASE_PUBLIC_URL` | Bucket public base URL |

After saving, redeploy:

```bash
vercel --prod
```

Or trigger a redeploy from the Vercel dashboard under **Deployments**.

---

## 12. Post-Deployment Validation

Run these checks against the production URL.

### Health check

```bash
curl https://<your-api>.vercel.app/api/health
```

Expected:

```json
{ "status": "healthy", "database": "connected" }
```

If `database` is `disconnected`, revisit `DATABASE_URL` / `DIRECT_URL` (step 11).

### Authentication

```bash
curl -X POST https://<your-api>.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

Expected: HTTP 200 and a "OTP sent" response. The Admin should receive a 6-digit code by email within seconds.

### CORS

From a browser console on the production frontend:

```javascript
fetch('https://<your-api>.vercel.app/api/health').then(r => r.json()).then(console.log)
```

If the request is blocked by CORS, the `CORS_ORIGIN` env var does not match the frontend origin. Update and redeploy.

---

## 13. Rollback

Vercel keeps every previous deployment. To roll back:

1. Open **Vercel → Project → Deployments**.
2. Locate the last known-good deployment.
3. Click the menu (⋯) and choose **Promote to Production**.

For database rollback, restore the most recent Supabase backup from **Database → Backups**.

---

## 14. Troubleshooting

**`PrismaClientInitializationError: tenant/user … not found`**
The Supabase project referenced by `DATABASE_URL` no longer exists or the credentials are wrong. Verify the connection string against **Project Settings → Database → Connection string**.

**`prepared statement … already exists`**
`DATABASE_URL` is missing `?pgbouncer=true&connection_limit=1`. Append it and redeploy.

**Migration script fails with `column "managerId" violates foreign key constraint`**
The two-pass logic in `migrate-from-source.ts` handles this automatically. If you see it manually, ensure the User table was emptied between attempts or use `skipDuplicates: true` (the script already does).

**`prisma generate` fails on Vercel build**
The `postinstall` hook in [package.json](package.json) handles this. If it still fails, set the Vercel build command to `npm install && npx prisma generate && npm run build`.

**Emails are not delivered**
- Verify `SMTP_USER` and `SMTP_PASS` in Vercel env (Gmail rejects regular passwords — you must use an App Password).
- Check the sender Gmail inbox for any security alerts.
- For high volumes, swap to a transactional provider (SendGrid, Postmark, AWS SES).

**`401 Unauthorized` on every authenticated request**
Confirm `JWT_ACCESS_SECRET` matches between deployment environments. Rotating it invalidates all active sessions, which is expected.

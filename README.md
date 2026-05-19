# POD Atlas — Backend API

RESTful API service for the POD Atlas HR management platform. Built with Express.js, Prisma ORM, and PostgreSQL.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Role-Based Access Control](#role-based-access-control)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Initial Setup](#initial-setup)

---

## Overview

POD Atlas is an enterprise HR platform that supports the full employee lifecycle — from onboarding through daily operations and offboarding. This service exposes a RESTful HTTP API consumed by the Atlas web frontend.

| Module | Responsibility |
|---|---|
| Auth | Passwordless OTP login, JWT access + refresh token issuance |
| Dashboard | Role-aware KPIs and recent activity aggregation |
| Attendance | Geolocation check-in/out, WFH tracking, overtime, regularization |
| Leaves | Leave applications, approvals, balance tracking, holiday calendar, comp-off |
| Onboarding | Task checklists, asset assignment, IT provisioning |
| Profile | Personal info, skills, certifications, KRA documents |
| Announcements | Company and department notices, birthday and anniversary feeds |
| Users | Employee directory, user lifecycle management |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Language | TypeScript (strict mode) |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens (access + rotating refresh) |
| Validation | Zod |
| Email | Nodemailer (SMTP) |
| Object Storage | S3-compatible (Supabase Storage) |
| Deployment | Vercel Serverless Functions |

---

## Architecture

The codebase follows a layered architecture with a clear separation of concerns:

```
HTTP Request
    │
    ▼
┌──────────────┐
│   Routes     │  Express routers — bind paths to controllers
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Middleware  │  Auth, validation (Zod), error handling
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Controllers  │  Thin HTTP handlers — parse input, call service, return response
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Services   │  Business logic, transactions, side effects
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Prisma    │  Type-safe database access
└──────────────┘
```

**Standard response envelope:**

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

---

## Project Structure

```
api/
├── prisma/
│   ├── schema.prisma        # Database schema (20+ models)
│   └── seed.ts              # Reference data seeding
├── src/
│   ├── app.ts               # Express application factory
│   ├── server.ts            # HTTP server entry point
│   ├── config/
│   │   └── env.ts           # Typed environment configuration
│   ├── controllers/         # HTTP request handlers
│   ├── services/            # Business logic
│   ├── routes/              # Express routers
│   ├── middleware/          # Auth, validation, error handling
│   ├── schemas/             # Zod request schemas
│   ├── lib/                 # Prisma client, S3 client
│   └── utils/               # Shared utilities (JWT, OTP, responses)
├── api/
│   └── index.ts             # Vercel serverless entry point
└── vercel.json              # Deployment configuration
```

---

## API Reference

All routes require an `Authorization: Bearer <accessToken>` header unless marked **Public**.

### Auth — `/api/auth`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Send 6-digit OTP to user email |
| POST | `/verify-otp` | Public | Verify OTP and issue JWT pair |
| POST | `/refresh` | Public | Rotate refresh token |
| POST | `/logout` | Auth | Invalidate active refresh token |
| GET | `/me` | Auth | Return the authenticated user |

### Dashboard — `/api/dashboard`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/stats` | Auth | Role-specific KPI metrics |
| GET | `/activity` | Auth | Recent leave and attendance activity |

### Attendance — `/api/attendance`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/check-in` | Auth | Clock in with location and WFH flag |
| POST | `/check-out` | Auth | Clock out and compute work and overtime hours |
| GET | `/today` | Auth | Current day check-in status |
| GET | `/history` | Auth | Personal attendance history |
| GET | `/monthly` | Auth | Records for a given month |
| GET | `/team` | Manager+ | Team attendance for a given date |

### Regularization — `/api/attendance/regularizations`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/` | Auth | Submit attendance correction request |
| GET | `/` | Auth | Own requests, or team requests for managers |
| PATCH | `/:id/approve` | Manager+ | Approve and apply correction |
| PATCH | `/:id/reject` | Manager+ | Reject with optional note |

### Leaves — `/api/leaves`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/my` | Auth | Own leave applications |
| POST | `/` | Auth | Submit a leave application |
| PATCH | `/:id/cancel` | Auth | Cancel own pending leave |
| GET | `/` | Manager+ | All applications, filterable |
| PATCH | `/:id/approve` | Manager+ | Approve a leave |
| PATCH | `/:id/reject` | Manager+ | Reject with reason |
| GET | `/balance/me` | Auth | Leave balance per type |

### Leave Types — `/api/leave-types`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | All leave types with allowed days |

### Holidays — `/api/holidays`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List holidays for a given year |
| POST | `/seed` | HR/Admin | Seed national holidays |
| POST | `/` | HR/Admin | Add a custom holiday |
| DELETE | `/:id` | HR/Admin | Remove a holiday |

### Comp-Off — `/api/compoffs`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | Own comp-off requests |
| POST | `/` | Auth | Request compensatory off |
| GET | `/balance` | Auth | Available comp-off days |
| PATCH | `/:id/approve` | Manager+ | Approve a request |
| PATCH | `/:id/reject` | Manager+ | Reject a request |

Comp-offs expire 3 months after the earned date.

### Onboarding — `/api/onboarding`

#### Checklist

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/init/:userId` | HR/Admin | Seed default checklist for an employee |
| GET | `/me` | Auth | Own checklist, assets, and IT provisions |
| GET | `/:userId` | Manager+ | Any employee's onboarding data |
| POST | `/:userId/tasks` | Manager+ | Add custom task |
| PATCH | `/tasks/:id` | Auth | Update task status |
| DELETE | `/tasks/:id` | HR/Admin | Delete task |

#### Assets

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/assets/list` | Manager+ | Asset registry with current assignees |
| POST | `/assets` | HR/Admin | Register a new asset |
| POST | `/assets/:id/assign` | HR/Admin | Assign an asset to an employee |
| PATCH | `/assets/assignments/:id/return` | HR/Admin | Mark asset as returned |
| GET | `/assets/my` | Auth | Own assigned assets |
| GET | `/assets/user/:userId` | Manager+ | Any employee's assets |

#### IT Provisioning

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/it-provisions` | HR/Admin | All IT provisions, filterable by user |
| PATCH | `/it-provisions/:id` | HR/Admin | Update status |
| POST | `/:userId/it-provisions` | HR/Admin | Add an IT item |

### Profile — `/api/profile`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/me` | Auth | Full profile (user, profile, skills, certs, KRA) |
| PATCH | `/me` | Auth | Update profile fields |
| PATCH | `/me/basic` | Auth | Update phone / designation |
| POST | `/me/skills` | Auth | Add skill |
| DELETE | `/me/skills/:id` | Auth | Remove skill |
| POST | `/me/certifications` | Auth | Add certification |
| DELETE | `/me/certifications/:id` | Auth | Remove certification |
| GET | `/me/kra` | Auth | Own KRA documents |
| POST | `/me/kra` | Auth | Upload KRA document |
| DELETE | `/me/kra/:id` | Auth | Delete KRA document |
| GET | `/kra/all` | Manager+ | All employees' KRA submissions |
| GET | `/:userId` | Manager+ | Any employee's full profile |

### Announcements — `/api/announcements`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | Active feed (pinned first, scoped to dept) |
| GET | `/celebrations` | Auth | Birthdays and anniversaries in the next 7 days |
| GET | `/all` | HR/Admin | All announcements including expired |
| POST | `/` | Manager+ | Create announcement |
| PATCH | `/:id` | Manager+ | Edit or pin |
| DELETE | `/:id` | HR/Admin | Delete |

### Users — `/api/users`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | List users, filterable |
| GET | `/departments` | Auth | List departments |
| GET | `/:id` | Auth | Single user |
| POST | `/` | HR/Admin | Create user (welcome email sent on success) |
| PUT | `/:id` | HR/Admin | Update user details |
| DELETE | `/:id` | Admin | Deactivate user |

### Health Check

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns service and database status |

---

## Database Schema

```
User                            Core employee record
├── UserProfile                 Extended profile data
├── Skill                       Skills with proficiency levels
├── Certification               Professional certifications
├── KRADocument                 KRA file uploads
├── Attendance                  Daily check-in/out records
├── AttendanceRegularization    Correction requests
├── Leave                       Leave applications
├── CompOff                     Compensatory off requests
├── OnboardingTask              Per-employee onboarding checklist
├── AssetAssignment             Asset-to-employee assignments
├── ITProvision                 IT setup tracking
└── Announcement                Authored announcements

Department                      Organisational units
Asset                           Physical asset registry
Holiday                         Holiday calendar
LeaveType                       Leave type definitions
RefreshToken                    Persisted refresh tokens (rotation)
OTP                             Active one-time passwords
```

See [prisma/schema.prisma](prisma/schema.prisma) for the full schema.

---

## Authentication

The API uses passwordless authentication via one-time passwords delivered by email, followed by short-lived JWT access tokens and long-lived refresh tokens.

```
Client                              Backend                             Email
  │                                   │                                   │
  ├── POST /auth/login {email} ──────►│                                   │
  │                                   ├── Generate 6-digit OTP            │
  │                                   ├── Store OTP (TTL 10 min)          │
  │                                   ├── Deliver OTP ─────────────────► │
  │◄── { message: "OTP sent" } ───────┤                                   │
  │                                   │                                   │
  ├── POST /auth/verify-otp ─────────►│                                   │
  │     { email, otp }                ├── Validate OTP                    │
  │                                   ├── Issue access token (15m)        │
  │                                   ├── Issue refresh token (7d)        │
  │◄── { accessToken,                 ├── Persist refresh token           │
  │      refreshToken, user } ────────┤                                   │
  │                                   │                                   │
  ├── Authorization: Bearer <at> ─────►   (all subsequent requests)       │
  │                                   │                                   │
  ├── On 401: POST /auth/refresh ────►│                                   │
  │     { refreshToken }              ├── Rotate refresh token            │
  │◄── new { accessToken,             │                                   │
  │      refreshToken } ──────────────┤                                   │
```

Access tokens expire after 15 minutes. Refresh tokens rotate on each use and expire after 7 days.

---

## Role-Based Access Control

| Capability | Employee | Manager | HR | Admin |
|---|:---:|:---:|:---:|:---:|
| View own attendance | ✓ | ✓ | ✓ | ✓ |
| View team attendance | — | ✓ | ✓ | ✓ |
| Apply / cancel own leave | ✓ | ✓ | ✓ | ✓ |
| Approve / reject leave | — | ✓ | ✓ | ✓ |
| Submit regularization | ✓ | ✓ | ✓ | ✓ |
| Approve regularization | — | ✓ | ✓ | ✓ |
| Request comp-off | ✓ | ✓ | ✓ | ✓ |
| Approve comp-off | — | ✓ | ✓ | ✓ |
| Post announcements | — | ✓ | ✓ | ✓ |
| Delete announcements | — | — | ✓ | ✓ |
| View own onboarding | ✓ | ✓ | ✓ | ✓ |
| Manage onboarding for others | — | ✓ | ✓ | ✓ |
| Manage assets and IT provisioning | — | — | ✓ | ✓ |
| Upload own KRA | ✓ | ✓ | ✓ | ✓ |
| View all KRAs | — | ✓ | ✓ | ✓ |
| Create users | — | — | ✓ | ✓ |
| Deactivate users | — | — | — | ✓ |
| Manage holidays | — | — | ✓ | ✓ |

Role checks are enforced by the `authorize(...roles)` middleware on every protected route.

---

## Environment Variables

A complete reference of supported variables is provided in [.env.example](.env.example).

```env
# Database
DATABASE_URL=postgresql://user:password@host:6543/postgres
DIRECT_URL=postgresql://user:password@host:5432/postgres

# JWT secrets — generate a strong unique value for each
JWT_ACCESS_SECRET=<min 64 random characters>
JWT_REFRESH_SECRET=<min 64 random characters>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# One-time password
OTP_EXPIRES_MINUTES=10

# SMTP (e.g. Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<smtp username>
SMTP_PASS=<smtp password or app password>
SMTP_FROM="POD Atlas <no-reply@example.com>"

# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001

# Object storage (S3-compatible)
SUPABASE_S3_ENDPOINT=
SUPABASE_S3_REGION=ap-south-1
SUPABASE_S3_ACCESS_KEY_ID=
SUPABASE_S3_SECRET_ACCESS_KEY=
SUPABASE_STORAGE_BUCKET=atlas-files
SUPABASE_PUBLIC_URL=
```

**Generating JWT secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Local Development

**Prerequisites:** Node.js 20+, npm, access to a PostgreSQL database.

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your credentials in .env

# Apply schema to database
npx prisma db push

# (Optional) Seed reference data
npx prisma db seed

# Start the dev server (hot reload)
npm run dev

# Type check
npx tsc --noEmit

# Inspect the database visually
npx prisma studio
```

The service listens on `http://localhost:3000` by default.

**Health check:**

```bash
curl http://localhost:3000/api/health
```

---

## Deployment

The API targets Vercel Serverless Functions. See [vercel.json](vercel.json) for the deployment configuration.

```bash
# Deploy to production
npx vercel --prod
```

All environment variables must be configured in **Vercel → Project → Settings → Environment Variables**.

When deploying to a serverless platform, use the database provider's **transaction pooler** URL (typically port 6543) for `DATABASE_URL`, and the **direct connection** URL (port 5432) for `DIRECT_URL`. Prisma migrations require a direct connection.

---

## Initial Setup

After your first deployment:

1. Create the first Admin user directly in the database (set `role = 'ADMIN'` and `isActive = true`).
2. Populate the `LeaveType` table with the leave categories used by your organisation.
3. Seed the holiday calendar via `POST /api/holidays/seed`, or insert custom entries.
4. Create departments in the `Department` table.
5. Use the Admin console (`/api/users`) to onboard employees — they will receive a welcome email automatically.
6. Initialise the onboarding checklist for each new hire via `POST /api/onboarding/init/:userId`.

---

## Contributing

Use the `dev` branch for active development. All pull requests should target `dev` and pass type checks before being merged.

```bash
git checkout dev
git pull origin dev
git checkout -b feature/<short-description>
# make changes
npx tsc --noEmit
git push origin feature/<short-description>
```

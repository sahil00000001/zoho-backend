# POD-Atlas — Backend API

> HR management platform backend built with Express.js, Prisma ORM, and Supabase PostgreSQL.

**Live API:** `https://zoho-backend-rho.vercel.app`
**Frontend:** `https://zoho-app-sigma.vercel.app`

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Modules & API Reference](#modules--api-reference)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [Role Permissions](#role-permissions)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)

---

## Overview

POD-Atlas is a full-featured HR platform for modern teams. The backend is a RESTful API serving all HR workflows:

| Module | What it does |
|---|---|
| **Auth** | Passwordless OTP login via email, JWT access + refresh tokens |
| **Dashboard** | Role-aware KPI stats and activity feed |
| **Attendance** | GPS check-in/out, WFH toggle, overtime, regularization requests |
| **Leaves** | Apply/approve leaves, balance tracking, holiday calendar, comp-off |
| **Onboarding** | 30-day task checklist, laptop/access card asset tracking, IT provisioning |
| **Profile** | Personal info, address, emergency contact, skills, certifications, KRA upload |
| **Announcements** | Company & department notices, birthday/anniversary celebrations |
| **Users** | Employee directory, CRUD with role-based access, welcome email on creation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express.js |
| ORM | Prisma v5 |
| Database | PostgreSQL via Supabase |
| Auth | JWT — access token (15 min) + refresh token (7 days, rotated) |
| Email | Nodemailer + Gmail SMTP (port 465, secure) |
| Validation | Zod |
| Language | TypeScript (strict) |
| Deployment | Vercel Serverless Functions |

---

## Project Structure

```
zoho-backend/
├── prisma/
│   └── schema.prisma           # Full DB schema (20+ models)
├── src/
│   ├── app.ts                  # Express app + route mounting
│   ├── config/
│   │   └── env.ts              # Zod-validated environment config
│   ├── controllers/            # HTTP handlers (thin, delegate to services)
│   │   ├── auth.controller.ts
│   │   ├── attendance.controller.ts
│   │   ├── regularization.controller.ts
│   │   ├── leave.controller.ts
│   │   ├── leaveType.controller.ts
│   │   ├── holiday.controller.ts
│   │   ├── compoff.controller.ts
│   │   ├── onboarding.controller.ts
│   │   ├── profile.controller.ts
│   │   ├── announcement.controller.ts
│   │   ├── user.controller.ts
│   │   └── dashboard.controller.ts
│   ├── services/               # All business logic lives here
│   │   ├── auth.service.ts
│   │   ├── attendance.service.ts
│   │   ├── regularization.service.ts
│   │   ├── leave.service.ts
│   │   ├── holiday.service.ts
│   │   ├── compoff.service.ts
│   │   ├── onboarding.service.ts
│   │   ├── profile.service.ts
│   │   ├── announcement.service.ts
│   │   ├── email.service.ts
│   │   ├── user.service.ts
│   │   └── dashboard.service.ts
│   ├── routes/                 # Express routers
│   ├── middleware/
│   │   ├── auth.ts             # authenticate + authorize(roles)
│   │   └── errorHandler.ts     # Global error handler
│   ├── schemas/                # Zod request validation schemas
│   ├── utils/
│   │   └── response.ts         # sendSuccess / sendError helpers
│   └── lib/
│       └── prisma.ts           # Prisma client singleton
└── vercel.json                 # Vercel deployment config
```

**Standard response envelope:**
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

---

## Modules & API Reference

> All routes require `Authorization: Bearer <accessToken>` unless marked **Public**.

---

### 🔐 Auth — `/api/auth`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Send 6-digit OTP to email (expires 10 min) |
| POST | `/verify-otp` | Public | Verify OTP → returns JWT pair + user |
| POST | `/refresh` | Public | Rotate refresh token → new token pair |
| POST | `/logout` | Auth | Invalidate refresh token |
| GET | `/me` | Auth | Current authenticated user |

---

### 📊 Dashboard — `/api/dashboard`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/stats` | Auth | Role-specific KPI metrics |
| GET | `/activity` | Auth | Recent leave/attendance activity |

Stats by role:
- **Employee** — leaves used this year, pending requests
- **Manager** — team size, present/on-leave today, pending approvals
- **HR/Admin** — total employees, present/on-leave/absent today, pending approvals

---

### 🕐 Attendance — `/api/attendance`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/check-in` | Auth | Clock in (body: `lat`, `lng`, `address`, `isWFH`) |
| POST | `/check-out` | Auth | Clock out; auto-calculates `workHours` + `overtimeHours` |
| GET | `/today` | Auth | Today's check-in/out status |
| GET | `/history` | Auth | Personal records (`?limit=N`) |
| GET | `/monthly` | Auth | Monthly records (`?month=YYYY-MM`) |
| GET | `/team` | Manager/HR/Admin | Team attendance for a date (`?date=YYYY-MM-DD`) |

Overtime = work hours beyond 9h standard day; stored as `overtimeHours` on the record.

---

### 📋 Regularization — `/api/attendance/regularizations`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/` | Auth | Submit correction request |
| GET | `/` | Auth | Own requests; all requests for managers |
| PATCH | `/:id/approve` | Manager/HR/Admin | Approve & apply to attendance record |
| PATCH | `/:id/reject` | Manager/HR/Admin | Reject with optional note |

---

### 🌿 Leaves — `/api/leaves`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/my` | Auth | My leave applications |
| POST | `/` | Auth | Apply for leave |
| PATCH | `/:id/cancel` | Auth | Cancel own pending leave |
| GET | `/` | Manager/HR/Admin | All applications (`?status=&userId=`) |
| PATCH | `/:id/approve` | Manager/HR/Admin | Approve |
| PATCH | `/:id/reject` | Manager/HR/Admin | Reject with reason |
| GET | `/balance/me` | Auth | Leave balance per type |

### Leave Types — `/api/leave-types`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | All leave types with `daysAllowed` |

---

### 🗓️ Holidays — `/api/holidays`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | All holidays (`?year=2026`) |
| POST | `/seed` | HR/Admin | Seed 15 India national holidays for 2026 |
| POST | `/` | HR/Admin | Add a custom holiday |
| DELETE | `/:id` | HR/Admin | Remove a holiday |

---

### 🏖️ Comp-Off — `/api/compoffs`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | My comp-off requests |
| POST | `/` | Auth | Request comp-off (`earnedDate`, `reason`) |
| GET | `/balance` | Auth | Available comp-off days |
| PATCH | `/:id/approve` | Manager/HR/Admin | Approve |
| PATCH | `/:id/reject` | Manager/HR/Admin | Reject |

Comp-offs expire **3 months** after the earned date.

---

### 🚀 Onboarding — `/api/onboarding`

#### Checklist

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/init/:userId` | HR/Admin | Create 15 default tasks + 8 IT items for employee |
| GET | `/me` | Auth | My checklist, assets, IT provisions |
| GET | `/:userId` | Manager/HR/Admin | Any employee's onboarding data |
| POST | `/:userId/tasks` | Manager/HR/Admin | Add custom task |
| PATCH | `/tasks/:id` | Auth | Update task status |
| DELETE | `/tasks/:id` | HR/Admin | Delete task |

Default checklist seeded per employee (15 tasks across 5 time bands):

| Day | Tasks |
|---|---|
| Day 1 | Paperwork, Office tour, Email setup, Access card, Meet manager |
| Days 2–3 | Laptop + software, VPN, Slack, GitHub access |
| Day 3–7 | HR policy orientation, Compliance training, First project |
| Day 15 | Mid-onboarding HR check-in |
| Day 30 | 30-day manager review |

#### Assets

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/assets/list` | Manager/HR/Admin | All assets with current assignee |
| POST | `/assets` | HR/Admin | Register asset (type, name, serial, model) |
| POST | `/assets/:id/assign` | HR/Admin | Assign to employee (transaction) |
| PATCH | `/assets/assignments/:id/return` | HR/Admin | Mark returned (transaction) |
| GET | `/assets/my` | Auth | My assigned assets |
| GET | `/assets/user/:userId` | Manager/HR/Admin | Any employee's assets |

Asset types: `LAPTOP`, `ACCESS_CARD`, `MONITOR`, `KEYBOARD`, `MOUSE`, `PHONE`, `OTHER`

#### IT Provisioning

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/it-provisions` | HR/Admin | All IT provisions (`?userId=`) |
| PATCH | `/it-provisions/:id` | HR/Admin | Update status |
| POST | `/:userId/it-provisions` | HR/Admin | Add IT item |

Default IT items seeded: Email, Slack, VPN, GitHub/GitLab, Jira, Google Workspace, HR Portal, Cloud Console

---

### 👤 Profile — `/api/profile`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/me` | Auth | Full profile (user + profile + skills + certs + KRA) |
| PATCH | `/me` | Auth | Update photo (base64), bio, address, emergency contact, DOB |
| PATCH | `/me/basic` | Auth | Update phone / designation |
| POST | `/me/skills` | Auth | Add skill (`name`, `level`) |
| DELETE | `/me/skills/:id` | Auth | Remove skill |
| POST | `/me/certifications` | Auth | Add certification |
| DELETE | `/me/certifications/:id` | Auth | Remove |
| GET | `/me/kra` | Auth | My KRA documents |
| POST | `/me/kra` | Auth | Upload KRA (`title`, `period`, `fileUrl` base64, `fileName`) |
| DELETE | `/me/kra/:id` | Auth | Delete KRA |
| GET | `/kra/all` | Manager/HR/Admin | All employees' KRA submissions |
| GET | `/:userId` | Manager/HR/Admin | Any employee's full profile |

---

### 📢 Announcements — `/api/announcements`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | Feed: company-wide + own dept, non-expired, pinned first |
| GET | `/celebrations` | Auth | Birthdays + work anniversaries in next 7 days |
| GET | `/all` | HR/Admin | All announcements including expired |
| POST | `/` | Manager/HR/Admin | Create announcement |
| PATCH | `/:id` | Manager/HR/Admin | Edit / toggle pin / change priority |
| DELETE | `/:id` | HR/Admin | Delete |

Announcement priorities: `HIGH` (red stripe), `NORMAL`, `LOW`
Types: `COMPANY` (all staff) or `DEPARTMENT` (specific dept only)

---

### 👥 Users & Directory — `/api/users`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Auth | All users (`?role=&departmentId=&isActive=&search=`) |
| GET | `/departments` | Auth | All departments |
| GET | `/:id` | Auth | Single user |
| POST | `/` | HR/Admin | Create user (auto-sends welcome email with credentials) |
| PUT | `/:id` | HR/Admin | Update user details |
| DELETE | `/:id` | Admin | Deactivate user |

### Health Check

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Returns DB connection status |

---

## Database Schema

### Key Models

```
User                    — Core employee record
├── UserProfile         — Extended info (photo, address, emergency, DOB)
├── Skill               — Skills with proficiency levels
├── Certification       — Professional certifications
├── KRADocument         — KRA file uploads (base64)
├── Attendance          — Daily check-in/out records
├── AttendanceRegularization — Correction requests
├── Leave               — Leave applications
├── CompOff             — Compensatory off requests
├── OnboardingTask      — Per-employee 30-day task checklist
├── AssetAssignment     — Asset-to-employee assignment history
├── ITProvision         — IT setup tracking per employee
└── Announcement        — Authored announcements

Department              — Org units
Asset                   — Physical asset registry
Holiday                 — National + company holidays
LeaveType               — Leave type definitions (Annual, Sick, etc.)
RefreshToken            — Stored refresh tokens (rotation)
OTP                     — Active OTP codes (TTL: 10 min)
```

---

## Authentication Flow

```
Client                          Backend                         Gmail
  │                                │                              │
  ├──POST /auth/login {email}──────►                              │
  │                                ├── Validate user in DB        │
  │                                ├── Generate 6-digit OTP       │
  │                                ├── Store OTP (expires 10m)    │
  │                                ├──────── Send email ──────────►
  │◄── { message: "OTP sent" } ────┤                              │
  │                                │                              │
  ├──POST /auth/verify-otp─────────►                              │
  │   { email, otp }               ├── Validate OTP + expiry      │
  │                                ├── Generate accessToken (15m) │
  │                                ├── Generate refreshToken (7d) │
  │◄── { accessToken,              ├── Store refreshToken in DB   │
  │      refreshToken, user } ─────┤                              │
  │                                │                              │
  ├── All requests:                │                              │
  │   Authorization: Bearer <at>   │                              │
  │                                │                              │
  ├── On 401: POST /auth/refresh───►                              │
  │   { refreshToken }             ├── Validate + rotate token    │
  │◄── { new accessToken,          │                              │
  │      new refreshToken } ───────┤                              │
```

---

## Role Permissions

| Feature | Employee | Manager | HR | Admin |
|---|---|---|---|---|
| View own attendance | ✅ | ✅ | ✅ | ✅ |
| View team attendance | — | ✅ | ✅ | ✅ |
| Apply/cancel leave | ✅ | ✅ | ✅ | ✅ |
| Approve/reject leave | — | ✅ | ✅ | ✅ |
| Submit regularization | ✅ | ✅ | ✅ | ✅ |
| Approve regularization | — | ✅ | ✅ | ✅ |
| Request comp-off | ✅ | ✅ | ✅ | ✅ |
| Approve comp-off | — | ✅ | ✅ | ✅ |
| Post announcements | — | ✅ | ✅ | ✅ |
| Delete announcements | — | — | ✅ | ✅ |
| View own onboarding | ✅ | ✅ | ✅ | ✅ |
| Manage onboarding for others | — | ✅ | ✅ | ✅ |
| Manage assets/IT | — | — | ✅ | ✅ |
| View/upload own KRA | ✅ | ✅ | ✅ | ✅ |
| View all KRAs | — | ✅ | ✅ | ✅ |
| Create users | — | — | ✅ | ✅ |
| Deactivate users | — | — | — | ✅ |
| Manage holidays | — | — | ✅ | ✅ |
| Seed national holidays | — | — | ✅ | ✅ |

---

## Environment Variables

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# JWT secrets (min 32 chars, use different values)
JWT_ACCESS_SECRET=change-me-min-32-characters-long
JWT_REFRESH_SECRET=change-me-min-32-characters-different

# Gmail SMTP
SMTP_USER=youremail@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # 16-char Google App Password

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001
```

**Getting a Gmail App Password:**
1. Go to `myaccount.google.com/security`
2. Enable 2-Step Verification
3. Search for "App passwords" → Generate for "Mail"
4. Use the 16-character code as `SMTP_PASS`

---

## Local Development

```bash
# Install
npm install

# Configure environment
cp .env.example .env
# Fill in your credentials

# Push schema to database
npx prisma db push

# Start dev server (with hot reload)
npm run dev
# API available at http://localhost:3000

# Type check
npx tsc --noEmit

# Open Prisma Studio (visual DB browser)
npx prisma studio
# → http://localhost:5555

# Health check
curl http://localhost:3000/api/health
```

---

## Deployment

**Platform:** Vercel (Serverless)

```bash
# Deploy via Vercel CLI
npx vercel --prod

# Or push to main branch — Vercel auto-deploys
git push origin main
```

Set all environment variables in **Vercel Dashboard → Project → Settings → Environment Variables**.

Use the Supabase **Session Pooler** URL (port 5432) for `DIRECT_URL` (required for Prisma migrations on serverless).

---

## First-Time Setup Checklist

After deploying:
1. Create first Admin user via Prisma Studio (set `role: ADMIN`, `isActive: true`)
2. Add leave types (Annual Leave, Sick Leave, etc.) in `LeaveType` table
3. Seed national holidays via `POST /api/holidays/seed`
4. Create departments in `Department` table
5. Add employees via User Management → they receive a welcome email
6. Initialize onboarding for new hires via `POST /api/onboarding/init/:userId`

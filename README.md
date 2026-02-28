# Employee Management Portal — Backend API

A production-ready REST API for the Employee Management Portal, built with **Express + TypeScript**, **Prisma ORM**, **Supabase (PostgreSQL)**, and deployed on **Vercel**.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 18+ | LTS, Vercel native |
| Language | TypeScript | Type-safety across the whole codebase |
| Framework | Express.js | Mature, minimal, widely supported |
| ORM | Prisma | Type-safe queries, auto migrations |
| Database | Supabase (PostgreSQL) | Managed Postgres + free tier + connection pooler |
| Validation | Zod | Schema-first, integrates with TypeScript |
| Auth | JWT (access + refresh tokens) | Stateless, scalable |
| OTP Delivery | Nodemailer (SMTP) | Works with Gmail / any SMTP provider |
| Security | Helmet, CORS | Security headers, CORS control |
| Deployment | Vercel | Serverless, zero-config, free tier |

---

## Project Structure

```
zoho-backend/
├── api/
│   └── index.ts            # Vercel serverless entry point
├── prisma/
│   ├── schema.prisma       # Database models & enums
│   └── seed.ts             # Seed departments, leave types, admin user
├── src/
│   ├── app.ts              # Express app (middleware + routes)
│   ├── server.ts           # Local dev server
│   ├── config/
│   │   └── env.ts          # Typed env variables (fails fast if missing)
│   ├── lib/
│   │   └── prisma.ts       # Prisma singleton (safe for serverless)
│   ├── middleware/
│   │   ├── auth.ts         # JWT authentication + role authorization
│   │   ├── errorHandler.ts # Global error handler + AppError class
│   │   └── validate.ts     # Zod request validator middleware
│   ├── schemas/
│   │   ├── auth.schema.ts  # Zod schemas for auth payloads
│   │   └── leave.schema.ts # Zod schemas for leave payloads
│   ├── services/
│   │   ├── auth.service.ts       # Login, OTP, JWT, refresh, logout logic
│   │   ├── attendance.service.ts # Check-in / check-out logic
│   │   ├── leave.service.ts      # Leave application logic
│   │   └── email.service.ts      # Nodemailer OTP email
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── attendance.controller.ts
│   │   └── leave.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── attendance.routes.ts
│   │   ├── leave.routes.ts
│   │   └── leaveType.routes.ts
│   └── utils/
│       ├── response.ts     # Standardised success/error response helpers
│       ├── jwt.ts          # Sign & verify access/refresh tokens
│       └── otp.ts          # OTP generation + expiry
├── .env.example            # All required env variables documented
├── .gitignore
├── package.json
├── tsconfig.json
└── vercel.json             # Vercel routing config
```

---

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project
- SMTP credentials (Gmail with App Password works)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Fill in the values in `.env` — see the section below for where to get them.

### 4. Push the database schema
```bash
npm run db:push
```

### 5. Seed initial data (departments, leave types, admin user)
```bash
npm run db:seed
```

### 6. Run the development server
```bash
npm run dev
```
The API will be available at `http://localhost:3000`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in each value.

### Supabase Database URLs

Go to **Supabase Dashboard → Settings → Database → Connection string**.

| Variable | Where to find it | Port |
|---|---|---|
| `DATABASE_URL` | *Transaction* pooler URI | 6543 |
| `DIRECT_URL` | *Session mode* URI | 5432 |

The `DATABASE_URL` (port 6543) is used at runtime by the app (safe for serverless).
The `DIRECT_URL` (port 5432) is used only by `prisma migrate` / `prisma db push`.

### JWT Secrets

Generate strong secrets (run once in your terminal):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it twice — once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

### SMTP / Email (Gmail)

1. Enable **2-Step Verification** on your Google account.
2. Go to **Google Account → Security → App Passwords** and create an App Password.
3. Use that 16-character App Password as `SMTP_PASS`.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=Employee Portal <your-email@gmail.com>
```

---

## Deploying to Vercel

### 1. Push code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Import the project on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Vercel auto-detects the `vercel.json` — no further config needed

### 3. Add environment variables on Vercel
In the Vercel project → **Settings → Environment Variables**, add every variable from `.env.example` with production values.

> **Important:** Use the Supabase Transaction pooler URL (port 6543) for `DATABASE_URL` on Vercel (serverless), and the Direct URL (port 5432) for `DIRECT_URL`.

### 4. Run migrations on production DB
After deploying, run migrations from your local machine pointing at the production DB:
```bash
DATABASE_URL="<direct-url-port-5432>" npx prisma migrate deploy
npm run db:seed
```

---

## API Reference

### Base URL
- Local: `http://localhost:3000`
- Production: `https://<your-vercel-domain>/`

### Standard Response Format

**Success**
```json
{
  "success": true,
  "data": { },
  "message": "Operation successful",
  "meta": null
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { }
  }
}
```

---

### Authentication APIs

#### POST `/api/auth/login`
Send OTP to a registered employee email.
```json
// Body
{ "email": "employee@company.com" }

// Response
{ "success": true, "data": { "message": "If this email is registered, an OTP has been sent." } }
```

#### POST `/api/auth/verify-otp`
Verify OTP and receive JWT tokens.
```json
// Body
{ "email": "employee@company.com", "otp": "123456" }

// Response data
{
  "user": { "id": "...", "employeeId": "EMP001", "email": "...", "firstName": "John", ... },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### GET `/api/auth/me`
Get the authenticated user's full profile.
`Authorization: Bearer <accessToken>`

#### POST `/api/auth/refresh`
Rotate tokens (refresh token is invalidated and replaced).
```json
{ "refreshToken": "eyJ..." }
```

#### POST `/api/auth/logout`
```json
{ "refreshToken": "eyJ..." }
```

---

### Attendance APIs
All require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/attendance/check-in` | Check in for today |
| POST | `/api/attendance/check-out` | Check out for today |
| GET | `/api/attendance/today` | Get today's attendance record |

---

### Leave Management APIs
All require `Authorization: Bearer <accessToken>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leaves` | Get all my leave requests |
| POST | `/api/leaves` | Apply for leave |
| GET | `/api/leave-types` | Get all active leave types |

**Apply for leave body:**
```json
{
  "leaveTypeId": "uuid",
  "startDate": "2024-04-01",
  "endDate": "2024-04-03",
  "reason": "Vacation"
}
```

---

### System APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check (DB connectivity) |

---

## Database Models

| Model | Description |
|---|---|
| `User` | Employees with role (EMPLOYEE / HR / ADMIN) |
| `Department` | Company departments |
| `OTP` | Short-lived OTPs linked to users |
| `RefreshToken` | Persisted refresh tokens (rotated on each use) |
| `Attendance` | Daily check-in/check-out records |
| `LeaveType` | Configurable leave categories (Annual, Sick, etc.) |
| `Leave` | Leave applications with status workflow |

---

## What's Been Built

- [x] OTP-based email authentication (no passwords)
- [x] JWT access + refresh token flow with rotation
- [x] Attendance check-in / check-out with late detection
- [x] Leave application with overlap prevention
- [x] Zod validation on all request bodies
- [x] Standardised success/error response format
- [x] Global error handler (Zod errors, AppErrors, unexpected errors)
- [x] Role-based authorization middleware (EMPLOYEE / HR / ADMIN)
- [x] Prisma singleton pattern (safe for Vercel serverless)
- [x] Database seeding (departments, leave types, admin user)
- [x] Vercel deployment configuration

## What Can Be Added Next

- [ ] Admin APIs (manage users, approve/reject leaves, view all attendance)
- [ ] HR APIs (department management, employee onboarding)
- [ ] Pagination on list endpoints
- [ ] File upload for profile photos (Supabase Storage)
- [ ] Real-time notifications (Supabase Realtime)
- [ ] Leave balance tracking per user per leave type
- [ ] Rate limiting (e.g., `express-rate-limit`)
- [ ] Request logging (e.g., `morgan`)
- [ ] API versioning (`/api/v1/...`)

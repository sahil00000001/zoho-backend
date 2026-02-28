# Employee Management Portal — Full Documentation

**Live API:** `https://zoho-backend-rho.vercel.app`
**Repository:** `https://github.com/sahil00000001/zoho-backend`

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Tech Stack & Why](#2-tech-stack--why)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Architecture](#5-architecture)
6. [API Reference](#6-api-reference)
7. [Environment Variables](#7-environment-variables)
8. [Local Development](#8-local-development)
9. [Deployment (Vercel)](#9-deployment-vercel)
10. [Troubleshooting Log](#10-troubleshooting-log)
11. [What Can Be Added Next](#11-what-can-be-added-next)

---

## 1. What Was Built

A production-ready REST API backend for an **Employee Management Portal**, supporting:

| Feature | Description |
|---|---|
| OTP Authentication | Email-based login with 6-digit OTP, no passwords |
| JWT Token System | Short-lived access tokens (15m) + rotating refresh tokens (7d) |
| Attendance Tracking | Check-in / Check-out with late detection and work hours calculation |
| Leave Management | Apply for leave, view history, check leave types |
| Role-Based Access | EMPLOYEE / HR / ADMIN roles on all routes |
| Request Validation | All inputs validated with Zod before hitting the database |
| Standardised Responses | Every API returns the same success/error JSON structure |
| Health Check | Live DB connectivity check endpoint |

---

## 2. Tech Stack & Why

| Layer | Technology | Reason |
|---|---|---|
| Runtime | **Node.js 18+** | LTS, native on Vercel |
| Language | **TypeScript** | Type-safety eliminates entire classes of runtime bugs |
| Framework | **Express.js** | Mature, minimal, works perfectly as a Vercel serverless function |
| ORM | **Prisma** | Type-safe queries, auto-generates TypeScript types from schema |
| Database | **Supabase (PostgreSQL)** | Managed Postgres + connection pooler + free tier + IPv4 support |
| Validation | **Zod** | Schema-first validation with TypeScript inference |
| Auth | **JWT (jsonwebtoken)** | Stateless, scales to any number of servers without shared state |
| Email / OTP | **Nodemailer** | Works with any SMTP provider (Gmail, Resend, SendGrid, etc.) |
| Security | **Helmet + CORS** | Security headers and CORS policy on every response |
| Deployment | **Vercel** | Serverless, auto-deploys on every git push, free tier |

---

## 3. Project Structure

```
zoho-backend/
│
├── api/
│   └── index.ts              ← Vercel serverless entry point (exports Express app)
│
├── prisma/
│   ├── schema.prisma         ← All database models and enums
│   └── seed.ts               ← Seeds departments, leave types, admin user
│
├── src/
│   ├── app.ts                ← Express app: middleware + route mounting
│   ├── server.ts             ← Local dev HTTP server (not used by Vercel)
│   │
│   ├── config/
│   │   └── env.ts            ← Typed env config — fails fast if any var is missing
│   │
│   ├── lib/
│   │   └── prisma.ts         ← Prisma singleton (prevents connection pool exhaustion in serverless)
│   │
│   ├── middleware/
│   │   ├── auth.ts           ← JWT authentication + role-based authorization
│   │   ├── errorHandler.ts   ← Global error handler + AppError class
│   │   └── validate.ts       ← Zod middleware for request body/query validation
│   │
│   ├── schemas/
│   │   ├── auth.schema.ts    ← Zod schemas for all auth payloads
│   │   └── leave.schema.ts   ← Zod schema for leave application
│   │
│   ├── services/             ← Business logic layer (talks to Prisma)
│   │   ├── auth.service.ts
│   │   ├── attendance.service.ts
│   │   ├── leave.service.ts
│   │   └── email.service.ts
│   │
│   ├── controllers/          ← HTTP layer (reads req, calls service, sends res)
│   │   ├── auth.controller.ts
│   │   ├── attendance.controller.ts
│   │   └── leave.controller.ts
│   │
│   ├── routes/               ← Route definitions (method + path + middleware + controller)
│   │   ├── auth.routes.ts
│   │   ├── attendance.routes.ts
│   │   ├── leave.routes.ts
│   │   └── leaveType.routes.ts
│   │
│   └── utils/
│       ├── response.ts       ← sendSuccess() and sendError() helpers
│       ├── jwt.ts            ← Sign and verify access/refresh tokens
│       └── otp.ts            ← Generate 6-digit OTP and calculate expiry
│
├── .env                      ← Local secrets (never committed to git)
├── .env.example              ← Template with all required variables documented
├── .gitignore
├── package.json
├── tsconfig.json             ← Compiles src/ → dist/ (Vercel handles api/ separately)
├── vercel.json               ← Routes all traffic to api/index serverless function
└── README.md
```

---

## 4. Database Schema

### Models

#### `Department`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | Unique |
| createdAt | DateTime | |
| updatedAt | DateTime | |

#### `User`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| employeeId | String | Unique, e.g. EMP001 |
| email | String | Unique |
| firstName | String | |
| lastName | String | |
| role | Enum | EMPLOYEE / HR / ADMIN |
| designation | String? | Optional |
| phoneNumber | String? | Optional |
| joiningDate | DateTime? | Optional |
| address | String? | Optional |
| profilePhotoUrl | String? | Optional |
| isActive | Boolean | Soft delete flag |
| departmentId | UUID? | FK → Department |

#### `OTP`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User (cascade delete) |
| code | String | 6-digit numeric OTP |
| expiresAt | DateTime | Set to now + OTP_EXPIRES_MINUTES |
| isUsed | Boolean | Marked true after successful use |

#### `RefreshToken`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User (cascade delete) |
| token | String | Unique JWT refresh token |
| expiresAt | DateTime | 7 days from creation |

#### `Attendance`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User |
| date | Date | Date only (no time) |
| checkInTime | DateTime? | Set on check-in |
| checkOutTime | DateTime? | Set on check-out |
| workHours | Float? | Calculated on check-out |
| status | Enum | PRESENT / ABSENT / HALF_DAY / LATE |
| **Unique** | | userId + date (one record per employee per day) |

#### `LeaveType`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | String | Unique, e.g. "Annual Leave" |
| description | String? | Optional |
| maxDays | Int | Max days allowed per year |
| isActive | Boolean | Soft delete flag |

#### `Leave`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| userId | UUID | FK → User |
| leaveTypeId | UUID | FK → LeaveType |
| startDate | Date | |
| endDate | Date | |
| reason | String | |
| status | Enum | PENDING / APPROVED / REJECTED / CANCELLED |

### Enums

```
Role:             EMPLOYEE | HR | ADMIN
AttendanceStatus: PRESENT | ABSENT | HALF_DAY | LATE
LeaveStatus:      PENDING | APPROVED | REJECTED | CANCELLED
```

---

## 5. Architecture

### Request Flow

```
Client Request
      │
      ▼
Vercel Edge (vercel.json rewrite)
      │
      ▼
api/index.ts  (Serverless Function)
      │
      ▼
Express App (src/app.ts)
      │
      ├── helmet()          ← Security headers
      ├── cors()            ← CORS policy
      ├── express.json()    ← Body parsing
      │
      ▼
Route (e.g. /api/auth/login)
      │
      ├── validate(schema)  ← Zod validates body, rejects bad input with 422
      ├── authenticate()    ← Verifies JWT, attaches user to req (protected routes)
      ├── authorize(role)   ← Checks user role (admin-only routes)
      │
      ▼
Controller
      │  Reads req, calls service, sends response via sendSuccess/sendError
      ▼
Service
      │  Business logic, throws AppError for domain errors
      ▼
Prisma Client → Supabase PostgreSQL
      │
      ▼
Response sent back up the chain
      │
      ▼
errorHandler()  ← Catches any thrown errors (AppError, ZodError, unknown)
```

### Key Design Decisions

**1. Prisma Singleton (`src/lib/prisma.ts`)**
In serverless environments, each function invocation can spin up a new module scope, which would create a new DB connection and exhaust the Supabase connection pool. The singleton pattern stores the client on `global` so it's reused across hot invocations in the same container.

**2. Service Layer**
Business logic lives in services (not controllers). Controllers are thin — they only read the request and call a service. This makes services reusable, testable, and easy to reason about.

**3. AppError Class**
Throwing `new AppError('CODE', 'message', statusCode)` from a service bubbles up to the global error handler, which formats it into the standard error response. No need for try/catch in every controller — they just call `next(err)`.

**4. JWT Rotation**
On every `/api/auth/refresh` call, the old refresh token is **deleted** from the database and a new one is created. This means if a refresh token is stolen, it can only be used once before it's rotated out.

**5. OTP Security**
- Previous unused OTPs are invalidated when a new login is initiated
- OTPs expire after `OTP_EXPIRES_MINUTES` (default: 10)
- The login endpoint returns the same message whether the email exists or not (prevents user enumeration attacks)

**6. Supabase Connection URLs**
| URL | Port | Mode | Used For |
|---|---|---|---|
| `DATABASE_URL` | 6543 | Transaction Pooler | Runtime (Vercel serverless) |
| `DIRECT_URL` | 5432 | Session Pooler | Prisma migrations / db push |

The `?pgbouncer=true&connection_limit=1` on `DATABASE_URL` tells Prisma to disable prepared statements (not supported in Transaction mode PgBouncer).

---

## 6. API Reference

### Base URL
```
https://zoho-backend-rho.vercel.app
```

### Standard Response Format

**Success (2xx)**
```json
{
  "success": true,
  "data": { },
  "message": "Operation successful",
  "meta": null
}
```

**Error (4xx / 5xx)**
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

#### POST `/api/auth/login` — Send OTP

**Request**
```json
{
  "email": "admin@company.com"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "message": "If this email is registered, an OTP has been sent."
  },
  "message": "OTP sent successfully"
}
```

**Validation Errors** — 422
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": { "email": ["Invalid email address"] }
  }
}
```

---

#### POST `/api/auth/verify-otp` — Verify OTP & Get Tokens

**Request**
```json
{
  "email": "admin@company.com",
  "otp": "482910"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "employeeId": "EMP000",
      "email": "admin@company.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "ADMIN",
      "designation": "System Administrator",
      "profilePhotoUrl": null,
      "department": {
        "id": "uuid",
        "name": "Human Resources"
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

**Error Responses**
| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Email not found or account inactive |
| `INVALID_OTP` | 401 | OTP wrong, expired, or already used |

---

#### GET `/api/auth/me` — Get My Profile

**Headers**
```
Authorization: Bearer <accessToken>
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeId": "EMP001",
    "email": "employee@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "designation": "Software Engineer",
    "phoneNumber": "+91-9999999999",
    "joiningDate": "2023-01-15T00:00:00.000Z",
    "address": "123 Main St, Mumbai",
    "profilePhotoUrl": null,
    "isActive": true,
    "department": {
      "id": "uuid",
      "name": "Engineering"
    }
  }
}
```

---

#### POST `/api/auth/refresh` — Rotate Tokens

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ... (new)",
    "refreshToken": "eyJ... (new, old one is now invalid)"
  },
  "message": "Tokens refreshed"
}
```

---

#### POST `/api/auth/logout`

**Request**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" },
  "message": "Logged out successfully"
}
```

---

### Attendance APIs
*All require `Authorization: Bearer <accessToken>`*

#### POST `/api/attendance/check-in`

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "date": "2024-04-01T00:00:00.000Z",
    "checkInTime": "2024-04-01T09:15:00.000Z",
    "checkOutTime": null,
    "workHours": null,
    "status": "PRESENT",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "employeeId": "EMP001"
    }
  },
  "message": "Checked in successfully"
}
```

**Notes:**
- Check-in after 09:30 AM sets `status: "LATE"`
- Returns `409 ALREADY_CHECKED_IN` if already checked in today

---

#### POST `/api/attendance/check-out`

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "checkInTime": "2024-04-01T09:15:00.000Z",
    "checkOutTime": "2024-04-01T18:00:00.000Z",
    "workHours": 8.75,
    "status": "PRESENT"
  },
  "message": "Checked out successfully"
}
```

**Error Codes**
| Code | HTTP | Meaning |
|---|---|---|
| `NOT_CHECKED_IN` | 400 | No check-in record for today |
| `ALREADY_CHECKED_OUT` | 409 | Already checked out today |

---

#### GET `/api/attendance/today`

**Response 200** *(if checked in)*
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2024-04-01T00:00:00.000Z",
    "checkInTime": "2024-04-01T09:15:00.000Z",
    "checkOutTime": null,
    "workHours": null,
    "status": "PRESENT"
  }
}
```

**Response 200** *(if not checked in)*
```json
{
  "success": true,
  "data": null
}
```

---

### Leave Management APIs
*All require `Authorization: Bearer <accessToken>`*

#### GET `/api/leaves` — Get My Leave History

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "startDate": "2024-04-01T00:00:00.000Z",
      "endDate": "2024-04-03T00:00:00.000Z",
      "reason": "Vacation",
      "status": "PENDING",
      "createdAt": "2024-03-25T10:00:00.000Z",
      "leaveType": {
        "id": "uuid",
        "name": "Annual Leave",
        "maxDays": 21
      },
      "user": {
        "id": "uuid",
        "employeeId": "EMP001",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ]
}
```

---

#### POST `/api/leaves` — Apply for Leave

**Request**
```json
{
  "leaveTypeId": "uuid-of-leave-type",
  "startDate": "2024-04-01",
  "endDate": "2024-04-03",
  "reason": "Family vacation"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "PENDING",
    "startDate": "2024-04-01T00:00:00.000Z",
    "endDate": "2024-04-03T00:00:00.000Z",
    "leaveType": { "id": "uuid", "name": "Annual Leave" }
  },
  "message": "Leave application submitted"
}
```

**Validation Rules:**
- `endDate` must be >= `startDate`
- `reason` must be 5–500 characters
- `leaveTypeId` must be a valid UUID of an active leave type
- Returns `409 LEAVE_OVERLAP` if dates overlap with an existing PENDING or APPROVED leave

---

#### GET `/api/leave-types` — Get All Active Leave Types

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Annual Leave",
      "description": "Yearly paid leave",
      "maxDays": 21,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Casual Leave",
      "description": "Short casual leave for personal matters",
      "maxDays": 7,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Maternity Leave",
      "description": "Leave for new mothers",
      "maxDays": 90,
      "isActive": true
    },
    {
      "id": "uuid",
      "name": "Sick Leave",
      "description": "Medical leave with doctor certificate",
      "maxDays": 14,
      "isActive": true
    }
  ]
}
```

---

### System APIs

#### GET `/api/health`

**Response 200**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
  },
  "message": "Operation successful"
}
```

**Response 503** *(if DB unreachable)*
```json
{
  "status": "unhealthy",
  "database": "disconnected"
}
```

---

### Common Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body failed Zod schema validation |
| `UNAUTHORIZED` | 401 | Missing or invalid Authorization header |
| `TOKEN_EXPIRED` | 401 | Access token has expired — use refresh endpoint |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `NOT_FOUND` | 404 | Resource or route not found |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## 7. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase Transaction Pooler URL (port 6543) with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | ✅ | Supabase Session Pooler URL (port 5432) — for Prisma migrations only |
| `JWT_ACCESS_SECRET` | ✅ | 64+ char random string for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | 64+ char random string for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | e.g. `7d` |
| `OTP_EXPIRES_MINUTES` | ✅ | e.g. `10` |
| `SMTP_HOST` | ✅ | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | ✅ | e.g. `587` |
| `SMTP_SECURE` | ✅ | `false` for TLS, `true` for SSL |
| `SMTP_USER` | ✅ | SMTP username / Gmail address |
| `SMTP_PASS` | ✅ | Gmail App Password (16 chars, no spaces) |
| `SMTP_FROM` | ✅ | e.g. `Employee Portal <noreply@company.com>` |
| `NODE_ENV` | ✅ | `development` or `production` |
| `CORS_ORIGIN` | ✅ | `*` or specific frontend URL |
| `PORT` | ❌ | Local dev only (default: 3000). Do NOT set on Vercel. |

---

## 8. Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Push schema to Supabase
npm run db:push

# 4. Seed initial data
npm run db:seed

# 5. Start dev server with hot reload
npm run dev
# → http://localhost:3000
```

**Useful commands**

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with auto-restart on file change |
| `npm run build` | Compile TypeScript → dist/ |
| `npm run db:push` | Push Prisma schema to Supabase (no migration file) |
| `npm run db:migrate` | Run pending migration files in production |
| `npm run db:seed` | Seed departments, leave types, admin user |
| `npm run db:studio` | Open Prisma Studio GUI at localhost:5555 |

---

## 9. Deployment (Vercel)

### How it works
1. `vercel.json` uses a `rewrites` rule to send all traffic to the `api/index.ts` serverless function
2. `api/index.ts` simply exports the Express app
3. Vercel's `@vercel/node` runtime wraps Express and handles each request as a serverless invocation
4. On every `git push` to `main`, Vercel automatically rebuilds and redeploys

### Build Process on Vercel
```
npm install
  └── postinstall: prisma generate   ← Creates typed Prisma Client

npm run build
  └── tsc                            ← Compiles src/ → dist/ (TypeScript check)

Vercel creates serverless function from api/index.ts
```

### Adding a New Environment Variable on Vercel
1. Vercel Dashboard → your project → **Settings → Environment Variables**
2. Add the variable
3. Go to **Deployments** → latest → **Redeploy** (new env vars only apply after redeploy)

### Manual Deployment
```bash
npx vercel --prod
```

---

## 10. Troubleshooting Log

Issues encountered and resolved during setup:

| Issue | Cause | Fix Applied |
|---|---|---|
| `P1001 Can't reach database` | `DIRECT_URL` pointed to IPv6-only direct connection | Switched to Session Pooler (same host as `DATABASE_URL`, port 5432) |
| `P1000 Authentication failed` | Password `Sahil@9625` contains `@` which breaks URL parsing | URL-encoded `@` → `%40` in both connection strings |
| `TS2783 specified more than once` | `select: { id: true, ...userSelect }` where `userSelect` already had `id` | Changed to `select: userSelect` since all fields already included |
| `Route not found` on root URL | No Express route defined for `/` — this is expected | Test `/api/health` not the root URL |
| Vercel build running `tsc` | Vercel auto-detected the `build` script in `package.json` | Expected — `tsc` verifies types; Vercel compiles `api/` separately |

---

## 11. What Can Be Added Next

### High Priority
- [ ] **Admin APIs** — Approve/reject leaves, view all employees' attendance
- [ ] **User creation API** — HR/Admin creates new employee accounts
- [ ] **Pagination** — Add `page` and `limit` query params to list endpoints

### Medium Priority
- [ ] **Leave balance tracking** — Track remaining days per user per leave type per year
- [ ] **Attendance history** — `GET /api/attendance?month=2024-04` for monthly report
- [ ] **Profile photo upload** — Store in Supabase Storage, save URL to User

### Nice to Have
- [ ] **Rate limiting** — `express-rate-limit` on OTP endpoint to prevent abuse
- [ ] **Request logging** — `morgan` middleware for access logs
- [ ] **API versioning** — Move routes to `/api/v1/...`
- [ ] **Swagger / OpenAPI docs** — Auto-generate interactive API docs
- [ ] **Test suite** — Unit tests for services, integration tests for routes

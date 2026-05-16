# Technical Requirements Document

## Passmark — Event Accreditation Platform

**Version:** 1.0  
**Status:** Draft  
**Author:** Engineering  
**Last Updated:** May 2026

---

## 1. System Overview

Passmark is a multi-tenant-ready, server-rendered web application with a REST API backend. V1 targets single-event deployments with a clean data model that supports multi-event in V2. The stack is chosen for speed of development, free-tier infrastructure compatibility, and developer availability.

---

## 2. Tech Stack

### 2.1 Frontend

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | Next.js 15 (App Router)                  |
| Language         | TypeScript                               |
| Styling          | Tailwind CSS v4                          |
| Icons            | Lucide React                             |
| State Management | Zustand (persistent)                     |
| Animations       | Framer Motion                            |
| HTTP Client      | Custom fetch wrapper at `src/lib/api.ts` |
| Forms            | React Hook Form + Zod validation         |

### 2.2 Backend

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Database       | Supabase (PostgreSQL)                                    |
| Auth           | Supabase Auth (JWT, magic link, email/password)          |
| File Storage   | Supabase Storage (S3-compatible)                         |
| API            | Supabase auto-generated REST + RPC for custom logic      |
| Edge Functions | Supabase Edge Functions (Deno) for custom server logic   |
| Email          | Supabase Auth emails + SendGrid for custom notifications |
| Hosting        | Cloudflare Pages (frontend)                              |

### 2.3 Dev Infrastructure

| Tool              | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| GitHub            | Version control                                   |
| GitHub Actions    | CI/CD pipeline (triggers Cloudflare Pages deploy) |
| ESLint + Prettier | Code quality                                      |
| Playwright        | E2E testing (critical paths)                      |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────┐
│                  Browser                     │
│      Next.js 15 App (Cloudflare Pages)       │
└──────────────┬───────────────────────────────┘
               │ HTTPS
       ┌───────┴──────────────────────┐
       │                              │
┌──────▼──────────────────────────────▼───────┐
│              Supabase                        │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │   Auth   │ │ Postgres │ │   Storage   │  │
│  │ (JWT)    │ │  (DB)    │ │  (Photos)   │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────────────────────────────────┐    │
│  │        Edge Functions (Deno)         │    │
│  │  custom logic, email notifications   │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

### 3.2 Route Structure

**Vendor Routes:**

```
/                         → redirect to /login
/login                    → Vendor login
/register                 → One-time registration (post first login)
/dashboard                → Vendor dashboard
/form/new                 → New accreditation form
/form/[id]/edit           → Edit saved/submitted form
/form/[id]/view           → Read-only view of submitted form
/profile                  → Vendor profile
```

**Admin Routes:**

```
/admin                    → redirect to /admin/login
/admin/login              → Admin login
/admin/dashboard          → Admin dashboard
/admin/users              → User management
/admin/users/[id]         → User detail + their applications
/admin/applications       → All applications
/admin/applications/[id]  → Application detail + decision controls
/admin/reports            → Reports and export
```

---

## 4. Data Models

All tables in Supabase PostgreSQL. UUIDs via `gen_random_uuid()`. RLS (Row Level Security) enabled on all tables.

### 4.1 Event

```sql
create table events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  is_active   boolean default true,
  created_at  timestamptz default now()
);
```

### 4.2 User (Vendor)

```sql
-- Supabase Auth handles auth.users; this extends it
create table vendor_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  event_id        uuid references events(id),
  username        text unique not null,
  is_active       boolean default true,
  is_registered   boolean default false,
  quota           int default 5,
  org_name        text not null,
  designation     text,
  -- Registration fields (null until registration form submitted)
  address_line1   text,
  address_line2   text,
  first_name      text,
  last_name       text,
  mobile          text,
  landline        text,
  id_type         text,
  id_number       text,
  tc_accepted     boolean default false,
  created_at      timestamptz default now()
);
```

### 4.3 Application

```sql
create type application_status as enum (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
);

create table applications (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references events(id),
  user_id         uuid references vendor_profiles(id),
  status          application_status default 'DRAFT',
  -- Personal
  first_name      text,
  last_name       text,
  designation     text,
  mobile          text,
  email           text,
  -- Identification
  id_type         text,
  id_number       text,
  -- Photo (Supabase Storage)
  photo_url       text,
  photo_path      text,
  -- Admin decision
  admin_remarks   text,
  decided_at      timestamptz,
  decided_by      uuid references admins(id),
  -- Meta
  submitted_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

### 4.4 Zone

```sql
create table zones (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references events(id),
  name        text not null,
  description text
);

create table application_zones (
  application_id uuid references applications(id) on delete cascade,
  zone_id        uuid references zones(id) on delete cascade,
  primary key (application_id, zone_id)
);
```

### 4.5 Admin

```sql
-- Admins are also Supabase Auth users but with a separate profile + role
create table admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now()
);
```

### 4.6 RLS Policies (Key Rules)

```sql
-- Vendors can only see their own applications
create policy "vendor_own_applications" on applications
  for all using (user_id = auth.uid());

-- Admins bypass RLS via service role key (used in Edge Functions only)
-- Never expose service role key to the client
```

---

## 5. API Specification

### 5.1 Auth

| Method | Endpoint                    | Description                 |
| ------ | --------------------------- | --------------------------- |
| POST   | `/api/auth/login`           | Vendor login                |
| POST   | `/api/auth/admin/login`     | Admin login                 |
| POST   | `/api/auth/refresh`         | Refresh access token        |
| POST   | `/api/auth/forgot-password` | Send reset email            |
| POST   | `/api/auth/reset-password`  | Set new password with token |

**POST /api/auth/login**

```json
// Request
{ "username": "string", "password": "string" }

// Response 200
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "orgName": "string",
    "isRegistered": false
  }
}

// Response 401
{ "error": "Invalid credentials" }
```

---

### 5.2 Registration

| Method | Endpoint               | Description                       |
| ------ | ---------------------- | --------------------------------- |
| POST   | `/api/vendor/register` | Submit one-time registration form |

**POST /api/vendor/register**

```json
// Request
{
  "addressLine1": "string",
  "addressLine2": "string?",
  "firstName": "string",
  "lastName": "string",
  "mobile": "string",
  "landline": "string?",
  "idType": "AADHAAR | PAN | PASSPORT | VOTER_ID | DRIVING_LICENCE",
  "idNumber": "string",
  "tcAccepted": true
}

// Response 200
{ "message": "Registration complete" }

// Response 400
{ "error": "Validation error", "fields": { "mobile": "Invalid format" } }
```

---

### 5.3 Applications

| Method | Endpoint                         | Description                    |
| ------ | -------------------------------- | ------------------------------ |
| GET    | `/api/applications`              | List vendor's own applications |
| POST   | `/api/applications`              | Create new application (draft) |
| GET    | `/api/applications/:id`          | Get single application         |
| PATCH  | `/api/applications/:id`          | Update (save) application      |
| POST   | `/api/applications/:id/submit`   | Submit application             |
| POST   | `/api/applications/:id/resubmit` | Resubmit edited application    |

---

### 5.4 Photo Upload

| Method | Endpoint                      | Description                        |
| ------ | ----------------------------- | ---------------------------------- |
| POST   | `/api/applications/:id/photo` | Upload photo (multipart/form-data) |
| DELETE | `/api/applications/:id/photo` | Remove photo                       |

**Validation:**

- Accepted MIME types: `image/jpeg`, `image/png`
- Min size: 50 KB
- Max size: 2 MB
- Stored in S3 with path: `events/{eventId}/applications/{applicationId}/photo.{ext}`
- Public URL stored in `Application.photoUrl`

---

### 5.5 Admin — User Management

| Method | Endpoint                      | Description                 |
| ------ | ----------------------------- | --------------------------- |
| GET    | `/api/admin/users`            | List all users (paginated)  |
| POST   | `/api/admin/users`            | Create new vendor account   |
| GET    | `/api/admin/users/:id`        | Get user detail             |
| PATCH  | `/api/admin/users/:id/quota`  | Update application quota    |
| PATCH  | `/api/admin/users/:id/status` | Activate/deactivate account |

---

### 5.6 Admin — Application Management

| Method | Endpoint                              | Description                                   |
| ------ | ------------------------------------- | --------------------------------------------- |
| GET    | `/api/admin/applications`             | List all applications (paginated, filterable) |
| GET    | `/api/admin/applications/:id`         | Application detail                            |
| POST   | `/api/admin/applications/:id/approve` | Approve with optional remarks                 |
| POST   | `/api/admin/applications/:id/reject`  | Reject with required remarks                  |
| POST   | `/api/admin/applications/:id/review`  | Mark as Under Review                          |

---

### 5.7 Reports

| Method | Endpoint                               | Description                    |
| ------ | -------------------------------------- | ------------------------------ |
| GET    | `/api/admin/reports/export?format=csv` | Export all applications as CSV |
| GET    | `/api/admin/reports/export?format=pdf` | Export approved list as PDF    |
| GET    | `/api/admin/reports/summary`           | Summary stats JSON             |

---

## 6. Authentication and Authorization

### 6.1 Supabase Auth Strategy

- Supabase Auth handles email/password login and JWT issuance
- Access token: Supabase-managed, 1-hour expiry by default
- Refresh token: handled by Supabase client SDK automatically
- Custom `role` claim injected via Supabase Auth hook: `"vendor"` | `"admin"`

### 6.2 Client Usage

```typescript
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

Admin-only operations (bulk reads, status updates) use the service role key exclusively inside Supabase Edge Functions — never exposed to the browser.

### 6.3 Route Guards (Frontend)

- `isRegistered: false` → redirect to `/register` from any vendor route
- Admin users accessing `/dashboard` redirect to `/admin/dashboard`
- Unauthenticated users redirect to `/login`
- Implemented via Next.js middleware reading the Supabase session cookie

---

## 7. Email Notifications

| Trigger                  | Recipient                                   | Template               |
| ------------------------ | ------------------------------------------- | ---------------------- |
| Account created          | Vendor                                      | Welcome + credentials  |
| Password reset           | Vendor                                      | Reset link             |
| Application submitted    | Admin (summary digest, not per-application) | Submission alert       |
| Application approved     | Vendor                                      | Approval with remarks  |
| Application rejected     | Vendor                                      | Rejection with remarks |
| Application under review | Vendor                                      | Status update          |

All emails sent via SendGrid transactional API. Templates stored in SendGrid dashboard. Variables injected at send time.

---

## 8. File Storage

- Provider: Supabase Storage (S3-compatible, built-in)
- Bucket: `application-photos` (private bucket)
- Path structure: `{eventId}/{applicationId}/photo.{ext}`
- Upload goes through Supabase client SDK with RLS enforcing user ownership
- Signed URLs generated for read access with 1-hour expiry
- Max file size enforced at bucket policy level (2 MB)
- File retention: tied to application lifecycle

---

## 9. Validation Rules

| Field       | Rule                                           |
| ----------- | ---------------------------------------------- |
| Email       | RFC 5322 format, checked on blur and on submit |
| Mobile      | Exactly 10 digits, numeric only                |
| Photo       | MIME type jpeg/png, 50 KB–2 MB                 |
| ID Number   | Non-empty, max 30 characters                   |
| Password    | Min 8 characters, at least one number          |
| Reset Token | UUID v4, single-use, expires in 24 hours       |

---

## 10. Non-Functional Requirements

| Requirement             | Target                                         |
| ----------------------- | ---------------------------------------------- |
| Page load (LCP)         | < 2.5s on 4G                                   |
| API response time (P95) | < 500ms                                        |
| Uptime                  | 99.5%                                          |
| Photo upload timeout    | 30 seconds                                     |
| Concurrent users (V1)   | 200                                            |
| Data retention          | Indefinite during event; archivable post-event |

---

## 11. Security Requirements

- All data in transit: TLS 1.2+
- Passwords: bcrypt with cost factor 12
- SQL injection: prevented via Prisma parameterized queries
- XSS: prevented via React's default escaping + strict CSP headers
- CSRF: mitigated via SameSite=Strict cookie on refresh token
- Rate limiting: 10 login attempts per IP per 15 minutes (429 response)
- Photo URL: never publicly guessable (presigned, time-limited)

---

## 12. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # Edge Functions only, never client-side

# Email (for custom notification templates via Edge Functions)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=noreply@passmark.in

# App
NEXT_PUBLIC_APP_URL=https://passmark.pages.dev  # or custom domain
NODE_ENV=production
```

---

## 13. Deployment

| Environment | URL                                       | Purpose              |
| ----------- | ----------------------------------------- | -------------------- |
| Development | `localhost:3000`                          | Local dev            |
| Staging     | `staging.passmark.pages.dev`              | QA and client review |
| Production  | `passmark.in` (custom domain on CF Pages) | Live                 |

CI/CD: GitHub Actions → on push to `main`, Cloudflare Pages builds and deploys automatically. Supabase migrations run via `supabase db push` in the pipeline before deploy. Edge Functions deployed via `supabase functions deploy`.

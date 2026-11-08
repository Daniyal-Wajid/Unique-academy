# Unique Academy Management System

Production application for one academy in Pakistan (up to 250 students and staff). The principal manages students, staff, ZKTeco MB460 attendance, fees, SMS, classes, and reports.

This repository is being built in phases. **Phase 1 is complete:** Next.js app shell, Supabase clients, authentication, SQL schema, and a live dashboard (no hardcoded sample people or fees).

## Stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase PostgreSQL, Auth, Row Level Security
- `@supabase/supabase-js` and `@supabase/ssr`
- Zod, React Hook Form, Recharts, Lucide
- Python + pyzk for the MB460 (Phase 3, `device-service/`)

Prisma is not used. There is no local PostgreSQL server. All database work goes through Supabase.

## Phase status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | App shell, auth, migrations, dashboard | Done |
| 2 | Students, staff, parents, classes | Next |
| 3 | ZKTeco connection test and attendance sync | Planned |
| 4 | Attendance calculations and reports | Planned |
| 5 | Fees, invoices, payments, receipts | Planned |
| 6 | SMS templates, preferences, logs | Planned |
| 7 | Final reports, settings, security review, deploy | Planned |

## Local setup (Windows academy PC)

### 1. Prerequisites

- Node.js 20 or later
- npm
- A Supabase project (cloud)
- Python 3.11+ (needed from Phase 3)

### 2. Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Turn **off** public sign-ups (Authentication → Providers → Email → disable new user sign-ups if you invite staff yourself).
3. Open SQL Editor and run `supabase/migrations/20261031120000_init.sql`.
4. Create the principal Auth user: Authentication → Users → Add user (email + password).
5. Promote that user:

```sql
update public.profiles
set role = 'principal',
    full_name = 'Principal',
    is_active = true
where email = 'principal@your-academy.com';
```

Students do not receive login accounts.

### 3. Application

```powershell
cd D:\Unique
copy .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never put this in client code)

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The dev and start scripts bind `0.0.0.0:3000` so other computers on the academy LAN can use `http://HOST-PC-IP:3000`. Add that IP to `ALLOWED_DEV_ORIGINS` if the Next.js dev overlay blocks it.

### 4. Environment notes

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_*` | Browser and server Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted server code only |
| `ZKTECO_IP`, `ZKTECO_PORT`, `ZKTECO_PASSWORD`, `ZKTECO_TIMEOUT` | Local Python device service (Phase 3) |

Do not hardcode the device IP or communication password. Do not expose port 4370 to the internet.

## Offline behaviour

The dashboard and biometric sync need the architecture that is actually configured:

- The Next.js UI can stay up on the academy PC.
- Supabase **cloud** queries do **not** work if the internet (or Supabase) is unreachable.
- SMS requires internet.
- The MB460 itself is on the local network; sync still needs a path to store records (Supabase, or a later local buffer).

## Database

Migrations live in `supabase/migrations/`. They create:

`profiles`, `students`, `staff`, `parents`, `student_parents`, `classes`, `enrollments`, `devices`, `biometric_users`, `attendance_logs`, `daily_attendance`, `shifts`, `holidays`, `leave_requests`, `fee_structures`, `invoices`, `invoice_items`, `payments`, `fee_adjustments`, `sms_templates`, `sms_logs`, `notification_preferences`, `system_settings`, `audit_logs`, `device_sync_checkpoints`

Money columns use `numeric(12,2)`. Payments are recorded atomically with `public.record_payment(...)`.

After the schema is applied, generate TypeScript types when the Supabase CLI is logged in:

```powershell
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.generated.ts
```

Hand-written types in `lib/types/database.ts` match Phase 1 and can be replaced by generated types later.

## Roles

- Principal
- Administrator
- Office Staff
- Teacher (optional)

RLS allows active staff to read operational data. Writes are limited to principal, administrator, and office staff. Device and system settings writes are principal/administrator only.

## MB460

- Model: MB460/ID
- Serial: AF6P210960179
- MAC: 00:17:61:11:9e:86
- TCP/IP port: 4370

A device row is seeded without an IP address. Phase 3 will start with a standalone Python connection test before full sync. Device logs are never deleted automatically.

## Scripts

```powershell
npm run dev    # http://0.0.0.0:3000
npm run build
npm run start  # production server on the academy PC
npm run lint
```

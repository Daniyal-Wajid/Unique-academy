-- Unique Academy — initial schema, helpers, RLS, and seed settings
-- Apply in the Supabase SQL editor or with the Supabase CLI.
-- Do not store biometric images or fingerprint templates.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('principal', 'administrator', 'office_staff', 'teacher');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.person_type as enum ('student', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'late', 'half_day', 'leave', 'holiday');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('paid', 'partial', 'unpaid', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'bank_transfer', 'cheque', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sms_status as enum ('pending', 'queued', 'sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.device_status as enum ('online', 'offline', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.leave_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.punch_type as enum ('check_in', 'check_out', 'unknown');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Timestamp helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Core identity
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role public.app_role not null default 'office_staff',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time not null,
  end_time time not null,
  late_grace_minutes integer not null default 15,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  teacher_id uuid,
  start_time time,
  end_time time,
  late_after_minutes integer not null default 15,
  attendance_cutoff_time time,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  admission_number text not null unique,
  full_name text not null,
  father_name text not null,
  parent_phone text not null,
  alternate_phone text,
  address text,
  admission_date date not null,
  class_id uuid references public.classes (id) on delete set null,
  monthly_fee numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  zk_user_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint students_monthly_fee_non_negative check (monthly_fee >= 0),
  constraint students_discount_non_negative check (discount >= 0)
);

create unique index if not exists students_zk_user_id_unique
  on public.students (zk_user_id)
  where zk_user_id is not null;

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique,
  full_name text not null,
  phone text not null,
  designation text not null,
  joining_date date not null,
  shift_id uuid references public.shifts (id) on delete set null,
  salary numeric(12, 2),
  zk_user_id text,
  user_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint staff_salary_non_negative check (salary is null or salary >= 0)
);

create unique index if not exists staff_zk_user_id_unique
  on public.staff (zk_user_id)
  where zk_user_id is not null;

alter table public.classes
  drop constraint if exists classes_teacher_id_fkey;

alter table public.classes
  add constraint classes_teacher_id_fkey
  foreign key (teacher_id) references public.staff (id) on delete set null;

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  primary_phone text not null,
  alternate_phone text,
  address text,
  sms_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists parents_primary_phone_unique
  on public.parents (primary_phone);

create table if not exists public.student_parents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  relationship text not null default 'guardian',
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (student_id, parent_id)
);

create unique index if not exists student_parents_one_primary
  on public.student_parents (student_id)
  where is_primary = true;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  enrolled_on date not null default ((timezone('Asia/Karachi', now()))::date),
  left_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists enrollments_one_active
  on public.enrollments (student_id)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- Device and attendance
-- ---------------------------------------------------------------------------
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  model text not null default 'MB460/ID',
  serial_number text unique,
  mac_address text,
  ip_address inet,
  port integer not null default 4370,
  status public.device_status not null default 'unknown',
  last_seen_at timestamptz,
  last_error text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.biometric_users (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  zk_user_id text not null,
  person_type public.person_type,
  student_id uuid references public.students (id) on delete set null,
  staff_id uuid references public.staff (id) on delete set null,
  name_on_device text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (device_id, zk_user_id)
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices (id) on delete set null,
  zk_user_id text not null,
  punched_at timestamptz not null,
  punch_type public.punch_type not null default 'unknown',
  punch_status_raw text,
  person_type public.person_type,
  student_id uuid references public.students (id) on delete set null,
  staff_id uuid references public.staff (id) on delete set null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (device_id, zk_user_id, punched_at)
);

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  person_type public.person_type not null,
  student_id uuid references public.students (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete cascade,
  class_id uuid references public.classes (id) on delete set null,
  attendance_date date not null,
  status public.attendance_status not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  minutes_late integer not null default 0,
  source text not null default 'device',
  notes text,
  corrected_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_attendance_person_check check (
    (person_type = 'student' and student_id is not null and staff_id is null)
    or (person_type = 'staff' and staff_id is not null and student_id is null)
  )
);

create unique index if not exists daily_attendance_student_date_unique
  on public.daily_attendance (student_id, attendance_date)
  where student_id is not null;

create unique index if not exists daily_attendance_staff_date_unique
  on public.daily_attendance (staff_id, attendance_date)
  where staff_id is not null;

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  applies_to text not null default 'all',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  person_type public.person_type not null,
  student_id uuid references public.students (id) on delete cascade,
  staff_id uuid references public.staff (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  status public.leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leave_dates_valid check (end_date >= start_date)
);

create table if not exists public.device_sync_checkpoints (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique references public.devices (id) on delete cascade,
  last_sync_at timestamptz,
  last_punched_at timestamptz,
  last_record_uid text,
  records_synced integer not null default 0,
  status text not null default 'idle',
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Fees
-- ---------------------------------------------------------------------------
create table if not exists public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes (id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null,
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint fee_structures_amount_non_negative check (amount >= 0)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  billing_period date not null,
  due_date date not null,
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  previous_balance numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0,
  status public.invoice_status not null default 'unpaid',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_id, billing_period),
  constraint invoices_amounts_non_negative check (
    subtotal >= 0 and discount_amount >= 0 and total_amount >= 0 and paid_amount >= 0
  )
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint invoice_items_amount_non_negative check (amount >= 0)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  student_id uuid not null references public.students (id) on delete restrict,
  amount numeric(12, 2) not null,
  method public.payment_method not null default 'cash',
  received_at timestamptz not null default timezone('utc', now()),
  receipt_number text not null unique,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint payments_amount_positive check (amount > 0)
);

create table if not exists public.fee_adjustments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  amount numeric(12, 2) not null,
  adjustment_type text not null,
  reason text not null,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- SMS, settings, audit
-- ---------------------------------------------------------------------------
create table if not exists public.sms_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  to_phone text not null,
  template_key text,
  body text not null,
  status public.sms_status not null default 'pending',
  provider text not null default 'mock',
  provider_message_id text,
  error_message text,
  student_id uuid references public.students (id) on delete set null,
  parent_id uuid references public.parents (id) on delete set null,
  duplicate_key text unique,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null unique references public.parents (id) on delete cascade,
  arrival boolean not null default true,
  absence boolean not null default true,
  late boolean not null default true,
  fee_reminder boolean not null default true,
  overdue boolean not null default true,
  payment boolean not null default true,
  announcement boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists students_class_id_idx on public.students (class_id);
create index if not exists students_is_active_idx on public.students (is_active);
create index if not exists staff_is_active_idx on public.staff (is_active);
create index if not exists attendance_logs_punched_at_idx on public.attendance_logs (punched_at desc);
create index if not exists attendance_logs_student_id_idx on public.attendance_logs (student_id);
create index if not exists attendance_logs_staff_id_idx on public.attendance_logs (staff_id);
create index if not exists daily_attendance_date_idx on public.daily_attendance (attendance_date desc);
create index if not exists daily_attendance_class_id_idx on public.daily_attendance (class_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_student_id_idx on public.invoices (student_id);
create index if not exists payments_received_at_idx on public.payments (received_at desc);
create index if not exists payments_student_id_idx on public.payments (student_id);
create index if not exists sms_logs_created_at_idx on public.sms_logs (created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'shifts', 'classes', 'students', 'staff', 'parents',
    'enrollments', 'devices', 'biometric_users', 'daily_attendance',
    'holidays', 'leave_requests', 'device_sync_checkpoints', 'fee_structures',
    'invoices', 'sms_templates', 'notification_preferences', 'system_settings'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auth profile sync
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    'office_staff'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  )
$$;

create or replace function public.has_write_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('principal', 'administrator', 'office_staff')
$$;

create or replace function public.has_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('principal', 'administrator')
$$;

-- ---------------------------------------------------------------------------
-- Atomic payment recording
-- ---------------------------------------------------------------------------
create or replace function public.record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method public.payment_method default 'cash',
  p_received_at timestamptz default timezone('utc', now()),
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_payment_id uuid;
  v_receipt text;
  v_new_paid numeric(12, 2);
  v_status public.invoice_status;
begin
  if auth.uid() is null or not public.has_write_role() then
    raise exception 'Not authorized to record payments';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if p_amount > (v_invoice.total_amount - v_invoice.paid_amount) then
    raise exception 'Payment exceeds outstanding balance';
  end if;

  v_receipt := 'RCPT-' || to_char(timezone('Asia/Karachi', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.payments (
    invoice_id, student_id, amount, method, received_at, receipt_number, notes, recorded_by
  )
  values (
    p_invoice_id,
    v_invoice.student_id,
    p_amount,
    p_method,
    coalesce(p_received_at, timezone('utc', now())),
    v_receipt,
    p_notes,
    auth.uid()
  )
  returning id into v_payment_id;

  v_new_paid := v_invoice.paid_amount + p_amount;

  if v_new_paid = 0 then
    v_status := 'unpaid';
  elsif v_new_paid >= v_invoice.total_amount then
    v_status := 'paid';
  else
    v_status := 'partial';
  end if;

  if v_status <> 'paid' and v_invoice.due_date < (timezone('Asia/Karachi', now()))::date then
    v_status := 'overdue';
  end if;

  update public.invoices
  set paid_amount = v_new_paid,
      status = v_status
  where id = p_invoice_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'payment.recorded',
    'payments',
    v_payment_id,
    jsonb_build_object('invoice_id', p_invoice_id, 'amount', p_amount, 'receipt', v_receipt)
  );

  return v_payment_id;
end;
$$;

grant execute on function public.record_payment(uuid, numeric, public.payment_method, timestamptz, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.staff enable row level security;
alter table public.parents enable row level security;
alter table public.student_parents enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.devices enable row level security;
alter table public.biometric_users enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.daily_attendance enable row level security;
alter table public.shifts enable row level security;
alter table public.holidays enable row level security;
alter table public.leave_requests enable row level security;
alter table public.fee_structures enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.fee_adjustments enable row level security;
alter table public.sms_templates enable row level security;
alter table public.sms_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.device_sync_checkpoints enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_active_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.has_admin_role())
  with check (public.has_admin_role());

-- Generic read for active staff, write for office roles
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'students', 'staff', 'parents', 'student_parents', 'classes', 'enrollments',
    'shifts', 'holidays', 'leave_requests', 'fee_structures', 'invoices',
    'invoice_items', 'payments', 'fee_adjustments', 'sms_templates', 'sms_logs',
    'notification_preferences', 'daily_attendance', 'attendance_logs',
    'biometric_users'
  ]
  loop
    execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (public.is_active_staff())',
      tbl, tbl
    );
    execute format('drop policy if exists %I_write on public.%I', tbl, tbl);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (public.has_write_role()) with check (public.has_write_role())',
      tbl, tbl
    );
  end loop;
end $$;

-- Device and settings: admin write, staff read
do $$
declare
  tbl text;
begin
  foreach tbl in array array['devices', 'device_sync_checkpoints', 'system_settings']
  loop
    execute format('drop policy if exists %I_select on public.%I', tbl, tbl);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (public.is_active_staff())',
      tbl, tbl
    );
    execute format('drop policy if exists %I_write on public.%I', tbl, tbl);
    execute format(
      'create policy %I_write on public.%I for all to authenticated using (public.has_admin_role()) with check (public.has_admin_role())',
      tbl, tbl
    );
  end loop;
end $$;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.has_admin_role());

drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (public.is_active_staff());

-- ---------------------------------------------------------------------------
-- Seed configuration (no sample students or staff)
-- ---------------------------------------------------------------------------
insert into public.shifts (name, start_time, end_time, late_grace_minutes)
values ('Morning', '08:00', '14:00', 15)
on conflict (name) do nothing;

insert into public.devices (name, model, serial_number, mac_address, port, status)
values ('Main Gate MB460', 'MB460/ID', 'AF6P210960179', '00:17:61:11:9e:86', 4370, 'unknown')
on conflict (serial_number) do nothing;

insert into public.sms_templates (template_key, name, body)
values
  ('arrival', 'Arrival notification', 'Assalamualaikum. {{student_name}} has arrived at {{academy_name}} at {{time}}.'),
  ('absence', 'Absence notification', 'Assalamualaikum. {{student_name}} is marked absent at {{academy_name}} on {{date}}.'),
  ('late', 'Late notification', 'Assalamualaikum. {{student_name}} arrived late at {{academy_name}} at {{time}}.'),
  ('fee_reminder', 'Fee reminder', 'Assalamualaikum. Fee reminder for {{student_name}}: PKR {{amount}} is due on {{due_date}}.'),
  ('overdue', 'Overdue reminder', 'Assalamualaikum. Overdue fee for {{student_name}}: PKR {{amount}}. Please clear dues at {{academy_name}}.'),
  ('payment', 'Payment confirmation', 'Assalamualaikum. Payment of PKR {{amount}} received for {{student_name}}. Receipt {{receipt_number}}.'),
  ('announcement', 'Academy announcement', '{{message}}')
on conflict (template_key) do nothing;

insert into public.system_settings (key, value, description)
values
  ('academy', '{"name":"Unique Academy","phone":"","address":"Pakistan","city":"","timezone":"Asia/Karachi"}'::jsonb, 'Academy profile'),
  ('attendance', '{"late_grace_minutes":15,"do_not_mark_absent_before_cutoff":true,"first_scan_is_arrival":true,"last_scan_is_departure":true}'::jsonb, 'Attendance rules'),
  ('fees', '{"currency":"PKR","due_day":10,"overdue_after_days":5}'::jsonb, 'Fee defaults'),
  ('sms', '{"provider":"mock","sender_id":"","enabled":false}'::jsonb, 'SMS provider settings'),
  ('device', '{"port":4370,"timeout_seconds":10,"auto_sync_minutes":5}'::jsonb, 'Device sync settings')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Auto-link any existing Auth user into profiles as Principal
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, role, is_active)
select id, coalesce(email, 'principal@unique.com'), 'Principal', 'principal', true
from auth.users
on conflict (id) do update set role = 'principal', is_active = true;

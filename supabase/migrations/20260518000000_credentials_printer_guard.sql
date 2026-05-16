-- ============================================================
-- Migration: Add printer / guard roles, credentials, scan logs,
-- activity feed, push subscriptions and account-lock tables.
-- Fills the schema gap between v0.1 and the PRD §8.
-- ============================================================

-- ── Print status enum ───────────────────────────────────────
do $$ begin
  create type print_status as enum ('PENDING', 'PRINTING', 'PRINTED', 'MAPPED');
exception
  when duplicate_object then null;
end $$;

-- ── Scan outcome enum ───────────────────────────────────────
do $$ begin
  create type scan_outcome as enum (
    'ALLOW',
    'DENY_ZONE',
    'DENY_REVOKED',
    'DENY_INVALID',
    'ALREADY_SCANNED'
  );
exception
  when duplicate_object then null;
end $$;

-- ── Role tables ─────────────────────────────────────────────

create table if not exists printers (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  event_id    uuid references events(id),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

create table if not exists guards (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  event_id    uuid references events(id),
  is_active   boolean default true,
  last_seen_at timestamptz,
  created_at  timestamptz default now()
);

-- Per-guard zone permissions (a guard can only validate these zones)
create table if not exists guard_zones (
  guard_id    uuid references guards(id) on delete cascade,
  zone_id     uuid references zones(id)  on delete cascade,
  primary key (guard_id, zone_id)
);

-- ── Credentials ─────────────────────────────────────────────

create table if not exists credentials (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references events(id),
  application_id  uuid references applications(id) on delete cascade,
  qr_payload      text not null unique,           -- credentialId|eventId|applicationId|ts
  qr_signature    text not null,                  -- HMAC-SHA256 hex of payload
  qr_data_url     text,                           -- base64 PNG (rendered server-side for print)
  serial_number   text unique,                    -- physical card serial; set at mapping
  print_status    print_status default 'PENDING',
  is_active       boolean default true,
  invalidated_at  timestamptz,
  invalidation_reason text,
  printed_at      timestamptz,
  printed_by      uuid references printers(id),
  mapped_at       timestamptz,
  mapped_by       uuid references admins(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Snapshot of approved zones at the moment of credential mint
-- (Independent of application_zones so post-issue admin edits to the
-- application don't silently change live credential access.)
create table if not exists credential_zones (
  credential_id   uuid references credentials(id) on delete cascade,
  zone_id         uuid references zones(id)       on delete cascade,
  primary key (credential_id, zone_id)
);

-- ── Scan logs (append-only) ─────────────────────────────────

create table if not exists scan_logs (
  id              uuid primary key default gen_random_uuid(),
  credential_id   uuid references credentials(id) on delete set null,
  guard_id        uuid references guards(id)      on delete set null,
  event_id        uuid references events(id),
  zone_id         uuid references zones(id),
  zone_label      text,
  outcome         scan_outcome not null,
  reason          text,
  scanned_at      timestamptz not null default now(),
  synced_at       timestamptz,
  device_id       text,
  raw_payload     text
);

-- ── Activity feed (admin-facing) ────────────────────────────

create table if not exists activity_events (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid references events(id),
  actor_id        uuid references auth.users(id) on delete set null,
  actor_role      text,
  action          text not null,
  subject_type    text,
  subject_id      uuid,
  metadata        jsonb,
  created_at      timestamptz default now()
);

-- ── Web Push subscriptions ──────────────────────────────────

create table if not exists push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth_key        text not null,
  user_agent      text,
  created_at      timestamptz default now()
);

-- ── Auth hardening: failed-login attempts + locks ───────────

create table if not exists failed_logins (
  id           bigserial primary key,
  email        text not null,
  ip           text,
  attempted_at timestamptz default now()
);

create index if not exists idx_failed_logins_email_time
  on failed_logins(email, attempted_at desc);

create table if not exists account_locks (
  email         text primary key,
  locked_until  timestamptz not null,
  reason        text,
  created_at    timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table printers           enable row level security;
alter table guards             enable row level security;
alter table guard_zones        enable row level security;
alter table credentials        enable row level security;
alter table credential_zones   enable row level security;
alter table scan_logs          enable row level security;
alter table activity_events    enable row level security;
alter table push_subscriptions enable row level security;
alter table failed_logins      enable row level security;
alter table account_locks      enable row level security;

-- ── Self-select for role membership ─────────────────────────
create policy "printer_self_select" on printers
  for select using (id = auth.uid());

create policy "guard_self_select" on guards
  for select using (id = auth.uid());

create policy "guard_zones_self_select" on guard_zones
  for select using (guard_id = auth.uid());

-- ── Printer queue access ────────────────────────────────────
-- Printers can read credentials for their event and update print status.
create policy "printer_queue_select" on credentials
  for select using (
    auth.uid() in (
      select id from printers
      where event_id is null or event_id = credentials.event_id
    )
  );

create policy "printer_queue_update" on credentials
  for update using (
    auth.uid() in (
      select id from printers
      where event_id is null or event_id = credentials.event_id
    )
  );

-- Printers need applicant detail to print the card
create policy "printer_application_select" on applications
  for select using (
    auth.uid() in (
      select id from printers
      where event_id is null or event_id = applications.event_id
    )
  );

create policy "printer_credential_zones_select" on credential_zones
  for select using (
    credential_id in (
      select id from credentials
      where event_id in (select event_id from printers where id = auth.uid())
         or event_id is null
    )
  );

-- ── Guard offline-sync access ───────────────────────────────
-- Guards can read active credentials for their event.
create policy "guard_credentials_select" on credentials
  for select using (
    auth.uid() in (
      select id from guards where event_id = credentials.event_id
    )
  );

create policy "guard_credential_zones_select" on credential_zones
  for select using (
    credential_id in (
      select c.id from credentials c
      join guards g on g.event_id = c.event_id
      where g.id = auth.uid()
    )
  );

-- Guards can read applicant name/photo for their event
create policy "guard_application_select" on applications
  for select using (
    auth.uid() in (
      select id from guards where event_id = applications.event_id
    )
  );

create policy "guard_zones_event_select" on zones
  for select using (true); -- zones already public-readable; reaffirm

-- ── Scan logs ───────────────────────────────────────────────
create policy "guard_scan_insert" on scan_logs
  for insert with check (guard_id = auth.uid());

create policy "guard_scan_select_own" on scan_logs
  for select using (guard_id = auth.uid());

-- Admin can read everything via service role; explicit RLS below
create policy "admin_scan_select" on scan_logs
  for select using (auth.uid() in (select id from admins));

create policy "admin_credentials_select" on credentials
  for select using (auth.uid() in (select id from admins));

create policy "admin_credentials_update" on credentials
  for update using (auth.uid() in (select id from admins));

create policy "admin_credentials_insert" on credentials
  for insert with check (auth.uid() in (select id from admins));

create policy "admin_credential_zones_all" on credential_zones
  for all using (auth.uid() in (select id from admins))
        with check (auth.uid() in (select id from admins));

create policy "admin_printers_all" on printers
  for all using (auth.uid() in (select id from admins))
        with check (auth.uid() in (select id from admins));

create policy "admin_guards_all" on guards
  for all using (auth.uid() in (select id from admins))
        with check (auth.uid() in (select id from admins));

create policy "admin_guard_zones_all" on guard_zones
  for all using (auth.uid() in (select id from admins))
        with check (auth.uid() in (select id from admins));

-- ── Activity feed ───────────────────────────────────────────
create policy "admin_activity_select" on activity_events
  for select using (auth.uid() in (select id from admins));

create policy "all_activity_insert" on activity_events
  for insert with check (auth.uid() is not null);

-- ── Push subscriptions: own only ────────────────────────────
create policy "push_sub_own_all" on push_subscriptions
  for all using (user_id = auth.uid())
        with check (user_id = auth.uid());

-- failed_logins and account_locks: no client-facing policy. All access via
-- service role from server actions / API routes. RLS-on with no policies
-- denies anon and authed clients by default.

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_credentials_application_id on credentials(application_id);
create index if not exists idx_credentials_event_id       on credentials(event_id);
create index if not exists idx_credentials_print_status   on credentials(print_status);
create index if not exists idx_credentials_is_active      on credentials(is_active);
create index if not exists idx_credential_zones_zone_id   on credential_zones(zone_id);
create index if not exists idx_scan_logs_credential_id    on scan_logs(credential_id);
create index if not exists idx_scan_logs_guard_id         on scan_logs(guard_id);
create index if not exists idx_scan_logs_event_zone       on scan_logs(event_id, zone_id);
create index if not exists idx_scan_logs_scanned_at       on scan_logs(scanned_at);
create index if not exists idx_activity_events_event      on activity_events(event_id, created_at desc);
create index if not exists idx_guard_zones_guard          on guard_zones(guard_id);
create index if not exists idx_guard_zones_zone           on guard_zones(zone_id);
create index if not exists idx_push_subscriptions_user    on push_subscriptions(user_id);

-- ── Touch trigger to keep credentials.updated_at fresh ──────
create or replace function set_credentials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_credentials_updated_at on credentials;
create trigger trg_credentials_updated_at
  before update on credentials
  for each row execute function set_credentials_updated_at();

-- ── Helper view: printable queue (printer dashboard) ────────
create or replace view print_queue as
select
  c.id              as credential_id,
  c.event_id,
  c.print_status,
  c.serial_number,
  c.created_at      as queued_at,
  a.id              as application_id,
  a.first_name,
  a.last_name,
  a.designation,
  a.photo_url,
  vp.org_name
from credentials c
join applications a    on a.id = c.application_id
left join vendor_profiles vp on vp.id = a.user_id
where c.is_active = true;

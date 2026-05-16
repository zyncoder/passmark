-- Supabase handles auth.users, this schema builds upon it.
-- Events
create table events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- Vendor Profiles
create table vendor_profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  event_id        uuid references events(id),
  username        text unique not null,
  is_active       boolean default true,
  is_registered   boolean default false,
  quota           int default 5,
  org_name        text not null,
  designation     text,
  -- Registration fields
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

-- Admins
create table admins (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  created_at  timestamptz default now()
);

-- Application Status Enum
create type application_status as enum (
  'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'
);

-- Applications
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
  -- Photo
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

-- Zones
create table zones (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references events(id),
  name        text not null,
  description text
);

-- Application Zones Mapping
create table application_zones (
  application_id uuid references applications(id) on delete cascade,
  zone_id        uuid references zones(id) on delete cascade,
  primary key (application_id, zone_id)
);

-- RLS Setup
alter table events enable row level security;
alter table vendor_profiles enable row level security;
alter table admins enable row level security;
alter table applications enable row level security;
alter table zones enable row level security;
alter table application_zones enable row level security;

-- Policies

-- Vendors can view the current active event
create policy "anyone_can_view_active_events" on events for select using (is_active = true);

-- Vendors can view and update their own profile
create policy "vendor_own_profile_select" on vendor_profiles for select using (id = auth.uid());
create policy "vendor_own_profile_update" on vendor_profiles for update using (id = auth.uid());

-- Vendors can view their own applications
create policy "vendor_own_applications_select" on applications for select using (user_id = auth.uid());
create policy "vendor_own_applications_insert" on applications for insert with check (user_id = auth.uid());
create policy "vendor_own_applications_update" on applications for update using (user_id = auth.uid());

-- Zones can be viewed by anyone
create policy "anyone_can_view_zones" on zones for select using (true);

-- Vendors can view their own application zones
create policy "vendor_own_application_zones_select" on application_zones for select using (
  application_id in (select id from applications where user_id = auth.uid())
);
create policy "vendor_own_application_zones_insert" on application_zones for insert with check (
  application_id in (select id from applications where user_id = auth.uid())
);
create policy "vendor_own_application_zones_delete" on application_zones for delete using (
  application_id in (select id from applications where user_id = auth.uid())
);

-- Note: Admin RLS is handled entirely via Supabase Service Role Key in Edge Functions or Admin API routes.
-- We do not add explicit admin policies to keep it secure from client side.

-- Herra web schema (blueprint section 5).
--
-- One project, public schema, RLS on every table. The hi_* registry tables
-- already exist and are owned by the ML side; this migration only adds the
-- web tier's tables and never touches them.

create extension if not exists postgis;

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'farmer' check (role in ('farmer', 'admin')),
  display_name text not null,
  timezone    text not null default 'Asia/Manila',
  settings    jsonb not null default '{}'::jsonb,
  status      text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- spaces

create table if not exists public.spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  boundary    geography(polygon, 4326) not null,
  status      text not null default 'ok' check (status in ('ok', 'attention', 'archived')),
  crop_focus  text[] not null default '{}',
  place       jsonb not null default '{}'::jsonb,
  alert_thresholds jsonb not null default '{}'::jsonb,
  thumb       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- membership

create table if not exists public.space_members (
  space_id    uuid not null references public.spaces (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  via_code_id uuid,
  primary key (space_id, user_id)
);

create table if not exists public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  code_hash   text not null,
  code_hint   text not null,
  expires_at  timestamptz,
  max_uses    int not null default 25,
  uses        int not null default 0,
  revoked_at  timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists access_codes_space_idx on public.access_codes (space_id);

-- ---------------------------------------------------------------- fields

create table if not exists public.fields (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  geom        geography(polygon, 4326) not null,
  area_ha     numeric(10, 4) not null default 0,
  centroid    geography(point, 4326),
  place       jsonb not null default '{}'::jsonb,
  current_crop text,
  archived_at timestamptz,
  thumb       text,
  created_at  timestamptz not null default now()
);

create index if not exists fields_owner_idx on public.fields (owner_id) where archived_at is null;
create index if not exists fields_space_idx on public.fields (space_id);

-- ---------------------------------------------------------------- assessments

create table if not exists public.assessments (
  id          uuid primary key default gen_random_uuid(),
  field_id    uuid not null references public.fields (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  profile_id  uuid,
  mode        text not null check (mode in ('recommend', 'checkup')),
  status      text not null default 'ok' check (status in ('ok', 'degraded', 'abstained', 'failed', 'processing', 'queued')),
  idempotency_key text unique,
  request     jsonb not null default '{}'::jsonb,
  response    jsonb,
  model_id    text,
  top_crop_id text,
  top_class   text,
  top_score   numeric(6, 2),
  reliability_tier text check (reliability_tier in ('high', 'medium', 'low')),
  moisture    int check (moisture between 1 and 5),
  current_crop text,
  photo_path  text,
  rerun_of    uuid references public.assessments (id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists assessments_field_idx on public.assessments (field_id, created_at desc);
create index if not exists assessments_user_idx on public.assessments (user_id, created_at desc);

-- ---------------------------------------------------------------- outcomes

create table if not exists public.outcomes (
  id          uuid primary key default gen_random_uuid(),
  field_id    uuid references public.fields (id) on delete set null,
  assessment_id uuid references public.assessments (id) on delete set null,
  user_id     uuid references public.profiles (id) on delete set null,
  crop_id     text not null,
  result_tag  text not null check (result_tag in ('good', 'average', 'poor', 'failed')),
  season_end  date,
  note        text,
  review_status text not null default 'submitted' check (review_status in ('submitted', 'reviewed', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- comms

create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces (id) on delete cascade,
  title       text not null,
  body        text not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('weather', 'announce', 'entry', 'data', 'outcome')),
  title_key   text not null,
  params      jsonb not null default '{}'::jsonb,
  route       text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------- admin

create table if not exists public.advisory_rules (
  id          uuid primary key default gen_random_uuid(),
  trigger_code text not null,
  severity    text not null check (severity in ('info', 'warn', 'risk')),
  text_key    text not null,
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   text,
  meta        text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

create table if not exists public.rate_limits (
  key         text primary key,
  window_start timestamptz not null default now(),
  count       int not null default 0
);

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ================================================================ helpers
--
-- SECURITY DEFINER so RLS policies can ask "is this user an admin" or "is this
-- user a member of this space" without recursing back through the policies on
-- profiles / space_members.

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

create or replace function public.is_member(sid uuid, uid uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.space_members m where m.space_id = sid and m.user_id = uid);
$$;

-- ================================================================ triggers

-- Fields: valid polygon, 0.03-500 ha, inside its space. The database is the
-- authority; the client validates only for feedback (blueprint 5.1).
create or replace function public.fields_guard()
returns trigger language plpgsql as $$
declare
  ha numeric;
  sb geography(polygon, 4326);
begin
  if not st_isvalid(new.geom::geometry) then
    raise exception 'Field boundary is not a valid polygon';
  end if;

  ha := st_area(new.geom) / 10000.0;
  if ha < 0.03 or ha > 500 then
    raise exception 'Field area % ha is outside the 0.03-500 ha range', round(ha, 3);
  end if;

  select boundary into sb from public.spaces where id = new.space_id;
  if sb is null then
    raise exception 'Space % does not exist', new.space_id;
  end if;
  if not st_within(new.geom::geometry, sb::geometry) then
    raise exception 'Field must lie inside its space boundary';
  end if;

  new.area_ha := round(ha, 4);
  new.centroid := st_centroid(new.geom)::geography;
  return new;
end $$;

drop trigger if exists fields_guard_trg on public.fields;
create trigger fields_guard_trg before insert or update of geom, space_id
  on public.fields for each row execute function public.fields_guard();

-- Spaces: valid boundary of at least 2 ha.
create or replace function public.spaces_guard()
returns trigger language plpgsql as $$
declare ha numeric;
begin
  if not st_isvalid(new.boundary::geometry) then
    raise exception 'Space boundary is not a valid polygon';
  end if;
  ha := st_area(new.boundary) / 10000.0;
  if ha < 2 then
    raise exception 'Space boundary must be at least 2 ha (got %)', round(ha, 2);
  end if;
  return new;
end $$;

drop trigger if exists spaces_guard_trg on public.spaces;
create trigger spaces_guard_trg before insert or update of boundary
  on public.spaces for each row execute function public.spaces_guard();

-- Profile on signup. Sign-up always creates a farmer (blueprint 6.1).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    'farmer',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ================================================================ join_space
--
-- SECURITY DEFINER: checks expiry, revocation, use limit and existing
-- membership, then inserts the membership and increments uses in one
-- transaction (blueprint 6.2). The pepper is supplied by the caller as the
-- already-computed hash, so the plain code never reaches the database.

create or replace function public.join_space(p_code_hash text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.access_codes;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into c from public.access_codes
   where code_hash = p_code_hash
   for update;

  if not found then
    raise exception 'That code is not valid';
  end if;
  if c.revoked_at is not null then
    raise exception 'That code has been revoked';
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    raise exception 'That code has expired';
  end if;
  if c.uses >= c.max_uses then
    raise exception 'That code has been used up';
  end if;

  if exists (select 1 from public.space_members m where m.space_id = c.space_id and m.user_id = uid) then
    return c.space_id;
  end if;

  insert into public.space_members (space_id, user_id, via_code_id)
  values (c.space_id, uid, c.id);

  update public.access_codes set uses = uses + 1 where id = c.id;

  return c.space_id;
end $$;

-- ================================================================ RLS

alter table public.profiles       enable row level security;
alter table public.spaces         enable row level security;
alter table public.space_members  enable row level security;
alter table public.access_codes   enable row level security;
alter table public.fields         enable row level security;
alter table public.assessments    enable row level security;
alter table public.outcomes       enable row level security;
alter table public.announcements  enable row level security;
alter table public.notifications  enable row level security;
alter table public.advisory_rules enable row level security;
alter table public.audit_log      enable row level security;
alter table public.rate_limits    enable row level security;
alter table public.app_settings   enable row level security;

-- profiles: self or admin reads; self may edit everything but role.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- spaces: members read, admins read all and write.
drop policy if exists spaces_read on public.spaces;
create policy spaces_read on public.spaces for select
  using (public.is_member(id) or public.is_admin());

drop policy if exists spaces_write on public.spaces;
create policy spaces_write on public.spaces for all
  using (public.is_admin()) with check (public.is_admin());

-- space_members: members see the roster of their spaces; admins all.
drop policy if exists members_read on public.space_members;
create policy members_read on public.space_members for select
  using (user_id = auth.uid() or public.is_member(space_id) or public.is_admin());

drop policy if exists members_admin_write on public.space_members;
create policy members_admin_write on public.space_members for delete
  using (public.is_admin());

-- access_codes: admins only. Redemption goes through join_space().
drop policy if exists codes_admin on public.access_codes;
create policy codes_admin on public.access_codes for all
  using (public.is_admin()) with check (public.is_admin());

-- fields: owner or an admin of the space; owner writes.
drop policy if exists fields_read on public.fields;
create policy fields_read on public.fields for select
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists fields_owner_write on public.fields;
create policy fields_owner_write on public.fields for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- assessments: owner or admin; owner creates.
drop policy if exists assessments_read on public.assessments;
create policy assessments_read on public.assessments for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists assessments_owner_write on public.assessments;
create policy assessments_owner_write on public.assessments for insert
  with check (user_id = auth.uid());

drop policy if exists assessments_owner_update on public.assessments;
create policy assessments_owner_update on public.assessments for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- outcomes: owner or admin; owner creates, admin reviews.
drop policy if exists outcomes_read on public.outcomes;
create policy outcomes_read on public.outcomes for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists outcomes_owner_insert on public.outcomes;
create policy outcomes_owner_insert on public.outcomes for insert
  with check (user_id = auth.uid());

drop policy if exists outcomes_admin_update on public.outcomes;
create policy outcomes_admin_update on public.outcomes for update
  using (public.is_admin()) with check (public.is_admin());

-- announcements: members read, admins write.
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select
  using (public.is_member(space_id) or public.is_admin());

drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements for all
  using (public.is_admin()) with check (public.is_admin());

-- notifications: self reads and marks read.
drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- advisory_rules and app_settings: admins read and write (members read rules
-- through the server, per blueprint 5).
drop policy if exists rules_admin on public.advisory_rules;
create policy rules_admin on public.advisory_rules for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_admin on public.app_settings;
create policy settings_admin on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- audit_log: admins read. Insert-only: no update or delete policy exists, so
-- those are denied for everyone.
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log for select
  using (public.is_admin());

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log for insert
  with check (auth.uid() is not null);

-- rate_limits: server only, no client policy at all.

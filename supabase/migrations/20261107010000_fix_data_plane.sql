-- Repair the web data plane to match the code and the ML registry.
--
-- 1. profiles needs email + updated_at (the UI maps both).
-- 2. assessments.profile_id is a content hash ("p_…"), not a UUID, and the
--    assessment needs its space for per-space reads.
-- 3. audit_log.meta is written as JSON by the server actions.
-- 4. outcomes accepts the status the UI submits.
-- 5. PostGIS columns are exposed as GeoJSON through security-invoker views so
--    PostgREST can read them under the caller's RLS.
-- 6. The assessment quota function used by the server action is created.
-- 7. The private photo bucket exists.
-- 8. Advisory rules and the ML crop config are seeded from the ML tier.

-- ---------------------------------------------------------------- profiles

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.profiles p
   set email = u.email
  from auth.users u
 where p.id = u.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, display_name, email)
  values (
    new.id,
    'farmer',
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- assessments

alter table public.assessments
  alter column profile_id type text using profile_id::text;

alter table public.assessments
  add column if not exists space_id uuid references public.spaces (id) on delete set null;

update public.assessments a
   set space_id = f.space_id
  from public.fields f
 where f.id = a.field_id and a.space_id is null;

create or replace function public.assessments_set_space()
returns trigger language plpgsql as $$
begin
  if new.space_id is null then
    select space_id into new.space_id from public.fields where id = new.field_id;
  end if;
  return new;
end $$;

drop trigger if exists assessments_space_trg on public.assessments;
create trigger assessments_space_trg before insert or update of field_id
  on public.assessments for each row execute function public.assessments_set_space();

create index if not exists assessments_space_idx on public.assessments (space_id, created_at desc);

-- ---------------------------------------------------------------- outcomes

alter table public.outcomes drop constraint if exists outcomes_review_status_check;
alter table public.outcomes
  add constraint outcomes_review_status_check
  check (review_status in ('submitted', 'pending', 'reviewed', 'rejected'));

-- ---------------------------------------------------------------- audit log

alter table public.audit_log
  alter column meta type jsonb using coalesce(nullif(meta, '')::jsonb, '{}'::jsonb);
alter table public.audit_log alter column meta set default '{}'::jsonb;

-- ---------------------------------------------------------------- GeoJSON views
-- security_invoker keeps the caller's RLS in force.

create or replace view public.spaces_geo
with (security_invoker = true) as
select s.*, st_asgeojson(s.boundary) as boundary_geojson
  from public.spaces s;

create or replace view public.fields_geo
with (security_invoker = true) as
select f.*, st_asgeojson(f.geom) as geom_geojson,
       st_asgeojson(f.centroid) as centroid_geojson
  from public.fields f;

grant select on public.spaces_geo, public.fields_geo to authenticated;

-- ---------------------------------------------------------------- quota

create or replace function public.check_assessment_quota(user_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select count(*) < 30
    from public.assessments
   where user_id = user_uuid
     and created_at > now() - interval '1 hour';
$$;

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'field-photos', 'field-photos', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists field_photos_insert on storage.objects;
create policy field_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'field-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists field_photos_read on storage.objects;
create policy field_photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'field-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists field_photos_admin_read on storage.objects;
create policy field_photos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'field-photos' and public.is_admin());

-- ---------------------------------------------------------------- advisory seed

insert into public.advisory_rules (trigger_code, severity, text_key, active)
select v.trigger_code, v.severity, v.text_key, v.active
  from (values
    ('tip.soil_ph_low', 'warn', 'advisory.soil_ph_low', true),
    ('tip.soil_ph_high', 'warn', 'advisory.soil_ph_high', true),
    ('tip.dry_spell', 'warn', 'advisory.dry_spell', true),
    ('tip.heavy_rain', 'warn', 'advisory.heavy_rain', true),
    ('tip.heat', 'warn', 'advisory.heat', true),
    ('tip.planting_window', 'info', 'advisory.planting_window', true),
    ('tip.field_split', 'warn', 'advisory.field_split', true),
    ('tip.moisture_recheck', 'info', 'advisory.moisture_recheck', true),
    ('tip.wind', 'info', 'advisory.wind', true),
    ('tip.spacing', 'info', 'advisory.spacing', true),
    ('tip.health_water', 'warn', 'advisory.health_water', true),
    ('tip.health_thermal', 'warn', 'advisory.health_thermal', true),
    ('tip.consider_crop', 'info', 'advisory.consider_crop', true)
  ) as v(trigger_code, severity, text_key, active)
 where not exists (
   select 1 from public.advisory_rules r where r.trigger_code = v.trigger_code
 );

-- ---------------------------------------------------------------- ML crop config
-- The ML tier's crop roster (data/reference/crops.yaml) is the source of truth.

insert into public.hi_config (key, value)
values (
  'crops',
  '{
    "rice":     {"name":"Rice","scientific":"Oryza sativa","water_need_weekly_mm":[25,50],"heat_limit_c":38,"cold_limit_c":15,"wind_sensitive":false,"soil_ph":[5.0,7.0],"ph_tolerance":1.0},
    "cassava":  {"name":"Cassava","scientific":"Manihot esculenta","water_need_weekly_mm":[15,35],"heat_limit_c":42,"cold_limit_c":16,"wind_sensitive":false,"soil_ph":[5.5,7.0],"ph_tolerance":1.0},
    "coconut":  {"name":"Coconut","scientific":"Cocos nucifera","water_need_weekly_mm":[20,40],"heat_limit_c":40,"cold_limit_c":18,"wind_sensitive":true,"soil_ph":[5.5,8.0],"ph_tolerance":1.5},
    "banana":   {"name":"Banana","scientific":"Musa spp.","water_need_weekly_mm":[25,50],"heat_limit_c":40,"cold_limit_c":15,"wind_sensitive":true,"soil_ph":[5.5,7.0],"ph_tolerance":1.0},
    "maize":    {"name":"Maize","scientific":"Zea mays","water_need_weekly_mm":[20,40],"heat_limit_c":40,"cold_limit_c":10,"wind_sensitive":true,"soil_ph":[5.5,7.5],"ph_tolerance":1.0},
    "cabbage":  {"name":"Cabbage","scientific":"Brassica oleracea var. capitata","water_need_weekly_mm":[20,35],"heat_limit_c":28,"cold_limit_c":5,"wind_sensitive":false,"soil_ph":[6.0,7.5],"ph_tolerance":1.0}
  }'::jsonb
)
on conflict (key) do update set value = excluded.value;

insert into public.hi_config (key, value)
values ('health_weights', '{"fit":0.45,"water":0.25,"thermal":0.15,"soil":0.15}'::jsonb)
on conflict (key) do nothing;

-- Keep the old stub rows out of the admin console. They were never a trained
-- model; the real champion is published by 04_publish.py.
delete from public.hi_models where id = 'hi-stub-20261107';
delete from public.hi_datasets where id = 'ds-ph-v1-stub';

-- ---------------------------------------------------------------- grants

grant select on public.spaces_geo, public.fields_geo to authenticated;
grant execute on function public.check_assessment_quota(uuid) to authenticated;

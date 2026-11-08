


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."fields_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."fields_guard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."hi_promote_model"("p_model_id" "text", "p_actor" "text", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_model RECORD;
    v_previous_champion TEXT;
BEGIN
    -- Lock the table to prevent concurrent promotions
    LOCK TABLE public.hi_models IN EXCLUSIVE MODE;
    
    -- Get the model record
    SELECT * INTO v_model
    FROM public.hi_models
    WHERE id = p_model_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Model not found');
    END IF;
    
    -- Validate status
    IF v_model.status != 'candidate' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Model is not a candidate');
    END IF;
    
    -- Validate gates
    IF NOT v_model.gate_pass THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gate G2 (performance) failed');
    END IF;
    
    IF NOT v_model.parity_pass THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gate G3 (parity) not verified');
    END IF;
    
    -- Find current champion
    SELECT id INTO v_previous_champion
    FROM public.hi_models
    WHERE status = 'champion'
    LIMIT 1;
    
    -- Retire previous champion
    IF v_previous_champion IS NOT NULL THEN
        UPDATE public.hi_models
        SET status = 'retired'
        WHERE id = v_previous_champion;
    END IF;
    
    -- Promote new champion
    UPDATE public.hi_models
    SET status = 'champion'
    WHERE id = p_model_id;
    
    -- Log the event
    INSERT INTO public.hi_champion_events (model_id, action, actor, reason)
    VALUES (p_model_id, 'promote', p_actor, p_reason);
    
    RETURN jsonb_build_object(
        'success', true,
        'model_id', p_model_id,
        'previous_champion', v_previous_champion
    );
END;
$$;


ALTER FUNCTION "public"."hi_promote_model"("p_model_id" "text", "p_actor" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."hi_promote_model"("p_model_id" "text", "p_actor" "text", "p_reason" "text") IS 'Promote a candidate model to champion status with gate enforcement';



CREATE OR REPLACE FUNCTION "public"."hi_rollback"("p_actor" "text", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_current_champion TEXT;
    v_previous_champion TEXT;
BEGIN
    LOCK TABLE public.hi_models IN EXCLUSIVE MODE;
    
    -- Find current champion
    SELECT id INTO v_current_champion
    FROM public.hi_models
    WHERE status = 'champion'
    LIMIT 1;
    
    IF v_current_champion IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No current champion to roll back from');
    END IF;
    
    -- Find most recently retired champion
    SELECT m.id INTO v_previous_champion
    FROM public.hi_models m
    JOIN public.hi_champion_events e ON m.id = e.model_id
    WHERE m.status = 'retired'
    ORDER BY e.at DESC
    LIMIT 1;
    
    IF v_previous_champion IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No retired champion to roll back to');
    END IF;
    
    -- Retire current champion
    UPDATE public.hi_models
    SET status = 'retired'
    WHERE id = v_current_champion;
    
    -- Restore previous champion
    UPDATE public.hi_models
    SET status = 'champion'
    WHERE id = v_previous_champion;
    
    -- Log the event
    INSERT INTO public.hi_champion_events (model_id, action, actor, reason)
    VALUES (v_previous_champion, 'rollback', p_actor, p_reason);
    
    RETURN jsonb_build_object(
        'success', true,
        'rolled_back_to', v_previous_champion,
        'retired', v_current_champion
    );
END;
$$;


ALTER FUNCTION "public"."hi_rollback"("p_actor" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."hi_rollback"("p_actor" "text", "p_reason" "text") IS 'Rollback to the most recently retired champion';



CREATE OR REPLACE FUNCTION "public"."is_admin"("uid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;


ALTER FUNCTION "public"."is_admin"("uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member"("sid" "uuid", "uid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from public.space_members m where m.space_id = sid and m.user_id = uid);
$$;


ALTER FUNCTION "public"."is_member"("sid" "uuid", "uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_space"("p_code_hash" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."join_space"("p_code_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."spaces_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."spaces_guard"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."access_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "code_hint" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "max_uses" integer DEFAULT 25 NOT NULL,
    "uses" integer DEFAULT 0 NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."access_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advisory_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trigger_code" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "text_key" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "advisory_rules_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warn'::"text", 'risk'::"text"])))
);


ALTER TABLE "public"."advisory_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "mode" "text" NOT NULL,
    "status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "idempotency_key" "text",
    "request" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "response" "jsonb",
    "model_id" "text",
    "top_crop_id" "text",
    "top_class" "text",
    "top_score" numeric(6,2),
    "reliability_tier" "text",
    "moisture" integer,
    "current_crop" "text",
    "photo_path" "text",
    "rerun_of" "uuid",
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assessments_mode_check" CHECK (("mode" = ANY (ARRAY['recommend'::"text", 'checkup'::"text"]))),
    CONSTRAINT "assessments_moisture_check" CHECK ((("moisture" >= 1) AND ("moisture" <= 5))),
    CONSTRAINT "assessments_reliability_tier_check" CHECK (("reliability_tier" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "assessments_status_check" CHECK (("status" = ANY (ARRAY['ok'::"text", 'degraded'::"text", 'abstained'::"text", 'failed'::"text", 'processing'::"text", 'queued'::"text"])))
);


ALTER TABLE "public"."assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "target_type" "text" NOT NULL,
    "target_id" "text",
    "meta" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "geom" "public"."geography"(Polygon,4326) NOT NULL,
    "area_ha" numeric(10,4) DEFAULT 0 NOT NULL,
    "centroid" "public"."geography"(Point,4326),
    "place" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "current_crop" "text",
    "archived_at" timestamp with time zone,
    "thumb" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hi_champion_events" (
    "id" bigint NOT NULL,
    "model_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "actor" "text",
    "reason" "text",
    "at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hi_champion_events_action_check" CHECK (("action" = ANY (ARRAY['promote'::"text", 'rollback'::"text"])))
);


ALTER TABLE "public"."hi_champion_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."hi_champion_events" IS 'Append-only log of model promotion and rollback events';



CREATE SEQUENCE IF NOT EXISTS "public"."hi_champion_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."hi_champion_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."hi_champion_events_id_seq" OWNED BY "public"."hi_champion_events"."id";



CREATE TABLE IF NOT EXISTS "public"."hi_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "updated_by" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hi_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."hi_config" IS 'Editable configuration for crops, thresholds, and health weights';



CREATE TABLE IF NOT EXISTS "public"."hi_models" (
    "id" "text" NOT NULL,
    "dataset_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "gate_pass" boolean DEFAULT false NOT NULL,
    "parity_pass" boolean DEFAULT false NOT NULL,
    "gate" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metrics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "report" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "artifact_path" "text" NOT NULL,
    "manifest_sha256" "text" NOT NULL,
    "feature_schema_hash" "text" NOT NULL,
    "grid_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "hi_models_status_check" CHECK (("status" = ANY (ARRAY['candidate'::"text", 'champion'::"text", 'retired'::"text"])))
);


ALTER TABLE "public"."hi_models" OWNER TO "postgres";


COMMENT ON TABLE "public"."hi_models" IS 'Registry of trained models with gate status and metadata';



CREATE OR REPLACE VIEW "public"."hi_current_champion" AS
 SELECT "id",
    "dataset_id",
    "status",
    "gate_pass",
    "parity_pass",
    "gate",
    "metrics",
    "report",
    "artifact_path",
    "manifest_sha256",
    "feature_schema_hash",
    "grid_hash",
    "created_at"
   FROM "public"."hi_models"
  WHERE ("status" = 'champion'::"text")
 LIMIT 1;


ALTER VIEW "public"."hi_current_champion" OWNER TO "postgres";


COMMENT ON VIEW "public"."hi_current_champion" IS 'Quick access to the current champion model';



CREATE TABLE IF NOT EXISTS "public"."hi_datasets" (
    "id" "text" NOT NULL,
    "manifest" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hi_datasets" OWNER TO "postgres";


COMMENT ON TABLE "public"."hi_datasets" IS 'Registry of training datasets with metadata';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "title_key" "text" NOT NULL,
    "params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "route" "text",
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_kind_check" CHECK (("kind" = ANY (ARRAY['weather'::"text", 'announce'::"text", 'entry'::"text", 'data'::"text", 'outcome'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."outcomes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid",
    "assessment_id" "uuid",
    "user_id" "uuid",
    "crop_id" "text" NOT NULL,
    "result_tag" "text" NOT NULL,
    "season_end" "date",
    "note" "text",
    "review_status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "outcomes_result_tag_check" CHECK (("result_tag" = ANY (ARRAY['good'::"text", 'average'::"text", 'poor'::"text", 'failed'::"text"]))),
    CONSTRAINT "outcomes_review_status_check" CHECK (("review_status" = ANY (ARRAY['submitted'::"text", 'reviewed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."outcomes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'farmer'::"text" NOT NULL,
    "display_name" "text" NOT NULL,
    "timezone" "text" DEFAULT 'Asia/Manila'::"text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['farmer'::"text", 'admin'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'invited'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "key" "text" NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."space_members" (
    "space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "via_code_id" "uuid"
);


ALTER TABLE "public"."space_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "boundary" "public"."geography"(Polygon,4326) NOT NULL,
    "status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "crop_focus" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "place" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "alert_thresholds" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "thumb" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spaces_status_check" CHECK (("status" = ANY (ARRAY['ok'::"text", 'attention'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."spaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."hi_champion_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."hi_champion_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."access_codes"
    ADD CONSTRAINT "access_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advisory_rules"
    ADD CONSTRAINT "advisory_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fields"
    ADD CONSTRAINT "fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hi_champion_events"
    ADD CONSTRAINT "hi_champion_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hi_config"
    ADD CONSTRAINT "hi_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."hi_datasets"
    ADD CONSTRAINT "hi_datasets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hi_models"
    ADD CONSTRAINT "hi_models_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."outcomes"
    ADD CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_pkey" PRIMARY KEY ("space_id", "user_id");



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_pkey" PRIMARY KEY ("id");



CREATE INDEX "access_codes_space_idx" ON "public"."access_codes" USING "btree" ("space_id");



CREATE INDEX "assessments_field_idx" ON "public"."assessments" USING "btree" ("field_id", "created_at" DESC);



CREATE INDEX "assessments_user_idx" ON "public"."assessments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "audit_log_created_idx" ON "public"."audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "fields_owner_idx" ON "public"."fields" USING "btree" ("owner_id") WHERE ("archived_at" IS NULL);



CREATE INDEX "fields_space_idx" ON "public"."fields" USING "btree" ("space_id");



CREATE INDEX "idx_hi_champion_events_at" ON "public"."hi_champion_events" USING "btree" ("at" DESC);



CREATE INDEX "idx_hi_datasets_created" ON "public"."hi_datasets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_hi_models_created" ON "public"."hi_models" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_hi_models_status" ON "public"."hi_models" USING "btree" ("status");



CREATE INDEX "notifications_user_idx" ON "public"."notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE OR REPLACE TRIGGER "fields_guard_trg" BEFORE INSERT OR UPDATE OF "geom", "space_id" ON "public"."fields" FOR EACH ROW EXECUTE FUNCTION "public"."fields_guard"();



CREATE OR REPLACE TRIGGER "spaces_guard_trg" BEFORE INSERT OR UPDATE OF "boundary" ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."spaces_guard"();



ALTER TABLE ONLY "public"."access_codes"
    ADD CONSTRAINT "access_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."access_codes"
    ADD CONSTRAINT "access_codes_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_rerun_of_fkey" FOREIGN KEY ("rerun_of") REFERENCES "public"."assessments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assessments"
    ADD CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fields"
    ADD CONSTRAINT "fields_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fields"
    ADD CONSTRAINT "fields_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hi_champion_events"
    ADD CONSTRAINT "hi_champion_events_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."hi_models"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."outcomes"
    ADD CONSTRAINT "outcomes_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."outcomes"
    ADD CONSTRAINT "outcomes_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."outcomes"
    ADD CONSTRAINT "outcomes_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."outcomes"
    ADD CONSTRAINT "outcomes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_members"
    ADD CONSTRAINT "space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Service role full access" ON "public"."hi_champion_events" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."hi_config" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."hi_datasets" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."hi_models" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."access_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advisory_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements_admin_write" ON "public"."announcements" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "announcements_read" ON "public"."announcements" FOR SELECT USING (("public"."is_member"("space_id") OR "public"."is_admin"()));



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "assessments_owner_update" ON "public"."assessments" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "assessments_owner_write" ON "public"."assessments" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "assessments_read" ON "public"."assessments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "audit_admin_read" ON "public"."audit_log" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "audit_insert" ON "public"."audit_log" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "codes_admin" ON "public"."access_codes" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fields_owner_write" ON "public"."fields" USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "fields_read" ON "public"."fields" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."hi_champion_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hi_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hi_datasets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hi_models" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members_admin_write" ON "public"."space_members" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "members_read" ON "public"."space_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_member"("space_id") OR "public"."is_admin"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_self" ON "public"."notifications" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "notifications_self_update" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."outcomes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "outcomes_admin_update" ON "public"."outcomes" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "outcomes_owner_insert" ON "public"."outcomes" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "outcomes_read" ON "public"."outcomes" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read" ON "public"."profiles" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rules_admin" ON "public"."advisory_rules" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "settings_admin" ON "public"."app_settings" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."space_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spaces_read" ON "public"."spaces" FOR SELECT USING (("public"."is_member"("id") OR "public"."is_admin"()));



CREATE POLICY "spaces_write" ON "public"."spaces" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."fields_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."fields_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fields_guard"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hi_promote_model"("p_model_id" "text", "p_actor" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hi_promote_model"("p_model_id" "text", "p_actor" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hi_promote_model"("p_model_id" "text", "p_actor" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."hi_rollback"("p_actor" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."hi_rollback"("p_actor" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hi_rollback"("p_actor" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member"("sid" "uuid", "uid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member"("sid" "uuid", "uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member"("sid" "uuid", "uid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."join_space"("p_code_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_space"("p_code_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_space"("p_code_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."spaces_guard"() TO "anon";
GRANT ALL ON FUNCTION "public"."spaces_guard"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."spaces_guard"() TO "service_role";



GRANT ALL ON TABLE "public"."access_codes" TO "anon";
GRANT ALL ON TABLE "public"."access_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."access_codes" TO "service_role";



GRANT ALL ON TABLE "public"."advisory_rules" TO "anon";
GRANT ALL ON TABLE "public"."advisory_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."advisory_rules" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."assessments" TO "anon";
GRANT ALL ON TABLE "public"."assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."assessments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."fields" TO "anon";
GRANT ALL ON TABLE "public"."fields" TO "authenticated";
GRANT ALL ON TABLE "public"."fields" TO "service_role";



GRANT ALL ON TABLE "public"."hi_champion_events" TO "anon";
GRANT ALL ON TABLE "public"."hi_champion_events" TO "authenticated";
GRANT ALL ON TABLE "public"."hi_champion_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."hi_champion_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."hi_champion_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."hi_champion_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."hi_config" TO "anon";
GRANT ALL ON TABLE "public"."hi_config" TO "authenticated";
GRANT ALL ON TABLE "public"."hi_config" TO "service_role";



GRANT ALL ON TABLE "public"."hi_models" TO "anon";
GRANT ALL ON TABLE "public"."hi_models" TO "authenticated";
GRANT ALL ON TABLE "public"."hi_models" TO "service_role";



GRANT ALL ON TABLE "public"."hi_current_champion" TO "anon";
GRANT ALL ON TABLE "public"."hi_current_champion" TO "authenticated";
GRANT ALL ON TABLE "public"."hi_current_champion" TO "service_role";



GRANT ALL ON TABLE "public"."hi_datasets" TO "anon";
GRANT ALL ON TABLE "public"."hi_datasets" TO "authenticated";
GRANT ALL ON TABLE "public"."hi_datasets" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."outcomes" TO "anon";
GRANT ALL ON TABLE "public"."outcomes" TO "authenticated";
GRANT ALL ON TABLE "public"."outcomes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."space_members" TO "anon";
GRANT ALL ON TABLE "public"."space_members" TO "authenticated";
GRANT ALL ON TABLE "public"."space_members" TO "service_role";



GRANT ALL ON TABLE "public"."spaces" TO "anon";
GRANT ALL ON TABLE "public"."spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."spaces" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








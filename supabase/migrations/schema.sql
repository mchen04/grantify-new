-- Supabase Database Schema for Grantify.ai
-- Generated from live database

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

-- ============================================
-- Extensions
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgsodium";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

-- ============================================
-- Schema Configuration
-- ============================================

ALTER SCHEMA "public" OWNER TO "postgres";
COMMENT ON SCHEMA "public" IS 'standard public schema';

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- ============================================
-- Functions
-- ============================================

-- Function: assign_default_role
CREATE OR REPLACE FUNCTION "public"."assign_default_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."assign_default_role"() OWNER TO "postgres";

-- Function: check_rls_status
CREATE OR REPLACE FUNCTION "public"."check_rls_status"() RETURNS TABLE("table_name" "text", "rls_enabled" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT tablename::text, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public';
END;
$$;
ALTER FUNCTION "public"."check_rls_status"() OWNER TO "postgres";

-- Function: get_auth_role
CREATE OR REPLACE FUNCTION "public"."get_auth_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN current_setting('request.jwt.claim.role', true);
END;
$$;
ALTER FUNCTION "public"."get_auth_role"() OWNER TO "postgres";

-- Function: get_similar_grants
CREATE OR REPLACE FUNCTION "public"."get_similar_grants"("query_embedding" "extensions"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 20) RETURNS SETOF "public"."grants"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT g.*
  FROM grants g
  WHERE g.embeddings IS NOT NULL
    AND (g.embeddings <=> query_embedding) < (1 - match_threshold) -- Cosine distance < (1 - threshold)
  ORDER BY g.embeddings <=> query_embedding -- Order by cosine distance (ascending)
  LIMIT match_count;
END;
$$;
ALTER FUNCTION "public"."get_similar_grants"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

-- Function: get_similar_grants_with_scores
CREATE OR REPLACE FUNCTION "public"."get_similar_grants_with_scores"("query_embedding" "extensions"."vector", "match_threshold" double precision DEFAULT 0.7, "match_count" integer DEFAULT 20) 
RETURNS TABLE(
    "id" "uuid", "opportunity_id" "text", "opportunity_number" "text", "title" "text", 
    "description_short" "text", "description_full" "text", "keywords" "text"[], "category" "text", 
    "agency_name" "text", "agency_subdivision" "text", "agency_code" "text", "source_url" "text", 
    "data_source" "text", "status" "text", "post_date" timestamp with time zone, 
    "close_date" timestamp with time zone, "loi_due_date" timestamp with time zone, 
    "expiration_date" timestamp with time zone, "earliest_start_date" timestamp with time zone, 
    "total_funding" bigint, "award_ceiling" bigint, "award_floor" bigint, 
    "expected_award_count" integer, "project_period_max_years" integer, 
    "cost_sharing" boolean, "eligible_applicants" "text"[], "eligibility_pi" "text", 
    "grant_type" "text", "activity_code" "text", "activity_category" "text"[], 
    "announcement_type" "text", "clinical_trial_allowed" boolean, 
    "grantor_contact_name" "text", "grantor_contact_role" "text", 
    "grantor_contact_email" "text", "grantor_contact_phone" "text", 
    "grantor_contact_affiliation" "text", "additional_notes" "text", 
    "created_at" timestamp with time zone, "updated_at" timestamp with time zone, 
    "embeddings" "extensions"."vector", "similarity_score" double precision
)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.*,
    1 - (g.embeddings <=> query_embedding) AS similarity_score -- Convert distance to similarity
  FROM grants g
  WHERE g.embeddings IS NOT NULL
    AND (g.embeddings <=> query_embedding) < (1 - match_threshold)
  ORDER BY g.embeddings <=> query_embedding
  LIMIT match_count;
END;
$$;
ALTER FUNCTION "public"."get_similar_grants_with_scores"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

-- Function: calculate_grant_similarities
CREATE OR REPLACE FUNCTION "public"."calculate_grant_similarities"("grant_ids" "uuid"[], "query_embedding" "extensions"."vector")
RETURNS TABLE("grant_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id AS grant_id,
    CASE 
      WHEN g.embeddings IS NOT NULL THEN 1 - (g.embeddings <=> query_embedding)
      ELSE 0.4 -- Lower default for grants without embeddings
    END AS similarity
  FROM grants g
  WHERE g.id = ANY(grant_ids);
END;
$$;
ALTER FUNCTION "public"."calculate_grant_similarities"("grant_ids" "uuid"[], "query_embedding" "extensions"."vector") OWNER TO "postgres";

-- Function: calculate_grant_similarities_fallback
CREATE OR REPLACE FUNCTION "public"."calculate_grant_similarities_fallback"("grant_ids" "uuid"[], "query_embedding" "text")
RETURNS TABLE("grant_id" "uuid", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  embedding_array float8[];
BEGIN
  -- Parse JSON string to array
  SELECT array_agg(value::float8) INTO embedding_array
  FROM json_array_elements_text(query_embedding::json) AS value;
  
  RETURN QUERY
  SELECT 
    g.id AS grant_id,
    CASE 
      WHEN g.embeddings IS NOT NULL THEN 1 - (g.embeddings <=> embedding_array::extensions.vector)
      ELSE 0.4 -- Lower default for grants without embeddings
    END AS similarity
  FROM grants g
  WHERE g.id = ANY(grant_ids);
END;
$$;
ALTER FUNCTION "public"."calculate_grant_similarities_fallback"("grant_ids" "uuid"[], "query_embedding" "text") OWNER TO "postgres";

-- Function: handle_new_user
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Insert the new user's ID and email into the public users table
  -- Use ON CONFLICT DO NOTHING to safely handle potential duplicate calls or race conditions.
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

-- Function: has_role
CREATE OR REPLACE FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id AND role = check_role
  );
END;
$$;
ALTER FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" character varying) OWNER TO "postgres";

-- Function: is_service_role
CREATE OR REPLACE FUNCTION "public"."is_service_role"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN current_setting('request.jwt.claim.role', true) = 'service_role';
END;
$$;
ALTER FUNCTION "public"."is_service_role"() OWNER TO "postgres";

-- Function: service_role_bypass_rls
CREATE OR REPLACE FUNCTION "public"."service_role_bypass_rls"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- If the role is service_role, bypass RLS
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN true;
  END IF;

  -- Otherwise, return false (let other policies handle access)
  RETURN false;
END;
$$;
ALTER FUNCTION "public"."service_role_bypass_rls"() OWNER TO "postgres";

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at = NOW(); -- Set updated_at to the current time
  RETURN NEW;             -- Return the modified row
END;
$$;
ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

-- ============================================
-- Tables
-- ============================================

-- Table: grants
CREATE TABLE IF NOT EXISTS "public"."grants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "opportunity_id" "text" NOT NULL,
    "opportunity_number" "text",
    "title" "text" NOT NULL,
    "description_short" "text",
    "description_full" "text",
    "keywords" "text"[],
    "category" "text",
    "agency_name" "text",
    "agency_subdivision" "text",
    "agency_code" "text",
    "source_url" "text",
    "data_source" "text",
    "status" "text",
    "post_date" timestamp with time zone,
    "close_date" timestamp with time zone,
    "loi_due_date" timestamp with time zone,
    "expiration_date" timestamp with time zone,
    "earliest_start_date" timestamp with time zone,
    "total_funding" bigint,
    "award_ceiling" bigint,
    "award_floor" bigint,
    "expected_award_count" integer,
    "project_period_max_years" integer,
    "cost_sharing" boolean DEFAULT false,
    "eligible_applicants" "text"[],
    "eligibility_pi" "text",
    "grant_type" "text",
    "activity_code" "text",
    "activity_category" "text"[],
    "announcement_type" "text",
    "clinical_trial_allowed" boolean,
    "additional_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "embeddings" "extensions"."vector"(768)
);
ALTER TABLE "public"."grants" OWNER TO "postgres";
COMMENT ON COLUMN "public"."grants"."embeddings" IS 'Vector embeddings of grant data, now 768-dimensional using Google text-embedding-004.';

-- Table: grant_contacts
CREATE TABLE IF NOT EXISTS "public"."grant_contacts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "grant_id" "uuid" NOT NULL,
    "contact_type" "text" NOT NULL,
    "contact_name" "text",
    "contact_role" "text",
    "contact_organization" "text",
    "email" "text",
    "phone" "text",
    "url" "text",
    "display_order" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."grant_contacts" OWNER TO "postgres";

-- Table: pipeline_runs
CREATE TABLE IF NOT EXISTS "public"."pipeline_runs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "status" "text" NOT NULL,
    "details" "jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pipeline_runs_status_check" CHECK (("status" = ANY (ARRAY['started'::"text", 'completed'::"text", 'failed'::"text"])))
);
ALTER TABLE "public"."pipeline_runs" OWNER TO "postgres";

-- Table: user_interactions
CREATE TABLE IF NOT EXISTS "public"."user_interactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "grant_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "notes" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_interactions_action_check" CHECK (("action" = ANY (ARRAY['saved'::"text", 'applied'::"text", 'ignored'::"text"])))
);
ALTER TABLE ONLY "public"."user_interactions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_interactions" OWNER TO "postgres";

-- Table: user_preferences
CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "funding_min" integer,
    "funding_max" integer,
    "deadline_range" "text" DEFAULT '0'::"text",
    "eligible_applicant_types" "text"[],
    "agencies" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_description_query" "text",
    "project_description_embedding" "extensions"."vector"(768),
    "auto_refresh_enabled" boolean DEFAULT false,
    "auto_refresh_interval" integer DEFAULT 5
);
ALTER TABLE ONLY "public"."user_preferences" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" OWNER TO "postgres";
COMMENT ON COLUMN "public"."user_preferences"."project_description_query" IS 'User-defined natural language query describing their grant interests.';
COMMENT ON COLUMN "public"."user_preferences"."project_description_embedding" IS 'Vector embedding of the project_description_query, 768-dimensional using Google text-embedding-004.';
COMMENT ON COLUMN "public"."user_preferences"."auto_refresh_enabled" IS 'Whether auto-refresh is enabled for the user dashboard.';
COMMENT ON COLUMN "public"."user_preferences"."auto_refresh_interval" IS 'Auto-refresh interval in minutes (default: 5 minutes).';

-- Table: user_roles
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'moderator'::character varying])::"text"[])))
);
ALTER TABLE "public"."user_roles" OWNER TO "postgres";

-- Table: users
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE ONLY "public"."users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" OWNER TO "postgres";

-- Table: csrf_tokens
CREATE TABLE IF NOT EXISTS "public"."csrf_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);
ALTER TABLE "public"."csrf_tokens" OWNER TO "postgres";

-- ============================================
-- Primary Keys
-- ============================================

ALTER TABLE ONLY "public"."grant_contacts"
    ADD CONSTRAINT "grant_contacts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."grants"
    ADD CONSTRAINT "grants_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."pipeline_runs"
    ADD CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."csrf_tokens"
    ADD CONSTRAINT "csrf_tokens_pkey" PRIMARY KEY ("id");

-- ============================================
-- Unique Constraints
-- ============================================

ALTER TABLE ONLY "public"."grants"
    ADD CONSTRAINT "grants_opportunity_id_key" UNIQUE ("opportunity_id");

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_grant_id_key" UNIQUE ("user_id", "grant_id");

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_unique_constraint" UNIQUE ("email");

ALTER TABLE ONLY "public"."csrf_tokens"
    ADD CONSTRAINT "csrf_tokens_user_id_key" UNIQUE ("user_id");

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX "grant_contacts_display_order_idx" ON "public"."grant_contacts" USING "btree" ("display_order");
CREATE INDEX "grant_contacts_grant_id_idx" ON "public"."grant_contacts" USING "btree" ("grant_id");
CREATE INDEX "grant_contacts_type_idx" ON "public"."grant_contacts" USING "btree" ("contact_type");

CREATE INDEX "grants_activity_category_idx" ON "public"."grants" USING "gin" ("activity_category");
CREATE INDEX "grants_agency_name_idx" ON "public"."grants" USING "btree" ("agency_name");
CREATE INDEX "grants_agency_subdivision_idx" ON "public"."grants" USING "btree" ("agency_subdivision");
CREATE INDEX "grants_category_idx" ON "public"."grants" USING "btree" ("category");
CREATE INDEX "grants_close_date_idx" ON "public"."grants" USING "btree" ("close_date");
CREATE INDEX "grants_eligible_applicants_idx" ON "public"."grants" USING "gin" ("eligible_applicants");
CREATE INDEX "grants_embeddings_idx" ON "public"."grants" USING "ivfflat" ("embeddings" "extensions"."vector_cosine_ops") WITH ("lists"='100');
CREATE INDEX "grants_grant_type_idx" ON "public"."grants" USING "btree" ("grant_type");
CREATE INDEX "grants_keywords_idx" ON "public"."grants" USING "gin" ("keywords");
CREATE INDEX "grants_opportunity_id_idx" ON "public"."grants" USING "btree" ("opportunity_id");
CREATE INDEX "grants_post_date_idx" ON "public"."grants" USING "btree" ("post_date");
CREATE INDEX "grants_status_idx" ON "public"."grants" USING "btree" ("status");

CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");
CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");

CREATE INDEX "user_interactions_action_idx" ON "public"."user_interactions" USING "btree" ("action");
CREATE INDEX "user_interactions_grant_id_idx" ON "public"."user_interactions" USING "btree" ("grant_id");
CREATE INDEX "user_interactions_user_id_idx" ON "public"."user_interactions" USING "btree" ("user_id");

CREATE INDEX "user_preferences_project_description_embedding_idx" ON "public"."user_preferences" USING "ivfflat" ("project_description_embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');

CREATE INDEX "csrf_tokens_user_id_idx" ON "public"."csrf_tokens" USING "btree" ("user_id");
CREATE INDEX "csrf_tokens_expires_at_idx" ON "public"."csrf_tokens" USING "btree" ("expires_at");

-- ============================================
-- Triggers
-- ============================================

CREATE OR REPLACE TRIGGER "update_grant_contacts_updated_at" 
    BEFORE UPDATE ON "public"."grant_contacts" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_grants_updated_at" 
    BEFORE UPDATE ON "public"."grants" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" 
    BEFORE UPDATE ON "public"."user_preferences" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_users_updated_at" 
    BEFORE UPDATE ON "public"."users" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- ============================================
-- Foreign Keys
-- ============================================

ALTER TABLE ONLY "public"."grant_contacts"
    ADD CONSTRAINT "grant_contacts_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "public"."grants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "public"."grants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_interactions"
    ADD CONSTRAINT "user_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."csrf_tokens"
    ADD CONSTRAINT "csrf_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on tables
ALTER TABLE "public"."grant_contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pipeline_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."csrf_tokens" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_interactions
CREATE POLICY "Allow public users to create their own interactions" ON "public"."user_interactions" 
    FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Allow public users to delete their own interactions" ON "public"."user_interactions" 
    FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Allow public users to read their own interactions" ON "public"."user_interactions" 
    FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Allow public users to update their own interactions" ON "public"."user_interactions" 
    FOR UPDATE USING (("auth"."uid"() = "user_id"));

-- RLS Policies for user_roles
CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" 
    FOR DELETE USING ((EXISTS ( SELECT 1
       FROM "public"."user_roles" "user_roles_1"
      WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND (("user_roles_1"."role")::"text" = 'admin'::"text")))));

CREATE POLICY "Only admins can insert roles" ON "public"."user_roles" 
    FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles" "user_roles_1"
      WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND (("user_roles_1"."role")::"text" = 'admin'::"text")))));

CREATE POLICY "Only admins can update roles" ON "public"."user_roles" 
    FOR UPDATE WITH CHECK ((EXISTS ( SELECT 1
       FROM "public"."user_roles" "user_roles_1"
      WHERE (("user_roles_1"."user_id" = "auth"."uid"()) AND (("user_roles_1"."role")::"text" = 'admin'::"text")))));

CREATE POLICY "Users can view own roles" ON "public"."user_roles" 
    FOR SELECT USING (("auth"."uid"() = "user_id"));

-- RLS Policies for grant_contacts
CREATE POLICY "grant_contacts_select_policy" ON "public"."grant_contacts" 
    FOR SELECT USING (true);

CREATE POLICY "grant_contacts_service_role_bypass" ON "public"."grant_contacts" 
    TO "service_role" USING ("public"."service_role_bypass_rls"()) WITH CHECK ("public"."service_role_bypass_rls"());

-- RLS Policies for grants
CREATE POLICY "grants_select_policy" ON "public"."grants" 
    FOR SELECT USING (true);

CREATE POLICY "grants_service_role_bypass" ON "public"."grants" 
    TO "service_role" USING ("public"."service_role_bypass_rls"()) WITH CHECK ("public"."service_role_bypass_rls"());

-- RLS Policies for pipeline_runs
CREATE POLICY "pipeline_runs_admin_only" ON "public"."pipeline_runs" 
    USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));

CREATE POLICY "pipeline_runs_service_role_bypass" ON "public"."pipeline_runs" 
    USING ("public"."service_role_bypass_rls"()) WITH CHECK ("public"."service_role_bypass_rls"());

-- RLS Policies for user_preferences
CREATE POLICY "user_preferences_delete_self" ON "public"."user_preferences" 
    FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "user_preferences_insert_self" ON "public"."user_preferences" 
    FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "user_preferences_select_self" ON "public"."user_preferences" 
    FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "user_preferences_service_role_bypass" ON "public"."user_preferences" 
    USING ("public"."service_role_bypass_rls"()) WITH CHECK ("public"."service_role_bypass_rls"());

CREATE POLICY "user_preferences_update_self" ON "public"."user_preferences" 
    FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

-- RLS Policies for users
CREATE POLICY "users_allow_trigger_insert" ON "public"."users" 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "users_select_self" ON "public"."users" 
    FOR SELECT USING (("auth"."uid"() = "id"));

CREATE POLICY "users_service_role_bypass" ON "public"."users" 
    USING ("public"."service_role_bypass_rls"()) WITH CHECK ("public"."service_role_bypass_rls"());

CREATE POLICY "users_update_self" ON "public"."users" 
    FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));

-- RLS Policies for csrf_tokens
CREATE POLICY "csrf_tokens_select_policy" ON "public"."csrf_tokens"
    FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "csrf_tokens_insert_policy" ON "public"."csrf_tokens"
    FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "csrf_tokens_update_policy" ON "public"."csrf_tokens"
    FOR UPDATE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "csrf_tokens_delete_policy" ON "public"."csrf_tokens"
    FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "csrf_tokens_service_role_bypass" ON "public"."csrf_tokens"
    TO "service_role" USING ("public"."service_role_bypass_rls"()) WITH CHECK ("public"."service_role_bypass_rls"());

-- ============================================
-- Permissions
-- ============================================

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";

-- Function permissions
GRANT ALL ON FUNCTION "public"."check_rls_status"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_auth_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("check_user_id" "uuid", "check_role" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_service_role"() TO "service_role";
GRANT ALL ON FUNCTION "public"."service_role_bypass_rls"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."service_role_bypass_rls"() TO "anon";
GRANT ALL ON FUNCTION "public"."service_role_bypass_rls"() TO "service_role";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";

-- Table permissions
GRANT ALL ON TABLE "public"."grants" TO "service_role";
GRANT ALL ON TABLE "public"."grant_contacts" TO "service_role";
GRANT SELECT ON TABLE "public"."grant_contacts" TO "authenticated";
GRANT SELECT ON TABLE "public"."grant_contacts" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_runs" TO "service_role";
GRANT ALL ON TABLE "public"."user_interactions" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_preferences" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_roles" TO "anon";
GRANT SELECT ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."csrf_tokens" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."csrf_tokens" TO "authenticated";

RESET ALL;
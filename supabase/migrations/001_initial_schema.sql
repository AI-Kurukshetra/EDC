-- ============================================================
-- Migration: 001_initial_schema.sql
-- Description: Creates the Clinical Data Hub Phase 1 schema,
--              helper triggers, storage buckets, and auth
--              profile bootstrap trigger.
-- Author: Codex
-- Date: 2026-03-14
-- Depends on: none
-- ============================================================

-- ─── ROLLBACK (run this section to undo) ────────────────────
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS public.set_current_timestamp_updated_at();
-- DROP TABLE IF EXISTS public.data_exports;
-- DROP TABLE IF EXISTS public.notifications;
-- DROP TABLE IF EXISTS public.study_documents;
-- DROP TABLE IF EXISTS public.signatures;
-- DROP TABLE IF EXISTS public.audit_logs;
-- DROP TABLE IF EXISTS public.query_responses;
-- DROP TABLE IF EXISTS public.queries;
-- DROP TABLE IF EXISTS public.data_entries;
-- DROP TABLE IF EXISTS public.form_templates;
-- DROP TABLE IF EXISTS public.subjects;
-- DROP TABLE IF EXISTS public.site_users;
-- DROP TABLE IF EXISTS public.sites;
-- DROP TABLE IF EXISTS public.studies;
-- DROP TABLE IF EXISTS public.profiles;
-- ─────────────────────────────────────────────────────────────

BEGIN;

  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$;

  CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'read_only'
      CONSTRAINT profiles_role_check
      CHECK (
        role IN (
          'super_admin',
          'sponsor',
          'investigator',
          'coordinator',
          'monitor',
          'data_manager',
          'read_only'
        )
      ),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
  CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.studies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    protocol_number TEXT NOT NULL UNIQUE,
    phase TEXT NOT NULL
      CONSTRAINT studies_phase_check
      CHECK (phase IN ('Phase I', 'Phase II', 'Phase III', 'Phase IV')),
    status TEXT NOT NULL DEFAULT 'draft'
      CONSTRAINT studies_status_check
      CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'terminated')),
    sponsor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    description TEXT,
    target_enrollment INT,
    start_date DATE,
    end_date DATE,
    therapeutic_area TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT studies_target_enrollment_check CHECK (target_enrollment IS NULL OR target_enrollment > 0),
    CONSTRAINT studies_end_date_after_start_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
  );

  CREATE INDEX IF NOT EXISTS idx_studies_sponsor_id ON public.studies (sponsor_id);

  DROP TRIGGER IF EXISTS set_updated_at_studies ON public.studies;
  CREATE TRIGGER set_updated_at_studies
    BEFORE UPDATE ON public.studies
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    site_code TEXT NOT NULL,
    principal_investigator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    address TEXT,
    country TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CONSTRAINT sites_status_check
      CHECK (status IN ('pending', 'active', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sites_study_code_unique UNIQUE (study_id, site_code)
  );

  CREATE INDEX IF NOT EXISTS idx_sites_study_id ON public.sites (study_id);
  CREATE INDEX IF NOT EXISTS idx_sites_principal_investigator_id
    ON public.sites (principal_investigator_id);

  DROP TRIGGER IF EXISTS set_updated_at_sites ON public.sites;
  CREATE TRIGGER set_updated_at_sites
    BEFORE UPDATE ON public.sites
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.site_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL
      CONSTRAINT site_users_role_check
      CHECK (
        role IN (
          'super_admin',
          'sponsor',
          'investigator',
          'coordinator',
          'monitor',
          'data_manager',
          'read_only'
        )
      ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT site_users_site_user_unique UNIQUE (site_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_site_users_site_id ON public.site_users (site_id);
  CREATE INDEX IF NOT EXISTS idx_site_users_user_id ON public.site_users (user_id);

  DROP TRIGGER IF EXISTS set_updated_at_site_users ON public.site_users;
  CREATE TRIGGER set_updated_at_site_users
    BEFORE UPDATE ON public.site_users
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.site_users ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
    subject_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'screened'
      CONSTRAINT subjects_status_check
      CHECK (
        status IN (
          'screened',
          'enrolled',
          'randomized',
          'completed',
          'withdrawn',
          'screen_failed'
        )
      ),
    consent_date DATE,
    enrollment_date DATE,
    withdrawal_date DATE,
    withdrawal_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT subjects_study_subject_id_unique UNIQUE (study_id, subject_id)
  );

  CREATE INDEX IF NOT EXISTS idx_subjects_study_id ON public.subjects (study_id);
  CREATE INDEX IF NOT EXISTS idx_subjects_site_id ON public.subjects (site_id);
  CREATE INDEX IF NOT EXISTS idx_subjects_status ON public.subjects (study_id, status);

  DROP TRIGGER IF EXISTS set_updated_at_subjects ON public.subjects;
  CREATE TRIGGER set_updated_at_subjects
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    form_type TEXT NOT NULL
      CONSTRAINT form_templates_form_type_check
      CHECK (
        form_type IN (
          'screening',
          'enrollment',
          'visit',
          'adverse_event',
          'completion',
          'other'
        )
      ),
    version INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT false,
    schema JSONB NOT NULL DEFAULT '{"fields":[]}'::jsonb,
    visit_schedule JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT form_templates_version_positive CHECK (version > 0),
    CONSTRAINT form_templates_study_name_version_unique UNIQUE (study_id, name, version)
  );

  CREATE INDEX IF NOT EXISTS idx_form_templates_study_id ON public.form_templates (study_id);

  DROP TRIGGER IF EXISTS set_updated_at_form_templates ON public.form_templates;
  CREATE TRIGGER set_updated_at_form_templates
    BEFORE UPDATE ON public.form_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.data_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    form_template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE RESTRICT,
    visit_number INT NOT NULL DEFAULT 1,
    visit_date DATE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft'
      CONSTRAINT data_entries_status_check
      CHECK (
        status IN ('draft', 'submitted', 'locked', 'sdv_required', 'sdv_complete')
      ),
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT data_entries_subject_form_visit_unique UNIQUE (subject_id, form_template_id, visit_number)
  );

  CREATE INDEX IF NOT EXISTS idx_data_entries_subject_id ON public.data_entries (subject_id);
  CREATE INDEX IF NOT EXISTS idx_data_entries_form_template_id
    ON public.data_entries (form_template_id);
  CREATE INDEX IF NOT EXISTS idx_data_entries_submitted_by ON public.data_entries (submitted_by);
  CREATE INDEX IF NOT EXISTS idx_data_entries_locked_by ON public.data_entries (locked_by);

  DROP TRIGGER IF EXISTS set_updated_at_data_entries ON public.data_entries;
  CREATE TRIGGER set_updated_at_data_entries
    BEFORE UPDATE ON public.data_entries
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.data_entries ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_entry_id UUID NOT NULL REFERENCES public.data_entries(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open'
      CONSTRAINT queries_status_check
      CHECK (status IN ('open', 'answered', 'closed', 'cancelled')),
    raised_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'normal'
      CONSTRAINT queries_priority_check
      CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_queries_data_entry_id ON public.queries (data_entry_id);
  CREATE INDEX IF NOT EXISTS idx_queries_subject_id ON public.queries (subject_id);
  CREATE INDEX IF NOT EXISTS idx_queries_raised_by ON public.queries (raised_by);
  CREATE INDEX IF NOT EXISTS idx_queries_assigned_to ON public.queries (assigned_to);
  CREATE INDEX IF NOT EXISTS idx_queries_status ON public.queries (status);

  DROP TRIGGER IF EXISTS set_updated_at_queries ON public.queries;
  CREATE TRIGGER set_updated_at_queries
    BEFORE UPDATE ON public.queries
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.query_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES public.queries(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    responded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_query_responses_query_id ON public.query_responses (query_id);
  CREATE INDEX IF NOT EXISTS idx_query_responses_responded_by
    ON public.query_responses (responded_by);

  DROP TRIGGER IF EXISTS set_updated_at_query_responses ON public.query_responses;
  CREATE TRIGGER set_updated_at_query_responses
    BEFORE UPDATE ON public.query_responses
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.query_responses ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup
    ON public.audit_logs (entity_type, entity_id);

  DROP TRIGGER IF EXISTS set_updated_at_audit_logs ON public.audit_logs;
  CREATE TRIGGER set_updated_at_audit_logs
    BEFORE UPDATE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    signed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    signature_meaning TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    certificate_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT signatures_certificate_hash_check CHECK (char_length(certificate_hash) = 64)
  );

  CREATE INDEX IF NOT EXISTS idx_signatures_signed_by ON public.signatures (signed_by);
  CREATE INDEX IF NOT EXISTS idx_signatures_entity_lookup
    ON public.signatures (entity_type, entity_id);

  DROP TRIGGER IF EXISTS set_updated_at_signatures ON public.signatures;
  CREATE TRIGGER set_updated_at_signatures
    BEFORE UPDATE ON public.signatures
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.study_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT study_documents_version_positive CHECK (version > 0)
  );

  CREATE INDEX IF NOT EXISTS idx_study_documents_study_id
    ON public.study_documents (study_id);
  CREATE INDEX IF NOT EXISTS idx_study_documents_uploaded_by
    ON public.study_documents (uploaded_by);

  DROP TRIGGER IF EXISTS set_updated_at_study_documents ON public.study_documents;
  CREATE TRIGGER set_updated_at_study_documents
    BEFORE UPDATE ON public.study_documents
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.study_documents ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_id TEXT,
    priority TEXT NOT NULL DEFAULT 'normal'
      CONSTRAINT notifications_priority_check
      CHECK (priority IN ('low', 'normal', 'high')),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, read_at);

  DROP TRIGGER IF EXISTS set_updated_at_notifications ON public.notifications;
  CREATE TRIGGER set_updated_at_notifications
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

  CREATE TABLE IF NOT EXISTS public.data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    format TEXT NOT NULL
      CONSTRAINT data_exports_format_check
      CHECK (format IN ('csv', 'json', 'cdisc')),
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'queued'
      CONSTRAINT data_exports_status_check
      CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    signed_url_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_data_exports_study_id ON public.data_exports (study_id);
  CREATE INDEX IF NOT EXISTS idx_data_exports_requested_by
    ON public.data_exports (requested_by);

  DROP TRIGGER IF EXISTS set_updated_at_data_exports ON public.data_exports;
  CREATE TRIGGER set_updated_at_data_exports
    BEFORE UPDATE ON public.data_exports
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

  ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

  INSERT INTO storage.buckets (id, name, public)
  VALUES
    ('study-documents', 'study-documents', false),
    ('exports', 'exports', false)
  ON CONFLICT (id) DO NOTHING;

  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, is_active)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
      COALESCE(NEW.email, NEW.raw_user_meta_data ->> 'email'),
      COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'read_only'),
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active;

    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;


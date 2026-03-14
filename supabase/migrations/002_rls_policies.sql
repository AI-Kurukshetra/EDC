-- ============================================================
-- Migration: 002_rls_policies.sql
-- Description: Adds Clinical Data Hub Phase 1 helper functions
--              and row-level security policies for all tables.
-- Author: Codex
-- Date: 2026-03-14
-- Depends on: 001_initial_schema.sql
-- ============================================================

-- ─── ROLLBACK (run this section to undo) ────────────────────
-- DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
-- DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
-- DROP POLICY IF EXISTS studies_select_members ON public.studies;
-- DROP POLICY IF EXISTS studies_insert_managers ON public.studies;
-- DROP POLICY IF EXISTS studies_update_managers ON public.studies;
-- DROP POLICY IF EXISTS sites_select_members ON public.sites;
-- DROP POLICY IF EXISTS sites_insert_managers ON public.sites;
-- DROP POLICY IF EXISTS sites_update_managers ON public.sites;
-- DROP POLICY IF EXISTS site_users_select_members ON public.site_users;
-- DROP POLICY IF EXISTS site_users_insert_managers ON public.site_users;
-- DROP POLICY IF EXISTS site_users_update_managers ON public.site_users;
-- DROP POLICY IF EXISTS site_users_delete_managers ON public.site_users;
-- DROP POLICY IF EXISTS subjects_select_members ON public.subjects;
-- DROP POLICY IF EXISTS subjects_insert_members ON public.subjects;
-- DROP POLICY IF EXISTS subjects_update_members ON public.subjects;
-- DROP POLICY IF EXISTS form_templates_select_members ON public.form_templates;
-- DROP POLICY IF EXISTS form_templates_insert_managers ON public.form_templates;
-- DROP POLICY IF EXISTS form_templates_update_managers ON public.form_templates;
-- DROP POLICY IF EXISTS data_entries_select_members ON public.data_entries;
-- DROP POLICY IF EXISTS data_entries_insert_members ON public.data_entries;
-- DROP POLICY IF EXISTS data_entries_update_members ON public.data_entries;
-- DROP POLICY IF EXISTS queries_select_members ON public.queries;
-- DROP POLICY IF EXISTS queries_insert_managers ON public.queries;
-- DROP POLICY IF EXISTS queries_update_managers ON public.queries;
-- DROP POLICY IF EXISTS query_responses_select_members ON public.query_responses;
-- DROP POLICY IF EXISTS query_responses_insert_members ON public.query_responses;
-- DROP POLICY IF EXISTS audit_logs_select_members ON public.audit_logs;
-- DROP POLICY IF EXISTS signatures_select_members ON public.signatures;
-- DROP POLICY IF EXISTS signatures_insert_self ON public.signatures;
-- DROP POLICY IF EXISTS study_documents_select_members ON public.study_documents;
-- DROP POLICY IF EXISTS study_documents_insert_managers ON public.study_documents;
-- DROP POLICY IF EXISTS study_documents_update_managers ON public.study_documents;
-- DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
-- DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
-- DROP POLICY IF EXISTS data_exports_select_members ON public.data_exports;
-- DROP POLICY IF EXISTS data_exports_insert_members ON public.data_exports;
-- DROP POLICY IF EXISTS data_exports_update_members ON public.data_exports;
-- DROP FUNCTION IF EXISTS public.current_user_role(uuid);
-- DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
-- DROP FUNCTION IF EXISTS public.is_study_member(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.can_manage_study(uuid, uuid);
-- DROP FUNCTION IF EXISTS public.is_site_member(uuid, uuid);
-- ─────────────────────────────────────────────────────────────

BEGIN;

  CREATE OR REPLACE FUNCTION public.current_user_role(check_user_id UUID DEFAULT auth.uid())
  RETURNS TEXT
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT p.role
    FROM public.profiles p
    WHERE p.id = check_user_id
      AND p.is_active = true;
  $$;

  CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID DEFAULT auth.uid())
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT COALESCE(public.current_user_role(check_user_id) = 'super_admin', false);
  $$;

  CREATE OR REPLACE FUNCTION public.is_site_member(target_site_id UUID, check_user_id UUID DEFAULT auth.uid())
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM public.site_users su
      JOIN public.profiles p ON p.id = su.user_id
      WHERE su.site_id = target_site_id
        AND su.user_id = check_user_id
        AND p.is_active = true
    );
  $$;

  CREATE OR REPLACE FUNCTION public.is_study_member(target_study_id UUID, check_user_id UUID DEFAULT auth.uid())
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM public.studies s
      LEFT JOIN public.sites si ON si.study_id = s.id
      LEFT JOIN public.site_users su ON su.site_id = si.id
      LEFT JOIN public.profiles p ON p.id = check_user_id
      WHERE s.id = target_study_id
        AND p.is_active = true
        AND (
          s.sponsor_id = check_user_id
          OR su.user_id = check_user_id
          OR p.role IN ('super_admin', 'data_manager')
        )
    );
  $$;

  CREATE OR REPLACE FUNCTION public.can_manage_study(target_study_id UUID, check_user_id UUID DEFAULT auth.uid())
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1
      FROM public.studies s
      JOIN public.profiles p ON p.id = check_user_id
      WHERE s.id = target_study_id
        AND p.is_active = true
        AND (
          s.sponsor_id = check_user_id
          OR p.role IN ('super_admin', 'data_manager')
        )
    );
  $$;

  DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
  CREATE POLICY profiles_select_all
    ON public.profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
  CREATE POLICY profiles_update_self
    ON public.profiles
    FOR UPDATE
    USING (id = auth.uid() OR public.is_super_admin())
    WITH CHECK (id = auth.uid() OR public.is_super_admin());

  DROP POLICY IF EXISTS studies_select_members ON public.studies;
  CREATE POLICY studies_select_members
    ON public.studies
    FOR SELECT
    USING (public.is_study_member(id));

  DROP POLICY IF EXISTS studies_insert_managers ON public.studies;
  CREATE POLICY studies_insert_managers
    ON public.studies
    FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND sponsor_id = auth.uid()
      AND public.current_user_role() IN ('sponsor', 'data_manager', 'super_admin')
    );

  DROP POLICY IF EXISTS studies_update_managers ON public.studies;
  CREATE POLICY studies_update_managers
    ON public.studies
    FOR UPDATE
    USING (public.can_manage_study(id))
    WITH CHECK (public.can_manage_study(id));

  DROP POLICY IF EXISTS sites_select_members ON public.sites;
  CREATE POLICY sites_select_members
    ON public.sites
    FOR SELECT
    USING (public.is_study_member(study_id));

  DROP POLICY IF EXISTS sites_insert_managers ON public.sites;
  CREATE POLICY sites_insert_managers
    ON public.sites
    FOR INSERT
    WITH CHECK (public.can_manage_study(study_id));

  DROP POLICY IF EXISTS sites_update_managers ON public.sites;
  CREATE POLICY sites_update_managers
    ON public.sites
    FOR UPDATE
    USING (public.can_manage_study(study_id))
    WITH CHECK (public.can_manage_study(study_id));

  DROP POLICY IF EXISTS site_users_select_members ON public.site_users;
  CREATE POLICY site_users_select_members
    ON public.site_users
    FOR SELECT
    USING (
      public.is_site_member(site_id)
      OR public.can_manage_study((SELECT s.study_id FROM public.sites s WHERE s.id = site_id))
    );

  DROP POLICY IF EXISTS site_users_insert_managers ON public.site_users;
  CREATE POLICY site_users_insert_managers
    ON public.site_users
    FOR INSERT
    WITH CHECK (
      public.can_manage_study((SELECT s.study_id FROM public.sites s WHERE s.id = site_id))
    );

  DROP POLICY IF EXISTS site_users_update_managers ON public.site_users;
  CREATE POLICY site_users_update_managers
    ON public.site_users
    FOR UPDATE
    USING (
      public.can_manage_study((SELECT s.study_id FROM public.sites s WHERE s.id = site_id))
    )
    WITH CHECK (
      public.can_manage_study((SELECT s.study_id FROM public.sites s WHERE s.id = site_id))
    );

  DROP POLICY IF EXISTS site_users_delete_managers ON public.site_users;
  CREATE POLICY site_users_delete_managers
    ON public.site_users
    FOR DELETE
    USING (
      public.can_manage_study((SELECT s.study_id FROM public.sites s WHERE s.id = site_id))
    );

  DROP POLICY IF EXISTS subjects_select_members ON public.subjects;
  CREATE POLICY subjects_select_members
    ON public.subjects
    FOR SELECT
    USING (public.is_study_member(study_id));

  DROP POLICY IF EXISTS subjects_insert_members ON public.subjects;
  CREATE POLICY subjects_insert_members
    ON public.subjects
    FOR INSERT
    WITH CHECK (
      public.is_site_member(site_id)
      OR public.can_manage_study(study_id)
    );

  DROP POLICY IF EXISTS subjects_update_members ON public.subjects;
  CREATE POLICY subjects_update_members
    ON public.subjects
    FOR UPDATE
    USING (
      public.is_site_member(site_id)
      OR public.can_manage_study(study_id)
    )
    WITH CHECK (
      public.is_site_member(site_id)
      OR public.can_manage_study(study_id)
    );

  DROP POLICY IF EXISTS form_templates_select_members ON public.form_templates;
  CREATE POLICY form_templates_select_members
    ON public.form_templates
    FOR SELECT
    USING (public.is_study_member(study_id));

  DROP POLICY IF EXISTS form_templates_insert_managers ON public.form_templates;
  CREATE POLICY form_templates_insert_managers
    ON public.form_templates
    FOR INSERT
    WITH CHECK (public.can_manage_study(study_id));

  DROP POLICY IF EXISTS form_templates_update_managers ON public.form_templates;
  CREATE POLICY form_templates_update_managers
    ON public.form_templates
    FOR UPDATE
    USING (public.can_manage_study(study_id))
    WITH CHECK (public.can_manage_study(study_id));

  DROP POLICY IF EXISTS data_entries_select_members ON public.data_entries;
  CREATE POLICY data_entries_select_members
    ON public.data_entries
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = data_entries.subject_id
          AND public.is_study_member(su.study_id)
      )
    );

  DROP POLICY IF EXISTS data_entries_insert_members ON public.data_entries;
  CREATE POLICY data_entries_insert_members
    ON public.data_entries
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = data_entries.subject_id
          AND (
            public.is_site_member(su.site_id)
            OR public.can_manage_study(su.study_id)
          )
      )
    );

  DROP POLICY IF EXISTS data_entries_update_members ON public.data_entries;
  CREATE POLICY data_entries_update_members
    ON public.data_entries
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = data_entries.subject_id
          AND (
            public.is_site_member(su.site_id)
            OR public.can_manage_study(su.study_id)
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = data_entries.subject_id
          AND (
            public.is_site_member(su.site_id)
            OR public.can_manage_study(su.study_id)
          )
      )
    );

  DROP POLICY IF EXISTS queries_select_members ON public.queries;
  CREATE POLICY queries_select_members
    ON public.queries
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = queries.subject_id
          AND public.is_study_member(su.study_id)
      )
    );

  DROP POLICY IF EXISTS queries_insert_managers ON public.queries;
  CREATE POLICY queries_insert_managers
    ON public.queries
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = queries.subject_id
          AND (
            public.can_manage_study(su.study_id)
            OR public.current_user_role() IN ('monitor')
          )
      )
    );

  DROP POLICY IF EXISTS queries_update_managers ON public.queries;
  CREATE POLICY queries_update_managers
    ON public.queries
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = queries.subject_id
          AND (
            public.can_manage_study(su.study_id)
            OR public.current_user_role() IN ('monitor')
            OR queries.assigned_to = auth.uid()
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.subjects su
        WHERE su.id = queries.subject_id
          AND (
            public.can_manage_study(su.study_id)
            OR public.current_user_role() IN ('monitor')
            OR queries.assigned_to = auth.uid()
          )
      )
    );

  DROP POLICY IF EXISTS query_responses_select_members ON public.query_responses;
  CREATE POLICY query_responses_select_members
    ON public.query_responses
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.queries q
        JOIN public.subjects su ON su.id = q.subject_id
        WHERE q.id = query_responses.query_id
          AND public.is_study_member(su.study_id)
      )
    );

  DROP POLICY IF EXISTS query_responses_insert_members ON public.query_responses;
  CREATE POLICY query_responses_insert_members
    ON public.query_responses
    FOR INSERT
    WITH CHECK (
      responded_by = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.queries q
        JOIN public.subjects su ON su.id = q.subject_id
        WHERE q.id = query_responses.query_id
          AND (
            public.is_site_member(su.site_id)
            OR public.can_manage_study(su.study_id)
            OR public.current_user_role() IN ('monitor')
          )
      )
    );

  DROP POLICY IF EXISTS audit_logs_select_members ON public.audit_logs;
  CREATE POLICY audit_logs_select_members
    ON public.audit_logs
    FOR SELECT
    USING (public.current_user_role() IN ('super_admin', 'sponsor', 'monitor', 'data_manager'));

  DROP POLICY IF EXISTS signatures_select_members ON public.signatures;
  CREATE POLICY signatures_select_members
    ON public.signatures
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

  DROP POLICY IF EXISTS signatures_insert_self ON public.signatures;
  CREATE POLICY signatures_insert_self
    ON public.signatures
    FOR INSERT
    WITH CHECK (signed_by = auth.uid());

  DROP POLICY IF EXISTS study_documents_select_members ON public.study_documents;
  CREATE POLICY study_documents_select_members
    ON public.study_documents
    FOR SELECT
    USING (public.is_study_member(study_id));

  DROP POLICY IF EXISTS study_documents_insert_managers ON public.study_documents;
  CREATE POLICY study_documents_insert_managers
    ON public.study_documents
    FOR INSERT
    WITH CHECK (public.can_manage_study(study_id));

  DROP POLICY IF EXISTS study_documents_update_managers ON public.study_documents;
  CREATE POLICY study_documents_update_managers
    ON public.study_documents
    FOR UPDATE
    USING (public.can_manage_study(study_id))
    WITH CHECK (public.can_manage_study(study_id));

  DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
  CREATE POLICY notifications_select_own
    ON public.notifications
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_super_admin());

  DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
  CREATE POLICY notifications_update_own
    ON public.notifications
    FOR UPDATE
    USING (user_id = auth.uid() OR public.is_super_admin())
    WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

  DROP POLICY IF EXISTS data_exports_select_members ON public.data_exports;
  CREATE POLICY data_exports_select_members
    ON public.data_exports
    FOR SELECT
    USING (
      requested_by = auth.uid()
      OR public.can_manage_study(study_id)
      OR public.current_user_role() IN ('monitor')
    );

  DROP POLICY IF EXISTS data_exports_insert_members ON public.data_exports;
  CREATE POLICY data_exports_insert_members
    ON public.data_exports
    FOR INSERT
    WITH CHECK (
      requested_by = auth.uid()
      AND (
        public.can_manage_study(study_id)
        OR public.current_user_role() IN ('monitor')
      )
    );

  DROP POLICY IF EXISTS data_exports_update_members ON public.data_exports;
  CREATE POLICY data_exports_update_members
    ON public.data_exports
    FOR UPDATE
    USING (
      requested_by = auth.uid()
      OR public.can_manage_study(study_id)
      OR public.current_user_role() IN ('monitor')
    )
    WITH CHECK (
      requested_by = auth.uid()
      OR public.can_manage_study(study_id)
      OR public.current_user_role() IN ('monitor')
    );

COMMIT;


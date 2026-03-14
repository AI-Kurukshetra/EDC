# Supabase — Migration & RLS Agent Instructions

# Clinical Data Hub · Stack: Supabase (PostgreSQL 15) + Next.js App Router

---

## 0. MCP Tool Usage — Read First

You have access to Supabase via MCP. Before using any MCP tool, read these rules:

```
ALLOWED via MCP:
  ✅ supabase_query          — read-only SELECT queries for inspection
  ✅ supabase_migrations      — apply new migration files
  ✅ supabase_list_tables     — inspect schema
  ✅ supabase_get_schema      — read current table structure

NEVER via MCP:
  ❌ Do NOT run raw DDL directly (ALTER, DROP, CREATE) outside a migration file
  ❌ Do NOT disable RLS on any table for any reason
  ❌ Do NOT run DELETE or TRUNCATE on production data
  ❌ Do NOT modify auth.users directly — use Supabase Auth API only
  ❌ Do NOT expose or log the service_role key anywhere
```

**Every database change — no matter how small — must go through a numbered
migration file. No exceptions. Not even a single column rename.**

---

## 1. Migration File Rules

### 1.1 Naming Convention

```
supabase/migrations/
├── 001_initial_schema.sql
├── 002_rls_policies.sql
├── 003_seed_reference_data.sql
├── 004_add_adverse_events_table.sql
└── 005_add_subject_notes_column.sql

Format:  NNN_snake_case_description.sql
         NNN = zero-padded 3-digit number, incrementing by 1
         description = what this migration does, not what table it touches

✅ Good: 006_add_randomization_to_subjects.sql
❌ Bad:  006_subjects.sql
❌ Bad:  006-add-randomization.sql
❌ Bad:  subjects_v2.sql
```

### 1.2 Migration File Structure

Every migration file must follow this exact structure:

```sql
-- ============================================================
-- Migration: 006_add_randomization_to_subjects.sql
-- Description: Adds randomization fields and randomization_lists
--              table to support Phase 2 subject randomization
-- Author: [agent/developer name]
-- Date: YYYY-MM-DD
-- Depends on: 001_initial_schema.sql, 002_rls_policies.sql
-- ============================================================

-- ─── ROLLBACK (run this section to undo) ────────────────────
-- ALTER TABLE subjects DROP COLUMN IF EXISTS randomization_code;
-- ALTER TABLE subjects DROP COLUMN IF EXISTS randomized_at;
-- DROP TABLE IF EXISTS randomization_lists;
-- ─────────────────────────────────────────────────────────────

BEGIN;

  -- ── 1. Schema changes ──────────────────────────────────────
  ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS randomization_code TEXT,
    ADD COLUMN IF NOT EXISTS randomized_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS randomization_arm   TEXT;

  CREATE TABLE IF NOT EXISTS randomization_lists (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id      UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    site_id       UUID REFERENCES sites(id),
    sequence      INT  NOT NULL,
    arm           TEXT NOT NULL,
    is_allocated  BOOLEAN DEFAULT false,
    allocated_to  UUID REFERENCES subjects(id),
    allocated_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (study_id, site_id, sequence)
  );

  -- ── 2. Indexes ─────────────────────────────────────────────
  CREATE INDEX IF NOT EXISTS idx_randomization_lists_study_id
    ON randomization_lists (study_id);

  CREATE INDEX IF NOT EXISTS idx_randomization_lists_unallocated
    ON randomization_lists (study_id, is_allocated)
    WHERE is_allocated = false;

  -- ── 3. updated_at trigger ──────────────────────────────────
  CREATE TRIGGER set_updated_at_randomization_lists
    BEFORE UPDATE ON randomization_lists
    FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

  -- ── 4. RLS ─────────────────────────────────────────────────
  ALTER TABLE randomization_lists ENABLE ROW LEVEL SECURITY;

  -- (policies defined in full below — see section 3)
  CREATE POLICY "randomization_lists_select_study_members"
    ON randomization_lists FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM site_users su
        WHERE su.site_id = randomization_lists.site_id
          AND su.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM studies s
        WHERE s.id = randomization_lists.study_id
          AND s.sponsor_id = auth.uid()
      )
    );

COMMIT;
```

### 1.3 Non-Negotiable Migration Rules

```
✅ Always wrap in BEGIN / COMMIT transaction
✅ Always use IF NOT EXISTS / IF EXISTS — migrations must be idempotent
✅ Always include a ROLLBACK comment block at the top
✅ Always add updated_at trigger for every new table
✅ Always create indexes on every foreign key column
✅ Always enable RLS immediately after CREATE TABLE — in the same migration
✅ Always write the depends_on header comment

❌ Never ALTER a column type without a data migration strategy noted in comments
❌ Never DROP a column without confirming no application code references it
❌ Never rename a column — add new, migrate data, drop old (3 separate migrations)
❌ Never use SERIAL or BIGSERIAL — always use UUID + gen_random_uuid()
❌ Never store passwords, tokens, or PII in plain text columns
❌ Never commit a migration that has not been tested locally first
```

---

## 2. Standard Table Template

When creating any new table, always start from this template:

```sql
CREATE TABLE IF NOT EXISTS table_name (
  -- ── Identity ───────────────────────────────────────────────
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign keys (always with ON DELETE behavior) ──────────
  study_id    UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- ── Domain columns ─────────────────────────────────────────
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
              CONSTRAINT table_name_status_check
              CHECK (status IN ('active', 'inactive')),

  -- ── Audit timestamps (always last) ─────────────────────────
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on every FK
CREATE INDEX IF NOT EXISTS idx_table_name_study_id
  ON table_name (study_id);

-- updated_at auto-update
CREATE TRIGGER set_updated_at_table_name
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS — always enable immediately
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2.1 ON DELETE Behavior Rules

```
ON DELETE CASCADE   → child records meaningless without parent
                      (data_entries → subjects, query_responses → queries)

ON DELETE RESTRICT  → child records have independent value, prevent orphan delete
                      (subjects → sites — don't silently delete subjects)

ON DELETE SET NULL  → child records survive, FK becomes nullable
                      (assigned_to on queries — user deleted, query persists)

SET DEFAULT         → rarely used in this schema
```

---

## 3. RLS Policy Patterns

### 3.1 The Four Policy Commands

Always write separate policies for each operation. Never combine with FOR ALL.

```sql
-- Correct: one policy per operation
CREATE POLICY "table_select" ON table_name FOR SELECT USING (...);
CREATE POLICY "table_insert" ON table_name FOR INSERT WITH CHECK (...);
CREATE POLICY "table_update" ON table_name FOR UPDATE USING (...) WITH CHECK (...);
-- Note: DELETE policy only if deletes are allowed at all

-- Wrong: never use FOR ALL
CREATE POLICY "table_all" ON table_name FOR ALL USING (...); -- ❌
```

### 3.2 Auth Helper Functions

```sql
-- Current user's UUID
auth.uid()

-- Current user's role (from profiles table)
-- Use this helper function — always reference it the same way:
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user belongs to a study (via any site)
CREATE OR REPLACE FUNCTION user_has_study_access(p_study_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM site_users su
    JOIN sites s ON s.id = su.site_id
    WHERE s.study_id = p_study_id
      AND su.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM studies
    WHERE id = p_study_id AND sponsor_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user belongs to a specific site
CREATE OR REPLACE FUNCTION user_has_site_access(p_site_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM site_users
    WHERE site_id = p_site_id AND user_id = auth.uid()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 3.3 Full RLS Policy Definitions Per Table

---

#### `profiles`

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all profiles (needed for user pickers, assignments)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insert handled by Auth trigger — no direct insert policy needed
-- Super admin can do anything via service_role (bypasses RLS)
```

---

#### `studies`

```sql
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studies_select"
  ON studies FOR SELECT
  TO authenticated
  USING (
    sponsor_id = auth.uid()                   -- sponsor sees their studies
    OR user_has_study_access(id)              -- assigned users see study
    OR current_user_role() = 'super_admin'    -- super admin sees all
  );

CREATE POLICY "studies_insert"
  ON studies FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('super_admin', 'sponsor')
    AND sponsor_id = auth.uid()
  );

CREATE POLICY "studies_update"
  ON studies FOR UPDATE
  TO authenticated
  USING (
    sponsor_id = auth.uid()
    OR current_user_role() = 'super_admin'
  )
  WITH CHECK (
    sponsor_id = auth.uid()
    OR current_user_role() = 'super_admin'
  );

-- Studies are NEVER deleted — terminated status is used instead
-- No DELETE policy = delete is blocked for all authenticated users
```

---

#### `sites`

```sql
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites_select"
  ON sites FOR SELECT
  TO authenticated
  USING (
    user_has_site_access(id)
    OR EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = sites.study_id
        AND studies.sponsor_id = auth.uid()
    )
    OR current_user_role() = 'super_admin'
  );

CREATE POLICY "sites_insert"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_id
        AND studies.sponsor_id = auth.uid()
    )
    OR current_user_role() = 'super_admin'
  );

CREATE POLICY "sites_update"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = sites.study_id
        AND studies.sponsor_id = auth.uid()
    )
    OR current_user_role() = 'super_admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = study_id
        AND studies.sponsor_id = auth.uid()
    )
    OR current_user_role() = 'super_admin'
  );
```

---

#### `site_users`

```sql
ALTER TABLE site_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_users_select"
  ON site_users FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()                       -- see your own assignments
    OR user_has_site_access(site_id)           -- see teammates at same site
    OR current_user_role() IN ('super_admin', 'sponsor', 'data_manager')
  );

CREATE POLICY "site_users_insert"
  ON site_users FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('super_admin', 'sponsor')
  );

CREATE POLICY "site_users_delete"
  ON site_users FOR DELETE
  TO authenticated
  USING (
    current_user_role() IN ('super_admin', 'sponsor')
  );
```

---

#### `subjects`

```sql
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_select"
  ON subjects FOR SELECT
  TO authenticated
  USING (
    user_has_site_access(site_id)
    OR EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = subjects.study_id
        AND studies.sponsor_id = auth.uid()
    )
    OR current_user_role() IN ('super_admin', 'data_manager', 'monitor')
  );

CREATE POLICY "subjects_insert"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_site_access(site_id)
    AND current_user_role() IN ('coordinator', 'investigator')
    OR current_user_role() IN ('super_admin', 'data_manager')
  );

CREATE POLICY "subjects_update"
  ON subjects FOR UPDATE
  TO authenticated
  USING (
    user_has_site_access(site_id)
    AND current_user_role() IN ('coordinator', 'investigator')
    OR current_user_role() IN ('super_admin', 'data_manager')
  )
  WITH CHECK (
    user_has_site_access(site_id)
    OR current_user_role() IN ('super_admin', 'data_manager')
  );

-- Subjects are NEVER deleted — withdrawn status is used
-- No DELETE policy
```

---

#### `form_templates`

```sql
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

-- All study members can read forms
CREATE POLICY "form_templates_select"
  ON form_templates FOR SELECT
  TO authenticated
  USING ( user_has_study_access(study_id) );

-- Only data managers and sponsors can create/edit forms
CREATE POLICY "form_templates_insert"
  ON form_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_study_access(study_id)
    AND current_user_role() IN ('super_admin', 'sponsor', 'data_manager')
  );

CREATE POLICY "form_templates_update"
  ON form_templates FOR UPDATE
  TO authenticated
  USING (
    user_has_study_access(study_id)
    AND current_user_role() IN ('super_admin', 'sponsor', 'data_manager')
  )
  WITH CHECK (
    user_has_study_access(study_id)
    AND current_user_role() IN ('super_admin', 'sponsor', 'data_manager')
  );

-- Published forms cannot be deleted — only unpublished drafts
CREATE POLICY "form_templates_delete"
  ON form_templates FOR DELETE
  TO authenticated
  USING (
    is_published = false
    AND current_user_role() IN ('super_admin', 'data_manager')
  );
```

---

#### `data_entries`

```sql
ALTER TABLE data_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_entries_select"
  ON data_entries FOR SELECT
  TO authenticated
  USING (
    -- Site coordinators/investigators see their site's data
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = data_entries.subject_id
        AND user_has_site_access(s.site_id)
    )
    OR current_user_role() IN ('super_admin', 'data_manager', 'monitor', 'sponsor')
  );

CREATE POLICY "data_entries_insert"
  ON data_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id
        AND user_has_site_access(s.site_id)
    )
    AND current_user_role() IN ('coordinator', 'investigator')
    -- Cannot insert if subject is withdrawn or study is terminated
    AND EXISTS (
      SELECT 1 FROM subjects s
      JOIN studies st ON st.id = s.study_id
      WHERE s.id = subject_id
        AND s.status NOT IN ('withdrawn', 'screen_failed')
        AND st.status = 'active'
    )
  );

-- Can only update draft or sdv_required entries — not locked ones
CREATE POLICY "data_entries_update"
  ON data_entries FOR UPDATE
  TO authenticated
  USING (
    status IN ('draft', 'sdv_required')
    AND (
      EXISTS (
        SELECT 1 FROM subjects s
        WHERE s.id = data_entries.subject_id
          AND user_has_site_access(s.site_id)
        AND current_user_role() IN ('coordinator', 'investigator')
      )
      OR current_user_role() IN ('super_admin', 'data_manager')
    )
  )
  WITH CHECK (
    -- Cannot change status to 'locked' directly — must go through Server Action
    -- which calls the Edge Function audit logger
    true
  );

-- Data entries are NEVER deleted
-- No DELETE policy
```

---

#### `queries`

```sql
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "queries_select"
  ON queries FOR SELECT
  TO authenticated
  USING ( user_has_study_access(
    (SELECT s.study_id FROM subjects s WHERE s.id = queries.subject_id)
  ));

-- Monitors and data managers raise queries
CREATE POLICY "queries_insert"
  ON queries FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_role() IN ('super_admin', 'data_manager', 'monitor')
    AND user_has_study_access(
      (SELECT s.study_id FROM subjects s WHERE s.id = subject_id)
    )
  );

-- Coordinators respond (update), DMs open/close
CREATE POLICY "queries_update"
  ON queries FOR UPDATE
  TO authenticated
  USING (
    user_has_study_access(
      (SELECT s.study_id FROM subjects s WHERE s.id = queries.subject_id)
    )
    AND (
      -- Coordinators can only add responses (status: open → answered)
      (current_user_role() IN ('coordinator', 'investigator')
        AND status = 'open')
      -- DMs can close/cancel
      OR current_user_role() IN ('super_admin', 'data_manager', 'monitor')
    )
  )
  WITH CHECK (true);
```

---

#### `query_responses`

```sql
ALTER TABLE query_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "query_responses_select"
  ON query_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM queries q
      JOIN subjects s ON s.id = q.subject_id
      WHERE q.id = query_responses.query_id
        AND user_has_study_access(s.study_id)
    )
  );

CREATE POLICY "query_responses_insert"
  ON query_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    responded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM queries q
      JOIN subjects s ON s.id = q.subject_id
      WHERE q.id = query_id
        AND user_has_study_access(s.study_id)
        AND q.status = 'open'
    )
  );

-- Responses are immutable — no UPDATE or DELETE
```

---

#### `audit_logs`

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- READ: only DMs, monitors, sponsors, and super admins
CREATE POLICY "audit_logs_select"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('super_admin', 'data_manager', 'monitor', 'sponsor')
    AND (
      study_id IS NULL   -- system-level events
      OR user_has_study_access(study_id)
    )
  );

-- INSERT: service_role only (via Edge Function) — NO authenticated insert policy
-- This means ONLY the Edge Function (using service_role key) can insert audit logs
-- If no INSERT policy exists for 'authenticated', authenticated users cannot insert

-- UPDATE: nobody
-- DELETE: nobody
-- These are intentionally absent — RLS blocks them by default
```

---

#### `signatures`

```sql
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures_select"
  ON signatures FOR SELECT
  TO authenticated
  USING (
    user_has_study_access(study_id)
    OR signed_by = auth.uid()
  );

-- Insert via Server Action only — user must re-authenticate
CREATE POLICY "signatures_insert"
  ON signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    signed_by = auth.uid()   -- can only sign as yourself
    AND user_has_study_access(study_id)
  );

-- Signatures are immutable — no UPDATE or DELETE policies
```

---

#### `study_documents`

```sql
ALTER TABLE study_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_documents_select"
  ON study_documents FOR SELECT
  TO authenticated
  USING ( user_has_study_access(study_id) );

CREATE POLICY "study_documents_insert"
  ON study_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND user_has_study_access(study_id)
    AND current_user_role() IN ('super_admin', 'sponsor', 'data_manager')
  );

CREATE POLICY "study_documents_update"
  ON study_documents FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR current_user_role() IN ('super_admin', 'data_manager')
  )
  WITH CHECK (true);

-- Only super admin can delete documents
CREATE POLICY "study_documents_delete"
  ON study_documents FOR DELETE
  TO authenticated
  USING ( current_user_role() = 'super_admin' );
```

---

#### `notifications`

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users see only their own notifications
CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() );

-- Insert via Edge Function (service_role) only — no direct insert policy

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  TO authenticated
  USING ( user_id = auth.uid() )   -- can only mark own notifications read
  WITH CHECK ( user_id = auth.uid() );
```

---

## 4. Supabase Storage — Bucket RLS

```sql
-- study-documents bucket policy
INSERT INTO storage.buckets (id, name, public)
VALUES ('study-documents', 'study-documents', false);

-- Allow read for authenticated study members
CREATE POLICY "study_documents_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'study-documents'
    AND auth.uid() IS NOT NULL
    -- path format: study-documents/{study_id}/{filename}
    AND user_has_study_access(
      (string_to_array(name, '/'))[1]::UUID
    )
  );

-- Allow upload for DMs and sponsors
CREATE POLICY "study_documents_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'study-documents'
    AND current_user_role() IN ('super_admin', 'sponsor', 'data_manager')
  );

-- Allow delete for super admin only
CREATE POLICY "study_documents_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-documents'
    AND current_user_role() = 'super_admin'
  );
```

---

## 5. Auth Trigger — Auto-Create Profile

When a new user signs up via Supabase Auth, automatically create their profile row:

```sql
-- 003_auth_trigger.sql

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'read_only'   -- default role — super admin assigns real role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 6. Performance — Indexes Checklist

After every migration that adds a table or new query pattern, verify these indexes exist:

```sql
-- Every FK column must have an index
CREATE INDEX IF NOT EXISTS idx_studies_sponsor_id         ON studies (sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sites_study_id             ON sites (study_id);
CREATE INDEX IF NOT EXISTS idx_site_users_site_id         ON site_users (site_id);
CREATE INDEX IF NOT EXISTS idx_site_users_user_id         ON site_users (user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_study_id          ON subjects (study_id);
CREATE INDEX IF NOT EXISTS idx_subjects_site_id           ON subjects (site_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_study_id    ON form_templates (study_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_subject_id    ON data_entries (subject_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_form_id       ON data_entries (form_template_id);
CREATE INDEX IF NOT EXISTS idx_data_entries_status        ON data_entries (status);
CREATE INDEX IF NOT EXISTS idx_queries_subject_id         ON queries (subject_id);
CREATE INDEX IF NOT EXISTS idx_queries_status             ON queries (status);
CREATE INDEX IF NOT EXISTS idx_queries_assigned_to        ON queries (assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_logs_study_id        ON audit_logs (study_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id         ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at      ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signatures_entity          ON signatures (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id      ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread       ON notifications (user_id, read_at)
  WHERE read_at IS NULL;
```

---

## 7. Agent Workflow — Step by Step

When asked to make any database change, follow this exact sequence:

```
STEP 1 — Understand the change
  Read existing migrations to understand current schema.
  Use MCP supabase_list_tables and supabase_get_schema to inspect live state.
  Never assume — always verify current state first.

STEP 2 — Plan before writing
  Write a short comment block describing:
  - What tables/columns are changing
  - What RLS policies are needed
  - What indexes are needed
  - What rollback looks like

STEP 3 — Write the migration file
  Create supabase/migrations/NNN_description.sql
  Follow the template in section 1.2 exactly.
  Use IF NOT EXISTS everywhere.
  Wrap in BEGIN / COMMIT.
  Include rollback comments.

STEP 4 — Write RLS policies in the same file
  Every new table gets RLS enabled + policies in the same migration.
  Use the helper functions from section 3.2.
  Follow the per-table patterns from section 3.3.

STEP 5 — Add indexes
  Add all FK indexes + any query-pattern indexes in the same migration.

STEP 6 — Apply via MCP
  Use supabase_migrations tool to apply the file.
  Never run DDL directly through supabase_query.

STEP 7 — Regenerate types
  After every successful migration, run:
  npx supabase gen types typescript --local > src/types/database.types.ts
  Commit the updated types file alongside the migration.

STEP 8 — Verify
  Use supabase_query to run a quick SELECT on the new table/column.
  Confirm RLS is enabled: SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public';
```

---

## 8. What the Agent Must Never Do

```
❌ Never run: ALTER TABLE ... DISABLE ROW LEVEL SECURITY
❌ Never run: DROP POLICY without immediately replacing it
❌ Never run: GRANT ALL ON ALL TABLES TO authenticated
❌ Never run: SET session_replication_role = replica (disables triggers + RLS)
❌ Never create a migration without IF NOT EXISTS guards
❌ Never skip the BEGIN/COMMIT transaction wrapper
❌ Never apply a migration without a rollback plan documented
❌ Never touch auth.users directly
❌ Never log or expose the service_role key
❌ Never create a table without immediately enabling RLS on it
❌ Never create a DELETE policy on audit_logs or signatures
❌ Never create an UPDATE policy on audit_logs or signatures
```

---

_Place this file at: `supabase/AGENTS.md`_
_It is loaded by Codex CLI whenever you work on files inside the supabase/ directory._

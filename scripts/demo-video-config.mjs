import path from 'node:path'

export const demoConfig = {
  baseUrl: process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:3001',
  email: process.env.DEMO_EMAIL ?? 'sponsor@clinicalhub.dev',
  password: process.env.DEMO_PASSWORD ?? 'Password123!',
  studyId: process.env.DEMO_STUDY_ID ?? 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  outputDir: process.env.DEMO_OUTPUT_DIR ?? path.resolve('artifacts/demo'),
  voice: process.env.DEMO_VOICE ?? 'Samantha',
  speakingRate: Number(process.env.DEMO_SPEAKING_RATE ?? '175'),
  viewport: {
    width: 1440,
    height: 1024,
  },
}

export const demoSegments = [
  {
    id: 'dashboard',
    path: '/',
    readyText: ['Clinical Data Hub', 'Clinical Operations'],
    narration:
      'Clinical trials still run across disconnected spreadsheets, email threads, static PDFs, and fragmented systems. That creates delays, poor visibility, audit risk, and slower decisions. Clinical Data Hub brings study operations into one workflow-driven platform. It connects study setup, subjects, eCRF capture, queries, documents, exports, audit trails, and electronic signatures in a single operational system.',
    motion: { down: 260, up: 0 },
  },
  {
    id: 'account',
    path: '/account',
    readyText: ['Account', 'Notifications'],
    narration:
      'Each user also has a role-aware account workspace with assignments, responsibilities, and notifications.',
    motion: { down: 420, up: 0 },
  },
  {
    id: 'studies',
    path: '/studies',
    readyText: ['Manage active and planned trials', 'Clinical studies'],
    narration:
      'From the study portfolio, teams can move directly from portfolio oversight into day-to-day trial execution.',
    motion: { down: 280, up: 0 },
  },
  {
    id: 'study-overview',
    path: (studyId) => `/studies/${studyId}`,
    readyText: ['Overview', 'Study readiness'],
    narration:
      'Inside a study, the platform becomes the operating system for execution. Everything is organized in one shell: forms, subjects, data capture, queries, documents, exports, and audit. Leadership gets study readiness, enrollment progress, and study-level sign-off in one place. That means operational oversight is built into the workflow, not bolted on afterward.',
    motion: { down: 320, up: 0 },
  },
  {
    id: 'forms',
    path: (studyId) => `/studies/${studyId}/forms`,
    readyText: ['Form templates', 'Published templates'],
    narration:
      'Protocol execution depends on controlled forms. Here, CRFs are versioned and published templates are locked from direct editing. Any change goes through a next-version workflow, which protects approved history and reduces downstream risk.',
    motion: { down: 700, up: 220 },
  },
  {
    id: 'subjects',
    path: (studyId) => `/studies/${studyId}/subjects`,
    readyText: ['Subject operations', 'Enroll subject'],
    narration:
      'Subject management is no longer external to the system. Teams can enroll participants directly into the study, track lifecycle state, and maintain operational context at the roster level. This turns the subject roster from a passive list into an operational workflow surface.',
    motion: { down: 820, up: 260 },
  },
  {
    id: 'data',
    path: (studyId) => `/studies/${studyId}/data`,
    readyText: ['Data capture', 'eCRF workspace', 'Entry workspace'],
    narration:
      'This is the live eCRF workspace. Teams can select a subject, pick a published CRF, capture visit-based responses, save drafts, and submit entries for review. Once data is submitted, it can be electronically signed and locked. That gives the platform a stronger compliance and accountability model around study data, with clear certification meaning and immutable audit traceability.',
    motion: { down: 900, up: 320 },
  },
  {
    id: 'queries',
    path: (studyId) => `/studies/${studyId}/queries`,
    readyText: ['Query workflow', 'Study queries', 'Response history'],
    narration:
      'Most systems treat data queries as disconnected follow-up. Here, query management is native to the study workflow. Teams can triage, respond, reassign, and close the loop in one place. That shortens resolution cycles and improves study visibility.',
    motion: { down: 760, up: 260 },
  },
  {
    id: 'documents',
    path: (studyId) => `/studies/${studyId}/documents`,
    readyText: ['Document register', 'Study documents'],
    narration:
      'Document governance is also embedded in the product. Teams can register documents, maintain version lineage, capture electronic signatures, and prevent in-place mutation of approved records. That means the system preserves both speed and control.',
    motion: { down: 860, up: 260 },
  },
  {
    id: 'export',
    path: (studyId) => `/studies/${studyId}/export`,
    readyText: ['Controlled exports', 'Export history'],
    narration:
      'Exports are not just file downloads. They are controlled operational events. Every export request is signed, time-stamped, and tracked. That creates much stronger accountability around data movement.',
    motion: { down: 620, up: 160 },
  },
  {
    id: 'audit',
    path: (studyId) => `/studies/${studyId}/audit`,
    readyText: ['Audit trail', 'Recent activity'],
    narration:
      'And because all of this happens in one system, the audit trail becomes meaningful. Subject actions, CRF submissions, query responses, document events, signatures, and exports are all traceable as part of the same study record. Clinical Data Hub is not just a UI for study records. It is an execution layer for clinical operations. It helps teams move from fragmented coordination to controlled, traceable workflows across the full study lifecycle. That means better visibility, faster execution, stronger governance, and a more scalable operating model for modern clinical studies.',
    motion: { down: 920, up: 220 },
  },
]

export function resolveSegmentPath(segment, studyId = demoConfig.studyId) {
  return typeof segment.path === 'function' ? segment.path(studyId) : segment.path
}

export function estimateSegmentDurationMs(narration, speakingRate = demoConfig.speakingRate) {
  const words = narration.trim().split(/\s+/).filter(Boolean).length
  const speechDurationMs = Math.ceil((words / speakingRate) * 60_000)
  return Math.max(speechDurationMs + 2_500, 7_000)
}

export function buildVoiceoverText() {
  return demoSegments
    .map((segment) => segment.narration.trim())
    .join('\n\n')
}

export const USER_ROLES = [
  'super_admin',
  'sponsor',
  'investigator',
  'coordinator',
  'monitor',
  'data_manager',
  'read_only',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const STUDY_PHASES = ['Phase I', 'Phase II', 'Phase III', 'Phase IV'] as const

export type StudyPhase = (typeof STUDY_PHASES)[number]

export const STUDY_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'terminated'] as const

export type StudyStatus = (typeof STUDY_STATUSES)[number]

export const SITE_STATUSES = ['pending', 'active', 'closed'] as const

export type SiteStatus = (typeof SITE_STATUSES)[number]

export const SUBJECT_STATUSES = [
  'screened',
  'enrolled',
  'randomized',
  'completed',
  'withdrawn',
  'screen_failed',
] as const

export type SubjectStatus = (typeof SUBJECT_STATUSES)[number]

export const FORM_TEMPLATE_TYPES = [
  'screening',
  'enrollment',
  'visit',
  'adverse_event',
  'completion',
  'other',
] as const

export type FormTemplateType = (typeof FORM_TEMPLATE_TYPES)[number]

export const CRF_FIELD_TYPES = [
  'text',
  'number',
  'date',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'textarea',
  'section_header',
] as const

export type CrfFieldType = (typeof CRF_FIELD_TYPES)[number]

export const CRF_CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
] as const

export type CrfConditionOperator = (typeof CRF_CONDITION_OPERATORS)[number]

export const DATA_ENTRY_STATUSES = [
  'draft',
  'submitted',
  'locked',
  'sdv_required',
  'sdv_complete',
] as const

export type DataEntryStatus = (typeof DATA_ENTRY_STATUSES)[number]

export const QUERY_STATUSES = ['open', 'answered', 'closed', 'cancelled'] as const

export type QueryStatus = (typeof QUERY_STATUSES)[number]

export const QUERY_PRIORITIES = ['low', 'normal', 'high'] as const

export type QueryPriority = (typeof QUERY_PRIORITIES)[number]

export const NOTIFICATION_TYPES = ['announcement', 'task', 'alert', 'reminder'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const STUDY_DOCUMENT_CATEGORIES = [
  'general',
  'protocol',
  'consent',
  'monitoring',
  'safety',
  'report',
] as const

export type StudyDocumentCategory = (typeof STUDY_DOCUMENT_CATEGORIES)[number]

export const DOCUMENT_SIGNATURE_MEANINGS = [
  'I confirm this document is accurate and complete.',
  'I approve this document for study use.',
  'I acknowledge I have reviewed this document.',
] as const

export type DocumentSignatureMeaning = (typeof DOCUMENT_SIGNATURE_MEANINGS)[number]

export type CrfFieldCondition = {
  fieldId: string
  operator: CrfConditionOperator
  value: string
}

export type CrfFieldValidation = {
  min?: number | undefined
  max?: number | undefined
  minLength?: number | undefined
  maxLength?: number | undefined
  pattern?: string | undefined
}

export type CrfField = {
  id: string
  label: string
  type: CrfFieldType
  required: boolean
  description?: string | undefined
  placeholder?: string | undefined
  options?: string[] | undefined
  validation?: CrfFieldValidation | undefined
  condition?: CrfFieldCondition | undefined
}

export type CrfSchema = {
  description?: string | undefined
  fields: CrfField[]
}

export type CrfEntryValue = string | number | string[]

export type CrfEntryRecord = Record<string, CrfEntryValue | undefined>

export type VisitSchedule = {
  visitKey: string
  dayOffset?: number | undefined
  windowBefore?: number | undefined
  windowAfter?: number | undefined
  repeatable?: boolean | undefined
}

export type StudyFormTemplate = {
  id: string
  studyId: string
  name: string
  formType: FormTemplateType
  version: number
  isPublished: boolean
  schema: CrfSchema
  visitSchedule: VisitSchedule | null
  createdAt: string
  updatedAt: string
}

export type StudyFormTemplateDraft = {
  id?: string
  studyId: string
  name: string
  formType: FormTemplateType
  version: number
  isPublished: boolean
  schema: CrfSchema
  visitSchedule: VisitSchedule
}

export type StudySummary = {
  id: string
  title: string
  protocolNumber: string
  phase: StudyPhase
  status: StudyStatus
  sponsorId: string | null
  targetEnrollment: number | null
  startDate: string | null
  endDate: string | null
  therapeuticArea: string | null
  createdAt: string
  updatedAt: string
}

export type SiteDraft = {
  name: string
  siteCode: string
  country: string
  principalInvestigatorId?: string
}

export type TeamAssignmentDraft = {
  userId: string
  role: UserRole
  siteCode?: string
}

export type StudySubjectSummary = {
  id: string
  siteId: string
  subjectId: string
  status: SubjectStatus
  siteName: string
  siteCode: string
  consentDate: string | null
  enrollmentDate: string | null
  createdAt: string
}

export type StudyDataEntry = {
  id: string
  subjectId: string
  formTemplateId: string
  visitNumber: number
  visitDate: string | null
  data: CrfEntryRecord
  status: DataEntryStatus
  submittedBy: string | null
  submittedAt: string | null
  lockedBy: string | null
  lockedAt: string | null
  createdAt: string
  updatedAt: string
}

export type StudyDataQuery = {
  id: string
  dataEntryId: string
  fieldId: string
  subjectId: string
  queryText: string
  status: QueryStatus
  priority: QueryPriority
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

export type StudyDataWorkspace = {
  subjects: StudySubjectSummary[]
  templates: StudyFormTemplate[]
  entries: StudyDataEntry[]
  queries: StudyDataQuery[]
}

export type StudyOperationsSubject = StudySubjectSummary & {
  siteCountry: string | null
  withdrawalDate: string | null
  withdrawalReason: string | null
  entryCount: number
  submittedEntryCount: number
  openQueryCount: number
  lastVisitDate: string | null
  lastSubmittedAt: string | null
}

export type StudyOperationsQuery = {
  id: string
  subjectId: string
  subjectLabel: string
  siteName: string
  siteCode: string
  formName: string
  fieldId: string
  queryText: string
  status: QueryStatus
  priority: QueryPriority
  raisedByName: string | null
  raisedByEmail: string | null
  assignedToName: string | null
  assignedToEmail: string | null
  responseCount: number
  lastResponseAt: string | null
  createdAt: string
  updatedAt: string
}

export type StudyOperationsSite = {
  id: string
  name: string
  siteCode: string
  country: string | null
  status: SiteStatus
  principalInvestigatorId: string | null
  principalInvestigatorName: string | null
  principalInvestigatorEmail: string | null
  teamSize: number
  subjectCount: number
  enrolledSubjectCount: number
  openQueryCount: number
  entryCount: number
  createdAt: string
}

export type StudyOperationsUser = {
  id: string
  userId: string
  fullName: string
  email: string
  siteId: string | null
  siteName: string | null
  siteCode: string | null
  siteRole: UserRole
  profileRole: UserRole
  isActive: boolean
  assignedAt: string
}

export type StudyOperationsAudit = {
  id: string
  action: string
  entityType: string
  entityId: string
  actorName: string | null
  actorEmail: string | null
  createdAt: string
}

export type StudyOperationsDocument = {
  id: string
  name: string
  filePath: string
  version: number
  category: StudyDocumentCategory
  uploadedByName: string | null
  uploadedByEmail: string | null
  createdAt: string
  signatureCount: number
  latestSignedAt: string | null
  latestSignedByName: string | null
  latestSignedByEmail: string | null
  latestSignatureMeaning: string | null
}

export type StudyOperationsDocumentsWorkspace = {
  studyId: string
  studyTitle: string
  canManageDocuments: boolean
  canSignDocuments: boolean
  viewerName: string | null
  viewerEmail: string | null
  viewerRole: UserRole | null
  documents: StudyOperationsDocument[]
}

export type StudyOperationsExport = {
  id: string
  format: 'csv' | 'json' | 'cdisc'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  requestedByName: string | null
  requestedByEmail: string | null
  filePath: string | null
  errorMessage: string | null
  completedAt: string | null
  signedUrlExpiresAt: string | null
  createdAt: string
}

export type StudyExportOption = {
  id: string
  name: string
  label: string
}

export type StudySiteOption = {
  id: string
  name: string
  siteCode: string
}

export type StudyOperationsExportWorkspace = {
  studyId: string
  studyTitle: string
  subjectCount: number
  formCount: number
  entryCount: number
  openQueryCount: number
  sites: StudySiteOption[]
  forms: StudyExportOption[]
  exports: StudyOperationsExport[]
}

export type StudyDetail = StudySummary & {
  description: string | null
  sites: {
    id: string
    name: string
    siteCode: string
    country: string | null
    status: SiteStatus
    principalInvestigatorId: string | null
    createdAt: string
  }[]
  openQueries: number
  enrolledSubjects: number
  completionRate: number
}

export type DashboardSnapshot = {
  activeStudies: number
  totalSubjects: number
  openQueries: number
  pendingTasks: number
  recentActivity: {
    id: string
    action: string
    entityType: string
    entityId: string
    createdAt: string
  }[]
}

export type SessionProfileSummary = {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  unreadNotificationCount: number
}

export type AccountSiteAssignment = {
  id: string
  siteId: string
  siteName: string
  siteCode: string
  studyId: string
  studyTitle: string
  role: UserRole
}

export type AccountStudySummary = {
  id: string
  title: string
  protocolNumber: string
  status: StudyStatus
}

export type AccountNotificationSummary = {
  id: string
  type: NotificationType
  title: string
  message: string
  entityId: string | null
  priority: QueryPriority
  readAt: string | null
  createdAt: string
}

export type AccountWorkspace = {
  profile: SessionProfileSummary
  siteAssignments: AccountSiteAssignment[]
  sponsoredStudies: AccountStudySummary[]
  notifications: AccountNotificationSummary[]
}

export type AdminRoleSummary = {
  role: UserRole
  count: number
}

export type AdminUserSummary = {
  id: string
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  unreadNotificationCount: number
  siteAssignmentCount: number
  sponsoredStudyCount: number
  assignedSites: string[]
  siteAssignments: AdminUserSiteAssignment[]
}

export type AdminAuditEvent = {
  id: string
  action: string
  entityType: string
  entityId: string
  actorName: string | null
  actorEmail: string | null
  createdAt: string
}

export type AdminSiteOption = {
  id: string
  name: string
  siteCode: string
  studyId: string
  studyTitle: string
}

export type AdminUserSiteAssignment = {
  id: string
  siteId: string
  siteName: string
  siteCode: string
  studyId: string
  studyTitle: string
  role: UserRole
}

export type AdminStudySummary = {
  id: string
  title: string
  protocolNumber: string
  status: StudyStatus
  sponsorId: string
  sponsorName: string | null
  sponsorEmail: string | null
  siteCount: number
  subjectCount: number
  openQueryCount: number
  highPriorityOpenQueryCount: number
  exportJobCount: number
  lastExportStatus: 'queued' | 'processing' | 'completed' | 'failed' | null
  lastExportRequestedAt: string | null
}

export type AdminNotificationSummary = {
  id: string
  userId: string
  recipientName: string
  recipientEmail: string
  type: NotificationType
  title: string
  message: string
  entityId: string | null
  priority: QueryPriority
  readAt: string | null
  createdAt: string
}

export type AdminDocumentSummary = {
  id: string
  studyId: string
  studyTitle: string
  protocolNumber: string
  name: string
  filePath: string
  version: number
  category: StudyDocumentCategory
  uploadedByName: string | null
  uploadedByEmail: string | null
  createdAt: string
}

export type AdminSignatureSummary = {
  id: string
  entityType: string
  entityId: string
  entityLabel: string | null
  entityContext: string | null
  signatureMeaning: string
  signedByName: string | null
  signedByEmail: string | null
  signedAt: string
  createdAt: string
  certificateHash: string
}

export type AdminWorkspace =
  | {
      isAuthorized: false
      viewer: SessionProfileSummary | null
    }
  | {
      isAuthorized: true
      viewer: SessionProfileSummary
      totalUsers: number
      activeUsers: number
      totalStudies: number
      totalSiteAssignments: number
      totalUnreadNotifications: number
      roleDistribution: AdminRoleSummary[]
      users: AdminUserSummary[]
      recentAuditEvents: AdminAuditEvent[]
      studies: AdminStudySummary[]
      sites: AdminSiteOption[]
      recentNotifications: AdminNotificationSummary[]
      documents: AdminDocumentSummary[]
      signatures: AdminSignatureSummary[]
    }

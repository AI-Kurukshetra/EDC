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

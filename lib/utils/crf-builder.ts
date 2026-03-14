import type {
  CrfField,
  CrfFieldCondition,
  CrfFieldType,
  CrfSchema,
  StudyFormTemplate,
  StudyFormTemplateDraft,
} from '@/types'

const FIELD_TYPES_WITH_OPTIONS: CrfFieldType[] = ['select', 'multiselect', 'radio', 'checkbox']
const FIELD_TYPES_WITH_PLACEHOLDERS: CrfFieldType[] = ['text', 'number', 'textarea']
const FIELD_TYPES_WITH_NUMERIC_LIMITS: CrfFieldType[] = ['number']
const FIELD_TYPES_WITH_TEXT_LIMITS: CrfFieldType[] = ['text', 'textarea']

function slugifyFieldId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
}

export function createUniqueFieldId(seed: string, existingIds: string[]) {
  const normalizedSeed = slugifyFieldId(seed) || 'field'
  let candidate = normalizedSeed
  let suffix = 2

  while (existingIds.includes(candidate)) {
    candidate = `${normalizedSeed}_${String(suffix)}`
    suffix += 1
  }

  return candidate
}

export function createDefaultCrfField(type: CrfFieldType, existingIds: string[]): CrfField {
  const defaultsByType: Record<CrfFieldType, Omit<CrfField, 'id'>> = {
    text: {
      label: 'Short answer',
      type,
      required: false,
      description: undefined,
      placeholder: 'Enter value',
      options: [],
      validation: {},
      condition: undefined,
    },
    number: {
      label: 'Numeric value',
      type,
      required: false,
      description: undefined,
      placeholder: 'Enter number',
      options: [],
      validation: {},
      condition: undefined,
    },
    date: {
      label: 'Visit date',
      type,
      required: false,
      description: undefined,
      placeholder: undefined,
      options: [],
      validation: {},
      condition: undefined,
    },
    select: {
      label: 'Single select',
      type,
      required: false,
      description: undefined,
      placeholder: undefined,
      options: ['Option A', 'Option B'],
      validation: {},
      condition: undefined,
    },
    multiselect: {
      label: 'Multi-select',
      type,
      required: false,
      description: undefined,
      placeholder: undefined,
      options: ['Option A', 'Option B'],
      validation: {},
      condition: undefined,
    },
    radio: {
      label: 'Radio group',
      type,
      required: false,
      description: undefined,
      placeholder: undefined,
      options: ['Yes', 'No'],
      validation: {},
      condition: undefined,
    },
    checkbox: {
      label: 'Checkboxes',
      type,
      required: false,
      description: undefined,
      placeholder: undefined,
      options: ['Item A', 'Item B'],
      validation: {},
      condition: undefined,
    },
    textarea: {
      label: 'Long answer',
      type,
      required: false,
      description: undefined,
      placeholder: 'Capture free-text notes',
      options: [],
      validation: {},
      condition: undefined,
    },
    section_header: {
      label: 'Section header',
      type,
      required: false,
      description: 'Use this to break long forms into reviewable blocks.',
      placeholder: undefined,
      options: [],
      validation: {},
      condition: undefined,
    },
  }

  const fieldDefaults = defaultsByType[type]

  return {
    id: createUniqueFieldId(fieldDefaults.label, existingIds),
    ...fieldDefaults,
  }
}

export function moveListItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return [...items]
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)

  if (movedItem === undefined) {
    return items
  }

  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

export function fieldSupportsOptions(type: CrfFieldType) {
  return FIELD_TYPES_WITH_OPTIONS.includes(type)
}

export function fieldSupportsPlaceholder(type: CrfFieldType) {
  return FIELD_TYPES_WITH_PLACEHOLDERS.includes(type)
}

export function fieldSupportsNumericLimits(type: CrfFieldType) {
  return FIELD_TYPES_WITH_NUMERIC_LIMITS.includes(type)
}

export function fieldSupportsTextLimits(type: CrfFieldType) {
  return FIELD_TYPES_WITH_TEXT_LIMITS.includes(type)
}

export function parseOptionList(rawValue: string) {
  return rawValue
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function serializeOptionList(options: string[] | undefined) {
  return (options ?? []).join('\n')
}

export function evaluateCrfCondition(
  condition: CrfFieldCondition | undefined,
  values: Record<string, string | number | string[] | undefined>,
) {
  if (!condition) {
    return true
  }

  const currentValue = values[condition.fieldId]

  switch (condition.operator) {
    case 'equals':
      return currentValue === condition.value
    case 'not_equals':
      return currentValue !== condition.value
    case 'contains':
      if (Array.isArray(currentValue)) {
        return currentValue.includes(condition.value)
      }

      return String(currentValue ?? '').includes(condition.value)
    case 'greater_than':
      return Number(currentValue) > Number(condition.value)
    case 'less_than':
      return Number(currentValue) < Number(condition.value)
    default:
      return true
  }
}

export function createEmptyStudyFormTemplate(studyId: string): StudyFormTemplateDraft {
  return {
    studyId,
    name: 'New CRF template',
    formType: 'visit',
    version: 1,
    isPublished: false,
    schema: {
      description: 'Define the fields the site team will complete for this encounter.',
      fields: [
        createDefaultCrfField('section_header', []),
        createDefaultCrfField('text', ['section_header']),
      ],
    },
    visitSchedule: {
      visitKey: 'visit_1',
      dayOffset: 1,
      windowBefore: 2,
      windowAfter: 2,
      repeatable: false,
    },
  }
}

export function createNextFormTemplateVersion(template: StudyFormTemplate): StudyFormTemplateDraft {
  return {
    studyId: template.studyId,
    name: template.name,
    formType: template.formType,
    version: template.version + 1,
    isPublished: false,
    schema: structuredClone(template.schema),
    visitSchedule: template.visitSchedule
      ? structuredClone(template.visitSchedule)
      : {
          visitKey: 'unscheduled',
          repeatable: false,
        },
  }
}

export function getPreviewSeedValues(schema: CrfSchema) {
  return schema.fields.reduce<Record<string, string | number | string[] | undefined>>(
    (values, field) => {
      if (field.type === 'multiselect' || field.type === 'checkbox') {
        values[field.id] = []
        return values
      }

      if (field.type === 'number') {
        values[field.id] = field.validation?.min ?? undefined
        return values
      }

      if (field.type === 'select' || field.type === 'radio') {
        values[field.id] = field.options?.[0]
        return values
      }

      values[field.id] = undefined
      return values
    },
    {},
  )
}

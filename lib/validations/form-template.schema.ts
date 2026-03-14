import { z } from 'zod'

import { PostgresUuidSchema } from '@/lib/validations/identifiers'
import {
  CRF_CONDITION_OPERATORS,
  CRF_FIELD_TYPES,
  FORM_TEMPLATE_TYPES,
  type CrfFieldType,
} from '@/types'

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function normalizeOptionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isNaN(parsedValue) ? value : parsedValue
  }

  return value
}

function fieldTypeUsesOptions(type: CrfFieldType) {
  return ['select', 'multiselect', 'radio', 'checkbox'].includes(type)
}

function fieldTypeUsesPlaceholder(type: CrfFieldType) {
  return ['text', 'number', 'textarea'].includes(type)
}

const OptionalTextSchema = z.preprocess(normalizeOptionalText, z.string().max(240).optional())

const OptionalNumberSchema = z.preprocess(normalizeOptionalNumber, z.number().optional())

export const CrfFieldConditionSchema = z.object({
  fieldId: z.string().min(1, 'Choose a source field for the conditional rule'),
  operator: z.enum(CRF_CONDITION_OPERATORS),
  value: z.string().min(1, 'Provide a comparison value'),
})

export const CrfFieldValidationSchema = z.object({
  min: OptionalNumberSchema,
  max: OptionalNumberSchema,
  minLength: OptionalNumberSchema,
  maxLength: OptionalNumberSchema,
  pattern: OptionalTextSchema,
})

export const CrfFieldSchema = z
  .object({
    id: z
      .string()
      .min(2, 'Field id must be at least 2 characters')
      .max(48, 'Field id must be 48 characters or fewer')
      .regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers, and underscores only'),
    label: z.string().min(1, 'Field label is required').max(120),
    type: z.enum(CRF_FIELD_TYPES),
    required: z.boolean(),
    description: OptionalTextSchema,
    placeholder: OptionalTextSchema,
    options: z.array(z.string().min(1)).default([]),
    validation: CrfFieldValidationSchema.default({}),
    condition: CrfFieldConditionSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.type === 'section_header' && value.required) {
      context.addIssue({
        code: 'custom',
        path: ['required'],
        message: 'Section headers cannot be required',
      })
    }

    if (fieldTypeUsesOptions(value.type) && value.options.length < 2) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Provide at least two response options',
      })
    }

    if (!fieldTypeUsesOptions(value.type) && value.options.length > 0) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Only select, multiselect, radio, and checkbox fields use options',
      })
    }

    if (!fieldTypeUsesPlaceholder(value.type) && value.placeholder) {
      context.addIssue({
        code: 'custom',
        path: ['placeholder'],
        message: 'This field type does not use placeholder text',
      })
    }

    if (value.validation.min !== undefined && value.validation.max !== undefined) {
      if (value.validation.min > value.validation.max) {
        context.addIssue({
          code: 'custom',
          path: ['validation', 'max'],
          message: 'Maximum must be greater than or equal to minimum',
        })
      }
    }

    if (value.validation.minLength !== undefined && value.validation.maxLength !== undefined) {
      if (value.validation.minLength > value.validation.maxLength) {
        context.addIssue({
          code: 'custom',
          path: ['validation', 'maxLength'],
          message: 'Maximum length must be greater than or equal to minimum length',
        })
      }
    }
  })

export const CrfSchemaSchema = z
  .object({
    description: OptionalTextSchema,
    fields: z.array(CrfFieldSchema).min(1, 'Add at least one field to the form'),
  })
  .superRefine((value, context) => {
    const seenFieldIds = new Set<string>()

    value.fields.forEach((field, index) => {
      if (seenFieldIds.has(field.id)) {
        context.addIssue({
          code: 'custom',
          path: ['fields', index, 'id'],
          message: 'Field ids must be unique within a template',
        })
      }

      seenFieldIds.add(field.id)

      if (field.condition && !seenFieldIds.has(field.condition.fieldId)) {
        context.addIssue({
          code: 'custom',
          path: ['fields', index, 'condition', 'fieldId'],
          message: 'Conditional rules can only reference an earlier field',
        })
      }
    })
  })

const VisitScheduleSourceSchema = z
  .object({
    visitKey: z.string().min(1).optional(),
    visit: z.string().min(1).optional(),
    dayOffset: OptionalNumberSchema,
    windowBefore: OptionalNumberSchema,
    windowAfter: OptionalNumberSchema,
    repeatable: z.boolean().optional(),
  })
  .transform((value) => ({
    visitKey: value.visitKey ?? value.visit ?? 'unscheduled',
    dayOffset: value.dayOffset,
    windowBefore: value.windowBefore,
    windowAfter: value.windowAfter,
    repeatable: value.repeatable ?? false,
  }))

export const VisitScheduleSchema = VisitScheduleSourceSchema

export const SaveStudyFormTemplateSchema = z.object({
  id: PostgresUuidSchema.optional(),
  studyId: PostgresUuidSchema,
  name: z.string().min(3, 'Form name must be at least 3 characters').max(160),
  formType: z.enum(FORM_TEMPLATE_TYPES),
  version: z.preprocess(normalizeOptionalNumber, z.number().int().positive()),
  isPublished: z.boolean(),
  schema: CrfSchemaSchema,
  visitSchedule: VisitScheduleSchema,
})

export type SaveStudyFormTemplateValues = z.input<typeof SaveStudyFormTemplateSchema>
export type SaveStudyFormTemplateInput = z.output<typeof SaveStudyFormTemplateSchema>
